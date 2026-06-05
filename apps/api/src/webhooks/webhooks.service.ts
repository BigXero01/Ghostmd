import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { DepositsService } from '../deposits/deposits.service';

@Injectable()
export class WebhooksService {
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    private depositsService: DepositsService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2024-06-20',
    });
  }

  async handleStripeEvent(signature: string, rawBody: Buffer) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.get('STRIPE_WEBHOOK_SECRET', ''),
      );
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.depositsService.processWebhookDeposit(intent.id);
    }

    return { received: true };
  }
}
