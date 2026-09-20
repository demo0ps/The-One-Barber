import { eng, json, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  eng().reset();
  return json({ ok: true, version: eng().store.db.version });
}
