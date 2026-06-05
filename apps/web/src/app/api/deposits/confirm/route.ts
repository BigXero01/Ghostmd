import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getStripe } from '@/lib/stripe-server';
import { processConfirmedDeposit } from '@/lib/deposit-helpers';

const schema = z.object({ paymentIntentId: z.string() });

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'paymentIntentId is required' }, { status: 400 });
  }

  const deposit = await prisma.deposit.findUnique({
    where: { stripePaymentIntentId: parsed.data.paymentIntentId },
  });

  if (!deposit || deposit.userId !== user.sub) {
    return NextResponse.json({ message: 'Deposit not found' }, { status: 404 });
  }

  const stripe = getStripe();
  const intent = await stripe.paymentIntents.retrieve(parsed.data.paymentIntentId);
  if (intent.status !== 'succeeded') {
    return NextResponse.json({ message: 'Payment not yet confirmed by Stripe' }, { status: 400 });
  }

  await processConfirmedDeposit(
    deposit.id,
    deposit.userId,
    parseFloat(deposit.amountUsd.toString()),
  );

  return NextResponse.json({ success: true });
}
