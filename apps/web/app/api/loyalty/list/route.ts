import { eng, json } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const e = eng();
  const members = e.db.loyalty
    .map((m) => ({
      phone: m.phone,
      name: m.name,
      email: m.email ?? '',
      stamps: m.stamps,
      freeCutsClaimed: m.freeCutsClaimed,
      lifetimeSpend: m.lifetimeSpend,
      joinedAt: m.joinedAt,
    }))
    .sort((a, b) => b.stamps - a.stamps || b.lifetimeSpend - a.lifetimeSpend);
  return json({
    stampsForFree: e.db.settings.loyalty.stampsForFree,
    members,
    log: e.db.loyaltyLog.slice(0, 25),
  });
}
