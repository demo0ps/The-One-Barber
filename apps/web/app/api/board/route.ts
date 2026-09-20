import { eng, err, json, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date') ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return err(new Error('date is required (YYYY-MM-DD).'), 400);
    return json(eng().board(date));
  } catch (e) {
    return err(e);
  }
}
