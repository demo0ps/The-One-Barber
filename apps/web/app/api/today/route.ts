import { eng, json } from '@/lib/engine';
import { todayStats } from '@the-one-barber/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json(todayStats(eng().db));
}
