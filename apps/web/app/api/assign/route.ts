import { eng, err, json, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    const method = body.method === 'card' ? 'card' : 'cash';
    const tip = body.tip != null ? Number(body.tip) : undefined;
    const booking = eng().assignWalkIn(
      String(body.bookingId ?? ''),
      String(body.barberId ?? ''),
      body.time ? String(body.time) : undefined,
      body.date ? String(body.date) : undefined,
      method,
      tip,
    );
    return json({ booking, method });
  } catch (e) {
    return err(e);
  }
}
