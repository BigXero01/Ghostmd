import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WithdrawalsService {
  constructor(private prisma: PrismaService) {}

  async requestWithdrawal(userId: string, amountUsd: number) {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { userId } });
    if (!portfolio) throw new BadRequestException('Portfolio not found');

    const balance = parseFloat(portfolio.balance.toString());
    if (amountUsd > balance) {
      throw new BadRequestException('Insufficient balance');
    }

    return this.prisma.$transaction(async (tx) => {
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
