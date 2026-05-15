import jwt, { type SignOptions } from 'jsonwebtoken';

/** Read env at call time so tests (and callers) can set vars before first use despite import order/cache. */
function jwtSecret(): string {
	return process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
}

function accessTokenExpiresIn(): SignOptions['expiresIn'] {
	return (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
}

function refreshTokenExpiresIn(): SignOptions['expiresIn'] {
	return (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as SignOptions['expiresIn'];
}

export interface JWTPayload {
	userId: string;
	username: string;
	isAdmin: boolean;
	iat?: number;
	exp?: number;
}

export interface RefreshTokenPayload {
	userId: string;
	tokenType: 'refresh';
	iat?: number;
	exp?: number;
}

/**
 * Generate access token
 * @param payload - User data to include in token
 * @returns JWT access token
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
	const options: SignOptions = {
		expiresIn: accessTokenExpiresIn(),
		issuer: 'dane.gg',
		audience: 'dane.gg-users'
	};
	return jwt.sign(payload, jwtSecret(), options);
}

/**
 * Generate refresh token
 * @param userId - User ID for the refresh token
 * @returns JWT refresh token
 */
export function generateRefreshToken(userId: string): string {
	const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
		userId,
		tokenType: 'refresh'
	};

	const options: SignOptions = {
		expiresIn: refreshTokenExpiresIn(),
		issuer: 'dane.gg',
		audience: 'dane.gg-users'
	};
	return jwt.sign(payload, jwtSecret(), options);
}

/**
 * Verify and decode access token
 * @param token - JWT access token
 * @returns Decoded payload or null if invalid
 */
export function verifyAccessToken(token: string): JWTPayload | null {
	try {
		const decoded = jwt.verify(token, jwtSecret(), {
			issuer: 'dane.gg',
			audience: 'dane.gg-users'
		}) as JWTPayload;

		return decoded;
	} catch {
		return null;
	}
}

/**
 * Verify and decode refresh token
 * @param token - JWT refresh token
 * @returns Decoded payload or null if invalid
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
	try {
		const decoded = jwt.verify(token, jwtSecret(), {
			issuer: 'dane.gg',
			audience: 'dane.gg-users'
		}) as RefreshTokenPayload;

		if (decoded.tokenType !== 'refresh') {
			return null;
		}

		return decoded;
	} catch {
		return null;
	}
}

/**
 * Generate token pair (access + refresh)
 * @param user - User data
 * @returns Object with access and refresh tokens
 */
export function generateTokenPair(user: { id: string; username: string; isAdmin: boolean }) {
	const accessToken = generateAccessToken({
		userId: user.id,
		username: user.username,
		isAdmin: user.isAdmin
	});

	const refreshToken = generateRefreshToken(user.id);

	return {
		accessToken,
		refreshToken,
		expiresIn: process.env.JWT_EXPIRES_IN || '7d'
	};
}
