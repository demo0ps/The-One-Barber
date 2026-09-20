import { eng } from '@/lib/engine';
import { todayStr } from '@the-one-barber/engine';

export const dynamic = 'force-dynamic';

// CRM export — CSV download ready for Elite Way Holding's CRM import.
export async function GET() {
  const rows = eng().crmClients();
  const stampsForFree = eng().db.settings.loyalty.stampsForFree;
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['Name', 'Phone', 'Email', 'Visits', 'Total spend (ZAR)', 'Last visit', `Loyalty stamps (of ${stampsForFree})`, 'Free cuts claimed'];
  const body = rows.map((c) =>
    [c.name, c.phone, c.email, c.visits, c.spend, c.lastVisit, c.stamps === null ? '' : c.stamps, c.freeCutsClaimed ?? ''].map(esc).join(','),
  );
  const csv = [header.map(esc).join(','), ...body].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="the-one-barber-crm-${todayStr()}.csv"`,
    },
  });
}
