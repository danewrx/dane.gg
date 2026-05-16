import { marked } from 'marked';

export async function renderMarkdown(source: string): Promise<string> {
	const t = source.trim();
	if (!t) return '';
	return marked.parse(t);
}
