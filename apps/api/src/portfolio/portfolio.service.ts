import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const EPOCH_ROI = 0.0025;
const EPOCHS_PER_DAY = 4;

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async getPortfolio(userId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { userId } });
    if (!portfolio) throw new NotFoundException('Portfolio not found');
    return portfolio;
  }

  async getHistory(userId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { userId },
      include: {
        snapshots: {
          orderBy: { snapshotAt: 'asc' },
          take: 90,
        },
      },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');
    return portfolio.snapshots;
  }

  async getProjections(userId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { userId } });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const balance = parseFloat(portfolio.balance.toString());
    const projections = [];
    let current = balance;
    const now = new Date();

    for (let day = 1; day <= 30; day++) {
      for (let epoch = 0; epoch < EPOCHS_PER_DAY; epoch++) {
        current *= 1 + EPOCH_ROI;
      }
      const date = new Date(now);
      date.setDate(now.getDate() + day);
      projections.push({
        day,
        balance: parseFloat(current.toFixed(2)),
        earnings: parseFloat((current - balance).toFixed(2)),
        date: date.toISOString().split('T')[0],
      });
    }

    return projections;
  }

  async creditBalance(userId: string, amountUsd: number) {
    return this.prisma.portfolio.update({
      where: { userId },
      data: {
        balance: { increment: amountUsd },
        totalDeposited: { increment: amountUsd },
      },
    });
  }

  async applyEpochRoi(portfolioId: string, roi: number) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const portfolio = await tx.portfolio.findUnique({ where: { id: portfolioId } });
      if (!portfolio) return;

      const currentBalance = parseFloat(portfolio.balance.toString());
      const earnings = currentBalance * roi;
      const newBalance = currentBalance + earnings;

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
    });
  }
}
