import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const portfolio = await prisma.portfolio.findUnique({ where: { userId: user.sub } });
  if (!portfolio) return NextResponse.json({ message: 'Portfolio not found' }, { status: 404 });

  return NextResponse.json(portfolio);
}
