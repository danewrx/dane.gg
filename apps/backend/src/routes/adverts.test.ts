import { describe, expect, test } from 'bun:test';
import path from 'path';
import sharp from 'sharp';
import {
	ImageSourceError,
	isPrivateAdvertHost,
	resolveUploadSourcePath,
	clampCropRegion,
	pickAdvertOutputFormat,
	cropAdvertImage
} from './adverts';

describe('isPrivateAdvertHost (SSRF guard)', () => {
	test('blocks loopback and unspecified hosts', () => {
		expect(isPrivateAdvertHost('localhost')).toBe(true);
		expect(isPrivateAdvertHost('LOCALHOST')).toBe(true);
		expect(isPrivateAdvertHost('0.0.0.0')).toBe(true);
		expect(isPrivateAdvertHost('::1')).toBe(true);
		expect(isPrivateAdvertHost('127.0.0.1')).toBe(true);
		expect(isPrivateAdvertHost('127.1.2.3')).toBe(true);
	});

	test('blocks RFC1918 private ranges', () => {
		expect(isPrivateAdvertHost('10.0.0.1')).toBe(true);
		expect(isPrivateAdvertHost('10.255.255.255')).toBe(true);
		expect(isPrivateAdvertHost('192.168.0.1')).toBe(true);
		expect(isPrivateAdvertHost('192.168.255.1')).toBe(true);
		expect(isPrivateAdvertHost('172.16.0.1')).toBe(true);
		expect(isPrivateAdvertHost('172.19.5.5')).toBe(true);
		expect(isPrivateAdvertHost('172.24.0.1')).toBe(true);
		expect(isPrivateAdvertHost('172.31.255.255')).toBe(true);
	});

	test('172.x boundaries: only .16 through .31 are private', () => {
		expect(isPrivateAdvertHost('172.15.0.1')).toBe(false);
		expect(isPrivateAdvertHost('172.32.0.1')).toBe(false);
	});

	test('blocks link-local and .local hostnames', () => {
		expect(isPrivateAdvertHost('169.254.169.254')).toBe(true); // cloud metadata
		expect(isPrivateAdvertHost('printer.local')).toBe(true);
		expect(isPrivateAdvertHost('NAS.LOCAL')).toBe(true);
	});

	test('allows normal public hosts', () => {
		expect(isPrivateAdvertHost('example.com')).toBe(false);
		expect(isPrivateAdvertHost('upload.wikimedia.org')).toBe(false);
		expect(isPrivateAdvertHost('8.8.8.8')).toBe(false);
		// Public addresses that merely contain private-looking substrings.
		expect(isPrivateAdvertHost('110.1.2.3')).toBe(false);
		expect(isPrivateAdvertHost('1270.example.com')).toBe(false);
	});

	test('over-blocks hostnames with private-IP prefixes (conservative by design)', () => {
		// The prefix regexes match hostnames too, not just IPs. Blocking a DNS
		// name like this is a harmless false positive for an SSRF guard.
		expect(isPrivateAdvertHost('192.168.example.com.evil.net')).toBe(true);
	});
});

describe('resolveUploadSourcePath (path traversal guard)', () => {
	const ROOT = '/srv/app';

	test('resolves a plain uploads path', () => {
		expect(resolveUploadSourcePath('/uploads/advert.png', ROOT)).toBe(
			path.join(ROOT, 'static', 'uploads', 'advert.png')
		);
	});

	test('allows nested uploads paths', () => {
		expect(resolveUploadSourcePath('/uploads/sub/dir/advert.gif', ROOT)).toBe(
			path.join(ROOT, 'static', 'uploads', 'sub', 'dir', 'advert.gif')
		);
	});

	test('rejects traversal out of the uploads directory', () => {
		expect(() => resolveUploadSourcePath('/uploads/../../.env', ROOT)).toThrow(ImageSourceError);
		expect(() => resolveUploadSourcePath('/uploads/../secrets.txt', ROOT)).toThrow(
			ImageSourceError
		);
		expect(() => resolveUploadSourcePath('/uploads/a/../../b.png', ROOT)).toThrow(ImageSourceError);
	});

	test('rejects sibling directories with the uploads prefix', () => {
		// static/uploads-evil must not pass the startsWith check.
		expect(() => resolveUploadSourcePath('/uploads/../uploads-evil/x.png', ROOT)).toThrow(
			ImageSourceError
		);
	});

	test('traversal that lands back inside uploads is fine', () => {
		expect(resolveUploadSourcePath('/uploads/a/../b.png', ROOT)).toBe(
			path.join(ROOT, 'static', 'uploads', 'b.png')
		);
	});
});

