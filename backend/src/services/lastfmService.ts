import { logger } from '../utils/logger';
export interface LastFmTrack {
	artist: string;
	name: string;
	album?: string;
	image?: string;
	url?: string;
	nowPlaying?: boolean;
	date?: {
		uts: string;
		'#text': string;
	};
}

export interface LastFmTrackRaw {
	artist: string | { '#text': string };
	name: string;
	album?: string | { '#text': string };
	image?: any[] | any;
	url?: string | { '#text': string };
	nowPlaying?: boolean;
	'@attr'?: {
		nowplaying?: string;
	};
	date?: {
		uts: string;
		'#text': string;
	};
}

export interface LastFmResponse {
	recenttracks?: {
		track: LastFmTrackRaw | LastFmTrackRaw[];
		'@attr': {
			user: string;
			totalPages: string;
			page: string;
			perPage: string;
			total: string;
		};
	};
}

export class LastFmService {
	private static readonly API_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

	/**
	 * Get the user's recent tracks from Last.fm API
	 */
	static async getRecentTracks(limit: number = 1): Promise<LastFmTrack[]> {
		const apiKey = process.env.LASTFM_API_KEY;
		const username = process.env.LASTFM_USERNAME;

		if (!apiKey || !username) {
			throw new Error('Last.fm API key or username not configured');
		}

		try {
			const params = new URLSearchParams({
				method: 'user.getrecenttracks',
				user: username,
				api_key: apiKey,
				format: 'json',
				limit: limit.toString()
			});

			const response = await fetch(`${this.API_BASE_URL}?${params}`);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Last.fm API error: ${response.status} - ${errorText}`);
			}

			const data: LastFmResponse = await response.json();

			if (!data.recenttracks?.track) {
				return [];
			}

			// Handle both single track and array of tracks
			const tracks = Array.isArray(data.recenttracks.track)
				? data.recenttracks.track
				: [data.recenttracks.track];

			return tracks.map(
				(track: LastFmTrackRaw): LastFmTrack => ({
					artist: typeof track.artist === 'string' ? track.artist : track.artist['#text'],
					name: track.name,
					album: track.album
						? typeof track.album === 'string'
							? track.album
							: track.album['#text']
						: undefined,
					image: this.normalizeArtworkUrl(this.getBestImage(track.image)),
					url: track.url
						? typeof track.url === 'string'
							? track.url
							: track.url['#text']
						: undefined,
					nowPlaying: track['@attr']?.nowplaying === 'true' || track.nowPlaying,
					date: track.date
				})
			);
		} catch (error) {
			logger.error('Error fetching Last.fm data:', error);
			throw error;
		}
	}

	/**
	 * Get the currently playing track
	 */
	static async getNowPlaying(): Promise<LastFmTrack | null> {
		try {
			const tracks = await this.getRecentTracks(1);
			const nowPlaying = tracks.find((track) => track.nowPlaying);
			return nowPlaying || null;
		} catch (error) {
			logger.error('Error fetching now playing track:', error);
			return null;
		}
	}

	/**
	 * Get the last played track
	 */
	static async getLastPlayed(): Promise<LastFmTrack | null> {
		try {
			const tracks = await this.getRecentTracks(1);
			const lastPlayed = tracks.find((track) => !track.nowPlaying);
			return lastPlayed || null;
		} catch (error) {
			logger.error('Error fetching last played track:', error);
			return null;
		}
	}

	/**
	 * Get current music status (now playing or last played)
	 */
	static async getCurrentMusicStatus(): Promise<{
		track: string | null;
		artist: string | null;
		album: string | null;
		image: string | null;
		url: string | null;
		nowPlaying: boolean;
		lastUpdate: string;
	}> {
		try {
			logger.info('Getting current music status from Last.fm...');

			// Try to get currently playing track first
			const nowPlaying = await this.getNowPlaying();
			if (nowPlaying) {
				logger.info(`Found currently playing track: ${nowPlaying.artist} - ${nowPlaying.name}`);
				const image =
					nowPlaying.image ||
					(await this.fetchFallbackCoverArt(nowPlaying.artist, nowPlaying.name));
				return {
					track: nowPlaying.name,
					artist: nowPlaying.artist,
					album: nowPlaying.album || null,
					image,
					url: nowPlaying.url || null,
					nowPlaying: true,
					lastUpdate: new Date().toISOString()
				};
			}

			// Fallback to last played track
			logger.info('No currently playing track, getting last played...');
			const lastPlayed = await this.getLastPlayed();
			if (lastPlayed) {
				// Use the actual timestamp from Last.fm if available, otherwise current time
				let lastUpdate = new Date().toISOString();
				if (lastPlayed.date?.uts) {
					// Convert Unix timestamp to ISO string
					const playedDate = new Date(parseInt(lastPlayed.date.uts) * 1000);
					lastUpdate = playedDate.toISOString();
				}

				logger.info(
					`Found last played track: ${lastPlayed.artist} - ${lastPlayed.name} (played at: ${lastUpdate})`
				);
				const image =
					lastPlayed.image ||
					(await this.fetchFallbackCoverArt(lastPlayed.artist, lastPlayed.name));
				return {
					track: lastPlayed.name,
					artist: lastPlayed.artist,
					album: lastPlayed.album || null,
					image,
					url: lastPlayed.url || null,
					nowPlaying: false,
					lastUpdate: lastUpdate
				};
			}

			// No tracks found
			logger.info('No music data available from Last.fm');
			return {
				track: null,
				artist: null,
				album: null,
				image: null,
				url: null,
				nowPlaying: false,
				lastUpdate: new Date().toISOString()
			};
		} catch (error) {
			logger.error('Error getting music status from Last.fm:', error);
			return {
				track: null,
				artist: null,
				album: null,
				image: null,
				url: null,
				nowPlaying: false,
				lastUpdate: new Date().toISOString()
			};
		}
	}

	/**
	 * Apple iTunes Search fallback
	 */
	private static async fetchFallbackCoverArt(
		artist: string,
		track: string
	): Promise<string | null> {
		const term = `${track} ${artist}`.trim().slice(0, 200);
		if (!term) return null;

		try {
			const url = new URL('https://itunes.apple.com/search');
			url.searchParams.set('term', term);
			url.searchParams.set('entity', 'song');
			url.searchParams.set('limit', '1');

			const response = await fetch(url.toString(), {
				headers: { Accept: 'application/json' }
			});
			if (!response.ok) return null;

			const data = (await response.json()) as {
				results?: Array<{ artworkUrl100?: string }>;
			};
			const artwork = data.results?.[0]?.artworkUrl100;
			if (!artwork || typeof artwork !== 'string') return null;

			const hiRes = artwork.replaceAll(/100x100bb/gi, '600x600bb');
			return this.normalizeArtworkUrl(hiRes) ?? null;
		} catch (error) {
			logger.warn('Cover art fallback (iTunes) failed:', error);
			return null;
		}
	}

	private static normalizeArtworkUrl(url: string | undefined): string | undefined {
		if (!url) return undefined;
		const trimmed = url.trim();
		if (!trimmed) return undefined;

		let u = trimmed;
		if (u.startsWith('//')) u = `https:${u}`;
		if (u.startsWith('http://')) u = `https://${u.slice('http://'.length)}`;

		try {
			const parsed = new URL(u);
			if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
			return u;
		} catch {
			return undefined;
		}
	}

	/**
	 * Get the best available image from Last.fm
	 */
	private static getBestImage(images: any): string | undefined {
		if (!images) return undefined;

		const imageArray = Array.isArray(images) ? images : [images];

		const textOf = (img: { '#text'?: string; text?: string }) => {
			const raw = img?.['#text'] ?? img?.text;
			return typeof raw === 'string' ? raw.trim() : '';
		};

		const sizes = ['extralarge', 'large', 'medium', 'small'];

		for (const size of sizes) {
			const image = imageArray.find((img) => img.size === size);
			const t = image ? textOf(image) : '';
			if (t) return t;
		}

		for (const img of imageArray) {
			const t = textOf(img);
			if (t) return t;
		}

		return undefined;
	}

	/**
	 * Check if the service is properly configured
	 */
	static isConfigured(): boolean {
		return !!(process.env.LASTFM_API_KEY && process.env.LASTFM_USERNAME);
	}
}
