import { randomBytes } from 'node:crypto';
import { describe, expect, test, beforeAll } from 'bun:test';
import jwtPkg from 'jsonwebtoken';

type JwtMod = typeof import('./jwt');

let jwt: JwtMod;

beforeAll(async () => {
	process.env.JWT_SECRET = randomBytes(48).toString('base64url');
	process.env.JWT_EXPIRES_IN = '2h';
	process.env.JWT_REFRESH_EXPIRES_IN = '2h';
	jwt = await import('./jwt');
});

describe('JWT helpers', () => {
	test('access token roundtrip', () => {
		const token = jwt.generateAccessToken({
			userId: 'u1',
			username: 'alice',
			isAdmin: true
		});
		const decoded = jwt.verifyAccessToken(token);
		expect(decoded).toMatchObject({
			userId: 'u1',
			username: 'alice',
			isAdmin: true
		});
	});

	test('refresh token roundtrip', () => {
		const token = jwt.generateRefreshToken('user-42');
		const decoded = jwt.verifyRefreshToken(token);
		expect(decoded).toMatchObject({ userId: 'user-42', tokenType: 'refresh' });
	});

	test('verifyRefreshToken rejects access token', () => {
		const access = jwt.generateAccessToken({
			userId: 'u1',
			username: 'bob',
			isAdmin: false
		});
		expect(jwt.verifyRefreshToken(access)).toBeNull();
	});

	test('verifyAccessToken returns null for malformed token', () => {
		expect(jwt.verifyAccessToken('not-a-jwt')).toBeNull();
		expect(jwt.verifyAccessToken('a.b.c')).toBeNull();
	});

	test('verifyAccessToken returns null for tampered payload', () => {
		const token = jwt.generateAccessToken({
			userId: 'u1',
			username: 'carol',
			isAdmin: false
		});
		const parts = token.split('.');
		expect(parts.length).toBe(3);
		const tampered = `${parts[0]}.${parts[1]}x${parts[2]}`;
		expect(jwt.verifyAccessToken(tampered)).toBeNull();
	});

	test('verifyAccessToken rejects token signed with another secret', () => {
		const wrongSigningKey = randomBytes(48).toString('base64url');
		const alien = jwtPkg.sign(
			{ userId: 'x', username: 'y', isAdmin: false },
			wrongSigningKey,
			{
				expiresIn: '1h',
				issuer: 'dane.gg',
				audience: 'dane.gg-users'
			}
		);
		expect(jwt.verifyAccessToken(alien)).toBeNull();
	});

	test('generateTokenPair returns both tokens', () => {
		const pair = jwt.generateTokenPair({
			id: 'id-1',
			username: 'dane',
			isAdmin: true
		});
		expect(pair.accessToken.length).toBeGreaterThan(20);
		expect(pair.refreshToken.length).toBeGreaterThan(20);
		expect(pair.expiresIn).toBe(process.env.JWT_EXPIRES_IN);
	});
});
