import { eng, err, json } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const phone = (url.searchParams.get('phone') ?? '').replace(/\s+/g, '');
    if (phone.length < 9) return err(new Error('Enter a valid phone number.'), 400);
    const e = eng();
    const client = e.db.clients.find((c) => c.phone.replace(/\s+/g, '') === phone);
    const rows = e.db.bookings
      .filter((b) => b.clientPhone.replace(/\s+/g, '') === phone)
      .map((b) => {
        const svc = e.db.services.find((s) => s.id === b.serviceId);
        const barber = e.db.barbers.find((x) => x.id === b.barberId);
        const addOns = (b.addOnIds ?? [])
          .map((id) => e.db.services.find((s) => s.id === id)?.name ?? '')
          .filter(Boolean);
        return {
          id: b.id,
          ref: b.ref,
          service: addOns.length ? `${svc?.name ?? 'Service'} + ${addOns.join(' + ')}` : svc?.name ?? 'Service',
          barber: barber?.name ?? 'Unallocated',
          date: b.date,
          time: b.time,
          price: b.price,
          status: b.status,
          type: b.type,
        };
      })
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
    return json({ client, rows });
  } catch (e) {
    return err(e);
  }
}
