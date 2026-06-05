import { getSession, deleteSession, createSession, getUserById, toPublicUser } from '@/server/store';
import { signAccessToken } from '@/server/auth';
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

  const refreshToken = String(body?.refreshToken ?? '');
  const session = await getSession(refreshToken);
  if (!session || new Date(session.expiresAt) < new Date()) {
    if (refreshToken) await deleteSession(refreshToken);
    return errorRes('Invalid or expired refresh token', 401);
  }

  const user = await getUserById(session.userId);
  if (!user) {
    await deleteSession(refreshToken);
    return errorRes('Invalid or expired refresh token', 401);
  }

  // Rotate the refresh token on every use.
  await deleteSession(refreshToken);
  const { accessToken, expiresIn } = await signAccessToken(user);
  const { refreshToken: newRefresh } = await createSession(user.id);

  return json(authResponse(toPublicUser(user), accessToken, newRefresh, expiresIn));
}