describe('clampCropRegion', () => {
	test('passes through an in-bounds region', () => {
		expect(clampCropRegion(10, 20, 100, 50, 500, 300)).toEqual({
			left: 10,
			top: 20,
			width: 100,
			height: 50
		});
	});

	test('clamps negative origins to zero', () => {
		expect(clampCropRegion(-5, -10, 100, 50, 500, 300)).toEqual({
			left: 0,
			top: 0,
			width: 100,
			height: 50
		});
	});

	test('shrinks a region overflowing the right/bottom edges', () => {
		expect(clampCropRegion(450, 280, 100, 50, 500, 300)).toEqual({
			left: 450,
			top: 280,
			width: 50,
			height: 20
		});
	});

	test('clamps an origin beyond the frame to the last pixel', () => {
		const region = clampCropRegion(9999, 9999, 100, 50, 500, 300);
		expect(region.left).toBe(499);
		expect(region.top).toBe(299);
		expect(region.width).toBe(1);
		expect(region.height).toBe(1);
	});

	test('rounds fractional inputs', () => {
		expect(clampCropRegion(10.4, 10.6, 99.5, 49.4, 500, 300)).toEqual({
			left: 10,
			top: 11,
			width: 100,
			height: 49
		});
	});
});

describe('pickAdvertOutputFormat', () => {
	test('keeps animation-capable and lossy formats', () => {
		expect(pickAdvertOutputFormat('gif')).toEqual({ ext: 'gif', mimetype: 'image/gif' });
		expect(pickAdvertOutputFormat('webp')).toEqual({ ext: 'webp', mimetype: 'image/webp' });
		expect(pickAdvertOutputFormat('jpeg')).toEqual({ ext: 'jpg', mimetype: 'image/jpeg' });
	});

	test('falls back to png for everything else', () => {
		expect(pickAdvertOutputFormat('png')).toEqual({ ext: 'png', mimetype: 'image/png' });
		expect(pickAdvertOutputFormat('avif')).toEqual({ ext: 'png', mimetype: 'image/png' });
		expect(pickAdvertOutputFormat('svg')).toEqual({ ext: 'png', mimetype: 'image/png' });
		expect(pickAdvertOutputFormat(undefined)).toEqual({ ext: 'png', mimetype: 'image/png' });
	});
});

describe('cropAdvertImage (sharp pipeline)', () => {
	function solidFrame(r: number, g: number, b: number, width = 300, height = 200) {
		return sharp({ create: { width, height, channels: 3, background: { r, g, b } } })
			.png()
			.toBuffer();
	}

	async function animatedGif(frameCount: number, width = 300, height = 200): Promise<Buffer> {
		const frames = await Promise.all(
			Array.from({ length: frameCount }, (_, i) =>
				solidFrame((i * 80) % 256, (i * 40) % 256, 200, width, height)
			)
		);
		return sharp(frames, { join: { animated: true } })
			.gif()
			.toBuffer();
	}

	test('crops a static image to the requested region', async () => {
		const input = await solidFrame(200, 10, 10);
		const { buffer, ext, mimetype } = await cropAdvertImage(input, {
			x: 50,
			y: 40,
			width: 120,
			height: 60
		});
		const meta = await sharp(buffer).metadata();
		expect(meta.width).toBe(120);
		expect(meta.height).toBe(60);
		expect(meta.format).toBe('png');
		expect(ext).toBe('png');
		expect(mimetype).toBe('image/png');
	});

	test('preserves every frame and the delays of an animated GIF', async () => {
		const input = await animatedGif(5);
		const inputMeta = await sharp(input, { animated: true }).metadata();
		expect(inputMeta.pages).toBe(5);

		const { buffer, ext } = await cropAdvertImage(input, { x: 20, y: 30, width: 200, height: 25 });
		expect(ext).toBe('gif');

		const meta = await sharp(buffer, { animated: true }).metadata();
		expect(meta.format).toBe('gif');
		expect(meta.pages).toBe(5);
		expect(meta.width).toBe(200);
		// pageHeight is the per-frame height, i.e. the cropped region height.
		expect(meta.pageHeight).toBe(25);
		expect(meta.delay).toHaveLength(5);
	});

	test('clamps the region against a single frame, not the stacked frames', async () => {
		// A 5-frame 300x200 GIF stacks to 300x1000 internally; a request taller
		// than one frame must clamp to 200, not spill into the next frame.
		const input = await animatedGif(5);
		const { buffer } = await cropAdvertImage(input, { x: 0, y: 0, width: 300, height: 900 });
		const meta = await sharp(buffer, { animated: true }).metadata();
		expect(meta.pages).toBe(5);
		expect(meta.pageHeight).toBe(200);
	});

	test('downscales output wider than the banner maximum', async () => {
		const input = await solidFrame(10, 10, 200, 3000, 400);
		const { buffer } = await cropAdvertImage(input, { x: 0, y: 0, width: 3000, height: 371 });
		const meta = await sharp(buffer).metadata();
		expect(meta.width).toBe(1456);
	});

	test('rejects an unreadable buffer', async () => {
		await expect(
			cropAdvertImage(Buffer.from('not an image'), { x: 0, y: 0, width: 10, height: 10 })
		).rejects.toThrow();
	});
});
