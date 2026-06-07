import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signAccessToken } from '@/lib/auth';

// Open-access entry point: provisions a fresh guest vault with no credentials.
// Each call creates its own user + portfolio so every visitor gets a real,
// persisted workspace without signing up or logging in.
export async function POST() {
  const suffix = crypto.randomUUID();

  const user = await prisma.user.create({
    data: {
      email: `guest_${suffix}@ghostmd.guest`,
      // Guests never authenticate with a password; store an unusable random hash.
      passwordHash: crypto.randomUUID(),
      firstName: 'Phantom',
      lastName: 'Guest',
      portfolio: { create: {} },
    },
    select: { id: true, email: true, firstName: true, lastName: true, kycStatus: true },
  });

  const accessToken = await signAccessToken(user.id, user.email);
  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId: user.id, refreshToken, expiresAt },
  });

  return NextResponse.json({ accessToken, refreshToken, expiresIn: 900, user });
}
