import type { Config, Context } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { db } from '../../db/index.js';
import { users, sessions, passwordResets } from '../../db/schema.js';

// Serverless replacement for the standalone NestJS auth API. On the Netlify
// deployment the NestJS server (Postgres + Redis, shipped to AWS by CI) is not
// present, so the frontend's /auth/* calls are served here instead, backed by
// Netlify Database. The request/response contract mirrors the original API so
// the web client works unchanged.

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = Number(
  (Netlify.env.get('REFRESH_TOKEN_EXPIRES_IN') ?? '7d').replace('d', ''),
);

type PublicUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: string;
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function getJwtSecret(): Uint8Array {
  const secret =
    Netlify.env.get('JWT_SECRET') ?? 'ghostmd-development-jwt-secret-change-me-32chars';
  return new TextEncoder().encode(secret);
}

async function generateTokens(user: PublicUser) {
  const accessToken = await new SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());

  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({ userId: user.id, refreshToken, expiresAt });

  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS, user };
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function register(body: any): Promise<Response> {
  const { email, password, firstName, lastName } = body ?? {};
  if (!isEmail(email)) return json({ message: 'A valid email is required' }, 400);
  if (typeof password !== 'string' || password.length < 8)
    return json({ message: 'Password must be at least 8 characters' }, 400);
  if (!firstName || !lastName)
    return json({ message: 'First and last name are required' }, 400);

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length > 0) return json({ message: 'Email already registered' }, 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const [created] = await db
    .insert(users)
    .values({ email, passwordHash, firstName, lastName })
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      kycStatus: users.kycStatus,
    });

  return json(await generateTokens(created), 200);
}

async function login(body: any): Promise<Response> {
  const { email, password } = body ?? {};
  if (!isEmail(email) || typeof password !== 'string' || password.length === 0)
    return json({ message: 'Email and password are required' }, 400);

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) return json({ message: 'Invalid credentials' }, 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return json({ message: 'Invalid credentials' }, 401);

  const publicUser: PublicUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    kycStatus: user.kycStatus,
  };
  return json(await generateTokens(publicUser), 200);
}

async function refresh(body: any): Promise<Response> {
  const { refreshToken } = body ?? {};
  if (typeof refreshToken !== 'string')
    return json({ message: 'Refresh token is required' }, 400);

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.refreshToken, refreshToken));
  if (!session || session.expiresAt < new Date())
    return json({ message: 'Invalid or expired refresh token' }, 401);

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user) return json({ message: 'Invalid or expired refresh token' }, 401);

  // Rotate: delete the used session, issue a fresh pair.
  await db.delete(sessions).where(eq(sessions.id, session.id));

  const publicUser: PublicUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    kycStatus: user.kycStatus,
  };
  return json(await generateTokens(publicUser), 200);
}

async function logout(body: any): Promise<Response> {
  const { refreshToken } = body ?? {};
  if (typeof refreshToken === 'string')
    await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
  return json({ message: 'Logged out successfully' }, 200);
}

async function forgotPassword(body: any): Promise<Response> {
  const { email } = body ?? {};
  if (isEmail(email)) {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (user) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(passwordResets).values({ userId: user.id, token, expiresAt });
    }
  }
  // Always respond identically to avoid leaking which emails are registered.
  return json({ message: 'If an account exists, a reset link has been sent.' }, 200);
}

async function resetPassword(body: any): Promise<Response> {
  const { token, password } = body ?? {};
  if (typeof token !== 'string' || typeof password !== 'string' || password.length < 8)
    return json({ message: 'Invalid or expired reset token' }, 400);

  const [reset] = await db.select().from(passwordResets).where(eq(passwordResets.token, token));
  if (!reset || reset.used || reset.expiresAt < new Date())
    return json({ message: 'Invalid or expired reset token' }, 400);

  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, reset.userId));
  await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.id, reset.id));

  return json({ message: 'Password reset successfully' }, 200);
}

const ROUTES: Record<string, (body: any, context: Context) => Promise<Response>> = {
  register,
  login,
  refresh,
  logout,
  'forgot-password': forgotPassword,
  'reset-password': resetPassword,
};

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== 'POST') return json({ message: 'Method not allowed' }, 405);

  const action = new URL(req.url).pathname.split('/').filter(Boolean).pop() ?? '';
  const handler = ROUTES[action];
  if (!handler) return json({ message: 'Not found' }, 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    return await handler(body, context);
  } catch (err) {
    console.error(`auth:${action} failed`, err);
    return json({ message: 'Internal server error' }, 500);
  }
};

export const config: Config = {
  method: 'POST',
  path: [
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
  ],
};
