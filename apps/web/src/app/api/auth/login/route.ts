import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { signAccessToken } from '@/lib/auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, lastName: true, kycStatus: true, passwordHash: true },
  });

  if (!user) {
    await bcrypt.hash('dummy', 12); // constant-time guard
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }

  const { passwordHash: _ph, ...safeUser } = user;
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

  return NextResponse.json({ accessToken, refreshToken, expiresIn: 900, user: safeUser });
}
