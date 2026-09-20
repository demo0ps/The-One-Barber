import { eng, err, json, platformGuard } from '@/lib/engine';
import type { Booking } from '@the-one-barber/engine';

export const dynamic = 'force-dynamic';

function shape(b: Booking) {
  const e = eng();
  const svc = e.db.services.find((s) => s.id === b.serviceId);
  const barber = e.db.barbers.find((x) => x.id === b.barberId);
  return {
    id: b.id,
    ref: b.ref,
    clientName: b.clientName,
    clientPhone: b.clientPhone,
    service: svc?.name ?? 'Service',
    serviceCategory: svc?.category ?? 'hair_cut',
    addOns: (b.addOnIds ?? [])
      .map((id) => e.db.services.find((s) => s.id === id)?.name ?? '')
      .filter(Boolean),
    barber: barber?.name ?? 'Unallocated',
    barberId: b.barberId,
    date: b.date,
    time: b.time,
    price: b.price,
    discount: b.discount ?? 0,
    status: b.status,
    type: b.type,
    tip: b.tip,
    createdAt: b.createdAt,
    completedAt: b.completedAt,
    notes: b.notes,
  };
}

export async function GET(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const barberId = url.searchParams.get('barberId');
    const queue = url.searchParams.get('queue');
    let rows: Booking[] = eng().db.bookings;
    if (date) rows = rows.filter((b) => b.date === date);
    if (barberId) rows = rows.filter((b) => b.barberId === barberId);
    if (queue === '1') {
      const today = new Date().toISOString().slice(0, 10);
      rows = rows.filter(
        (b) => !b.barberId && b.type === 'walk_in' && (b.status === 'confirmed' || b.status === 'pending_payment') && b.date === today,
      );
      rows = rows.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    const list = rows
      .map(shape)
      .slice()
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
    return json({ rows: list });
  } catch (e) {
    return err(e);
  }
}

export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    const booking = eng().createOnline({
      serviceId: String(body.serviceId ?? ''),
      barberId: String(body.barberId ?? ''),
      date: String(body.date ?? ''),
      time: String(body.time ?? ''),
      name: String(body.name ?? ''),
      phone: String(body.phone ?? ''),
      email: body.email ? String(body.email) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      addOnIds: Array.isArray(body.addOnIds) ? body.addOnIds.map((x: unknown) => String(x)) : undefined,
      tip: body.tip != null ? Number(body.tip) : undefined,
    });
    return json({ booking: shape(booking) }, 201);
  } catch (e) {
    return err(e);
  }
}
