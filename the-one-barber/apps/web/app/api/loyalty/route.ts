import { eng, err, json, platformGuard } from '@/lib/engine';

export const dynamic = 'force-dynamic';

// GET — loyalty program info + (optional) member lookup by phone.
// The stamp card: 9 stamps on completed hair cuts → 10th haircut free.
export async function GET(req: Request) {
  try {
    const e = eng();
    const url = new URL(req.url);
    const phone = url.searchParams.get('phone');
    const member = phone ? e.memberByPhone(phone) : undefined;
    return json({
      stampsForFree: e.db.settings.loyalty.stampsForFree,
      member: member
        ? {
            phone: member.phone,
            name: member.name,
            stamps: member.stamps,
            freeCutsClaimed: member.freeCutsClaimed,
            lifetimeSpend: member.lifetimeSpend,
            joinedAt: member.joinedAt,
          }
        : null,
    });
  } catch (e) {
    return err(e);
  }
}

// POST — join the loyalty card.
export async function POST(req: Request) {
  { const g = platformGuard(req); if (g) return g; }
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    if (name.length < 2) return err(new Error('Enter your name.'), 400);
    if (phone.replace(/\D/g, '').length < 9) return err(new Error('Enter a valid phone number.'), 400);
    const member = eng().upsertMember({ name, phone, email: body.email ? String(body.email) : undefined });
    return json({ member }, 201);
  } catch (e) {
    return err(e);
  }
}
