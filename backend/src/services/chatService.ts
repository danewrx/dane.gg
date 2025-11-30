import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db } from '../db';
import { messages, type NewMessage } from '../db/schema';
import { desc, gte, eq, and } from 'drizzle-orm';

interface ChatMessage {
  id?: string;
  timestamp: string;
  nickname: string;
  message: string;
  formatted: string;
}

export class ChatService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private nicknames: Map<WebSocket, string> = new Map();
  private readonly DEFAULT_NICKNAME = 'Anonymous';
  private readonly MESSAGE_HISTORY_DAYS = 30;

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    try {
      this.wss = new WebSocketServer({ 
        server,
        path: '/ws/chat'
      });

      this.wss.on('connection', (ws: WebSocket, req) => {
        console.log('📨 New WebSocket connection attempt from:', req.socket.remoteAddress);
        this.handleConnection(ws);
      });

      this.wss.on('error', (error) => {
        console.error('❌ WebSocket server error:', error);
      });

      console.log('✅ Chat WebSocket server initialized on /ws/chat');
      console.log('   Server listening:', server.listening);
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket server:', error);
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket): Promise<void> {
    // Add client to set
    this.clients.add(ws);
    
    // Set default nickname
    this.nicknames.set(ws, this.DEFAULT_NICKNAME);

    console.log(`📨 New chat client connected. Total clients: ${this.clients.size}`);

    this.sendRecentMessages(ws)
      .then(() => {
        // Send welcome system message after history is loaded
        this.sendToClient(ws, {
          type: 'system',
          message: 'Connected to chat - please be respectful'
        });

        this.sendToClient(ws, {
          type: 'userCount',
          count: this.clients.size
        });
      })
      .catch((error) => {
        console.error('Error loading recent messages for new connection:', error);
        this.sendToClient(ws, {
          type: 'system',
          message: 'Connected to chat - please be respectful'
        });
        
        this.sendToClient(ws, {
          type: 'userCount',
          count: this.clients.size
        });
      });

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = data.toString('utf-8').trim();
        
        if (!message) {
          return;
        }

        // Handle /nick command
        if (message.startsWith('/nick ')) {
          const nickname = message.substring(6).trim();
          this.handleNickCommand(ws, nickname, false);
          return;
        }

        if (message.startsWith('/nick_restore ')) {
          const nickname = message.substring(14).trim();
          this.handleNickCommand(ws, nickname, true);
          return;
        }

        // Handle /delete command (admin only)
        if (message.startsWith('/delete ')) {
          const messageId = message.substring(8).trim();
          this.handleDeleteMessage(messageId);
          return;
        }

        // Handle regular message
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('Error handling chat message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnection(ws);
    });
  }

  /**
   * Handle /nick command
   * @param silent - don't send system message
   */
  private handleNickCommand(ws: WebSocket, nickname: string, silent: boolean = false): void {
    if (!nickname || nickname.length === 0) {
      this.sendToClient(ws, {
        type: 'error',
        message: 'Nickname cannot be empty'
      });
      return;
    }

    // Sanitize nickname (remove special characters that might break formatting)
    const sanitizedNickname = nickname.replace(/[<>]/g, '').trim();
    
    if (sanitizedNickname.length === 0) {
      this.sendToClient(ws, {
        type: 'error',
        message: 'Invalid nickname'
      });
      return;
    }

    const oldNickname = this.nicknames.get(ws) || this.DEFAULT_NICKNAME;
    this.nicknames.set(ws, sanitizedNickname);

    if (!silent && oldNickname !== sanitizedNickname) {
      // Notify user of nickname change
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

    console.log(`👤 ${oldNickname} changed nickname to ${sanitizedNickname}`);
  }

  /**
   * Handle regular chat message
   */
  private async handleMessage(ws: WebSocket, message: string): Promise<void> {
    const nickname = this.nicknames.get(ws) || this.DEFAULT_NICKNAME;
    const now = new Date();
    
    // Format message will be done on client side using user's local timezone
    // For now, provide a placeholder that client will reformat
    const formatted = `[${now.toISOString()}] <${nickname}> ${message}`;

    // Save to database and get ID
    let messageId: string | undefined;
    try {
      messageId = await this.saveMessageToDatabase(nickname, message, now);
    } catch (error) {
      console.error('Error saving message to database:', error);
    }

    const chatMessage: ChatMessage = {
      id: messageId,
      timestamp: now.toISOString(),
      nickname,
      message,
      formatted
    };

    // Broadcast to all clients
    this.broadcast(chatMessage);
  }

  /**
   * Handle message deletion
   */
  private async handleDeleteMessage(messageId: string): Promise<void> {
    try {
      // Delete from database
      await db.delete(messages).where(eq(messages.id, messageId));
      
      console.log(`🗑️ Message deleted: ${messageId}`);

      // Broadcast deletion to all clients
      this.broadcastDelete(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }

  /**
   * Broadcast message deletion to all clients
   */
  private broadcastDelete(messageId: string): void {
    const message = JSON.stringify({
      type: 'delete',
      messageId
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Error broadcasting delete to client:', error);
        }
      }
    });
  }

  /**
   * Format message in IRC style
   * Note: This is a helper function. Actual formatting should be done on the client
   */
  private formatMessage(date: Date, nickname: string, message: string): string {
    // This will be reformatted on the client side using the user's timezone
    return `[${date.toISOString()}] <${nickname}> ${message}`;
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(chatMessage: ChatMessage): void {
    const message = JSON.stringify({
      type: 'message',
      data: chatMessage
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Error broadcasting message to client:', error);
        }
      }
    });
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(ws: WebSocket, data: { type: string; message?: string; count?: number }): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: WebSocket): void {
    this.clients.delete(ws);
    this.nicknames.delete(ws);
    console.log(`📨 Chat client disconnected. Total clients: ${this.clients.size}`);
    
    this.broadcastUserCount();
  }
  
  /**
   * Broadcast current user count to all connected clients
   */
  private broadcastUserCount(): void {
    const count = this.clients.size;
    const message = JSON.stringify({
      type: 'userCount',
      count: count
    });
    
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
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Save message to database and return ID
   */
  private async saveMessageToDatabase(nickname: string, content: string, timestamp: Date): Promise<string | undefined> {
    try {
      const newMessage: NewMessage = {
        username: nickname,
        content: content,
        timestamp: timestamp,
        messageType: 'chat'
      };

      const result = await db.insert(messages).values(newMessage).returning({ id: messages.id });
      return result[0]?.id;
    } catch (error) {
      console.error('Error saving message to database:', error);
      // Don't throw - allow message to still be broadcast even if DB save fails
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

      return recentMessages
        .reverse()
        .map((msg) => {
          const timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();
          // Placeholder formatted string - client will reformat with local timezone
          const formatted = `[${timestamp.toISOString()}] <${msg.username}> ${msg.content}`;
          
          return {
            id: msg.id,
            timestamp: timestamp.toISOString(),
            nickname: msg.username,
            message: msg.content,
            formatted
          };
        });
    } catch (error) {
      console.error('Error loading recent messages from database:', error);
      return [];
    }
  }

  /**
   * Send recent messages to a newly connected client
   */
  private async sendRecentMessages(ws: WebSocket): Promise<void> {
    try {
      const recentMessages = await this.loadRecentMessages();
      
      if (recentMessages.length > 0) {
        // Send all recent messages to the client
        const message = JSON.stringify({
          type: 'history',
          data: recentMessages
        });

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    } catch (error) {
      console.error('Error sending recent messages to client:', error);
    }
  }

  /**
   * Broadcast admin config update to all clients
   */
  broadcastAdminConfig(config: { nickname?: string; color?: string }): void {
    const message = JSON.stringify({
      type: 'adminConfig',
      data: config
    });

    console.log(`📢 Broadcasting admin config update:`, config);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Error broadcasting admin config to client:', error);
        }
      }
    });
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
      this.nicknames.clear();
      console.log('Chat WebSocket server closed');
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();

