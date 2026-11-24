export const MAX_SEO_DESCRIPTION = 300;
export const MAX_THUMBNAIL_ALT = 200;
const MAX_OG_IMAGE = 500;

export interface PostSeoFields {
	/** undefined = leave unchanged, null = clear */
	seoDescription?: string | null;
	ogImage?: string | null;
	thumbnailAlt?: string | null;
}

/** An uploaded file path or an http(s) URL. */
function isImageSource(value: string): boolean {
	if (/^\/uploads\/[^/\\]+$/.test(value)) return true;
	try {
		return ['http:', 'https:'].includes(new URL(value).protocol);
	} catch {
		return false;
	}
}

type Cleaned = { value: string | null } | { error: string };

function cleanText(value: unknown, label: string, max: number): Cleaned {
	if (value !== null && typeof value !== 'string') return { error: `${label} must be text` };
	const text = (value ?? '').trim();
	return text.length > max
		? { error: `${label} must be ${max} characters or fewer` }
		: { value: text || null };
}

const FIELDS: {
	key: keyof PostSeoFields;
	label: string;
	max: number;
	isValid?: (value: string) => boolean;
	invalidMessage?: string;
}[] = [
	{ key: 'seoDescription', label: 'SEO description', max: MAX_SEO_DESCRIPTION },
	{
		key: 'ogImage',
		label: 'Social image',
		max: MAX_OG_IMAGE,
		isValid: isImageSource,
		invalidMessage: 'Social image must be an uploaded file or an http(s) URL'
	},
	{ key: 'thumbnailAlt', label: 'Cover image alt text', max: MAX_THUMBNAIL_ALT }
];

/**
 * Validates the optional SEO fields of a blog post request
 */
export function parsePostSeoFields(
	body: Partial<Record<keyof PostSeoFields, unknown>>
): { fields: PostSeoFields } | { error: string } {
	const fields: PostSeoFields = {};

	for (const field of FIELDS) {
		const raw = body[field.key];
		if (raw === undefined) continue;

		const cleaned = cleanText(raw, field.label, field.max);
		if ('error' in cleaned) return cleaned;
		if (cleaned.value && field.isValid && !field.isValid(cleaned.value)) {
			return { error: field.invalidMessage ?? `${field.label} is not valid` };
		}
		fields[field.key] = cleaned.value;
	}

	return { fields };
}
