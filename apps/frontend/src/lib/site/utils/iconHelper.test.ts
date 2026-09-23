import { describe, expect, it } from 'vitest';
import {
	getIconRenderInfo,
	isLikelyLucideMisstoredAsCoreUi,
	stripCoreUIBrandPrefix
} from './iconHelper';

describe('stripCoreUIBrandPrefix', () => {
	it('removes one leading cb- prefix case-insensitively', () => {
		expect(stripCoreUIBrandPrefix('cb-github')).toBe('github');
		expect(stripCoreUIBrandPrefix('CB-Mail')).toBe('Mail');
	});

	it('passes through when prefix is absent', () => {
		expect(stripCoreUIBrandPrefix('github')).toBe('github');
	});
});
describe('isLikelyLucideMisstoredAsCoreUi', () => {
	it('detects PascalCase Lucide names mis-labelled as CoreUI', () => {
		expect(isLikelyLucideMisstoredAsCoreUi('Mail')).toBe(true);
		expect(isLikelyLucideMisstoredAsCoreUi('cb-Mail')).toBe(true);
	});

	it('allows normal CoreUI slugs', () => {
		expect(isLikelyLucideMisstoredAsCoreUi('github')).toBe(false);
		expect(isLikelyLucideMisstoredAsCoreUi('cib-github')).toBe(false);
	});
});

describe('getIconRenderInfo', () => {
	it('resolves Lucide component icons by stored name', () => {
		const mail = getIconRenderInfo('Mail');
		expect(mail.type).toBe('component');
		expect(mail.component).toBeTruthy();
	});
});
