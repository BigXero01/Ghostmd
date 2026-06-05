import { getDeposits, confirmDeposit, creditDeposit } from '@/server/store';
import { getAuthUser } from '@/server/auth';
import { serializeDeposit, unauthorized, errorRes, json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Confirms a Stripe-backed deposit after client-side payment confirmation and
// credits the balance exactly once.
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorRes('Invalid request body');
  }

  const depositId = String(body?.depositId ?? '');
  const deposits = await getDeposits(user.id);
  const deposit = deposits.find((d) => d.id === depositId);
  if (!deposit) return errorRes('Deposit not found', 404);

  const wasUnconfirmed = deposit.status !== 'CONFIRMED';
  const confirmed = await confirmDeposit(user.id, depositId);
  if (wasUnconfirmed) {
    await creditDeposit(user.id, deposit.amountUsd);
  }

  return json({ success: true, deposit: confirmed ? serializeDeposit(confirmed) : null });
}
