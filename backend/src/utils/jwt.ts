import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

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
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'dane.gg',
    audience: 'dane.gg-users'
  });
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
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'dane.gg',
    audience: 'dane.gg-users'
  });
}

/**
 * Verify and decode access token
 * @param token - JWT access token
 * @returns Decoded payload or null if invalid
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'dane.gg',
      audience: 'dane.gg-users'
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
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
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'dane.gg',
      audience: 'dane.gg-users'
    }) as RefreshTokenPayload;
    
    if (decoded.tokenType !== 'refresh') {
      return null;
    }
    
    return decoded;
  } catch (error) {
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
    expiresIn: JWT_EXPIRES_IN
  };
}
