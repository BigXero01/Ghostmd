import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

const MIN_DEPOSIT = 25;

@Injectable()
export class DepositsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
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

    return this.processConfirmedDeposit(deposit.id);
  }

  async processWebhookDeposit(paymentIntentId: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!deposit) return;

    await this.processConfirmedDeposit(deposit.id);
  }

  private async processConfirmedDeposit(depositId: string) {
    // The status transition and the balance credit must be a single atomic,
    // idempotent operation. The client-side confirmation endpoint and the Stripe
    // webhook can both fire for the same payment, and Stripe redelivers webhooks
    // on non-2xx responses — so this method may be invoked several times for one
    // deposit. The conditional `updateMany` claims the deposit exactly once
    // (count === 1 only on the transition out of a non-CONFIRMED state); every
    // subsequent call is a no-op, preventing double-crediting. Crediting the
    // portfolio inside the same transaction guarantees a confirmed deposit is
    // always reflected in the balance (no partial-failure window). The credit
    // uses the Decimal amount directly, keeping ledger precision intact.
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.deposit.updateMany({
        where: { id: depositId, status: { not: 'CONFIRMED' } },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });

      if (claimed.count === 0) return;

      const deposit = await tx.deposit.findUniqueOrThrow({ where: { id: depositId } });

      await tx.portfolio.update({
        where: { userId: deposit.userId },
        data: {
          balance: { increment: deposit.amountUsd },
          totalDeposited: { increment: deposit.amountUsd },
        },
      });
    });

    return { success: true };
  }

  async getDeposits(userId: string) {
    return this.prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
