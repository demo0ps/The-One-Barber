// ---------------------------------------------------------------------------
// Financial engine — pure functions over the DB. Every number shown in the
// admin & barber dashboards comes from here, so all dashboards agree.
// ---------------------------------------------------------------------------

import { addDays, monthKey, monthLabel, todayStr } from './calendar';
import type { DB } from './types';

export type Range = '7d' | '30d' | '90d' | 'month';

export function rangeBounds(range: Range, today: string): { from: string; to: string } {
  switch (range) {
    case '7d':
      return { from: addDays(today, -6), to: today };
    case '90d':
      return { from: addDays(today, -89), to: today };
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today };
    case '30d':
    default:
      return { from: addDays(today, -29), to: today };
  }
}

export interface BarberMoney {
  barberId: string;
  name: string;
  image: string;
  completed: number;
  revenue: number;
  commission: number;
  tips: number;
  payout: number;
}

export interface ServiceMoney {
  serviceId: string;
  name: string;
  count: number;
  revenue: number;
  cost: number;
  margin: number;
}

export interface FinancialsReport {
  range: Range;
  from: string;
  to: string;
  kpi: {
    revenue: number;
    completed: number;
    avgTicket: number;
    commission: number;
    tips: number;
    productCost: number;
    expenses: number;
    net: number;
    taxProvision: number;
    cash: number;
    card: number;
  };
  byBarber: BarberMoney[];
  byService: ServiceMoney[];
  pl: { label: string; amount: number; kind: 'head' | 'minus' | 'total' }[];
  budget: { category: string; budget: number; actual: number; pct: number }[];
  forecast: { label: string; value: number }[];
  daily: { date: string; revenue: number; count: number }[];
}

function paidAmount(db: DB, bookingId: string): number | null {
  const p = db.payments.find((x) => x.bookingId === bookingId && x.status === 'captured');
  return p ? p.amount : null;
}

