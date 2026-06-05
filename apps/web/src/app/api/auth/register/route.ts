import { createUser, getUserByEmail, createSession, toPublicUser } from '@/server/store';
import { hashPassword, signAccessToken } from '@/server/auth';
import { authResponse, errorRes, json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorRes('Invalid request body');
  }

  const firstName = String(body?.firstName ?? '').trim();
  const lastName = String(body?.lastName ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const password = String(body?.password ?? '');

  if (!firstName || !lastName) return errorRes('First and last name are required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorRes('Invalid email');
  if (!PASSWORD_RE.test(password)) {
    return errorRes('Password must be 8+ chars with uppercase, lowercase, number, and special character');
  }

  if (await getUserByEmail(email)) {
    return errorRes('Email already registered', 409);
  }

  const user = await createUser({ email, passwordHash: hashPassword(password), firstName, lastName });
  const { accessToken, expiresIn } = await signAccessToken(user);
  const { refreshToken } = await createSession(user.id);

  return json(authResponse(toPublicUser(user), accessToken, refreshToken, expiresIn), 201);
}
