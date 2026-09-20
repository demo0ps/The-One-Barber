import { eng, err, json, num, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    const category = String(body.category ?? '');
    if (!category) return err(new Error('Category is required.'), 400);
    eng().setBudget(category, num(body.amount));
    return json({ ok: true });
  } catch (e) {
    return err(e);
  }
}
