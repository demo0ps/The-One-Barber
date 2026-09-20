import { eng, err, json, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

// Staff action: tap a stamp (chair) or redeem the 10th free cut.
export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    const phone = String(body.phone ?? '');
    const action = body.action === 'redeem' ? 'redeem' : 'stamp';
    const note = body.note ? String(body.note) : undefined;
    const event = action === 'redeem' ? eng().redeemFreeCut(phone, note) : eng().addStamp(phone, note);
    return json({ event }, 201);
  } catch (e) {
    return err(e);
  }
}
