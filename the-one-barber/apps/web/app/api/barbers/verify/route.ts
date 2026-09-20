import { eng, json, platformGuard } from '@/lib/engine';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json().catch(() => ({}));
    const barberId = String(body.barberId ?? '').trim();
    const pin = String(body.pin ?? '').trim();
    if (!barberId || !/^\d{4}$/.test(pin)) return json({ error: 'Provide barberId and a 4-digit PIN.' }, 400);
    const b = eng().verifyBarberPin(barberId, pin);
    return json({ ok: true, barber: { id: b.id, name: b.name } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'PIN check failed.';
    const code = msg.includes('Wrong') || msg.toLowerCase().includes('unknown') ? 401 : 400;
    return json({ error: msg }, code);
  }
}
