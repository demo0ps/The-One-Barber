import { eng, err, json, num, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json({ inventory: eng().db.inventory });
}

export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    if (body.id != null) {
      eng().adjustInventory(String(body.id), num(body.delta));
      return json({ ok: true, inventory: eng().db.inventory });
    }
    if (!body.name) return err(new Error('Item name is required.'), 400);
    const item = eng().addInventoryItem({
      name: String(body.name),
      unit: String(body.unit ?? 'unit'),
      unitCost: num(body.unitCost),
      stock: num(body.stock),
      lowAt: num(body.lowAt, 5),
    });
    return json({ item }, 201);
  } catch (e) {
    return err(e);
  }
}
