import { describe, expect, test } from 'bun:test';
import { getOrSetCached } from './shortLivedCache';

describe('getOrSetCached', () => {
	test('reuses value within TTL (single fn invocation)', async () => {
		const key = `cache-test-${Math.random()}`;
		let calls = 0;
		const fn = async () => {
			calls += 1;
			return { id: 1 };
		};

		const a = await getOrSetCached(key, 60_000, fn);
		const b = await getOrSetCached(key, 60_000, fn);

		expect(a).toEqual({ id: 1 });
		expect(b).toEqual({ id: 1 });
		expect(calls).toBe(1);
	});

	test('separate keys invoke fn separately', async () => {
		const k1 = `cache-a-${Math.random()}`;
		const k2 = `cache-b-${Math.random()}`;
		let calls = 0;
		const fn = async () => {
			calls += 1;
			return calls;
		};

		const x = await getOrSetCached(k1, 60_000, fn);
		const y = await getOrSetCached(k2, 60_000, fn);

		expect(x).toBe(1);
		expect(y).toBe(2);
		expect(calls).toBe(2);
	});
});
