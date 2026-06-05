import { json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Accepts an email and always responds success to avoid account enumeration.
// (Email delivery is out of scope for this deployment.)
export async function POST(req: Request) {
  try {
    await req.json();
  } catch {
    // ignore body parse errors — response is intentionally uniform
  }
  return json({ success: true });
}
