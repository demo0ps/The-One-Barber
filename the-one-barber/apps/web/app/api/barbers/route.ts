import { eng, err, json, num, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const admin = (req.headers.get('x-admin-pin') ?? '') === (process.env.ADMIN_PIN ?? '9201');
  const bs = eng().db.barbers;
  // barber PINs are only surfaced to the admin gate; strip for everyone else
  if (admin) return json({ barbers: bs });
  return json({ barbers: bs.map(({ pin: _pin, ...rest }) => rest) });
}

export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  const path = new URL((req as Request & { url: string }).url).pathname;
  // /api/barbers/verify — server-side per-barber PIN check (StaffGate posts here)
  if (path.endsWith('/verify')) {
    try {
      const body = await req.json().catch(() => ({}));
      const barberId = String(body.barberId ?? '').trim();
      const pin = String(body.pin ?? '').trim();
      if (!barberId || !/^\d{4}$/.test(pin)) return err('Provide barberId and a 4-digit PIN.', 400);
      const b = eng().verifyBarberPin(barberId, pin);
      return json({ ok: true, barber: { id: b.id, name: b.name } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'PIN check failed.';
      const code = /Wrong PIN/.test(msg) ? 401 : 400;
      return json({ error: msg }, code);
    }
  }
  try {
    const body = await req.json();
    const b = eng().addBarber({
      name: String(body.name ?? ''),
      title: String(body.title ?? ''),
      commission: num(body.commission, 0.5),
      bio: body.bio ? String(body.bio) : undefined,
      image: body.image ? String(body.image) : undefined,
      pin: body.pin != null ? String(body.pin) : undefined,
    });
    return json({ barber: b }, 201);
  } catch (e) {
    return err(e);
  }
}

export async function PATCH(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    eng().patchBarber(String(body.id), {
      name: body.name != null ? String(body.name) : undefined,
      title: body.title != null ? String(body.title) : undefined,
      commission: body.commission != null ? num(body.commission) : undefined,
      active: body.active != null ? Boolean(body.active) : undefined,
      pin: body.pin != null ? String(body.pin) : undefined,
    });
    return json({ ok: true, barbers: eng().db.barbers });
  } catch (e) {
    return err(e);
  }
}
