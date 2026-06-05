import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export async function processConfirmedDeposit(
  depositId: string,
  userId: string,
  amount: number,
): Promise<void> {
  // Atomic compare-and-swap: if status is already CONFIRMED a concurrent call
  // got here first — count === 0 means we skip the credit.
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const { count } = await tx.deposit.updateMany({
      where: { id: depositId, status: { not: 'CONFIRMED' } },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    if (count === 0) return;
    await tx.portfolio.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        totalDeposited: { increment: amount },
      },
    });
  });
}
