import { addDeposit, creditDeposit } from '@/server/store';
import { getAuthUser } from '@/server/auth';
import { unauthorized, errorRes, json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_DEPOSIT = 25;

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorRes('Invalid request body');
  }

  const amountUsd = Number(body?.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd < MIN_DEPOSIT) {
    return errorRes(`Minimum deposit is $${MIN_DEPOSIT}`);
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  // When Stripe is configured, create a real PaymentIntent and return its
  // client secret; the deposit is credited later via the confirm endpoint.
  if (stripeKey) {
    try {
      const params = new URLSearchParams();
      params.set('amount', String(Math.round(amountUsd * 100)));
      params.set('currency', 'usd');
      params.set('automatic_payment_methods[enabled]', 'true');
      params.set('metadata[userId]', user.id);

      const res = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      const intent = await res.json();
      if (!res.ok) {
        return errorRes(intent?.error?.message || 'Failed to create payment intent', 502);
      }
      const deposit = await addDeposit({
        userId: user.id,
        amountUsd,
        status: 'PENDING',
        stripePaymentIntentId: intent.id,
      });
      return json({ clientSecret: intent.client_secret, depositId: deposit.id });
    } catch {
      return errorRes('Payment provider unavailable', 502);
    }
  }

  // No Stripe configured: process the deposit instantly so the flow works
  // end-to-end. The deposit is recorded as CONFIRMED and the balance credited.
  const deposit = await addDeposit({ userId: user.id, amountUsd, status: 'CONFIRMED' });
  await creditDeposit(user.id, amountUsd);
  return json({ simulated: true, depositId: deposit.id });
}
