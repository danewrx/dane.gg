import { logger } from '../utils/logger';
/**
 * Shared admin session tracker
 * Tracks which session IDs belong to authenticated admin users
 */

interface AdminSessionInfo {
	username: string;
	userId: string;
	authenticatedAt: Date;
}

class AdminSessionsStore {
	private sessions: Map<string, AdminSessionInfo> = new Map();

	/**
	 * Register an admin session
	 */
	register(sessionId: string, userId: string, username: string): void {
		this.sessions.set(sessionId, {
			username,
			userId,
			authenticatedAt: new Date()
		});
		logger.info(`Admin session registered: ${username}`);
	}

	/**
	 * Remove an admin session (logout)
	 */
	remove(sessionId: string): void {
		const session = this.sessions.get(sessionId);
		if (session) {
			logger.info(`Admin session removed: ${session.username}`);
			this.sessions.delete(sessionId);
		}
	}

	/**
	 * Check if a session ID is a valid admin session
	 */
	isAdmin(sessionId: string): boolean {
		return this.sessions.has(sessionId);
	}

	/**
	 * Get admin session info
	 */
	get(sessionId: string): AdminSessionInfo | undefined {
		return this.sessions.get(sessionId);
	}

	/**
	 * Clean up expired sessions (older than 24 hours)
	 */
	cleanup(): void {
		const now = new Date();
		const maxAge = 24 * 60 * 60 * 1000; // 24 hours

		for (const [sessionId, info] of this.sessions.entries()) {
			if (now.getTime() - info.authenticatedAt.getTime() > maxAge) {
				this.sessions.delete(sessionId);
				logger.info(`Cleaned up expired admin session: ${info.username}`);
			}
		}
	}
}

export const adminSessions = new AdminSessionsStore();

// Run cleanup every hour
setInterval(
	() => {
		adminSessions.cleanup();
	},
	60 * 60 * 1000
);
