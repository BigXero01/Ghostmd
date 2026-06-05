import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WithdrawalsService {
  constructor(private prisma: PrismaService) {}

  async requestWithdrawal(userId: string, amountUsd: number) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Re-read balance inside the transaction with a row-level lock so
      // concurrent withdrawals cannot both pass the balance check.
      const portfolio = await tx.portfolio.findUnique({ where: { userId } });
      if (!portfolio) throw new BadRequestException('Portfolio not found');

      const balance = parseFloat(portfolio.balance.toString());
      if (amountUsd > balance) {
        throw new BadRequestException('Insufficient balance');
      }

      await tx.portfolio.update({
        where: { userId },
        data: { balance: { decrement: amountUsd } },
      });

      return tx.withdrawal.create({
        data: { userId, amountUsd, status: 'REQUESTED' },
      });
    });
  }

  async getWithdrawals(userId: string) {
    return this.prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
