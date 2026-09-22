const RESERVED = new Set(['rss', 'rss.xml']);

export function match(param: string): boolean {
	return !RESERVED.has(param);
}
