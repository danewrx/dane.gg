import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { ChatService } from './chatService';
import { ContentModerationService } from './contentModeration';
import { db } from '../db';
import { messages } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

interface ChatClient extends WebSocket {
	visitorId?: string;
	isAlive?: boolean;
}

interface ChatMessage {
	type: 'message' | 'error' | 'history' | 'delete';
	data?: any;
	message?: string;
	messageId?: string;
	displayName?: string;
	user?: {
		displayName: string;
		visitorId: string;
	};
	timestamp?: string;
}

export class ChatWebSocketServer {
	private wss: WebSocketServer | null = null;
	private clients: Set<ChatClient> = new Set();

	initialize(server: any) {
		this.wss = new WebSocketServer({ 
			server,
			path: '/ws/chat'
		});

		this.wss.on('connection', (ws: ChatClient, req: IncomingMessage) => {
			this.handleConnection(ws, req);
		});

		// Heartbeat
		const heartbeatInterval = setInterval(() => {
			this.clients.forEach((client) => {
				if (client.isAlive === false) {
					client.terminate();
					this.clients.delete(client);
					return;
				}
				client.isAlive = false;
				client.ping();
			});
		}, 30000);

		this.wss.on('close', () => {
			clearInterval(heartbeatInterval);
		});

		console.log('💬 Chat WebSocket server initialized');
	}

	private async handleConnection(ws: ChatClient, req: IncomingMessage) {
		ws.isAlive = true;

		ws.on('pong', () => {
			ws.isAlive = true;
		});

		// Extract visitor ID
		const cookies = req.headers.cookie || '';
		const visitorIdMatch = cookies.match(/visitor_id=([^;]+)/);
		const visitorId = visitorIdMatch ? visitorIdMatch[1] : null;

		if (!visitorId) {
			ws.send(JSON.stringify({
				type: 'error',
				message: 'No visitor ID found. Please refresh the page.'
			}));
			ws.close();
			return;
		}

		ws.visitorId = visitorId;
		this.clients.add(ws);

		// Send recent messages
		const recentMessages = await ChatService.getRecentMessages(50);
		ws.send(JSON.stringify({
			type: 'history',
			data: recentMessages.map(msg => ({
				id: msg.id,
				message: msg.content,
				user: {
					displayName: msg.username,
					visitorId: msg.visitorId ? msg.visitorId.substring(0, 8) : 'unknown'
				},
				timestamp: msg.timestamp
			}))
		}));

		ws.on('message', async (data: Buffer) => {
			try {
				const message: ChatMessage = JSON.parse(data.toString());

				if (message.type === 'message' && message.message) {
					await this.handleMessage(ws, message.message, visitorId, message.displayName);
				}
			} catch (error) {
				console.error('Error handling chat message:', error);
				ws.send(JSON.stringify({
					type: 'error',
					message: 'Invalid message format'
				}));
			}
		});

		ws.on('close', () => {
			this.clients.delete(ws);
		});

		ws.on('error', (error) => {
			console.error('WebSocket error:', error);
			this.clients.delete(ws);
		});
	}

	private async handleMessage(ws: ChatClient, messageText: string, visitorId: string, clientDisplayName?: string) {
		const trimmedMessage = messageText.trim();
		if (!trimmedMessage || trimmedMessage.length === 0) {
			return;
		}

		if (trimmedMessage.length > 500) {
			ws.send(JSON.stringify({
				type: 'error',
				message: 'Message too long (max 500 characters)'
			}));
			return;
		}

		// Rate limiting: Check if user sent a message in the last 2 seconds
		const recentMessage = await db.query.messages.findFirst({
			where: eq(messages.visitorId, visitorId),
			orderBy: desc(messages.timestamp)
		});

		if (recentMessage && recentMessage.timestamp) {
			const timeSinceLastMessage = Date.now() - new Date(recentMessage.timestamp).getTime();
			if (timeSinceLastMessage < 2000) {
				ws.send(JSON.stringify({
					type: 'error',
					message: 'Please wait before sending another message'
				}));
				return;
			}
		}

		const moderationResult = await ContentModerationService.moderateMessage(trimmedMessage);
		
		if (!moderationResult.isApproved) {
			ws.send(JSON.stringify({
				type: 'error',
				message: moderationResult.reason || 'Message was blocked by content moderation'
			}));
			
			return;
		}

		// Use client-provided display name, or default to "Anonymous"
		const displayName = clientDisplayName && clientDisplayName.trim() 
			? clientDisplayName.trim().substring(0, 50)
			: 'Anonymous';
		
		const savedMessage = await ChatService.saveMessage(visitorId, displayName, trimmedMessage);

		// Broadcast
		const broadcastMessage: ChatMessage = {
			type: 'message',
			message: savedMessage.content,
			user: {
				displayName: savedMessage.username,
				visitorId: savedMessage.visitorId ? savedMessage.visitorId.substring(0, 8) : 'unknown'
			},
			timestamp: savedMessage.timestamp?.toISOString() || new Date().toISOString()
		};

		this.broadcast(broadcastMessage);
	}

	private broadcast(message: ChatMessage) {
		const data = JSON.stringify(message);
		this.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(data);
			}
		});
	}

	// Broadcast system messages
	broadcastSystemMessage(message: string) {
		this.broadcast({
			type: 'message',
			message,
			user: {
				displayName: 'System',
				visitorId: 'system'
			},
			timestamp: new Date().toISOString()
		});
	}

	// Broadcast message deletion
	broadcastMessageDeletion(messageId: string) {
		this.broadcast({
			type: 'delete',
			messageId,
			timestamp: new Date().toISOString()
		});
	}

	getClientCount(): number {
		return this.clients.size;
	}
}

export const chatWebSocketServer = new ChatWebSocketServer();

