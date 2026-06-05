import { getPortfolio, debitWithdrawal, addWithdrawal } from '@/server/store';
import { getAuthUser } from '@/server/auth';
import { serializeWithdrawal, unauthorized, errorRes, json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_WITHDRAWAL = 25;

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
  if (!Number.isFinite(amountUsd) || amountUsd < MIN_WITHDRAWAL) {
    return errorRes(`Minimum withdrawal is $${MIN_WITHDRAWAL}`);
  }

  const portfolio = await getPortfolio(user.id);
  if (!portfolio) return errorRes('Portfolio not found', 404);
  if (amountUsd > portfolio.balance) return errorRes('Insufficient balance');

  await debitWithdrawal(user.id, amountUsd);
  const withdrawal = await addWithdrawal(user.id, amountUsd);

  return json(serializeWithdrawal(withdrawal), 201);
}
