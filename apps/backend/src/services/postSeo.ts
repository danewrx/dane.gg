export const MAX_SEO_DESCRIPTION = 300;
export const MAX_THUMBNAIL_ALT = 200;
const MAX_OG_IMAGE = 500;

export interface PostSeoFields {
	seoDescription?: string | null;
	ogImage?: string | null;
	thumbnailAlt?: string | null;
}

function isImageSource(value: string): boolean {
	if (/^\/uploads\/[^/\\]+$/.test(value)) return true;
	try {
		return ['http:', 'https:'].includes(new URL(value).protocol);
	} catch {
		return false;
	}
}

export function parsePostSeoFields(body: {
	seoDescription?: unknown;
	ogImage?: unknown;
	thumbnailAlt?: unknown;
}): { fields: PostSeoFields } | { error: string } {
	const fields: PostSeoFields = {};

	if (body.seoDescription !== undefined) {
		if (body.seoDescription !== null && typeof body.seoDescription !== 'string') {
			return { error: 'SEO description must be text' };
		}
		const text = (body.seoDescription ?? '').trim();
		if (text.length > MAX_SEO_DESCRIPTION) {
			return { error: `SEO description must be ${MAX_SEO_DESCRIPTION} characters or fewer` };
		}
		fields.seoDescription = text || null;
	}

	if (body.ogImage !== undefined) {
		if (body.ogImage !== null && typeof body.ogImage !== 'string') {
			return { error: 'Social image must be a path or URL' };
		}
		const value = (body.ogImage ?? '').trim();
		if (value && (value.length > MAX_OG_IMAGE || !isImageSource(value))) {
			return { error: 'Social image must be an uploaded file or an http(s) URL' };
		}
		fields.ogImage = value || null;
	}

	if (body.thumbnailAlt !== undefined) {
		if (body.thumbnailAlt !== null && typeof body.thumbnailAlt !== 'string') {
			return { error: 'Cover image alt text must be text' };
		}
		const text = (body.thumbnailAlt ?? '').trim();
		if (text.length > MAX_THUMBNAIL_ALT) {
			return { error: `Cover image alt text must be ${MAX_THUMBNAIL_ALT} characters or fewer` };
		}
		fields.thumbnailAlt = text || null;
	}

	return { fields };
}
