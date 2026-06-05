import { getSnapshots } from '@/server/store';
import { getAuthUser } from '@/server/auth';
import { serializeSnapshot, unauthorized, json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const snapshots = await getSnapshots(user.id);
  return json(snapshots.map(serializeSnapshot));
}
