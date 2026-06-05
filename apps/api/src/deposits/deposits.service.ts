import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';

const MIN_DEPOSIT = 25;

@Injectable()
export class DepositsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private portfolioService: PortfolioService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2024-06-20',
    });
  }

  async createIntent(userId: string, amountUsd: number) {
    if (amountUsd < MIN_DEPOSIT) {
      throw new BadRequestException(`Minimum deposit is $${MIN_DEPOSIT}`);
    }

    const amountCents = Math.round(amountUsd * 100);
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { userId },
    });

    const deposit = await this.prisma.deposit.create({
      data: {
        userId,
        stripePaymentIntentId: paymentIntent.id,
        amountUsd,
        status: 'PENDING',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      depositId: deposit.id,
    };
  }

  async confirmDeposit(userId: string, paymentIntentId: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!deposit || deposit.userId !== userId) {
      throw new NotFoundException('Deposit not found');
    }

    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') {
      throw new BadRequestException('Payment not yet confirmed');
    }

    return this.processConfirmedDeposit(deposit.id, deposit.userId, parseFloat(deposit.amountUsd.toString()));
  }

  async processWebhookDeposit(paymentIntentId: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!deposit || deposit.status === 'CONFIRMED') return;

    await this.processConfirmedDeposit(
      deposit.id,
      deposit.userId,
      parseFloat(deposit.amountUsd.toString()),
    );
  }

  private async processConfirmedDeposit(depositId: string, userId: string, amount: number) {
    await this.prisma.$transaction([
      this.prisma.deposit.update({
        where: { id: depositId },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      }),
    ]);

    await this.portfolioService.creditBalance(userId, amount);
    return { success: true };
  }

  async getDeposits(userId: string) {
    return this.prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
