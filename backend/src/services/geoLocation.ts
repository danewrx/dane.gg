/**
 * IP geolocation service
 */

export class GeoLocationService {
	private static cache = new Map<string, { country: string; timestamp: number }>();
	private static CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

	/**
	 * Get country from IP address
	 */
	static async getCountry(ip: string): Promise<string | null> {
		// Skip localhost (but return test data in development)
		if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip === 'unknown') {
			// Return test data in development
			if (process.env.NODE_ENV === 'development') {
				return 'Test Country';
			}
			return null;
		}

		// Check cache first
		const cached = this.cache.get(ip);
		if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
			return cached.country;
		}

		try {
			const response = await fetch(
				`http://ip-api.com/json/${ip}?fields=status,country,countryCode`
			);
			const data = await response.json();

			if (data.status === 'success' && data.country) {
				const country = data.country;

				// Cache the result
				this.cache.set(ip, { country, timestamp: Date.now() });

				return country;
			}

			return null;
		} catch (error) {
			console.error('Geolocation failed:', error);
			return null;
		}
	}

	/**
	 * Get statistics about the cache
	 */
	static getCacheStats(): {
		size: number;
		entries: Array<{ ip: string; country: string; age: number }>;
	} {
		const now = Date.now();
		const entries = Array.from(this.cache.entries()).map(([ip, data]) => ({
			ip,
			country: data.country,
			age: Math.floor((now - data.timestamp) / 1000 / 60) // minutes
		}));

		return {
			size: this.cache.size,
			entries
		};
	}
}
