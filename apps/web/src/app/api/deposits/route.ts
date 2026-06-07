import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEMO_USER_ID } from '@/lib/auth';

export async function GET() {
  const deposits = await prisma.deposit.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(deposits);
}
