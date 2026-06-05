import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message: 'Password must contain uppercase, lowercase, number and special character',
    }),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid or expired reset token' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;

  const reset = await prisma.passwordReset.findUnique({ where: { token } });
  if (!reset || reset.used || reset.expiresAt < new Date()) {
    return NextResponse.json({ message: 'Invalid or expired reset token' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
  ]);

  return NextResponse.json({ message: 'Password reset successfully' });
}
