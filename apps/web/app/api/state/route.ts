import { eng, json } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json({ version: eng().store.db.version });
}
