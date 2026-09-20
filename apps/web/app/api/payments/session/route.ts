import { eng, err, json, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    const bookingId = String(body.bookingId ?? '');
    const host = req.headers.get('host') ?? 'localhost:3000';
    const session = eng().createPaymentSession(bookingId, host);
    return json(session);
  } catch (e) {
    return err(e);
  }
}
