export const SITE_CONFIG_BROADCAST_CHANNEL = 'dane-site-config';

export function notifySiteConfigConsumers(): void {
	if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
	try {
		const bc = new BroadcastChannel(SITE_CONFIG_BROADCAST_CHANNEL);
		bc.postMessage({ t: 'config' });
		bc.close();
	} catch {}
}

export function subscribeSiteConfigBroadcast(handler: () => void): () => void {
	if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
		return () => {};
	}
	const bc = new BroadcastChannel(SITE_CONFIG_BROADCAST_CHANNEL);
	bc.onmessage = () => handler();
	return () => bc.close();
}
