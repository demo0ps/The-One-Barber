import { eng, err, json } from '@/lib/engine';
import { isRealMode } from '@the-one-barber/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref') ?? '';
    const e = eng();
    const payment = e.db.payments.find((p) => p.ref === ref || p.id === ref || p.gatewayRef === ref);
    if (!payment) return err(new Error('Unknown payment reference.'), 404);
    const booking = e.db.bookings.find((b) => b.id === payment.bookingId);
    if (!booking) return err(new Error('Booking not found.'), 404);
    const svc = e.db.services.find((s) => s.id === booking.serviceId);
    const barber = e.db.barbers.find((b) => b.id === booking.barberId);
    return json({
      mode: isRealMode() ? 'payfast' : 'demo',
      payment: { ref: payment.ref, amount: payment.amount, status: payment.status },
      booking: {
        ref: booking.ref,
        clientName: booking.clientName,
        service: svc?.name ?? 'Service',
        barber: barber?.name ?? 'The One Barber',
        date: booking.date,
        time: booking.time,
        price: booking.price,
        discount: booking.discount ?? 0,
      },
    });
  } catch (e) {
    return err(e);
  }
}
