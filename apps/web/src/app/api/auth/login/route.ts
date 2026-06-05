import { getUserByEmail, createSession, toPublicUser } from '@/server/store';
import { verifyPassword, signAccessToken } from '@/server/auth';
import { authResponse, errorRes, json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorRes('Invalid request body');
  }

  const email = String(body?.email ?? '').trim();
  const password = String(body?.password ?? '');
  if (!email || !password) return errorRes('Email and password are required');

  const user = await getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return errorRes('Invalid email or password', 401);
  }

  const { accessToken, expiresIn } = await signAccessToken(user);
  const { refreshToken } = await createSession(user.id);

  return json(authResponse(toPublicUser(user), accessToken, refreshToken, expiresIn));
}
