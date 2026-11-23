import { describe, expect, test } from 'bun:test';
import sharp from 'sharp';
import { OG_HEIGHT, OG_WIDTH, buildOgTree, renderOgPng, titleFontSize } from './ogImage';

const collectTypes = (
	node: unknown,
	found: { type: string; props: Record<string, unknown> }[] = []
) => {
	if (node && typeof node === 'object' && 'type' in node) {
		const element = node as {
			type: string;
			props: { children?: unknown } & Record<string, unknown>;
		};
		found.push(element);
		[element.props.children].flat().forEach((child) => collectTypes(child, found));
	}
	return found;
};

describe('titleFontSize', () => {
	test('shrinks for longer titles and stays a multiple of 16 (pixel font)', () => {
		expect(titleFontSize('Hello')).toBe(96);
		expect(titleFontSize('x'.repeat(40))).toBe(80);
		expect(titleFontSize('x'.repeat(60))).toBe(64);
		expect(titleFontSize('x'.repeat(200))).toBe(48);
		for (const length of [1, 24, 25, 48, 49, 72, 73, 300]) {
			expect(titleFontSize('x'.repeat(length)) % 16).toBe(0);
		}
	});
});

describe('buildOgTree', () => {
	test('uses the cover image and a scrim when a cover is given', () => {
		const images = collectTypes(
			buildOgTree({ title: 'Post', coverDataUri: 'data:image/jpeg;base64,AAAA' })
		)
			.filter((node) => node.type === 'img')
			.map((node) => node.props.src);
		expect(images).toEqual(['data:image/jpeg;base64,AAAA']);
	});

	test('draws the logo over the background when given', () => {
		const images = collectTypes(buildOgTree({ title: 'Post', logoDataUri: 'data:lain' }))
			.filter((node) => node.type === 'img')
			.map((node) => node.props.src);
		expect(images).toEqual(['data:lain']);
	});

	test('omits the meta line and pill when not given', () => {
		const tree = JSON.stringify(buildOgTree({ title: 'Only a title' }));
		expect(tree).toContain('Only a title');
		expect(tree).not.toContain('dane.gg/blog');
	});
});

describe('renderOgPng', () => {
	test('renders a 1200x630 PNG', async () => {
		const png = await renderOgPng({
			title: 'We lost something special',
			meta: '16 Nov 2026',
			pill: 'dane.gg/blog'
		});
		const meta = await sharp(png).metadata();
		expect(meta.format).toBe('png');
		expect([meta.width, meta.height]).toEqual([OG_WIDTH, OG_HEIGHT]);
	});
});
