import { sanitizeSvgInlineMarkup } from '@repo/shared/utils/sanitizeSvgInline';
import { validateSvgIconUrl } from '@repo/shared/utils/validateSvgIconUrl';

export const ICON_TYPES = [
	'coreui-brand',
	'lucide',
	'svg-url',
	'svg-inline',
	'custom-text'
] as const;

const ICON_TYPE_ERROR =
	'Valid icon type is required (coreui-brand, lucide, svg-url, svg-inline, or custom-text)';

const SVG_URL_ERROR =
	'SVG URL must be a valid absolute http(s) URL (max 500 characters, no username/password in the URL)';

const SVG_INLINE_ERROR =
	'Valid inline SVG markup is required when icon type is svg-inline (must start with <svg and pass safety checks)';

function isAllowedIconType(value: unknown): value is string {
	return typeof value === 'string' && (ICON_TYPES as readonly string[]).includes(value);
}

export type ValidatedCreatePayload = {
	name: string;
	url: string;
	iconType: string;
	iconName: string | null;
	iconText: string | null;
	svgUrl: string | null;
	svgInline: string | null;
	displayOrder: number;
	isActive: boolean;
};

export function validateCreateSocialLinkBody(body: {
	name?: unknown;
	url?: unknown;
	iconType?: unknown;
	iconName?: unknown;
	iconText?: unknown;
	svgUrl?: unknown;
	svgInline?: unknown;
	displayOrder?: unknown;
	isActive?: unknown;
}): { error: string } | ValidatedCreatePayload {
	if (!body.name || !body.url) {
		return { error: 'Name and URL are required' };
	}

	if (!isAllowedIconType(body.iconType)) {
		return { error: ICON_TYPE_ERROR };
	}

	const iconType = body.iconType;

	if (iconType === 'custom-text' && !body.iconText) {
		return { error: 'Icon text is required when icon type is custom-text' };
	}

	if ((iconType === 'coreui-brand' || iconType === 'lucide') && !body.iconName) {
		return { error: 'Icon name is required when icon type is coreui-brand or lucide' };
	}

	let svgUrlOut: string | null = null;
	if (iconType === 'svg-url') {
		const n = validateSvgIconUrl(String(body.svgUrl ?? ''));
		if (!n) return { error: SVG_URL_ERROR };
		svgUrlOut = n;
	}

	let svgInlineOut: string | null = null;
	if (iconType === 'svg-inline') {
		const safe = sanitizeSvgInlineMarkup(String(body.svgInline ?? ''));
		if (!safe) return { error: SVG_INLINE_ERROR };
		svgInlineOut = safe;
	}

	return {
		name: String(body.name),
		url: String(body.url),
		iconType,
		iconName: iconType === 'coreui-brand' || iconType === 'lucide' ? String(body.iconName) : null,
		iconText: iconType === 'custom-text' ? String(body.iconText) : null,
		svgUrl: svgUrlOut,
		svgInline: svgInlineOut,
		displayOrder: Number(body.displayOrder) || 0,
		isActive: body.isActive !== undefined ? Boolean(body.isActive) : true
	};
}

export type ValidatedUpdateIconFields = {
	svgUrlResolved: string | null | undefined;
	svgInlineStored: string | null | undefined;
};

export function validateUpdateSocialLinkIconFields(body: {
	iconType?: unknown;
	iconName?: unknown;
	iconText?: unknown;
	svgUrl?: unknown;
	svgInline?: unknown;
}): { error: string } | ValidatedUpdateIconFields {
	const { iconType } = body;

	if (iconType !== undefined && iconType !== null && !isAllowedIconType(iconType)) {
		return { error: ICON_TYPE_ERROR };
	}

	if (iconType === undefined || iconType === null) {
		return { svgUrlResolved: undefined, svgInlineStored: undefined };
	}

	if (iconType === 'custom-text' && !body.iconText) {
		return { error: 'Icon text is required when icon type is custom-text' };
	}

	if ((iconType === 'coreui-brand' || iconType === 'lucide') && !body.iconName) {
		return { error: 'Icon name is required when icon type is coreui-brand or lucide' };
	}

	return resolveSvgPayloadForUpdate(iconType, body.svgUrl, body.svgInline);
}

function resolveSvgPayloadForUpdate(
	iconType: string,
	svgUrl: unknown,
	svgInline: unknown
): { error: string } | ValidatedUpdateIconFields {
	if (iconType === 'svg-url') {
		const n = validateSvgIconUrl(String(svgUrl ?? ''));
		if (!n) return { error: SVG_URL_ERROR };
		return { svgUrlResolved: n, svgInlineStored: null };
	}

	if (iconType === 'svg-inline') {
		const safe = sanitizeSvgInlineMarkup(String(svgInline ?? ''));
		if (!safe) return { error: SVG_INLINE_ERROR };
		return { svgUrlResolved: null, svgInlineStored: safe };
	}

	return { svgUrlResolved: null, svgInlineStored: null };
}
