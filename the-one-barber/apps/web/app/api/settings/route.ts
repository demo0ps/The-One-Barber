import { eng, err, json, num, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json({ settings: eng().db.settings });
}

export async function PATCH(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    // per-weekday hours: [{open:"09:00",close:"19:00"} x7, index 0 = Sunday]
    if (Array.isArray(body.dayHours)) {
      patch.dayHours = body.dayHours.map((h: { open?: unknown; close?: unknown }) => ({
        open: typeof h.open === 'string' ? h.open : '08:00',
        close: typeof h.close === 'string' ? h.close : '18:00',
      }));
    }
    if (body.taxRate != null) patch.taxRate = num(body.taxRate);
    for (const k of ['shopName', 'tagline', 'address', 'addressNote', 'phone', 'whatsapp', 'instagram', 'instagramUrl', 'facebook', 'paymentNote'] as const) {
      if (typeof body[k] === 'string') patch[k] = body[k];
    }
    eng().patchSettings(patch);
    return json({ ok: true, settings: eng().db.settings });
  } catch (e) {
    return err(e);
  }
}
