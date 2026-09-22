import { describe, expect, it } from 'vitest';
import { getApiErrorMessage, getErrorMessage } from './errorUtils';

describe('getErrorMessage', () => {
	it('returns strings as-is', () => {
		expect(getErrorMessage('oops')).toBe('oops');
	});

	it('reads Error.message', () => {
		expect(getErrorMessage(new Error('fail'))).toBe('fail');
	});

	it('prefers response.data.message on Error', () => {
		const err = new Error('x') as Error & { response: { data: { message: string } } };
		err.response = { data: { message: 'from api' } };
		expect(getErrorMessage(err)).toBe('from api');
	});

	it('uses fallback when nothing matches', () => {
		expect(getErrorMessage(null, 'fallback')).toBe('fallback');
	});
});

describe('getApiErrorMessage', () => {
	it('reads nested response.data.message', () => {
		expect(getApiErrorMessage({ response: { data: { message: 'bad' } } }, 'fallback')).toBe('bad');
	});

	it('uses fallback for empty object', () => {
		expect(getApiErrorMessage({}, 'nope')).toBe('nope');
	});
});
