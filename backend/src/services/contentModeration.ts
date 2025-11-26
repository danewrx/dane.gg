import { db } from '../db';
import { chatModerationRules } from '../db/schema';

export interface ModerationResult {
	isApproved: boolean;
	reason?: string;
	categories?: string[];
	confidence?: number;
}

export class ContentModerationService {
	private static rulesCache: { words: string[]; patterns: RegExp[]; lastUpdated: number } | null = null;
	private static readonly CACHE_TTL = 60000; // 1 minute cache

	/**
	 * Get blocked words and patterns from database
	 * Uses caching to avoid queries on every message
	 */
	private static async getModerationRules(): Promise<{ words: string[]; patterns: RegExp[] }> {
		const now = Date.now();
		
		if (this.rulesCache && (now - this.rulesCache.lastUpdated) < this.CACHE_TTL) {
			return {
				words: this.rulesCache.words,
				patterns: this.rulesCache.patterns
			};
		}

		const rules = await db.select().from(chatModerationRules);

		const words: string[] = [];
		const patterns: RegExp[] = [];

		for (const rule of rules) {
			if (rule.type === 'word') {
				words.push(rule.value);
			} else if (rule.type === 'pattern') {
				try {
					const regex = new RegExp(rule.value);
					patterns.push(regex);
				} catch (error) {
					console.error(`Invalid regex pattern in moderation rule ${rule.id}:`, rule.value);
				}
		}
		}

		this.rulesCache = {
			words,
			patterns,
			lastUpdated: now
		};

		return { words, patterns };
	}

	/**
	 * Invalidate the rules cache (called after adding/removing rules)
	 */
	static invalidateCache(): void {
		this.rulesCache = null;
	}

	/**
	 * Check if a message should be allowed
	 */
	static async moderateMessage(message: string): Promise<ModerationResult> {
		return this.checkMessage(message);
	}

	/**
	 * Moderation check with rules from db
	 */
	private static async checkMessage(message: string): Promise<ModerationResult> {
		const lowerMessage = message.toLowerCase().trim();
		
		// Get rules from db (cache)
		const { words, patterns } = await this.getModerationRules();
		
		// Check for blocked words
		for (const word of words) {
			if (lowerMessage.includes(word.toLowerCase())) {
				return {
					isApproved: false,
					reason: 'Message contains inappropriate content',
					categories: ['blocked_word'],
					confidence: 0.9
				};
			}
		}
		
		// Check for blocked patterns
		for (const pattern of patterns) {
			if (pattern.test(message)) {
				return {
					isApproved: false,
					reason: 'Message matches blocked pattern',
					categories: ['blocked_pattern'],
					confidence: 0.9
				};
			}
		}
		
		// Check message length
		if (message.length > 500) {
			return {
				isApproved: false,
				reason: 'Message too long (max 500 characters)',
				categories: ['length'],
				confidence: 1.0
			};
		}
		
		// Check for repetition
		if (this.detectSpam(message)) {
			return {
				isApproved: false,
				reason: 'Message appears to be spam',
				categories: ['spam'],
				confidence: 0.8
			};
		}
		
		// Check for caps
		const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
		if (capsRatio > 0.7 && message.length > 10) {
			return {
				isApproved: false,
				reason: 'Please avoid excessive capitalization',
				categories: ['formatting'],
				confidence: 0.7
			};
		}
		
		return {
			isApproved: true,
			confidence: 1.0
		};
	}
	
	/**
	 * Detect spam patterns
	 */
	private static detectSpam(message: string): boolean {
		// Check for repeated characters
		if (/(.)\1{4,}/.test(message)) {
			return true;
		}
		
		// Check for repeated words
		const words = message.toLowerCase().split(/\s+/);
		const wordCounts = new Map<string, number>();
		for (const word of words) {
			if (word.length > 2) {
				wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
				if (wordCounts.get(word)! > 3) {
					return true;
				}
			}
		}
		
		// Check for excessive links
		const linkCount = (message.match(/https?:\/\//g) || []).length;
		if (linkCount > 2) {
			return true;
		}
		
		return false;
	}
}

