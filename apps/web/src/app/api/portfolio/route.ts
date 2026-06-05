import { getPortfolio } from '@/server/store';
import { getAuthUser } from '@/server/auth';
import { serializePortfolio, unauthorized, errorRes, json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const portfolio = await getPortfolio(user.id);
  if (!portfolio) return errorRes('Portfolio not found', 404);

  return json(serializePortfolio(portfolio));
}
