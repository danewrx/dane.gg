import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOTS = ['src/routes/(site)', 'src/lib/site'];

function svelteFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return svelteFiles(path);
		return entry.name.endsWith('.svelte') ? [path] : [];
	});
}

/** Every `<img ...>` tag in a Svelte file, read up to its closing `>` outside `{}` and quotes. */
export function imgTags(source: string): string[] {
	const tags: string[] = [];
	for (const match of source.matchAll(/<img\b/g)) {
		let depth = 0;
		let quote = '';
		let end = match.index!;
		for (; end < source.length; end++) {
			const char = source[end];
			if (quote) {
				if (char === quote) quote = '';
			} else if (depth === 0 && (char === '"' || char === "'")) quote = char;
			else if (char === '{') depth++;
			else if (char === '}') depth--;
			else if (char === '>' && depth === 0) break;
		}
		tags.push(source.slice(match.index!, end + 1));
	}
	return tags;
}

describe('imgTags', () => {
	it('reads whole tags, including arrow functions in attributes', () => {
		const tags = imgTags(
			`<img src="a.png" alt="A" onerror={(e) => (e.currentTarget.style.display = 'none')} />\n<img src={b} alt="" />`
		);
		expect(tags).toHaveLength(2);
		expect(tags[0]).toContain('onerror');
		expect(tags[0].endsWith('/>')).toBe(true);
	});
});

describe('public site images', () => {
	const tags = ROOTS.flatMap((root) =>
		svelteFiles(root).flatMap((file) =>
			imgTags(readFileSync(file, 'utf8')).map((tag) => ({ file, tag }))
		)
	);

	it('finds the site images', () => {
		expect(tags.length).toBeGreaterThan(10);
	});

	it('every image has an alt attribute', () => {
		const missing = tags.filter(({ tag }) => !/\balt=/.test(tag) && !/\{\.\.\./.test(tag));
		expect(missing.map(({ file, tag }) => `${file}: ${tag.slice(0, 80)}`)).toEqual([]);
	});

	it('no image uses a generic alt such as "Icon"; decorative images use an empty alt', () => {
		const generic = tags.filter(({ tag }) => /\balt="(icon|image|picture|photo)"/i.test(tag));
		expect(generic.map(({ file, tag }) => `${file}: ${tag.slice(0, 80)}`)).toEqual([]);
	});
});
