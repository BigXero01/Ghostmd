import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe-server';
import { prisma } from '@/lib/prisma';
import { processConfirmedDeposit } from '@/lib/deposit-helpers';

// Stripe delivers raw bytes; Next.js App Router does NOT auto-consume the body,
// so req.arrayBuffer() gives us the exact bytes needed for signature verification.
export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ message: 'Missing stripe-signature' }, { status: 400 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ message: 'Invalid webhook signature' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const deposit = await prisma.deposit.findUnique({
      where: { stripePaymentIntentId: intent.id },
    });
    if (deposit && deposit.status !== 'CONFIRMED') {
      await processConfirmedDeposit(
        deposit.id,
        deposit.userId,
        parseFloat(deposit.amountUsd.toString()),
      );
    }
  }

  return NextResponse.json({ received: true });
}
