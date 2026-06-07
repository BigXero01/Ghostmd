import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEMO_USER_ID } from '@/lib/auth';

export async function GET() {
  const portfolio = await prisma.portfolio.findUnique({
    where: { userId: DEMO_USER_ID },
    include: {
      snapshots: {
        orderBy: { snapshotAt: 'asc' },
        take: 90,
      },
    },
  });
  if (!portfolio) return NextResponse.json({ message: 'Portfolio not found' }, { status: 404 });

  return NextResponse.json(portfolio.snapshots);
}
