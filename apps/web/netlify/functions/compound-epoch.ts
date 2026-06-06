import { PrismaClient, Prisma } from '@prisma/client';
import type { Config } from '@netlify/functions';

const BASE_ROI = 0.0025;

async function applyEpochRoi(
  tx: Prisma.TransactionClient,
  portfolioId: string,
  roi: number,
): Promise<void> {
  const portfolio = await tx.portfolio.findUnique({ where: { id: portfolioId } });
  if (!portfolio) return;

  const current = parseFloat(portfolio.balance.toString());
  const earnings = current * roi;
  const newBalance = current + earnings;

  await tx.portfolio.update({
    where: { id: portfolioId },
    data: {
      balance: newBalance,
      totalEarnings: { increment: earnings },
      lastCompounded: new Date(),
    },
  });

  await tx.portfolioSnapshot.create({
    data: { portfolioId, balance: newBalance },
  });
}

export default async function handler() {
  const prisma = new PrismaClient();
  const epochId = `epoch_${Date.now()}`;

  try {
    const variance = (Math.random() - 0.3) * 0.001;
    const roi = Math.max(0.001, BASE_ROI + variance);

    const portfolios = await prisma.portfolio.findMany({
      where: { balance: { gt: 0 } },
    });

    let succeeded = 0;
    let failed = 0;

    await Promise.all(
      portfolios.map(async (portfolio) => {
        try {
          await prisma.$transaction((tx) => applyEpochRoi(tx, portfolio.id, roi));
          succeeded++;
        } catch (err) {
          failed++;
          console.error(`compound-epoch ${epochId}: portfolio ${portfolio.id} failed:`, err);
        }
      }),
    );

    await prisma.$transaction([
      prisma.epochLog.create({ data: { epochId, roi, succeeded, failed } }),
      prisma.algoEvent.create({
        data: {
          type: 'epoch',
          data: { epochId, roi, succeeded, failed, timestamp: Date.now() },
        },
      }),
    ]);

    // Prune epoch events older than 7 days to keep the table lean.
    await prisma.algoEvent.deleteMany({
      where: {
        type: 'epoch',
        createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    console.log(
      `Epoch ${epochId} complete. ROI: ${(roi * 100).toFixed(4)}%. Succeeded: ${succeeded}, Failed: ${failed}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

export const config: Config = {
  schedule: '0 */6 * * *',
};
