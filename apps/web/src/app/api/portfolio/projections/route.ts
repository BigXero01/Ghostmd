import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEMO_USER_ID } from '@/lib/auth';

const EPOCH_ROI = 0.0025;
const EPOCHS_PER_DAY = 4;

export async function GET() {
  const portfolio = await prisma.portfolio.findUnique({ where: { userId: DEMO_USER_ID } });
  if (!portfolio) return NextResponse.json({ message: 'Portfolio not found' }, { status: 404 });

  const initialBalance = parseFloat(portfolio.balance.toString());
  const projections = [];
  let balance = initialBalance;
  const now = new Date();

  for (let day = 1; day <= 30; day++) {
    for (let epoch = 0; epoch < EPOCHS_PER_DAY; epoch++) {
      balance *= 1 + EPOCH_ROI;
    }
    const date = new Date(now);
    date.setDate(now.getDate() + day);
    projections.push({
      day,
      balance: parseFloat(balance.toFixed(2)),
      earnings: parseFloat((balance - initialBalance).toFixed(2)),
      date: date.toISOString().split('T')[0],
    });
  }

  return NextResponse.json(projections);
}
