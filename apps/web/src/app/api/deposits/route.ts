import { getDeposits } from '@/server/store';
import { getAuthUser } from '@/server/auth';
import { serializeDeposit, unauthorized, json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const deposits = await getDeposits(user.id);
  return json(deposits.map(serializeDeposit));
}
