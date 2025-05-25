import pool from '../db.js';
import { broadcastDiscordStatusUpdate } from '../services/chat.js';

export default class DiscordController {
    async setIntegrationStatus(req, res) {
        if (!req.user || !req.user.is_admin) {
             return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const newStatus = !!req.body.enabled; // Ensure it's a boolean

        try {
            await pool.query(
                "UPDATE discord.settings SET setting_value = $1 WHERE setting_key = 'webchat_enabled'",
                [newStatus]
            );

            broadcastDiscordStatusUpdate(newStatus);

            console.log(`[API Discord Integration] Status for 'webchat_enabled' set to ${newStatus} by admin ID: ${req.user.id}.`);
            res.status(200).json({ message: 'Discord integration status updated successfully.' });
        } catch (dbError) {
            console.error('[API DB Error] Failed to set Discord integration status:', dbError);
            res.status(500).json({ message: 'Failed to update Discord integration status in database.' });
        }
    }
}