export function report(db: DB, range: Range, barberId?: string): FinancialsReport {
  const today = todayStr();
  const { from, to } = rangeBounds(range, today);
  const inRange = (d: string) => d >= from && d <= to;
  const barbers = db.barbers.filter((b) => b.active && (!barberId || b.id === barberId));

  const completed = db.bookings.filter(
    (b) => inRange(b.date) && b.status === 'completed' && (!barberId || b.barberId === barberId),
  );

  let revenue = 0;
  let commission = 0;
  let tips = 0;
  let productCost = 0;
  const barberAcc = new Map<string, BarberMoney>();
  const serviceAcc = new Map<string, ServiceMoney>();

  for (const b of barbers) {
    barberAcc.set(b.id, { barberId: b.id, name: b.name, image: b.image, completed: 0, revenue: 0, commission: 0, tips: 0, payout: 0 });
  }

  for (const bk of completed) {
    const rawAmount = paidAmount(db, bk.id) ?? bk.price - (bk.discount ?? 0);
    const barber = db.barbers.find((x) => x.id === bk.barberId);
    const svc = db.services.find((x) => x.id === bk.serviceId);
    const tip = bk.tip ?? 0;
    // payment may already include tip (new flow: online tip at booking / walk-in tip at assign)
    // detect inclusive payment: rawAmount === service price + tip
    const basePrice = bk.price - (bk.discount ?? 0);
    const includesTip = tip > 0 && Math.abs(rawAmount - (basePrice + tip)) < 0.01;
    const serviceAmount = includesTip ? rawAmount - tip : rawAmount;

    revenue += serviceAmount;
    tips += tip;
    productCost += svc?.cost ?? 0;
    if (barber) commission += serviceAmount * barber.commission;

    const bm = barberAcc.get(barber?.id ?? '');
    if (bm) {
      bm.completed += 1;
      bm.revenue += serviceAmount;
      bm.commission += serviceAmount * (barber!.commission);
      bm.tips += tip;
    }
    const sm = serviceAcc.get(bk.serviceId) ?? {
      serviceId: bk.serviceId,
      name: svc?.name ?? 'Service',
      count: 0,
      revenue: 0,
      cost: 0,
      margin: 0,
    };
    sm.count += 1;
    sm.revenue += serviceAmount;
    sm.cost += svc?.cost ?? 0;
    serviceAcc.set(bk.serviceId, sm);
  }

  const expenseList = db.expenses.filter((e) => inRange(e.date));
  const expenses = expenseList.reduce((s, e) => s + e.amount, 0);
  const byCategory = new Map<string, number>();
  for (const e of expenseList) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);

  let cash = 0;
  let card = 0;
  for (const bk of completed) {
    const p = db.payments.find((x) => x.bookingId === bk.id && x.status === 'captured');
    if (!p) continue;
    if (p.method === 'cash') cash += p.amount;
    else card += p.amount;
  }

  const net = revenue - productCost - commission - expenses;
  const byBarber = [...barberAcc.values()].map((b) => ({ ...b, payout: b.commission + b.tips })).sort(
    (a, b) => b.revenue - a.revenue,
  );
  const byService = [...serviceAcc.values()].map((s) => ({ ...s, margin: s.revenue - s.cost })).sort((a, b) => b.revenue - a.revenue);

  // P&L rows
  const pl: FinancialsReport['pl'] = [
    { label: 'Revenue (completed services)', amount: revenue, kind: 'head' },
    { label: 'Product cost', amount: -productCost, kind: 'minus' },
    { label: 'Barber commissions', amount: -commission, kind: 'minus' },
  ];
  for (const [category, amount] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    pl.push({ label: category, amount: -amount, kind: 'minus' });
  }
  pl.push({ label: 'Net profit', amount: net, kind: 'total' });

  // Budget vs actual (current month)
  const mk = monthKey(today);
  const budget: FinancialsReport['budget'] = db.budgets.map((b) => {
    const actual = db.expenses
      .filter((e) => e.category === b.category && monthKey(e.date) === mk)
      .reduce((s, e) => s + e.amount, 0);
    return { category: b.category, budget: b.amount, actual, pct: b.amount > 0 ? Math.min(1, actual / b.amount) : 0 };
  });

  // 3-month forecast: last-30-day daily average, gentle growth curve
  const { from: f30, to: t30 } = rangeBounds('30d', today);
  let rev30 = 0;
  for (const bk of db.bookings) {
    if (bk.status === 'completed' && bk.date >= f30 && bk.date <= t30) {
      const raw = paidAmount(db, bk.id) ?? bk.price - (bk.discount ?? 0);
      const tip = bk.tip ?? 0;
      const base = bk.price - (bk.discount ?? 0);
      const includesTip = tip > 0 && Math.abs(raw - (base + tip)) < 0.01;
      rev30 += includesTip ? raw - tip : raw;
    }
  }
  const avgPerDay = rev30 / 30;
  const forecast: FinancialsReport['forecast'] = [];
  for (let i = 1; i <= 3; i++) {
    const [y, m] = today.split('-').map(Number);
    const key = `${new Date(y, m - 1 + i, 1).getFullYear()}-${String(new Date(y, m - 1 + i, 1).getMonth() + 1).padStart(2, '0')}`;
    forecast.push({ label: monthLabel(key), value: Math.round(avgPerDay * 30 * (1 + (i - 1) * 0.04)) });
  }

  // Last 14 days (for charts)
  const daily: FinancialsReport['daily'] = [];
  for (let i = 13; i >= 0; i--) {
    const date = addDays(today, -i);
    let rev = 0;
    let count = 0;
    for (const bk of db.bookings) {
      if (bk.status === 'completed' && bk.date === date && (!barberId || bk.barberId === barberId)) {
        const raw = paidAmount(db, bk.id) ?? bk.price - (bk.discount ?? 0);
        const tip = bk.tip ?? 0;
        const base = bk.price - (bk.discount ?? 0);
        const includesTip = tip > 0 && Math.abs(raw - (base + tip)) < 0.01;
        rev += includesTip ? raw - tip : raw;
        count += 1;
      }
    }
    daily.push({ date, revenue: rev, count });
  }

  return {
    range,
    from,
    to,
    kpi: {
      revenue,
      completed: completed.length,
      avgTicket: completed.length ? revenue / completed.length : 0,
      commission,
      tips,
      productCost,
      expenses,
      net,
      taxProvision: revenue * db.settings.taxRate,
      cash,
      card,
    },
    byBarber,
    byService,
    pl,
    budget,
    forecast,
    daily,
  };
}

/** Lightweight "today" numbers for the reception & barber dashboards. */
export function todayStats(db: DB) {
  const today = todayStr();
  const todays = db.bookings.filter((b) => b.date === today);
  const completed = todays.filter((b) => b.status === 'completed');
  const revenue = completed.reduce((s, b) => {
    const raw = paidAmount(db, b.id) ?? b.price - (b.discount ?? 0);
    const tip = b.tip ?? 0;
    const base = b.price - (b.discount ?? 0);
    const includesTip = tip > 0 && Math.abs(raw - (base + tip)) < 0.01;
    return s + (includesTip ? raw - tip : raw);
  }, 0);
  const walkIns = todays.filter((b) => b.type === 'walk_in' && b.status !== 'canceled' && b.status !== 'no_show');
  const unassigned = todays.filter((b) => !b.barberId && (b.status === 'confirmed' || b.status === 'pending_payment'));
  const inProgress = todays.filter((b) => b.status === 'in_progress');
  return {
    date: today,
    total: todays.filter((b) => b.status !== 'canceled').length,
    completed: completed.length,
    revenue,
    walkIns: walkIns.length,
    unassigned: unassigned.length,
    inProgress: inProgress.length,
  };
}
