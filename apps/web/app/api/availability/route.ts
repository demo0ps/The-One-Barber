import { eng, err, json } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const barberId = url.searchParams.get('barberId') ?? '';
    const date = url.searchParams.get('date') ?? '';
    const serviceId = url.searchParams.get('serviceId') ?? '';
    const duration = url.searchParams.get('duration');
    if (!barberId || !date || !serviceId) return err(new Error('barberId, date and serviceId are required.'), 400);
    // duration = main service + add-ons (in minutes), when booking with add-ons
    const slots = eng().availableSlots(barberId, date, serviceId, duration ? Number(duration) : undefined);
    return json({ slots });
  } catch (e) {
    return err(e);
  }
}
