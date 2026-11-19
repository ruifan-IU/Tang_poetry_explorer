import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SALT_ROUNDS = 10;

/**
 * The key that signs auth cookies. There is deliberately no fallback: a
 * default key would be public (it's in the source), letting anyone forge a
 * cookie for any user, and sign-in would keep working so nothing would look
 * wrong. Read on use rather than at import, so `next build` doesn't need it.
 */
function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set (see .env.example)');
  }
  return secret;
}

export interface JWTPayload {
  userId: number;
  email: string;
  name: string | null;
  emailVerified?: boolean;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Create a JWT token for a user
 */
export function createToken(payload: JWTPayload): string {
  return jwt.sign(payload, jwtSecret(), {
    expiresIn: '7d', // Token expires in 7 days
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  // Outside the try: a missing secret must fail loudly, not make every
  // token look invalid (which would quietly sign everyone out).
  const secret = jwtSecret();
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Get the current user from cookies (server-side only)
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

/**
 * Set authentication cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Remove authentication cookie
 */
export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}
