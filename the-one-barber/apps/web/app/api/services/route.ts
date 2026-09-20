import { eng, err, json, num, platformGuard } from '@/lib/engine';
import type { ServiceCategory } from '@the-one-barber/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  const all = new URL(req.url).searchParams.get('all') === '1';
  return json({ services: eng().db.services.filter((s) => all || s.active) });
}

export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    const svc = eng().addService({
      name: String(body.name ?? ''),
      price: num(body.price),
      cost: num(body.cost),
      durationMin: num(body.durationMin, 30),
      description: String(body.description ?? ''),
      category: body.category ? (String(body.category) as ServiceCategory) : undefined,
      from: body.from ? Boolean(body.from) : undefined,
      addOn: body.addOn ? Boolean(body.addOn) : undefined,
      addOnOnly: body.addOnOnly ? Boolean(body.addOnOnly) : undefined,
    });
    return json({ service: svc }, 201);
  } catch (e) {
    return err(e);
  }
}

export async function PATCH(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    eng().patchService(String(body.id), {
      name: body.name != null ? String(body.name) : undefined,
      price: body.price != null ? num(body.price) : undefined,
      cost: body.cost != null ? num(body.cost) : undefined,
      durationMin: body.durationMin != null ? num(body.durationMin) : undefined,
      description: body.description != null ? String(body.description) : undefined,
      active: body.active != null ? Boolean(body.active) : undefined,
      category: body.category ? (String(body.category) as ServiceCategory) : undefined,
      from: body.from != null ? Boolean(body.from) : undefined,
      addOn: body.addOn != null ? Boolean(body.addOn) : undefined,
      addOnOnly: body.addOnOnly != null ? Boolean(body.addOnOnly) : undefined,
    });
    return json({ ok: true, services: eng().db.services });
  } catch (e) {
    return err(e);
  }
}
