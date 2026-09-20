import { eng, json } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json({ history: eng().db.priceHistory });
}
