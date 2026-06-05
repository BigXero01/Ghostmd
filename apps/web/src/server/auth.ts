// Authentication primitives: password hashing and stateless access tokens.
//
// Passwords are hashed with scrypt (no native dependency required). Access
// tokens are compact HMAC-SHA256 signed tokens (JWT-style HS256) carrying the
// user id and an expiry. Refresh tokens are opaque and stored server-side in
// Blobs (see store.ts), enabling rotation and revocation on logout.
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
} from 'node:crypto';
import { getAuthSecret, getUserById, type UserRecord } from './store';

const ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes

// --- Password hashing ----------------------------------------------------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hash] = parts;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// --- Access tokens (HS256) ----------------------------------------------
function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

interface TokenPayload {
  sub: string;
  email: string;
  exp: number;
}

export async function signAccessToken(user: Pick<UserRecord, 'id' | 'email'>): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const secret = await getAuthSecret();
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = b64url(createHmac('sha256', secret).update(data).digest());
  return { accessToken: `${data}.${sig}`, expiresIn: ACCESS_TTL_SECONDS };
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const secret = await getAuthSecret();
  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest();
  let provided: Buffer;
  try {
    provided = b64urlDecode(sig);
  } catch {
    return null;
  }
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }
  let payload: TokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString('utf8'));
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
  return payload;
}

// Resolve the authenticated user from a request's Authorization header.
export async function getAuthUser(req: Request): Promise<UserRecord | null> {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const payload = await verifyAccessToken(match[1]);
  if (!payload) return null;
  return getUserById(payload.sub);
}
