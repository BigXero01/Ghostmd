import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { DEMO_USER_ID } from '@/lib/auth';
import { getStripe } from '@/lib/stripe-server';

const schema = z.object({
  amountUsd: z.number().min(25, 'Minimum deposit is $25').max(100000),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
  }

  const { amountUsd } = parsed.data;
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amountUsd * 100),
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: { userId: DEMO_USER_ID },
  });

  const deposit = await prisma.deposit.create({
    data: {
      userId: DEMO_USER_ID,
      stripePaymentIntentId: paymentIntent.id,
      amountUsd,
      status: 'PENDING',
    },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    depositId: deposit.id,
  });
}
