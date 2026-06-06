import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// Polling endpoint that replaces the Socket.io push model.
// Clients pass ?since=<ISO timestamp> to fetch only new events.
// Returns up to 50 events plus a cursor for the next call.
export async function GET(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const since = req.nextUrl.searchParams.get('since');

  const events = await prisma.algoEvent.findMany({
    where: since ? { createdAt: { gt: new Date(since) } } : undefined,
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  const cursor =
    events.length > 0
      ? events[events.length - 1].createdAt.toISOString()
      : (since ?? null);

  return NextResponse.json({ events, cursor });
}
