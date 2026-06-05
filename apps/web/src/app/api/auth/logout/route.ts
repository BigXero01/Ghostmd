import { deleteSession } from '@/server/store';
import { json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignore — logout is idempotent
  }
  const refreshToken = String(body?.refreshToken ?? '');
  if (refreshToken) await deleteSession(refreshToken);
  return json({ success: true });
}
