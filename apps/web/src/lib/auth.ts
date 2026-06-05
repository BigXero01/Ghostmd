import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function signAccessToken(sub: string, email: string): Promise<string> {
  return new SignJWT({ sub, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

export async function verifyAuth(req: NextRequest): Promise<{ sub: string; email: string } | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { sub: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}
