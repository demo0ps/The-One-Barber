import { eng, json } from '@/lib/engine';
export const dynamic = 'force-dynamic';

const SUPER_PW = process.env.SUPERADMIN_PASSWORD ?? 'Eliteflow26';

export async function GET() {
  const d = eng().db as unknown as { platformEnabled?: boolean };
  return json({ enabled: d.platformEnabled !== false, version: eng().db.version });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const pw = String(body.password ?? '').trim();
    if (pw !== SUPER_PW) return json({ error: 'Wrong super-admin password.' }, 401);
    const enabled = body.enabled != null ? Boolean(body.enabled) : undefined;
    const e = eng();
    if (enabled === undefined) {
      // toggle
      const cur = (e.db as unknown as { platformEnabled?: boolean }).platformEnabled !== false;
      e.setPlatformEnabled(!cur);
    } else {
      e.setPlatformEnabled(enabled);
    }
    const d = e.db as unknown as { platformEnabled?: boolean };
    return json({ ok: true, enabled: d.platformEnabled !== false, version: e.db.version });
  } catch (e2) {
    return json({ error: e2 instanceof Error ? e2.message : 'Toggle failed.' }, 500);
  }
}
