import { sanitizeSvgInlineMarkup } from '@repo/shared/utils/sanitizeSvgInline';
import { validateSvgIconUrl } from '@repo/shared/utils/validateSvgIconUrl';

export const ICON_TYPES = [
	'coreui-brand',
	'lucide',
	'svg-url',
	'svg-inline',
	'custom-text'
] as const;

/** 'link' opens the URL; 'copy' copies the stored text to the clipboard. */
export const LINK_TYPES = ['link', 'copy'] as const;

const LINK_TYPE_ERROR = 'Valid link type is required (link or copy)';

const ICON_TYPE_ERROR =
	'Valid icon type is required (coreui-brand, lucide, svg-url, svg-inline, or custom-text)';

const SVG_URL_ERROR =
	'SVG URL must be a valid absolute http(s) URL (max 500 characters, no username/password in the URL)';

const SVG_INLINE_ERROR =
	'Valid inline SVG markup is required when icon type is svg-inline (must start with <svg and pass safety checks)';

function isAllowedIconType(value: unknown): value is string {
	return typeof value === 'string' && (ICON_TYPES as readonly string[]).includes(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function asTrimmedSvgField(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

type CreateNameUrlOk = { nameTrimmed: string; urlTrimmed: string };

function parseCreateNameAndUrl(
	body: {
		name?: unknown;
		url?: unknown;
	},
	linkType: string
): { error: string } | CreateNameUrlOk {
	if (!isNonEmptyString(body.name) || !isNonEmptyString(body.url)) {
		return {
			error:
				linkType === 'copy' ? 'Name and text to copy are required' : 'Name and URL are required'
		};
	}
	return { nameTrimmed: body.name.trim(), urlTrimmed: body.url.trim() };
}

/** Returns the validated link type, defaulting to 'link' when absent. */
export function parseLinkType(value: unknown): { error: string } | string {
	if (value === undefined || value === null || value === '') {
		return 'link';
	}
	if (typeof value === 'string' && (LINK_TYPES as readonly string[]).includes(value)) {
		return value;
	}
	return { error: LINK_TYPE_ERROR };
}

function validateCreateIconTypeSpecific(
	iconType: string,
	body: { iconName?: unknown; iconText?: unknown }
): { error: string } | null {
	if (iconType === 'custom-text' && !isNonEmptyString(body.iconText)) {
		return { error: 'Icon text is required when icon type is custom-text' };
	}
	if ((iconType === 'coreui-brand' || iconType === 'lucide') && !isNonEmptyString(body.iconName)) {
		return { error: 'Icon name is required when icon type is coreui-brand or lucide' };
	}
	return null;
}

function tryCreateSvgFields(
	iconType: string,
	body: { svgUrl?: unknown; svgInline?: unknown }
): { error: string } | { svgUrlOut: string | null; svgInlineOut: string | null } {
	if (iconType === 'svg-url') {
		const n = validateSvgIconUrl(asTrimmedSvgField(body.svgUrl));
		return n ? { svgUrlOut: n, svgInlineOut: null } : { error: SVG_URL_ERROR };
	}
	if (iconType === 'svg-inline') {
		const safe = sanitizeSvgInlineMarkup(asTrimmedSvgField(body.svgInline));
		return safe ? { svgUrlOut: null, svgInlineOut: safe } : { error: SVG_INLINE_ERROR };
	}
	return { svgUrlOut: null, svgInlineOut: null };
}

function pickCreateIconName(iconType: string, body: { iconName?: unknown }): string | null {
	return (iconType === 'coreui-brand' || iconType === 'lucide') && isNonEmptyString(body.iconName)
		? body.iconName.trim()
		: null;
}

function pickCreateIconText(iconType: string, body: { iconText?: unknown }): string | null {
	return iconType === 'custom-text' && isNonEmptyString(body.iconText)
		? body.iconText.trim()
		: null;
}

export type ValidatedCreatePayload = {
	name: string;
	url: string;
	linkType: string;
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
	linkType?: unknown;
	iconType?: unknown;
	iconName?: unknown;
	iconText?: unknown;
	svgUrl?: unknown;
	svgInline?: unknown;
	displayOrder?: unknown;
	isActive?: unknown;
}): { error: string } | ValidatedCreatePayload {
	const linkType = parseLinkType(body.linkType);
	if (typeof linkType !== 'string') {
		return linkType;
	}

	const nameUrl = parseCreateNameAndUrl(body, linkType);
	if ('error' in nameUrl) {
		return nameUrl;
	}

	if (!isAllowedIconType(body.iconType)) {
		return { error: ICON_TYPE_ERROR };
	}

	const iconType = body.iconType;

	const fieldError = validateCreateIconTypeSpecific(iconType, body);
	if (fieldError) {
		return fieldError;
	}

	const svg = tryCreateSvgFields(iconType, body);
	if ('error' in svg) {
		return svg;
	}

	return {
		name: nameUrl.nameTrimmed,
		url: nameUrl.urlTrimmed,
		linkType,
		iconType,
		iconName: pickCreateIconName(iconType, body),
		iconText: pickCreateIconText(iconType, body),
		svgUrl: svg.svgUrlOut,
		svgInline: svg.svgInlineOut,
		displayOrder: Number(body.displayOrder) || 0,
		isActive: body.isActive === undefined ? true : Boolean(body.isActive)
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

	if (iconType === undefined || iconType === null) {
		return { svgUrlResolved: undefined, svgInlineStored: undefined };
	}

	if (!isAllowedIconType(iconType)) {
		return { error: ICON_TYPE_ERROR };
	}

	if (iconType === 'custom-text' && !isNonEmptyString(body.iconText)) {
		return { error: 'Icon text is required when icon type is custom-text' };
	}

	if ((iconType === 'coreui-brand' || iconType === 'lucide') && !isNonEmptyString(body.iconName)) {
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
		const n = validateSvgIconUrl(asTrimmedSvgField(svgUrl));
		if (!n) return { error: SVG_URL_ERROR };
		return { svgUrlResolved: n, svgInlineStored: null };
	}

	if (iconType === 'svg-inline') {
		const safe = sanitizeSvgInlineMarkup(asTrimmedSvgField(svgInline));
		if (!safe) return { error: SVG_INLINE_ERROR };
		return { svgUrlResolved: null, svgInlineStored: safe };
	}

	return { svgUrlResolved: null, svgInlineStored: null };
}
