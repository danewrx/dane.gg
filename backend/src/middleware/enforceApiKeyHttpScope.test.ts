import { describe, expect, mock, test } from 'bun:test';
import type { NextFunction, Request, Response } from 'express';
import { enforceApiKeyHttpScope } from './auth';

type ApiKeyUser = NonNullable<Request['user']> & {
	isApiKey: true;
	apiKeyPermissions: string;
};

function apiKeyUser(permissions: string): ApiKeyUser {
	return {
		id: 'key-id',
		username: 'api:test',
		isAdmin: false,
		isApiKey: true,
		apiKeyPermissions: permissions
	};
}

function mockRes() {
	let statusCode = 0;
	let body: unknown;
	const res = {
		headersSent: false,
		status(code: number) {
			statusCode = code;
			return res;
		},
		json(payload: unknown) {
			body = payload;
			return res;
		},
		getStatus() {
			return statusCode;
		},
		getBody() {
			return body;
		}
	};
	return res as unknown as Response & { getStatus: () => number; getBody: () => unknown };
}

function req(
	overrides: Partial<Pick<Request, 'method' | 'originalUrl' | 'url' | 'baseUrl' | 'path'>> & {
		user?: Request['user'];
	}
): Request {
	return {
		method: 'GET',
		originalUrl: '/api/foo',
		...overrides
	} as Request;
}

describe('enforceApiKeyHttpScope', () => {
	test('skips scope checks for non–API-key users', () => {
		const next = mock(() => {});
		const res = mockRes();
		enforceApiKeyHttpScope(
			req({ user: { id: 'u', username: 'x', isAdmin: false } }),
			res,
			next as NextFunction
		);
		expect(next).toHaveBeenCalled();
		expect(res.getStatus()).toBe(0);
	});

	test('allows full-scope API keys for any method/path', () => {
		const next = mock(() => {});
		const res = mockRes();
		enforceApiKeyHttpScope(
			req({ user: apiKeyUser('full'), method: 'DELETE', originalUrl: '/api/admin/wipe' }),
			res,
			next as NextFunction
		);
		expect(next).toHaveBeenCalled();
		expect(res.getStatus()).toBe(0);
	});

	test('read scope: allows GET outside webhooks', () => {
		const next = mock(() => {});
		const res = mockRes();
		enforceApiKeyHttpScope(
			req({ user: apiKeyUser('read'), method: 'GET', originalUrl: '/api/projects' }),
			res,
			next as NextFunction
		);
		expect(next).toHaveBeenCalled();
	});

	test('read scope: blocks mutating methods', () => {
		const next = mock(() => {});
		const res = mockRes();
		enforceApiKeyHttpScope(
			req({ user: apiKeyUser('read'), method: 'POST', originalUrl: '/api/x' }),
			res,
			next as NextFunction
		);
		expect(next).not.toHaveBeenCalled();
		expect(res.getStatus()).toBe(403);
		expect(String((res.getBody() as { message?: string })?.message)).toMatch(/GET/i);
	});

	test('read scope: blocks /webhooks', () => {
		const next = mock(() => {});
		const res = mockRes();
		enforceApiKeyHttpScope(
			req({ user: apiKeyUser('read'), method: 'GET', originalUrl: '/webhooks/hook' }),
			res,
			next as NextFunction
		);
		expect(res.getStatus()).toBe(403);
	});

	test('chat scope: allows GET on /api/chat and related prefixes', () => {
		for (const path of [
			'/api/chat',
			'/api/chat/rooms',
			'/api/emojis',
			'/api/chat-notification-sounds'
		]) {
			const next = mock(() => {});
			const res = mockRes();
			enforceApiKeyHttpScope(
				req({ user: apiKeyUser('chat'), method: 'GET', originalUrl: path }),
				res,
				next as NextFunction
			);
			expect(next).toHaveBeenCalled();
			expect(res.getStatus()).toBe(0);
		}
	});

	test('chat scope: blocks other API paths', () => {
		const next = mock(() => {});
		const res = mockRes();
		enforceApiKeyHttpScope(
			req({ user: apiKeyUser('chat'), method: 'GET', originalUrl: '/api/blog' }),
			res,
			next as NextFunction
		);
		expect(res.getStatus()).toBe(403);
	});

	test('webhooks scope: allows POST under /webhooks', () => {
		const next = mock(() => {});
		const res = mockRes();
		enforceApiKeyHttpScope(
			req({ user: apiKeyUser('webhooks'), method: 'POST', originalUrl: '/webhooks/stripe' }),
			res,
			next as NextFunction
		);
		expect(next).toHaveBeenCalled();
	});

	test('webhooks scope: blocks GET on /webhooks', () => {
		const next = mock(() => {});
		const res = mockRes();
		enforceApiKeyHttpScope(
			req({ user: apiKeyUser('webhooks'), method: 'GET', originalUrl: '/webhooks/stripe' }),
			res,
			next as NextFunction
		);
		expect(res.getStatus()).toBe(403);
	});

	test('webhooks scope: blocks POST outside /webhooks', () => {
		const next = mock(() => {});
		const res = mockRes();
		enforceApiKeyHttpScope(
			req({ user: apiKeyUser('webhooks'), method: 'POST', originalUrl: '/api/x' }),
			res,
			next as NextFunction
		);
		expect(res.getStatus()).toBe(403);
	});

	test('rejects unknown permission string', () => {
		const next = mock(() => {});
		const res = mockRes();
		enforceApiKeyHttpScope(
			req({ user: apiKeyUser('superuser'), method: 'GET', originalUrl: '/' }),
			res,
			next as NextFunction
		);
		expect(res.getStatus()).toBe(403);
		expect(String((res.getBody() as { message?: string })?.message)).toMatch(/Unknown/i);
	});
});
