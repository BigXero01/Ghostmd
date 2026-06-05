import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { signAccessToken } from '@/lib/auth';

const schema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message: 'Password must contain uppercase, lowercase, number and special character',
    }),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { email, password, firstName, lastName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ message: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      portfolio: { create: {} },
    },
    select: { id: true, email: true, firstName: true, lastName: true, kycStatus: true },
  });

  return tokenResponse(user);
}

async function tokenResponse(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: string;
}) {
  const accessToken = await signAccessToken(user.id, user.email);
  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.session.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    }),
    prisma.session.create({
      data: { userId: user.id, refreshToken, expiresAt },
    }),
  ]);

  return NextResponse.json({
    accessToken,
    refreshToken,
    expiresIn: 900,
    user,
  });
}
