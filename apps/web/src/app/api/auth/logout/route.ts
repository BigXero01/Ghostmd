import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({ refreshToken: z.string() });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Logged out' });
  }

  const parsed = schema.safeParse(body);
  if (parsed.success) {
    await prisma.session.deleteMany({ where: { refreshToken: parsed.data.refreshToken } });
  }

  return NextResponse.json({ message: 'Logged out successfully' });
}
