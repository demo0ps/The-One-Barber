import { eng, err, json } from '@/lib/engine';
import { report, type Range } from '@the-one-barber/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const range = (url.searchParams.get('range') ?? '30d') as Range;
    if (!['7d', '30d', '90d', 'month'].includes(range)) return err(new Error('Bad range.'), 400);
    const barberId = url.searchParams.get('barberId') ?? undefined;
    return json(report(eng().db, range, barberId));
  } catch (e) {
    return err(e);
  }
}
