import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import pool from '../db.js';
import { jwtDecode } from 'jwt-decode';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function sanitizeServerMessage(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    const needsSanitization = /[<>`]/.test(text);
    if (!needsSanitization) {
        return text.substring(0, 500).trim();
    }
    return text
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/`{3}[\s\S]*?`{3}/g, "[code block removed]")
        .replace(/`[\s\S]*?`/g, "[inline code removed]")
        .substring(0, 500)
        .trim();
}

let wssInstance = null;
function isAdminFromJWT(jwtToken) {
    if (!jwtToken) return false;
    try {
        const decoded = jwtDecode(jwtToken);
        return decoded && decoded.is_admin === true;
    } catch (e) {
        console.error('[WSS Auth] JWT verification error:', e.message);
        return false;
    }
}

function broadcast(wss, data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function broadcastClientCount(wss) {
    const count = wss.clients.size;
    console.log(`[WSS broadcastClientCount] Current client count: ${count}`);
    broadcast(wss, { type: 'client_count_update', count });
}

async function sendMessageHistory(ws) {
    try {
        const { rows: dbMessages } = await pool.query(
            'SELECT id, username, content, timestamp, message_type, message_color, client_uuid FROM website.messages ORDER BY timestamp DESC LIMIT 50'
        );
        
        const historyMessagesForClient = dbMessages.map(msg => ({
            id: msg.id,
            username: msg.username,
            content: msg.content,
            timestamp: msg.timestamp,
            message_type: msg.message_type,
            message_color: msg.message_color,
            client_uuid: msg.client_uuid,
            isHistorical: true
        }));
        
        ws.send(JSON.stringify({ type: 'history', data: historyMessagesForClient }));
    } catch (err) {
        console.error('Error fetching message history:', err);
    }
}

async function getChatAggregateStats() {
    try {
        const totalMessagesResult = await pool.query('SELECT COUNT(*) AS total_messages FROM website.messages');
        const uniquePostersResult = await pool.query(
            "SELECT COUNT(DISTINCT client_uuid) AS unique_posters FROM website.messages WHERE client_uuid IS NOT NULL AND client_uuid != '00000000-0000-0000-0000-000000000000'"
        );

        const stats = {
            totalMessages: parseInt(totalMessagesResult.rows[0]?.total_messages, 10) || 0,
            uniquePosters: parseInt(uniquePostersResult.rows[0]?.unique_posters, 10) || 0,
        };
        // console.log('[WSS getChatAggregateStats] Fetched stats:', stats);
        return stats;
    } catch (err) {
        console.error('[WSS getChatAggregateStats] Error fetching chat aggregate stats:', err);
        return {
            totalMessages: 0,
            uniquePosters: 0,
        };
    }
}

async function broadcastAggregateStats(wss) {
    console.log('[WSS broadcastAggregateStats] Attempting to broadcast aggregate stats...'); // Log entry
    try {
        const updatedAggStats = await getChatAggregateStats();
        broadcast(wss, { type: 'chat_aggregate_stats', data: updatedAggStats });
        console.log('[WSS broadcastAggregateStats] Successfully broadcasted aggregate stats.'); // Log success
    } catch (error) {
        console.error('[WSS broadcastAggregateStats] CRITICAL ERROR broadcasting aggregate stats:', error);
    }
}

function setupWebSocket(server) {
    const wss = new WebSocketServer({ server, path: '/api/chat' });
    wssInstance = wss;
    console.log('[WSS] WebSocket server setup on /api/chat');

    wss.on('connection', async (ws) => {
        console.log('[WSS Connection] Client connected.');

        // SETUP MESSAGE HANDLER IMMEDIATELY
        ws.on('message', async (message) => {
            console.log(`[WSS ws.on('message') RAW ENTRY] Message received. Type: ${typeof message}, Content: ${message.toString()}`);
            let data;
            try {
                console.log(`[WSS Message Received raw] From client: ${message.toString()}`);
                data = JSON.parse(message.toString());
                console.log(`[WSS Message Parsed] From client - Type: ${data.type}, Full Data:`, JSON.stringify(data, null, 2)); // Enhanced log

                let messageToProcess = data;

                if (data.type === 'message' && data.data && data.data.message_type === 'Discord') {
                    
                    let hexColor = '#ffffff';
                    if (typeof data.data.message_color !== 'undefined' && data.data.message_color !== null) {
                        const discordColorDecimal = Number(data.data.message_color);
                        if (!isNaN(discordColorDecimal) && discordColorDecimal !== 0) {
                            hexColor = '#' + discordColorDecimal.toString(16).padStart(6, '0');
                        } else if (discordColorDecimal === 0) {
                            hexColor = '#8e9297';
                        }
                    }
                    
                    messageToProcess = {
                        content: data.data.content,
                        username: data.data.username,
                        userUUID: data.data.userUUID,      // This is the Discord User ID
                        message_type: data.data.message_type, // Should be 'Discord'
                        message_color: hexColor,          // Hex string
                        isFromDiscordBot: true // Add a flag for clarity if needed later
                    };
                    console.log('[WSS Message Handler] Transformed Discord message for processing:', JSON.stringify(messageToProcess, null, 2));
                }

                // --- Start of message processing logic using messageToProcess ---

                if (messageToProcess.type === 'get_discord_integration_status') {
                    console.log('[WSS Message Handler] Matched type: get_discord_integration_status');
                    if (isAdminFromJWT(messageToProcess.jwt)) {
                        console.log('[WSS Message Handler get_discord_integration_status] Admin check PASSED.');
                        try {
                            const result = await pool.query(
                                "SELECT setting_value FROM discord.settings WHERE setting_key = 'webchat_enabled'"
                            );
                            let isEnabled = false;
                            if (result.rows.length > 0) {
                                isEnabled = result.rows[0].setting_value;
                            }
                            console.log(`[WSS get_discord_integration_status] Sending status to client. DB isEnabled: ${isEnabled}`);
                            ws.send(JSON.stringify({ type: 'discord_integration_status', enabled: isEnabled }));
                        } catch (dbError) {
                            console.error('[WSS DB Error] Failed to get Discord integration status:', dbError);
                            ws.send(JSON.stringify({ type: 'error', message: 'Failed to retrieve Discord integration status.' }));
                        }
                    } else {
                        console.log('[WSS Message Handler get_discord_integration_status] Admin check FAILED.');
                        ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized to get Discord status.' }));
                    }
                    return;
                }

                // Moderation: Delete message
                if (messageToProcess.type === 'delete_message' && isAdminFromJWT(messageToProcess.jwt)) {
                    console.log('[WSS Message Handler] Matched type: delete_message');
                    await pool.query('DELETE FROM website.messages WHERE id = $1', [messageToProcess.messageId]);
                    broadcast(wss, { type: 'message_deleted', messageId: messageToProcess.messageId });
                    await broadcastAggregateStats(wss);
                    return;
                }

                // Moderation: Change/remove username
                if (messageToProcess.type === 'change_username' && isAdminFromJWT(messageToProcess.jwt)) {
                    console.log('[WSS Message Handler] Matched type: change_username');
                    await pool.query('UPDATE website.messages SET username = $1 WHERE client_uuid = $2', [messageToProcess.newUsername || 'Anonymous', messageToProcess.userUUID]);
                    broadcast(wss, { type: 'username_changed', userUUID: messageToProcess.userUUID, newUsername: messageToProcess.newUsername || 'Anonymous' });
                    return;
                }

                // Moderation: Send admin message
                if (messageToProcess.type === 'admin_message' && isAdminFromJWT(messageToProcess.jwt)) {
                    console.log('[WSS Message Handler] Matched type: admin_message');
                    const sanitizedContent = sanitizeServerMessage(messageToProcess.content);
                    const ADMIN_UUID = '00000000-0000-0000-0000-000000000000';
                    const result = await pool.query(
                        `INSERT INTO website.messages (username, content, message_type, message_color, client_uuid)
                         VALUES ($1, $2, $3, $4, $5)
                         RETURNING id, username, content, timestamp, message_type, message_color, client_uuid`,
                        ['Admin', sanitizedContent, 'admin', '#ff0000', ADMIN_UUID]
                    );
                    broadcast(wss, {
                        type: 'message',
                        data: {
                            id: result.rows[0].id,
                            username: result.rows[0].username,
                            content: result.rows[0].content,
                            timestamp: result.rows[0].timestamp,
                            message_type: result.rows[0].message_type,
                            message_color: result.rows[0].message_color,
                            userUUID: result.rows[0].client_uuid,
                        }
                    });
                    await broadcastAggregateStats(wss);
                    return;
                }

                if (
                    (typeof messageToProcess.type === 'undefined' || messageToProcess.isFromDiscordBot) &&
                    messageToProcess.content && 
                    messageToProcess.username && 
                    messageToProcess.userUUID
                ) {
                    console.log(`[WSS Message Handler] Processing as normal/Discord message. User: ${messageToProcess.username}, Type: ${messageToProcess.message_type}`);
                    
                    const sanitizedContent = sanitizeServerMessage(messageToProcess.content);
                    const sanitizedUsername = sanitizeServerMessage(messageToProcess.username);

                    const query = `
                        INSERT INTO website.messages (username, content, message_type, message_color, client_uuid)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING id, username, content, timestamp, message_type, message_color, client_uuid
                    `;
                    const result = await pool.query(query, [
                        sanitizedUsername,
                        sanitizedContent,
                        messageToProcess.message_type || 'chat', // 'Discord' for bot messages
                        messageToProcess.message_color,          // Hex string from transformation or default
                        messageToProcess.userUUID                // Discord User ID for bot messages, or web client UUID
                    ]);
                    console.log('[WSS Message Handler] Message saved to DB. ID:', result.rows[0].id);

                    const newMsgData = {
                        id: result.rows[0].id,
                        username: result.rows[0].username,
                        content: result.rows[0].content,
                        timestamp: result.rows[0].timestamp,
                        message_type: result.rows[0].message_type,
                        message_color: result.rows[0].message_color,
                        userUUID: result.rows[0].client_uuid,
                    };
                    broadcast(wss, { type: 'message', data: newMsgData });
                    console.log('[WSS Message Handler] Broadcasted message:', JSON.stringify(newMsgData, null, 2));
                    
                    await broadcastAggregateStats(wss);
                    return; 
                }

                console.log('[WSS Message Handler] Message did not match any known handlers. Data:', JSON.stringify(messageToProcess, null, 2));

            } catch (error) {
                console.error('[WSS Message Error] Failed to process message. Raw message was:', message ? message.toString() : 'N/A', 'Parsed data (if available):', data, 'Error:', error);
            }
        });

        ws.on('close', () => {
            console.log('[WSS Connection] Client disconnected.');
            broadcastClientCount(wss);
        });

        ws.on('error', (error) => {
            console.error('[WSS Connection] WebSocket error on client:', error);
        });

        sendMessageHistory(ws);
        broadcastClientCount(wss);
        await broadcastAggregateStats(wss);

    });
}

export function broadcastDiscordStatusUpdate(enabled) {
    if (wssInstance) {
        console.log(`[WSS Chat Service] Broadcasting discord_integration_status: ${enabled} to all clients.`);
        broadcast(wssInstance, { type: 'discord_integration_status', enabled });
    } else {
        console.warn('[WSS Chat Service] wssInstance not available for broadcastDiscordStatusUpdate.');
    }
}

export default setupWebSocket;