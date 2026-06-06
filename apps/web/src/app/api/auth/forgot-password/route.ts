import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
  }

  const parsed = schema.safeParse(body);
  // Always return the same message regardless of whether the email exists
  if (!parsed.success) {
    return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = crypto.randomUUID();
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    // TODO: wire email delivery — send link to /auth/reset-password?token=<token>
    console.warn(`Password reset token for ${user.id}: ${token} (email delivery not configured)`);
  }

  return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
}
