import { logger } from '../utils/logger';
import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import { db } from '../db';
import { messages, siteConfig, apiKeys, type NewMessage } from '../db/schema';
import { desc, eq } from 'drizzle-orm';
import cookie from 'cookie';
import signature from 'cookie-signature';
import crypto from 'crypto';
import { adminSessions } from './adminSessions';

/** Site config key; when false, Discord bot bridge commands are rejected (missing key = enabled). */
export const DISCORD_CHAT_INTEGRATION_CONFIG_KEY = 'discord_chat_integration_enabled';

type MessageSource = 'web' | 'discord' | 'admin';

interface ChatMessage {
	id?: string;
	timestamp: string;
	nickname: string;
	message: string;
	formatted: string;
	color?: string;
	source?: MessageSource;
}

interface AdminConfig {
	nickname: string;
	color: string;
}

interface MessageRateLimit {
	count: number;
	resetTime: number;
}

interface ConnectionRateLimit {
	count: number;
	resetTime: number;
}

export class ChatService {
	private wss: WebSocketServer | null = null;
	private clients: Set<WebSocket> = new Set();
	private nicknames: Map<WebSocket, string> = new Map();
	private adminClients: Set<WebSocket> = new Set();
	private apiKeyConnections: Map<WebSocket, string> = new Map(); // Track API key prefix per connection
	private messageRateLimits: Map<WebSocket, MessageRateLimit> = new Map(); // Rate limiting per connection
	private connectionRateLimits: Map<string, ConnectionRateLimit> = new Map(); // Global connection rate limiting per IP
	private readonly DEFAULT_NICKNAME = 'Anonymous';
	private readonly MESSAGE_HISTORY_LIMIT = 50;
	private readonly MAX_MESSAGE_LENGTH = 1000;
	private readonly RATE_LIMIT_MESSAGES = 8;
	private readonly RATE_LIMIT_WINDOW_MS = 5000; // 5 seconds
	private readonly MAX_CONNECTIONS_PER_IP = 10; // Max WebSocket connections per IP
	private readonly CONNECTION_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
	private sessionSecret: string = '';

	private adminConfig: AdminConfig = {
		nickname: 'Admin',
		color: '#f5b700'
	};

	/**
	 * Initialize WebSocket server
	 */
	async initialize(server: Server): Promise<void> {
		try {
			this.sessionSecret = process.env.SESSION_SECRET || '';
			if (!this.sessionSecret) {
				if (process.env.NODE_ENV === 'production') {
					throw new Error('SESSION_SECRET environment variable is required in production');
				}
				logger.warn('SESSION_SECRET not set, using default (only for development)');
				this.sessionSecret = 'your-super-secret-session-key-change-this-in-production';
			}

			await this.loadAdminConfig();

			this.wss = new WebSocketServer({
				server,
				path: '/ws/chat'
			});

			this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
				const { isAdmin, apiKeyPrefix } = await this.validateAdminSession(req);
				this.handleConnection(ws, req, isAdmin, apiKeyPrefix);
			});

			this.wss.on('error', (error) => {
				logger.error('WebSocket server error:', error);
			});

