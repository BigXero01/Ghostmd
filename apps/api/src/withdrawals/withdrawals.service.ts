import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WithdrawalsService {
  constructor(private prisma: PrismaService) {}

  async requestWithdrawal(userId: string, amountUsd: number) {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { userId } });
    if (!portfolio) throw new BadRequestException('Portfolio not found');

    return this.prisma.$transaction(async (tx) => {
      // Gate and debit in a single atomic statement. Checking the balance and
      // then decrementing as two steps is a TOCTOU race: two concurrent
      // withdrawals can both observe a sufficient balance and each debit it,
      // overdrawing the account into a negative balance. The conditional
      // `updateMany` only debits when the balance still covers the amount, so at
      // most one of two racing requests succeeds; the loser gets count === 0.
      const debit = await tx.portfolio.updateMany({
        where: { userId, balance: { gte: amountUsd } },
        data: { balance: { decrement: amountUsd } },
      });

      if (debit.count === 0) {
        throw new BadRequestException('Insufficient balance');
      }

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
