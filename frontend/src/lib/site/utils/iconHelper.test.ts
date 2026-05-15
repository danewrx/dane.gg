import { describe, expect, it } from 'vitest';
import { getIconRenderInfo, isLikelyLucideMisstoredAsCoreUi } from './iconHelper';

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
