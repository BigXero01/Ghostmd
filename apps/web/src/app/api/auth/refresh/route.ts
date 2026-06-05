import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { signAccessToken } from '@/lib/auth';

const schema = z.object({ refreshToken: z.string() });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid or expired refresh token' }, { status: 401 });
  }

  const session = await prisma.session.findUnique({
    where: { refreshToken: parsed.data.refreshToken },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true, kycStatus: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ message: 'Invalid or expired refresh token' }, { status: 401 });
  }

  await prisma.session.delete({ where: { id: session.id } });

  const accessToken = await signAccessToken(session.user.id, session.user.email);
  const newRefreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId: session.user.id, refreshToken: newRefreshToken, expiresAt },
  });

  return NextResponse.json({
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 900,
    user: session.user,
  });
}
