import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import { db } from '../db';
import { messages, siteConfig, apiKeys, type NewMessage } from '../db/schema';
import { desc, gte, eq } from 'drizzle-orm';
import cookie from 'cookie';
import signature from 'cookie-signature';
import crypto from 'crypto';
import { adminSessions } from './adminSessions';

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

export class ChatService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private nicknames: Map<WebSocket, string> = new Map();
  private adminClients: Set<WebSocket> = new Set();
  private apiKeyConnections: Map<WebSocket, string> = new Map(); // Track API key prefix per connection
  private readonly DEFAULT_NICKNAME = 'Anonymous';
  private readonly MESSAGE_HISTORY_DAYS = 30;
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
      // Get session secret from environment
      this.sessionSecret = process.env.SESSION_SECRET || 'your-super-secret-session-key-change-this-in-production';
      
      await this.loadAdminConfig();
      
      this.wss = new WebSocketServer({ 
        server,
        path: '/ws/chat'
      });

      this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
        const { isAdmin, apiKeyPrefix } = await this.validateAdminSession(req);
        this.handleConnection(ws, isAdmin, apiKeyPrefix);
      });

      this.wss.on('error', (error) => {
        console.error('❌ WebSocket server error:', error);
      });

      console.log('✅ Chat WebSocket server initialized on /ws/chat');
      console.log('   Admin config:', this.adminConfig);
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket server:', error);
    }
  }

  /**
   * Validate if the WebSocket request comes from an authenticated admin or has a valid API key
   * Returns both admin status and API key prefix if authenticated via API key
   */
  private async validateAdminSession(req: IncomingMessage): Promise<{ isAdmin: boolean; apiKeyPrefix?: string }> {
    try {
      const authHeader = req.headers.authorization;
      const xApiKey = req.headers['x-api-key'];
      
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const queryApiKey = url.searchParams.get('api_key');
      
      let apiKey: string | undefined;
      if (authHeader?.startsWith('Bearer dk_')) {
        apiKey = authHeader.substring(7);
      } else if (typeof xApiKey === 'string' && xApiKey.startsWith('dk_')) {
        apiKey = xApiKey;
      } else if (queryApiKey && queryApiKey.startsWith('dk_')) {
        apiKey = queryApiKey;
      }

      if (apiKey) {
        const isValid = await this.validateApiKey(apiKey);
        if (isValid) {
          const prefix = apiKey.substring(0, 11); // dk_ + 8 chars
          console.log(`✅ API key validated for WebSocket connection (prefix: ${prefix})`);
          return { isAdmin: true, apiKeyPrefix: prefix };
        } else {
          console.log('❌ API key validation failed for WebSocket connection');
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
        console.log('✅ Admin session validated for user:', info?.username);
        return { isAdmin: true };
      }

      return { isAdmin: false };
    } catch (error) {
      console.error('Error validating admin session:', error);
      return { isAdmin: false };
    }
  }

  /**
   * Validate an API key for WebSocket authentication
   */
  private async validateApiKey(key: string): Promise<boolean> {
    try {
      const prefix = key.substring(0, 11); // dk_ + 8 chars
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');

      const result = await db
        .select({
          id: apiKeys.id,
          keyHash: apiKeys.keyHash,
          isActive: apiKeys.isActive,
          expiresAt: apiKeys.expiresAt,
          permissions: apiKeys.permissions
        })
        .from(apiKeys)
        .where(eq(apiKeys.keyPrefix, prefix))
        .limit(1);

      if (result.length === 0) {
        return false;
      }

      const apiKey = result[0];

      // Verify hash
      if (apiKey.keyHash !== keyHash) {
        return false;
      }

      if (!apiKey.isActive) {
        return false;
      }

      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        return false;
      }

      // Update last used
      db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, apiKey.id))
        .catch(err => console.error('Failed to update API key last used:', err));

      return true;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }

  /**
   * Load admin config from database
   */
  private async loadAdminConfig(): Promise<void> {
    try {
      const [nicknameResult, colorResult] = await Promise.all([
        db.select({ value: siteConfig.value })
          .from(siteConfig)
          .where(eq(siteConfig.key, 'admin_chat_nickname'))
          .limit(1),
        db.select({ value: siteConfig.value })
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

      console.log('📋 Loaded admin config:', this.adminConfig);
    } catch (error) {
      console.error('Error loading admin config:', error);
    }
  }

  /**
   * Save admin config to database
   */
  private async saveAdminConfig(key: 'nickname' | 'color', value: string): Promise<boolean> {
    try {
      const dbKey = key === 'nickname' ? 'admin_chat_nickname' : 'admin_chat_color';
      
      const existing = await db.select()
        .from(siteConfig)
        .where(eq(siteConfig.key, dbKey))
        .limit(1);

      if (existing.length > 0) {
        await db.update(siteConfig)
          .set({ value, updatedAt: new Date() })
          .where(eq(siteConfig.key, dbKey));
      } else {
        await db.insert(siteConfig).values({
          key: dbKey,
          value,
          description: key === 'nickname' 
            ? 'Nickname used by admins in the site chat'
            : 'Color used for admin nickname in the site chat',
          dataType: 'string',
          isActive: true
        });
      }

      return true;
    } catch (error) {
      console.error(`Error saving admin ${key}:`, error);
      return false;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, isAdmin: boolean, apiKeyPrefix?: string): Promise<void> {
    this.clients.add(ws);
    this.nicknames.set(ws, this.DEFAULT_NICKNAME);
    
    if (isAdmin) {
      this.adminClients.add(ws);
      if (apiKeyPrefix) {
        this.apiKeyConnections.set(ws, apiKeyPrefix);
        console.log(`🔑 Client connected as admin via API key (prefix: ${apiKeyPrefix}). Total admin clients: ${this.adminClients.size}`);
      } else {
        console.log(`🔑 Client connected as admin via session. Total admin clients: ${this.adminClients.size}`);
      }
    } else {
      console.log(`📨 Client connected as regular user (not admin)`);
    }

    console.log(`📨 New chat client connected. Total clients: ${this.clients.size}`);

    // Send admin config first
    this.sendToClient(ws, {
      type: 'adminConfig',
      data: this.adminConfig
    });

    // Then send message history
    try {
      await this.sendRecentMessages(ws);
    } catch (error) {
      console.error('Error loading recent messages:', error);
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

        // Handle commands
        if (message.startsWith('/')) {
          this.handleCommand(ws, message);
          return;
        }

        // Handle regular message
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('Error handling chat message:', error);
      }
    });

    ws.on('close', () => this.handleDisconnection(ws));
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnection(ws);
    });
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
      
      console.log(`🔍 Auth check requested:`);
      console.log(`   - In clients set: ${isInClients}`);
      console.log(`   - In adminClients set: ${isAdmin}`);
      console.log(`   - API key prefix: ${apiKeyPrefix || 'none'}`);
      console.log(`   - Nickname: ${nickname || 'none'}`);
      console.log(`   - Total clients: ${this.clients.size}`);
      console.log(`   - Total admin clients: ${this.adminClients.size}`);
      
      this.sendToClient(ws, {
        type: 'system',
        message: `Auth status: ${isAdmin ? 'ADMIN' : 'NOT ADMIN'}, API key: ${apiKeyPrefix || 'none'}, In clients: ${isInClients}`
      });
      return;
    }
    
    // Log command attempts for debugging
    if (message.startsWith('/set_discord_message_id') || message.startsWith('/delete_discord_message')) {
      const isAdmin = this.adminClients.has(ws);
      console.log(`🔍 Command received: ${message.substring(0, 30)}... | Admin: ${isAdmin} | Total admin clients: ${this.adminClients.size}`);
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
      if (!this.adminClients.has(ws)) {
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
        console.log(`❌ Unauthorized /set_discord_message_id:`);
        console.log(`   - Client in clients set: ${isInClients}`);
        console.log(`   - Client in adminClients set: ${isAdmin}`);
        console.log(`   - API key prefix: ${apiKeyPrefix || 'none'}`);
        console.log(`   - Total clients: ${this.clients.size}`);
        console.log(`   - Total admin clients: ${this.adminClients.size}`);
        console.log(`   - Command: ${message.substring(0, 50)}...`);
        
        // Check if connection was previously authenticated with API key
        if (apiKeyPrefix) {
          console.log(`   ⚠️ Connection has API key prefix but is not in adminClients - possible connection state issue`);
        }
        
        this.sendToClient(ws, { 
          type: 'error', 
          message: 'Unauthorized: Connection not authenticated as admin. Please reconnect with API key.' 
        });
        return;
      }
      const parts = message.substring(24).trim().split(' ');
      if (parts.length >= 2) {
        const messageId = parts[0];
        const discordMessageId = parts.slice(1).join(' ');
        console.log(`📝 Setting Discord message ID: ${messageId} → ${discordMessageId}`);
        await this.handleSetDiscordMessageId(messageId, discordMessageId);
        this.sendToClient(ws, { 
          type: 'system', 
          message: `Discord message ID stored: ${discordMessageId}` 
        });
      } else {
        this.sendToClient(ws, { type: 'error', message: 'Invalid format. Use: /set_discord_message_id <messageId> <discordMessageId>' });
      }
      return;
    }
  }

  /**
   * Handle message from Discord bot
   */
  private async handleDiscordMessage(ws: WebSocket, jsonStr: string): Promise<void> {
    try {
      const data = JSON.parse(jsonStr);
      const { nickname, message, color, discordMessageId } = data;

      if (!nickname || !message) {
        this.sendToClient(ws, { type: 'error', message: 'Missing nickname or message' });
        return;
      }

      if (nickname.length > 50) {
        this.sendToClient(ws, { type: 'error', message: 'Nickname too long' });
        return;
      }

      if (message.length > 1000) {
        this.sendToClient(ws, { type: 'error', message: 'Message too long' });
        return;
      }

      const now = new Date();
      const formatted = `[${now.toISOString()}] <${nickname}> ${message}`;

      let messageId: string | undefined;
      try {
        messageId = await this.saveMessageToDatabase(nickname, message, now, color, 'discord', discordMessageId);
      } catch (error) {
        console.error('Error saving Discord message to database:', error);
      }

      const chatMessage: ChatMessage = {
        id: messageId,
        timestamp: now.toISOString(),
        nickname,
        message,
        formatted,
        color: color || undefined,
        source: 'discord'
      };

      this.broadcast(chatMessage);
    } catch (error) {
      console.error('Error parsing Discord message:', error);
      this.sendToClient(ws, { type: 'error', message: 'Invalid JSON format' });
    }
  }

  /**
   * Handle setting Discord message ID for a message
   * Called by Discord bot when it sends a web message to Discord
   */
  private async handleSetDiscordMessageId(messageId: string, discordMessageId: string): Promise<void> {
    try {
      await db
        .update(messages)
        .set({ discordMessageId })
        .where(eq(messages.id, messageId));
      
      console.log(`✅ Stored Discord message ID ${discordMessageId} for message ${messageId}`);
    } catch (error) {
      console.error('Error storing Discord message ID:', error);
    }
  }

  /**
   * Handle /nick command
   */
  private handleNickCommand(ws: WebSocket, nickname: string, silent: boolean = false): void {
    if (!nickname || nickname.length === 0) {
      this.sendToClient(ws, { type: 'error', message: 'Nickname cannot be empty' });
      return;
    }

    const sanitizedNickname = nickname.replace(/[<>]/g, '').trim();
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

    console.log(`👤 ${oldNickname} -> ${sanitizedNickname}`);
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
      this.sendToClient(ws, { type: 'error', message: 'Color must be a valid hex color (e.g., #f5b700)' });
      return;
    }

    const saved = await this.saveAdminConfig('color', color);
    if (saved) {
      this.adminConfig.color = color;
      console.log(`📢 Admin color changed to: ${color}`);
      
      this.broadcastAdminConfig();
    } else {
      this.sendToClient(ws, { type: 'error', message: 'Failed to save color' });
    }
  }

  /**
   * Handle regular chat message
   */
  private async handleMessage(ws: WebSocket, message: string): Promise<void> {
    const nickname = this.nicknames.get(ws) || this.DEFAULT_NICKNAME;
    const isAdmin = this.adminClients.has(ws);
    const now = new Date();
    const formatted = `[${now.toISOString()}] <${nickname}> ${message}`;
    
    const messageColor = isAdmin ? this.adminConfig.color : undefined;
    const source: MessageSource = isAdmin ? 'admin' : 'web';

    let messageId: string | undefined;
    try {
      messageId = await this.saveMessageToDatabase(nickname, message, now, messageColor, source);
    } catch (error) {
      console.error('Error saving message to database:', error);
    }

    const chatMessage: ChatMessage = {
      id: messageId,
      timestamp: now.toISOString(),
      nickname,
      message,
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
      // Fetch message to check if it has a Discord message ID
      const messageResult = await db
        .select({ discordMessageId: messages.discordMessageId })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      const discordMessageId = messageResult[0]?.discordMessageId;

      // Delete from database
      await db.delete(messages).where(eq(messages.id, messageId));
      console.log(`🗑️ Message deleted: ${messageId}`);

      // If message has Discord message ID, notify Discord bot to delete it
      if (discordMessageId) {
        this.notifyDiscordBotDelete(discordMessageId);
      }

      this.broadcastDelete(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
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
          console.log(`📤 Sent Discord delete command to bot: ${discordMessageId}`);
        } catch (error) {
          console.error('Error sending Discord delete command:', error);
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
          console.error('Error broadcasting delete:', error);
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
          console.error('Error broadcasting message:', error);
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

    console.log(`📢 Broadcasting admin config:`, this.adminConfig);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Error broadcasting admin config:', error);
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
        console.error('Error sending to client:', error);
      }
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: WebSocket): void {
    const wasAdmin = this.adminClients.has(ws);
    const apiKeyPrefix = this.apiKeyConnections.get(ws);
    
    this.clients.delete(ws);
    this.nicknames.delete(ws);
    this.adminClients.delete(ws);
    this.apiKeyConnections.delete(ws);
    
    if (wasAdmin) {
      console.log(`🔓 Admin client disconnected${apiKeyPrefix ? ` (API key prefix: ${apiKeyPrefix})` : ''}. Total admin clients: ${this.adminClients.size}`);
    }
    console.log(`📨 Chat client disconnected. Total clients: ${this.clients.size}`);
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
          console.error('Error closing WebSocket connection:', error);
        }
      }
      // Clean up tracking
      this.apiKeyConnections.delete(ws);
    });

    if (closedCount > 0) {
      console.log(`🔒 Closed ${closedCount} WebSocket connection(s) for API key prefix: ${apiKeyPrefix}`);
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
          console.error('Error broadcasting user count:', error);
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
      console.error('Error saving message:', error);
      return undefined;
    }
  }

  /**
   * Load recent messages from database
   */
  private async loadRecentMessages(): Promise<ChatMessage[]> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setDate(cutoffTime.getDate() - this.MESSAGE_HISTORY_DAYS);

      const recentMessages = await db
        .select()
        .from(messages)
        .where(gte(messages.timestamp, cutoffTime))
        .orderBy(desc(messages.timestamp));

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
      console.error('Error loading recent messages:', error);
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
      console.log('Chat WebSocket server closed');
    }
  }
}

export const chatService = new ChatService();
