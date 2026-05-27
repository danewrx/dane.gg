type Entry<T> = { at: number; value: T };

const buckets = new Map<string, Entry<unknown>>();

/**
 * In-memory TTL cache for hot public endpoints (reduces hammering third-party APIs).
 */
export async function getOrSetCached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
	const now = Date.now();
	const hit = buckets.get(key) as Entry<T> | undefined;
	if (hit && now - hit.at < ttlMs) {
		return hit.value;
	}
	const value = await fn();
	buckets.set(key, { at: now, value });
	return value;
}

export function invalidateCached(key: string): void {
	buckets.delete(key);
}
