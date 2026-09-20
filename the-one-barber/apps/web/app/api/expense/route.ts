import { eng, err, json, num, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    eng().addExpense({
      category: String(body.category ?? 'Misc'),
      amount: num(body.amount),
      note: body.note ? String(body.note) : undefined,
    });
    return json({ ok: true }, 201);
  } catch (e) {
    return err(e);
  }
}
