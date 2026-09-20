import { eng, json } from '@/lib/engine';
import { monthKey, todayStr } from '@the-one-barber/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const mk = monthKey(todayStr());
  const expenses = eng()
    .db.expenses.filter((e) => monthKey(e.date) === mk)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  return json({ expenses });
}