			logger.info('Chat WebSocket server initialized on /ws/chat');
			logger.info('Admin config:', this.adminConfig);
		} catch (error) {
			logger.error('Failed to initialize WebSocket server:', error);
		}
	}

	/**
	 * Validate if the WebSocket request comes from an authenticated admin or has a valid API key
	 * Returns both admin status and API key prefix if authenticated via API key
	 */
	private async validateAdminSession(
		req: IncomingMessage
	): Promise<{ isAdmin: boolean; apiKeyPrefix?: string }> {
		try {
			// Check if this is explicitly a public chat connection
			const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
			const isPublicChat = url.searchParams.get('public') === 'true';

			if (isPublicChat) {
				logger.info('Public chat connection detected - ignoring admin session');
				return { isAdmin: false };
			}

			const authHeader = req.headers.authorization;
			const xApiKey = req.headers['x-api-key'];

			let apiKey: string | undefined;

			if (authHeader?.startsWith('Bearer dk_')) {
				apiKey = authHeader.substring(7);
			} else if (typeof xApiKey === 'string' && xApiKey.startsWith('dk_')) {
				apiKey = xApiKey;
			}

			if (apiKey) {
				const isValid = await this.validateApiKey(apiKey);
				if (isValid) {
					const prefix = apiKey.substring(0, 11); // dk_ + 8 chars
					logger.info(`API key validated for WebSocket connection (prefix: ${prefix})`);
					return { isAdmin: true, apiKeyPrefix: prefix };
				} else {
					logger.info('API key validation failed for WebSocket connection');
				}
			}

			// Fall back to session cookie validation
			const cookies = cookie.parse(req.headers.cookie || '');
			const signedSessionId = cookies['dane.gg.sid'];

			if (!signedSessionId) {
				return { isAdmin: false };
			}

			// The cookie is signed with 's:' prefix
			let sessionId = signedSessionId;
			if (signedSessionId.startsWith('s:')) {
				const unsigned = signature.unsign(signedSessionId.slice(2), this.sessionSecret);
				if (!unsigned) {
					return { isAdmin: false };
				}
				sessionId = unsigned;
			}

			// Check if session is registered as admin
			if (adminSessions.isAdmin(sessionId)) {
				const info = adminSessions.get(sessionId);
				logger.info('Admin session validated for user:', info?.username);
				return { isAdmin: true };
			}

			return { isAdmin: false };
		} catch (error) {
			logger.error('Error validating admin session:', error);
			return { isAdmin: false };
		}
	}

	/**
	 * Constant-time comparison of two hash strings to prevent timing attacks
	 */
	private constantTimeCompare(a: string, b: string): boolean {
		if (a.length !== b.length) {
			return false;
		}
		try {
			return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
		} catch {
			return false;
		}
	}

	/**
	 * Validate an API key for WebSocket authentication
	 * Uses constant-time comparison and timing normalization to prevent timing attacks
	 */
	private async validateApiKey(key: string): Promise<boolean> {
		try {
			const prefix = key.substring(0, 11); // dk_ + 8 chars
			const keyHash = crypto.createHash('sha256').update(key).digest('hex');

			const [result] = await Promise.all([
				db
					.select({
						id: apiKeys.id,
						keyHash: apiKeys.keyHash,
						isActive: apiKeys.isActive,
						expiresAt: apiKeys.expiresAt,
						permissions: apiKeys.permissions
					})
					.from(apiKeys)
					.where(eq(apiKeys.keyPrefix, prefix))
					.limit(1),
				new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 10)))
			]);

			// Always perform hash comparison even if prefix not found to prevent timing leaks
			const storedHash = result.length > 0 ? result[0].keyHash : '0'.repeat(64);

			// Verify hash using constant-time comparison
			if (!this.constantTimeCompare(keyHash, storedHash)) {
				return false;
			}

			if (result.length === 0) {
				return false;
			}

			const apiKey = result[0];

			if (!apiKey.isActive) {
				return false;
			}

			if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
				return false;
			}

			if (apiKey.permissions !== 'full' && apiKey.permissions !== 'chat') {
				return false;
			}

			// Update last used
			db.update(apiKeys)
				.set({ lastUsedAt: new Date() })
				.where(eq(apiKeys.id, apiKey.id))
				.catch((err) => logger.error('Failed to update API key last used:', err));

			return true;
		} catch (error) {
			logger.error('Error validating API key:', error);
			return false;
		}
	}

	/**
	 * Load admin config from database
	 */
	private async loadAdminConfig(): Promise<void> {
		try {
			const [nicknameResult, colorResult] = await Promise.all([
				db
					.select({ value: siteConfig.value })
					.from(siteConfig)
					.where(eq(siteConfig.key, 'admin_chat_nickname'))
					.limit(1),
				db
					.select({ value: siteConfig.value })
					.from(siteConfig)
					.where(eq(siteConfig.key, 'admin_chat_color'))
					.limit(1)
			]);

			if (nicknameResult.length > 0) {
				this.adminConfig.nickname = nicknameResult[0].value;
			}
			if (colorResult.length > 0) {
				this.adminConfig.color = colorResult[0].value;
			}

			logger.info('Loaded admin config:', this.adminConfig);
		} catch (error) {
			logger.error('Error loading admin config:', error);
		}
	}

	/**
	 * Save admin config to database
	 */
	private async saveAdminConfig(key: 'nickname' | 'color', value: string): Promise<boolean> {
		try {
			const dbKey = key === 'nickname' ? 'admin_chat_nickname' : 'admin_chat_color';

			const existing = await db.select().from(siteConfig).where(eq(siteConfig.key, dbKey)).limit(1);

			if (existing.length > 0) {
				await db
					.update(siteConfig)
					.set({ value, updatedAt: new Date() })
					.where(eq(siteConfig.key, dbKey));
			} else {
				await db.insert(siteConfig).values({
					key: dbKey,
					value,
					description:
						key === 'nickname'
							? 'Nickname used by admins in the site chat'
							: 'Color used for admin nickname in the site chat',
					dataType: 'string',
					isActive: true
				});
			}

			return true;
		} catch (error) {
			logger.error(`Error saving admin ${key}:`, error);
			return false;
		}
	}

	/**
	 * Check global connection rate limit per IP
	 */
	private checkConnectionRateLimit(clientIp: string): boolean {
		const now = Date.now();
		const limit = this.connectionRateLimits.get(clientIp);

		if (!limit) {
			this.connectionRateLimits.set(clientIp, {
				count: 0,
				resetTime: now + this.CONNECTION_RATE_LIMIT_WINDOW_MS
			});
			return true;
		}

		if (now >= limit.resetTime) {
			limit.count = 0;
			limit.resetTime = now + this.CONNECTION_RATE_LIMIT_WINDOW_MS;
		}

		if (limit.count >= this.MAX_CONNECTIONS_PER_IP) {
			return false;
		}

		limit.count++;
		return true;
	}

	/**
	 * Get client IP from WebSocket request
	 */
	private getClientIp(req: IncomingMessage): string {
		const cf = req.headers['cf-connecting-ip'];
		if (cf && typeof cf === 'string') return cf.trim();

		const forwarded = req.headers['x-forwarded-for'];
		if (forwarded && typeof forwarded === 'string') {
			return forwarded.split(',')[0].trim();
		}
		return req.socket.remoteAddress || 'unknown';
	}

	/**
	 * Handle new WebSocket connection
	 */
	private async handleConnection(
		ws: WebSocket,
		req: IncomingMessage,
		isAdmin: boolean,
		apiKeyPrefix?: string
	): Promise<void> {
		const clientIp = this.getClientIp(req);
		if (!this.checkConnectionRateLimit(clientIp)) {
			logger.info(`Rate limit exceeded for IP ${clientIp}`);
			this.sendToClient(ws, {
				type: 'error',
				message: `Too many connections from your IP. Maximum ${this.MAX_CONNECTIONS_PER_IP} connections per minute.`
			});
			ws.close(1008, 'Connection rate limit exceeded');
			return;
		}

		this.clients.add(ws);
		this.nicknames.set(ws, this.DEFAULT_NICKNAME);
		this.messageRateLimits.set(ws, { count: 0, resetTime: Date.now() + this.RATE_LIMIT_WINDOW_MS });

		if (isAdmin) {
			this.adminClients.add(ws);
			if (apiKeyPrefix) {
				this.apiKeyConnections.set(ws, apiKeyPrefix);
				logger.info(
					`Client connected as admin via API key (prefix: ${apiKeyPrefix}). Total admin clients: ${this.adminClients.size}`
				);
			} else {
				logger.info(
					`Client connected as admin via session. Total admin clients: ${this.adminClients.size}`
				);
			}
		} else {
			logger.info(`Client connected as regular user (not admin)`);
		}

		logger.info(`New chat client connected. Total clients: ${this.clients.size}`);

		// Send admin config only to admin clients
		if (isAdmin) {
			this.sendToClient(ws, {
				type: 'adminConfig',
				data: this.adminConfig
			});
		}

		// Then send message history
		try {
			await this.sendRecentMessages(ws);
		} catch (error) {
			logger.error('Error loading recent messages:', error);
		}

		this.sendToClient(ws, {
			type: 'system',
			message: 'Connected to chat - please be respectful'
		});

		this.sendToClient(ws, {
			type: 'userCount',
			count: this.clients.size
		});

		this.broadcastUserCount();

		// Handle incoming messages
		ws.on('message', (data: Buffer) => {
			try {
				const message = data.toString('utf-8').trim();
				if (!message) return;

				// Check rate limit for all messages (commands and regular messages)
				// /check_auth is exempt
				if (!message.startsWith('/check_auth') && !this.checkRateLimit(ws)) {
					this.sendToClient(ws, {
						type: 'error',
						message: `Rate limit exceeded. Maximum ${this.RATE_LIMIT_MESSAGES} messages per ${this.RATE_LIMIT_WINDOW_MS / 1000} seconds.`
					});
					return;
				}

				// Handle commands
				if (message.startsWith('/')) {
					this.handleCommand(ws, message);
					return;
				}

				// Handle regular message
				this.handleMessage(ws, message);
			} catch (error) {
				logger.error('Error handling chat message:', error);
			}
		});

		ws.on('close', () => this.handleDisconnection(ws, req));
		ws.on('error', (error) => {
			logger.error('WebSocket error:', error);
			this.handleDisconnection(ws, req);
		});
	}

	/**
	 * Discord ↔ site chat integration enabled (admin toggle / site_config).
	 * Defaults to true when key is unset.
	 */
	private async isDiscordChatIntegrationEnabled(): Promise<boolean> {
		const { ConfigService } = await import('./config');
		const v = await ConfigService.get(DISCORD_CHAT_INTEGRATION_CONFIG_KEY);
		if (v === null || v === undefined) return true;
		return Boolean(v);
	}

	/**
	 * Handle chat commands
	 */
	private async handleCommand(ws: WebSocket, message: string): Promise<void> {
		// /check_auth - Diagnostic command to check authentication status
		if (message === '/check_auth') {
			const isAdmin = this.adminClients.has(ws);
			const isInClients = this.clients.has(ws);
			const apiKeyPrefix = this.apiKeyConnections.get(ws);
			const nickname = this.nicknames.get(ws);

			logger.info(`Auth check requested:`);
			logger.info(`   - In clients set: ${isInClients}`);
			logger.info(`   - In adminClients set: ${isAdmin}`);
			logger.info(`   - API key prefix: ${apiKeyPrefix || 'none'}`);
			logger.info(`   - Nickname: ${nickname || 'none'}`);
			logger.info(`   - Total clients: ${this.clients.size}`);
			logger.info(`   - Total admin clients: ${this.adminClients.size}`);

			this.sendToClient(ws, {
				type: 'system',
				message: `Auth status: ${isAdmin ? 'ADMIN' : 'NOT ADMIN'}, API key: ${apiKeyPrefix || 'none'}, In clients: ${isInClients}`
			});
			return;
		}

		// Log command attempts for debugging
		if (
			message.startsWith('/set_discord_message_id') ||
			message.startsWith('/delete_discord_message')
		) {
			const isAdmin = this.adminClients.has(ws);
			logger.info(
				`Command received: ${message.substring(0, 30)}... | Admin: ${isAdmin} | Total admin clients: ${this.adminClients.size}`
			);
		}
		// /nick <nickname> - Change nickname (shows message)
		if (message.startsWith('/nick ')) {
			const nickname = message.substring(6).trim();
			this.handleNickCommand(ws, nickname, false);
			return;
		}

		// /nick_restore <nickname> - Restore nickname silently
		if (message.startsWith('/nick_restore ')) {
			const nickname = message.substring(14).trim();
			this.handleNickCommand(ws, nickname, true);
			return;
		}

		// /delete <messageId> - Delete a message (admin only)
		if (message.startsWith('/delete ')) {
			const isAdmin = this.adminClients.has(ws);
			const isInClients = this.clients.has(ws);

			if (!isAdmin) {
				logger.info(`Unauthorized /delete command:`);
				logger.info(`   - Client in clients set: ${isInClients}`);
				logger.info(`   - Client in adminClients set: ${isAdmin}`);
				logger.info(`   - Total clients: ${this.clients.size}`);
				logger.info(`   - Total admin clients: ${this.adminClients.size}`);
				logger.info(`   - Command: ${message.substring(0, 50)}...`);
				this.sendToClient(ws, { type: 'error', message: 'Unauthorized' });
				return;
			}
			const messageId = message.substring(8).trim();
			await this.handleDeleteMessage(messageId);
			return;
		}

		// /set_admin_nickname <nickname> - Set admin nickname (admin only)
		if (message.startsWith('/set_admin_nickname ')) {
			if (!this.adminClients.has(ws)) {
				this.sendToClient(ws, { type: 'error', message: 'Unauthorized' });
				return;
			}
			const nickname = message.substring(20).trim();
			await this.handleSetAdminNickname(ws, nickname);
			return;
		}

		// /set_admin_color <color> - Set admin color (admin only)
		if (message.startsWith('/set_admin_color ')) {
			if (!this.adminClients.has(ws)) {
				this.sendToClient(ws, { type: 'error', message: 'Unauthorized' });
				return;
			}
			const color = message.substring(17).trim();
			await this.handleSetAdminColor(ws, color);
			return;
		}

		// /get_admin_config - Get current admin config
		if (message === '/get_admin_config') {
			this.sendToClient(ws, {
				type: 'adminConfig',
				data: this.adminConfig
			});
			return;
		}

		// /check_auth - Check authentication status (for debugging)
		if (message === '/check_auth') {
			const isAdmin = this.adminClients.has(ws);
			const isInClients = this.clients.has(ws);
			this.sendToClient(ws, {
				type: 'system',
				message: `Auth Status: In clients: ${isInClients}, Is admin: ${isAdmin}, Total admins: ${this.adminClients.size}`
			});
			return;
		}

		// /discord <json> - Post a message from Discord (bot only, requires admin auth)
		if (message.startsWith('/discord ')) {
			if (!this.adminClients.has(ws)) {
				this.sendToClient(ws, { type: 'error', message: 'Unauthorized' });
				return;
			}
			if (!(await this.isDiscordChatIntegrationEnabled())) {
				this.sendToClient(ws, {
					type: 'error',
					message:
						'Discord chat integration is disabled in admin settings. Enable it on Admin → Chat to relay messages.'
				});
				return;
			}
			const jsonStr = message.substring(9).trim();
			await this.handleDiscordMessage(ws, jsonStr);
			return;
		}

		// /set_discord_message_id <messageId> <discordMessageId> - Store Discord message ID for a message (bot only)
		if (message.startsWith('/set_discord_message_id ')) {
			const isAdmin = this.adminClients.has(ws);
			const isInClients = this.clients.has(ws);
			const apiKeyPrefix = this.apiKeyConnections.get(ws);

			if (!isAdmin) {
				logger.info(`Unauthorized /set_discord_message_id:`);
				logger.info(`   - Client in clients set: ${isInClients}`);
				logger.info(`   - Client in adminClients set: ${isAdmin}`);
				logger.info(`   - API key prefix: ${apiKeyPrefix || 'none'}`);
				logger.info(`   - Total clients: ${this.clients.size}`);
				logger.info(`   - Total admin clients: ${this.adminClients.size}`);
				logger.info(`   - Command: ${message.substring(0, 50)}...`);

				// Check if connection was previously authenticated with API key
				if (apiKeyPrefix) {
					logger.info(
						`Connection has API key prefix but is not in adminClients - possible connection state issue`
					);
				}

				this.sendToClient(ws, {
					type: 'error',
					message:
						'Unauthorized: Connection not authenticated as admin. Please reconnect with API key.'
				});
				return;
			}
			if (!(await this.isDiscordChatIntegrationEnabled())) {
				this.sendToClient(ws, {
					type: 'error',
					message:
						'Discord chat integration is disabled in admin settings. Enable it on Admin → Chat to sync message IDs.'
				});
				return;
			}
			const parts = message.substring(24).trim().split(' ');
			if (parts.length >= 2) {
				const messageId = parts[0];
				const discordMessageId = parts.slice(1).join(' ');
				logger.info(`Setting Discord message ID: ${messageId} → ${discordMessageId}`);
				await this.handleSetDiscordMessageId(messageId, discordMessageId);
				this.sendToClient(ws, {
					type: 'system',
					message: `Discord message ID stored: ${discordMessageId}`
				});
			} else {
				this.sendToClient(ws, {
					type: 'error',
					message: 'Invalid format. Use: /set_discord_message_id <messageId> <discordMessageId>'
				});
			}
			return;
		}
	}

	/**
	 * Handle message from Discord bot
	 */
	private async handleDiscordMessage(ws: WebSocket, jsonStr: string): Promise<void> {
		try {
			if (jsonStr.length > 5000) {
				this.sendToClient(ws, { type: 'error', message: 'JSON payload too large' });
				return;
			}

			const data = JSON.parse(jsonStr);
			const { nickname, message, color, discordMessageId } = data;

			if (!nickname || !message) {
				this.sendToClient(ws, { type: 'error', message: 'Missing nickname or message' });
				return;
			}

			// Sanitize nickname
			const sanitizedNickname = this.sanitizeNickname(String(nickname));
			if (sanitizedNickname.length === 0 || sanitizedNickname.length > 50) {
				this.sendToClient(ws, { type: 'error', message: 'Invalid nickname' });
				return;
			}

			// Validate and sanitize message
			const messageStr = String(message);
			if (messageStr.length > this.MAX_MESSAGE_LENGTH) {
				this.sendToClient(ws, {
					type: 'error',
					message: `Message too long. Maximum ${this.MAX_MESSAGE_LENGTH} characters.`
				});
				return;
			}
			const sanitizedMessage = this.sanitizeMessage(messageStr);
			if (!sanitizedMessage || sanitizedMessage.length === 0) {
				this.sendToClient(ws, { type: 'error', message: 'Message cannot be empty' });
				return;
			}

			// Validate Discord message ID
			if (
				discordMessageId &&
				(typeof discordMessageId !== 'string' ||
					discordMessageId.length > 100 ||
					!/^\d+$/.test(discordMessageId))
			) {
				this.sendToClient(ws, { type: 'error', message: 'Invalid Discord message ID format' });
				return;
			}

			const now = new Date();
			const formatted = `[${now.toISOString()}] <${sanitizedNickname}> ${sanitizedMessage}`;

			// Validate color
			let validColor: string | undefined = undefined;
			if (color) {
				const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
				if (hexColorRegex.test(String(color))) {
					validColor = String(color);
				}
			}

			let messageId: string | undefined;
			try {
				messageId = await this.saveMessageToDatabase(
					sanitizedNickname,
					sanitizedMessage,
					now,
					validColor,
					'discord',
					discordMessageId
				);
			} catch (error) {
				logger.error('Error saving Discord message to database:', error);
			}

			const chatMessage: ChatMessage = {
				id: messageId,
				timestamp: now.toISOString(),
				nickname: sanitizedNickname,
				message: sanitizedMessage,
				formatted,
				color: validColor,
				source: 'discord'
			};

			this.broadcast(chatMessage);
		} catch (error) {
			logger.error('Error parsing Discord message:', error);
			this.sendToClient(ws, { type: 'error', message: 'Invalid JSON format' });
		}
	}

	/**
	 * Handle setting Discord message ID for a message
	 * Called by Discord bot when it sends a web message to Discord
	 */
	private async handleSetDiscordMessageId(
		messageId: string,
		discordMessageId: string
	): Promise<void> {
		try {
			// Validate UUID format for message ID
			if (!this.isValidUUID(messageId)) {
				logger.error(`Invalid message ID format: ${messageId}`);
				return;
			}

			// Validate Discord message ID (max 100 chars)
			if (!discordMessageId || discordMessageId.length > 100 || !/^\d+$/.test(discordMessageId)) {
				logger.error(`Invalid Discord message ID format: ${discordMessageId}`);
				return;
			}

			await db.update(messages).set({ discordMessageId }).where(eq(messages.id, messageId));

			logger.info(`Stored Discord message ID ${discordMessageId} for message ${messageId}`);
		} catch (error) {
			logger.error('Error storing Discord message ID:', error);
		}
	}

	/**
	 * Handle /nick command
	 */
	/**
	 * Sanitize nickname
	 */
	private sanitizeNickname(nickname: string): string {
		return nickname
			.replace(/[<>]/g, '') // Remove angle brackets
			.replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
			.replace(/\s+/g, ' ') // Normalize whitespace
			.trim()
			.substring(0, 25); // Enforce max length
	}

	private handleNickCommand(ws: WebSocket, nickname: string, silent: boolean = false): void {
		if (!nickname || nickname.length === 0) {
			this.sendToClient(ws, { type: 'error', message: 'Nickname cannot be empty' });
			return;
		}

		const sanitizedNickname = this.sanitizeNickname(nickname);
		if (sanitizedNickname.length === 0) {
			this.sendToClient(ws, { type: 'error', message: 'Invalid nickname' });
			return;
		}

		const oldNickname = this.nicknames.get(ws) || this.DEFAULT_NICKNAME;
		this.nicknames.set(ws, sanitizedNickname);

		if (!silent && oldNickname !== sanitizedNickname) {
			if (oldNickname === this.DEFAULT_NICKNAME) {
				this.sendToClient(ws, {
					type: 'system',
					message: `Nickname set to "${sanitizedNickname}"`
				});
			} else {
				this.sendToClient(ws, {
					type: 'system',
					message: `Nickname changed from "${oldNickname}" to "${sanitizedNickname}"`
				});
			}
		}

		logger.info(`${oldNickname} -> ${sanitizedNickname}`);
	}

	/**
	 * Handle setting admin nickname
	 */
	private async handleSetAdminNickname(ws: WebSocket, nickname: string): Promise<void> {
		if (!nickname || nickname.length < 1 || nickname.length > 20) {
			this.sendToClient(ws, { type: 'error', message: 'Nickname must be 1-20 characters' });
			return;
		}

		const saved = await this.saveAdminConfig('nickname', nickname);
		if (saved) {
			this.adminConfig.nickname = nickname;
			this.broadcastAdminConfig();
		} else {
			this.sendToClient(ws, { type: 'error', message: 'Failed to save nickname' });
		}
	}

	/**
	 * Handle setting admin color
	 */
	private async handleSetAdminColor(ws: WebSocket, color: string): Promise<void> {
		const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
		if (!hexColorRegex.test(color)) {
			this.sendToClient(ws, {
				type: 'error',
				message: 'Color must be a valid hex color (e.g., #f5b700)'
			});
			return;
		}

		const saved = await this.saveAdminConfig('color', color);
		if (saved) {
			this.adminConfig.color = color;
			logger.info(`Admin color changed to: ${color}`);

			this.broadcastAdminConfig();
		} else {
			this.sendToClient(ws, { type: 'error', message: 'Failed to save color' });
		}
	}

	/**
	 * Check rate limit for a connection
	 */
	private checkRateLimit(ws: WebSocket): boolean {
		const now = Date.now();
		const limit = this.messageRateLimits.get(ws);

		if (!limit) {
			this.messageRateLimits.set(ws, { count: 0, resetTime: now + this.RATE_LIMIT_WINDOW_MS });
			return true;
		}

		if (now >= limit.resetTime) {
			limit.count = 0;
			limit.resetTime = now + this.RATE_LIMIT_WINDOW_MS;
		}

		if (limit.count >= this.RATE_LIMIT_MESSAGES) {
			return false;
		}

		limit.count++;
		return true;
	}

	/**
	 * Sanitize message content
	 */
	private sanitizeMessage(message: string): string {
		// Remove null bytes and control characters
		return message
			.replace(/\0/g, '')
			.replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
			.trim();
	}

	/**
	 * Validate UUID format
	 */
	private isValidUUID(str: string): boolean {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		return uuidRegex.test(str);
	}

	/**
	 * Handle regular chat message
	 */
	private async handleMessage(ws: WebSocket, message: string): Promise<void> {
		if (message.length > this.MAX_MESSAGE_LENGTH) {
			this.sendToClient(ws, {
				type: 'error',
				message: `Message too long. Maximum ${this.MAX_MESSAGE_LENGTH} characters.`
			});
			return;
		}

		const sanitizedMessage = this.sanitizeMessage(message);
		if (!sanitizedMessage || sanitizedMessage.length === 0) {
			this.sendToClient(ws, {
				type: 'error',
				message: 'Message cannot be empty.'
			});
			return;
		}

		const isAdmin = this.adminClients.has(ws);
		const nickname = isAdmin
			? this.adminConfig.nickname
			: this.nicknames.get(ws) || this.DEFAULT_NICKNAME;
		const now = new Date();
		const formatted = `[${now.toISOString()}] <${nickname}> ${sanitizedMessage}`;

		const messageColor = isAdmin ? this.adminConfig.color : undefined;
		const source: MessageSource = isAdmin ? 'admin' : 'web';

		let messageId: string | undefined;
		try {
			messageId = await this.saveMessageToDatabase(
				nickname,
				sanitizedMessage,
				now,
				messageColor,
				source
			);
		} catch (error) {
			logger.error('Error saving message to database:', error);
		}

		const chatMessage: ChatMessage = {
			id: messageId,
			timestamp: now.toISOString(),
			nickname,
			message: sanitizedMessage,
			formatted,
			color: messageColor,
			source
		};

		this.broadcast(chatMessage);
	}

	/**
	 * Handle message deletion
	 */
	private async handleDeleteMessage(messageId: string): Promise<void> {
		try {
			// Validate UUID format
			if (!this.isValidUUID(messageId)) {
				logger.error(`Invalid message ID format: ${messageId}`);
				return;
			}

			// Fetch message to check if it has a Discord message ID
			const messageResult = await db
				.select({ discordMessageId: messages.discordMessageId })
				.from(messages)
				.where(eq(messages.id, messageId))
				.limit(1);

			const discordMessageId = messageResult[0]?.discordMessageId;

			// Delete from database
			await db.delete(messages).where(eq(messages.id, messageId));
			logger.info(`Message deleted: ${messageId}`);

			// If message has Discord message ID, notify Discord bot to delete it
			if (discordMessageId && (await this.isDiscordChatIntegrationEnabled())) {
				this.notifyDiscordBotDelete(discordMessageId);
			}

			this.broadcastDelete(messageId);
		} catch (error) {
			logger.error('Error deleting message:', error);
		}
	}

	/**
	 * Notify Discord bot to delete a message in Discord
	 */
	private notifyDiscordBotDelete(discordMessageId: string): void {
		// Send command to all admin clients (Discord bot should be an admin client)
		const command = `/delete_discord_message ${discordMessageId}`;
		this.adminClients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				try {
					client.send(command);
					logger.info(`Sent Discord delete command to bot: ${discordMessageId}`);
				} catch (error) {
					logger.error('Error sending Discord delete command:', error);
				}
			}
		});
	}

	/**
	 * Broadcast message deletion
	 */
	private broadcastDelete(messageId: string): void {
		const message = JSON.stringify({ type: 'delete', messageId });
		this.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				try {
					client.send(message);
				} catch (error) {
					logger.error('Error broadcasting delete:', error);
				}
			}
		});
	}

	/**
	 * Broadcast chat message
	 */
	private broadcast(chatMessage: ChatMessage): void {
		const message = JSON.stringify({ type: 'message', data: chatMessage });
		this.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				try {
					client.send(message);
				} catch (error) {
					logger.error('Error broadcasting message:', error);
				}
			}
		});
	}

	/**
	 * Broadcast admin config to all clients
	 */
	private broadcastAdminConfig(): void {
		const message = JSON.stringify({
			type: 'adminConfig',
			data: this.adminConfig
		});

		logger.info(`Broadcasting admin config:`, this.adminConfig);

		this.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				try {
					client.send(message);
				} catch (error) {
					logger.error('Error broadcasting admin config:', error);
				}
			}
		});
	}

	/**
	 * Broadcast emoji update to all clients
	 */
	broadcastEmojiUpdate(): void {
		const message = JSON.stringify({
			type: 'emojiUpdate'
		});

		logger.info('Broadcasting emoji update to all clients');

		this.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				try {
					client.send(message);
				} catch (error) {
					logger.error('Error broadcasting emoji update:', error);
				}
			}
		});
	}

	/** Notify all chat clients to refresh notification sounds */
	broadcastNotificationSoundsUpdate(): void {
		const message = JSON.stringify({ type: 'notificationSoundsUpdate' });

		this.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				try {
					client.send(message);
				} catch (error) {
					logger.error('Error broadcasting notification sounds update:', error);
				}
			}
		});
	}

	/** Notify clients to refetch site config */
	broadcastSiteConfigUpdate(): void {
		const message = JSON.stringify({ type: 'siteConfigUpdate' });

		this.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				try {
					client.send(message);
				} catch (error) {
					logger.error('Error broadcasting site config update:', error);
				}
			}
		});
	}

	/**
	 * Send message to specific client
	 */
	private sendToClient(ws: WebSocket, data: any): void {
		if (ws.readyState === WebSocket.OPEN) {
			try {
				ws.send(JSON.stringify(data));
			} catch (error) {
				logger.error('Error sending to client:', error);
			}
		}
	}

	/**
	 * Handle client disconnection
	 */
	private handleDisconnection(ws: WebSocket, _req?: IncomingMessage): void {
		const wasAdmin = this.adminClients.has(ws);
		const apiKeyPrefix = this.apiKeyConnections.get(ws);

		this.clients.delete(ws);
		this.nicknames.delete(ws);
		this.adminClients.delete(ws);
		this.apiKeyConnections.delete(ws);
		this.messageRateLimits.delete(ws);

		if (wasAdmin) {
			logger.info(
				`Admin client disconnected${apiKeyPrefix ? ` (API key prefix: ${apiKeyPrefix})` : ''}. Total admin clients: ${this.adminClients.size}`
			);
		}
		logger.info(`Chat client disconnected. Total clients: ${this.clients.size}`);
		this.broadcastUserCount();
	}

	/**
	 * Close all WebSocket connections authenticated with a specific API key prefix
	 * Called when an API key is deleted, deactivated, or regenerated
	 */
	closeConnectionsForApiKey(apiKeyPrefix: string): number {
		let closedCount = 0;
		const connectionsToClose: WebSocket[] = [];

		// Find all connections using this API key prefix
		this.apiKeyConnections.forEach((prefix, ws) => {
			if (prefix === apiKeyPrefix) {
				connectionsToClose.push(ws);
			}
		});

		// Close the connections
		connectionsToClose.forEach((ws) => {
			if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
				try {
					this.sendToClient(ws, {
						type: 'error',
						message: 'API key revoked. Connection closed.'
					});
					ws.close(1008, 'API key revoked');
					closedCount++;
				} catch (error) {
					logger.error('Error closing WebSocket connection:', error);
				}
			}
			// Clean up tracking
			this.apiKeyConnections.delete(ws);
		});

		if (closedCount > 0) {
			logger.info(
				`Closed ${closedCount} WebSocket connection(s) for API key prefix: ${apiKeyPrefix}`
			);
		}

		return closedCount;
	}

	/**
	 * Broadcast user count
	 */
	private broadcastUserCount(): void {
		const message = JSON.stringify({ type: 'userCount', count: this.clients.size });
		this.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				try {
					client.send(message);
				} catch (error) {
					logger.error('Error broadcasting user count:', error);
				}
			}
		});
	}

	/**
	 * Get client count
	 */
	getClientCount(): number {
		return this.clients.size;
	}

	/**
	 * Save message to database
	 */
	private async saveMessageToDatabase(
		nickname: string,
		content: string,
		timestamp: Date,
		color?: string,
		source: MessageSource = 'web',
		discordMessageId?: string
	): Promise<string | undefined> {
		try {
			const newMessage: NewMessage = {
				username: nickname,
				content: content,
				timestamp: timestamp,
				messageType: 'chat',
				messageColor: color || null,
				messageSource: source,
				discordMessageId: discordMessageId || null
			};
			const result = await db.insert(messages).values(newMessage).returning({ id: messages.id });
			return result[0]?.id;
		} catch (error) {
			logger.error('Error saving message:', error);
			return undefined;
		}
	}

	/**
	 * Load the latest fixed-size chat history from database
	 */
	private async loadRecentMessages(): Promise<ChatMessage[]> {
		try {
			const recentMessages = await db
				.select()
				.from(messages)
				.orderBy(desc(messages.timestamp))
				.limit(this.MESSAGE_HISTORY_LIMIT);

			return recentMessages.reverse().map((msg) => {
				const timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();
				return {
					id: msg.id,
					timestamp: timestamp.toISOString(),
					nickname: msg.username,
					message: msg.content,
					formatted: `[${timestamp.toISOString()}] <${msg.username}> ${msg.content}`,
					color: msg.messageColor || undefined,
					source: (msg.messageSource as MessageSource) || 'web'
				};
			});
		} catch (error) {
			logger.error('Error loading recent messages:', error);
			return [];
		}
	}

	/**
	 * Send recent messages to client
	 */
	private async sendRecentMessages(ws: WebSocket): Promise<void> {
		const recentMessages = await this.loadRecentMessages();
		if (recentMessages.length > 0 && ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({ type: 'history', data: recentMessages }));
		}
	}

	/**
	 * Get current admin config (for external access)
	 */
	getAdminConfig(): AdminConfig {
		return { ...this.adminConfig };
	}

	/**
	 * Close WebSocket server
	 */
	close(): void {
		if (this.wss) {
			this.wss.close();
			this.clients.clear();
			this.nicknames.clear();
			this.adminClients.clear();
			logger.info('Chat WebSocket server closed');
		}
	}
}

export const chatService = new ChatService();
