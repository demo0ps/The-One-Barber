import { eng, err, json, num, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

// Simulated-gateway callback (demo mode only). In live mode the real PayFast
// server pushes the IPN to /api/payments/payfast-ipn instead.
export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    const ref = String(body.ref ?? '');
    const ok = body.ok !== false;
    const amount = body.amount != null ? num(body.amount) : undefined;
    const res = eng().processIpn({ ref, ok, amount });
    if (!res.ok) return err(new Error(res.error ?? 'Payment failed.'), 400);
    return json({ ok: true });
  } catch (e) {
    return err(e);
  }
}
