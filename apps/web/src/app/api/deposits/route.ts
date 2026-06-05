import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const deposits = await prisma.deposit.findMany({
    where: { userId: user.sub },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(deposits);
}
