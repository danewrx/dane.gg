import { marked } from 'marked';

/** Render admin-authored markdown for safe `@html` use (trusted CMS content only). */
export async function renderMarkdown(source: string): Promise<string> {
	const t = source.trim();
	if (!t) return '';
	return marked.parse(t);
}
