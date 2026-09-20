import { eng, err, json, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    const e = eng();
    const booking = e.createWalkIn({
      name: String(body.name ?? ''),
      phone: body.phone ? String(body.phone) : undefined,
      serviceId: String(body.serviceId ?? ''),
      notes: body.notes ? String(body.notes) : undefined,
    });
    if (body.presetBarber) {
      // pre-selected barber (e.g. clicked an empty slot on the all-calendar)
      const tip = body.tip != null ? Number(body.tip) : body.presetTip != null ? Number(body.presetTip) : undefined;
      e.assignWalkIn(
        booking.id,
        String(body.presetBarber),
        body.presetTime ? String(body.presetTime) : undefined,
        body.presetDate ? String(body.presetDate) : undefined,
        body.method === 'card' ? 'card' : 'cash',
        tip,
      );
    }
    const updated = e.db.bookings.find((b) => b.id === booking.id)!;
    return json({ booking: updated }, 201);
  } catch (e) {
    return err(e);
  }
}
