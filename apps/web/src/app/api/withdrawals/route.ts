import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DEMO_USER_ID } from '@/lib/auth';

const schema = z.object({
  amountUsd: z.number().min(25, 'Minimum withdrawal is $25'),
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
    return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
  }

  const { amountUsd } = parsed.data;

  try {
    const withdrawal = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const portfolio = await tx.portfolio.findUnique({ where: { userId: DEMO_USER_ID } });
      if (!portfolio) throw new Error('Portfolio not found');

      const balance = parseFloat(portfolio.balance.toString());
      if (amountUsd > balance) throw new Error('Insufficient balance');

      await tx.portfolio.update({
        where: { userId: DEMO_USER_ID },
        data: { balance: { decrement: amountUsd } },
      });

      return tx.withdrawal.create({
        data: { userId: DEMO_USER_ID, amountUsd, status: 'REQUESTED' },
      });
    });

    return NextResponse.json(withdrawal);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Withdrawal failed';
    const status = msg === 'Insufficient balance' || msg === 'Portfolio not found' ? 400 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}

export async function GET() {
  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(withdrawals);
}
