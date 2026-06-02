/**
 * ntfy publish headers — https://docs.ntfy.sh/publish/
 * Tags drive emoji styling; icon and click URL control notification visuals/interaction.
 */

export interface NtfyEventAppearance {
	title: string;
	priority: number;
	tags: string[];
	markdown: boolean;
	click: string;
	icon: string;
}

export const NTFY_APPEARANCE_OPTIONAL_DEFAULTS = {
	markdown: false,
	click: '',
	icon: ''
};

function sanitizeNtfyHeaderValue(value: string, maxLength = 200): string {
	const ascii = value
		.replaceAll(/[^\x20-\x7E]/g, '')
		.replaceAll(/\s+/g, ' ')
		.trim();
	return ascii.slice(0, maxLength);
}

function sanitizeOptionalUrl(value: unknown, maxLength = 2048): string {
	if (typeof value !== 'string') return '';
	const trimmed = value.trim();
	if (!trimmed) return '';
	try {
		const url = new URL(trimmed);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
		return trimmed.slice(0, maxLength);
	} catch {
		return '';
	}
}

function clampPriority(value: unknown, fallback: number): number {
	const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
	if (!Number.isFinite(n)) return fallback;
	return Math.min(5, Math.max(1, Math.round(n)));
}

function sanitizeTags(value: unknown, fallback: string[]): string[] {
	if (!Array.isArray(value)) return [...fallback];
	const tags = value
		.filter((t): t is string => typeof t === 'string')
		.map((t) => t.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''))
		.filter((t) => t.length > 0 && t.length <= 32);
	return tags.length > 0 ? tags.slice(0, 8) : [...fallback];
}

function fieldFromRaw(
	raw: Record<string, unknown>,
	key: string,
	sanitize: (value: unknown) => string,
	base: string
): string {
	if (!(key in raw)) return base;
	return sanitize(raw[key]);
}

export function mergeNtfyAppearance(
	base: NtfyEventAppearance,
	input: unknown
): NtfyEventAppearance {
	if (!input || typeof input !== 'object') return { ...base };
	const raw = input as Record<string, unknown>;
	return {
		title:
			typeof raw.title === 'string' && raw.title.trim()
				? sanitizeNtfyHeaderValue(raw.title, 200)
				: base.title,
		priority: clampPriority(raw.priority, base.priority),
		tags: 'tags' in raw ? sanitizeTags(raw.tags, base.tags) : base.tags,
		markdown: typeof raw.markdown === 'boolean' ? raw.markdown : base.markdown,
		click: fieldFromRaw(raw, 'click', sanitizeOptionalUrl, base.click),
		icon: fieldFromRaw(raw, 'icon', sanitizeOptionalUrl, base.icon)
	};
}

export function buildNtfyPublishHeaders(
	appearance: NtfyEventAppearance
): Record<string, string> {
	const headers: Record<string, string> = {
		'Content-Type': appearance.markdown ? 'text/markdown' : 'text/plain'
	};

	if (appearance.title) {
		headers.Title = sanitizeNtfyHeaderValue(appearance.title);
	}

	if (appearance.priority) {
		headers.Priority = appearance.priority.toString();
	}

	if (appearance.tags.length > 0) {
		headers.Tags = appearance.tags.join(',');
	}

	if (appearance.markdown) {
		headers.Markdown = 'yes';
	}

	if (appearance.click) {
		headers.Click = appearance.click;
	}

	if (appearance.icon) {
		headers.Icon = appearance.icon;
	}

	return headers;
}
