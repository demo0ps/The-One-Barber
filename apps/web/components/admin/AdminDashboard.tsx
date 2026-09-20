'use client';

import { useMemo, useState } from 'react';
import { api, bumpRefresh } from '@/lib/api';
import { useEngineData } from '@/lib/sync';
import { localToday } from '@/lib/dates';
import { fmtDate, fmtR } from '@/lib/format';
import type { Staff } from '@/lib/staff';
import StaffSwitcher from '../staff/StaffSwitcher';
import { Card, Empty, Field, Progress, Stat, Tabs } from '../ui';

type Range = '7d' | '30d' | '90d' | 'month';
type Tab = 'overview' | 'barbers' | 'prices' | 'money' | 'customers' | 'loyalty' | 'inventory' | 'expenses' | 'settings';

interface Report {
  from: string;
  to: string;
  kpi: {
    revenue: number; completed: number; avgTicket: number; commission: number; tips: number;
    productCost: number; expenses: number; net: number; taxProvision: number; cash: number; card: number;
  };
  byBarber: { barberId: string; name: string; image: string; completed: number; revenue: number; commission: number; tips: number; payout: number }[];
  byService: { serviceId: string; name: string; count: number; revenue: number; cost: number; margin: number }[];
  pl: { label: string; amount: number; kind: string }[];
  budget: { category: string; budget: number; actual: number; pct: number }[];
  forecast: { label: string; value: number }[];
  daily: { date: string; revenue: number; count: number }[];
}

interface BarberRow { id: string; name: string; title: string; image: string; commission: number; active: boolean; bio?: string; pin?: string }
interface ServiceRow { id: string; name: string; price: number; cost: number; durationMin: number; description: string; active: boolean; category: string; from?: boolean; addOn?: boolean; addOnOnly?: boolean }
interface MemberRow { phone: string; name: string; email: string; stamps: number; freeCutsClaimed: number; lifetimeSpend: number; joinedAt: string }
interface LoyaltyLogRow { id: string; phone: string; memberName: string; action: string; note: string; at: string }
interface InventoryRow { id: string; name: string; unit: string; unitCost: number; stock: number; lowAt: number }
interface ExpenseRow { id: string; category: string; amount: number; note: string; date: string }
interface ClientRow { id: string; name: string; phone: string; email: string; visits: number; spend: number; lastVisit: string; stamps: number | null; freeCutsClaimed: number | null }
interface PriceChange { id: string; serviceName: string; oldPrice: number; newPrice: number; at: string }
interface BookingRow { id: string; clientName: string; service: string; date: string; time: string; status: string; price: number; tip?: number }

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◈' },
  { id: 'barbers', label: 'Barbers', icon: '✂' },
  { id: 'prices', label: 'Services & Prices', icon: 'R' },
  { id: 'money', label: 'Money', icon: 'R' },
  { id: 'customers', label: 'Customers (CRM)', icon: '✉' },
  { id: 'loyalty', label: 'Loyalty card', icon: '★' },
  { id: 'inventory', label: 'Inventory', icon: '▣' },
  { id: 'expenses', label: 'Expenses & Budget', icon: '−' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export default function AdminDashboard({ staff }: { staff: Staff }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [range, setRange] = useState<Range>('30d');
  const [showAddBarber, setShowAddBarber] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reportQ = useEngineData<Report>(`/api/financials?range=${range}`);
  const barbersQ = useEngineData<{ barbers: BarberRow[] }>('/api/barbers', { headers: { 'x-admin-pin': '9201' } });
  const servicesQ = useEngineData<{ services: ServiceRow[] }>('/api/services?all=1');
  const clientsQ = useEngineData<{ clients: ClientRow[] }>('/api/clients/list');
  const loyaltyQ = useEngineData<{ members: MemberRow[]; log: LoyaltyLogRow[]; stampsForFree: number }>('/api/loyalty/list');

  const say = (m: string) => { setMsg(m); setErr(null); bumpRefresh(); };
  const fail = (e: unknown) => { setErr(e instanceof Error ? e.message : 'Something failed.'); setMsg(null); };

  const k = reportQ.data?.kpi;
  const cashPct = k && k.cash + k.card > 0 ? k.cash / (k.cash + k.card) : 0;

  return (
    <div className="min-h-screen bg-ink">
      {/* ─── Sidebar + top bar (bronze identity) ─── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-bronze/25 bg-coal/95 lg:flex">
        <div className="border-b border-bronze/20 px-5 py-5">
          <div className="flex flex-col items-center gap-2">
            <img src="/images/logo.png" alt="The One Barber" className="w-40 max-w-full h-auto" />
            <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase">Money Room</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                tab === n.id ? 'bg-bronze/15 text-bronze-light' : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={`w-4 text-center ${tab === n.id ? 'text-bronze' : 'text-white/30'}`}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-bronze/20 p-3">
          <StaffSwitcher current="admin" />
          <button
            className="btn-gold mt-2 w-full !py-2 text-xs"
            onClick={() => { setTab('barbers'); setShowAddBarber(true); }}
          >
            ＋ Add barber
          </button>
          <button
            className="mt-2 w-full cursor-pointer rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 hover:text-white"
            onClick={() => { window.localStorage.removeItem('obb_staff'); window.location.href = window.location.pathname; }}
          >
            ⎋ Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-56">
        <header className="sticky top-0 z-30 border-b border-bronze/25 bg-ink/90 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-3 lg:hidden">
              <img src="/images/logo.png" alt="The One Barber" className="h-9 w-auto" />
              <div>
                <div className="font-display text-sm font-semibold tracking-wider text-white">MONEY ROOM</div>
                <StaffSwitcher current="admin" />
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="font-display text-xl font-semibold text-white">{NAV.find((n) => n.id === tab)?.label}</div>
              <div className="text-xs text-white/40">Pretoria · one engine, every number below is live</div>
            </div>
            <div className="flex items-center gap-3">
              <Tabs
                tabs={[
                  { id: '7d' as Range, label: '7d' },
                  { id: '30d' as Range, label: '30d' },
                  { id: '90d' as Range, label: '90d' },
                  { id: 'month' as Range, label: 'Month' },
                ]}
                active={range}
                onChange={setRange}
              />
              <button className="btn-gold !px-4 !py-2 text-xs lg:hidden" onClick={() => { setTab('barbers'); setShowAddBarber(true); }}>＋ Barber</button>
              <button
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 hover:text-white"
                onClick={() => { window.localStorage.removeItem('obb_staff'); window.location.href = window.location.pathname; }}
                title="Sign out of Money Room"
              >
                ⎋ Sign out
              </button>
            </div>
          </div>
          {/* mobile nav */}
          <div className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium ${tab === n.id ? 'bg-bronze text-black' : 'bg-white/5 text-white/60'}`}>
                {n.label}
              </button>
            ))}
            <button
              onClick={() => { window.localStorage.removeItem('obb_staff'); window.location.href = window.location.pathname; }}
              className="ml-auto shrink-0 cursor-pointer rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200"
            >
              ⎋ Sign out
            </button>
          </div>
        </header>

        <main className="space-y-6 px-5 py-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Stat label="Revenue" value={fmtR(k?.revenue ?? 0)} sub={`${k?.completed ?? 0} completed`} accent />
            <Stat label="Net profit" value={fmtR(k?.net ?? 0)} sub="after everything" />
            <Stat label="Avg ticket" value={fmtR(k?.avgTicket ?? 0)} sub="per service" />
            <Stat label="Commissions due" value={fmtR(k?.commission ?? 0)} sub={`+ tips ${fmtR(k?.tips ?? 0)}`} />
            <Stat label="Tax set-aside" value={fmtR(k?.taxProvision ?? 0)} sub="15% — take it" />
            <Stat label="Cash / Card" value={`${Math.round(cashPct * 100)} / ${100 - Math.round(cashPct * 100)}`} sub={`${fmtR(k?.cash ?? 0)} / ${fmtR(k?.card ?? 0)}`} />
          </div>

          {msg && <div className="card border-bronze/40 bg-bronze/5 px-4 py-3 text-sm text-bronze-light">{msg}</div>}
          {err && <div className="card border-rose-400/30 px-4 py-3 text-sm text-rose-300">{err}</div>}

          {tab === 'overview' && (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="p-6">
                <div className="mb-4 font-display text-lg font-semibold text-white">
                  Profit &amp; loss <span className="ml-2 text-xs font-normal text-white/40">{reportQ.data?.from} → {reportQ.data?.to}</span>
                </div>
                <div className="space-y-2 text-sm">
                  {(reportQ.data?.pl ?? []).map((row, i) => (
                    <div key={i} className={`flex items-center justify-between ${row.kind === 'total' ? 'hairline mt-3 pt-3' : ''}`}>
                      <span className={row.kind === 'total' ? 'font-display text-base font-semibold text-white' : 'text-white/55'}>{row.label}</span>
                      <span className={`font-semibold ${row.amount < 0 ? 'text-white/70' : row.kind === 'total' ? 'font-display text-lg text-bronze-light' : 'text-white'}`}>
                        {row.amount < 0 ? '− ' : ''}{fmtR(Math.abs(row.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="mb-4 font-display text-lg font-semibold text-white">Budget vs actual <span className="text-xs font-normal text-white/40">this month</span></div>
                  <div className="space-y-4">
                    {(reportQ.data?.budget ?? []).map((b) => (
                      <div key={b.category}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-medium text-white/70">{b.category}</span>
                          <span className={b.pct > 1 ? 'text-rose-300' : 'text-white/45'}>{fmtR(b.actual)} of {fmtR(b.budget)}</span>
                        </div>
                        <Progress pct={b.pct} />
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="mb-4 font-display text-lg font-semibold text-white">3-month forecast</div>
                  <div className="grid grid-cols-3 gap-3">
                    {(reportQ.data?.forecast ?? []).map((f) => (
                      <div key={f.label} className="rounded-xl border border-bronze/25 bg-bronze/5 p-3 text-center">
                        <div className="text-[10px] font-semibold tracking-wider text-white/40 uppercase">{f.label}</div>
                        <div className="mt-1 font-display text-lg font-bold text-bronze-light">{fmtR(f.value)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <Card className="p-6 xl:col-span-2">
                <div className="mb-4 font-display text-lg font-semibold text-white">Service profitability</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] tracking-wider text-white/35 uppercase">
                        <th className="py-2 pr-4">Service</th><th className="py-2 pr-4">Bookings</th><th className="py-2 pr-4">Revenue</th>
                        <th className="py-2 pr-4">Product cost</th><th className="py-2 pr-4">Margin</th><th className="py-2">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(reportQ.data?.byService ?? []).map((s) => (
                        <tr key={s.serviceId}>
                          <td className="py-2.5 pr-4 font-medium text-white">{s.name}</td>
                          <td className="py-2.5 pr-4 text-white/60">{s.count}</td>
                          <td className="py-2.5 pr-4 text-white/80">{fmtR(s.revenue)}</td>
                          <td className="py-2.5 pr-4 text-white/50">{fmtR(s.cost)}</td>
                          <td className="py-2.5 pr-4 font-semibold text-emerald-300">{fmtR(s.margin)}</td>
                          <td className="py-2.5 font-semibold text-bronze-light">{s.revenue ? Math.round((s.margin / s.revenue) * 100) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {tab === 'barbers' && <BarbersTab barbers={barbersQ.data?.barbers ?? []} money={reportQ.data?.byBarber ?? []} range={range} showAdd={showAddBarber} onCloseAdd={() => setShowAddBarber(false)} onSaved={say} onFail={fail} />}

          {tab === 'prices' && <PricesTab services={servicesQ.data?.services ?? []} onSaved={say} onFail={fail} />}

          {tab === 'money' && <MoneyTab report={reportQ.data} />}

          {tab === 'customers' && <CustomersTab clients={clientsQ.data?.clients ?? []} />}

          {tab === 'loyalty' && (
            <LoyaltyTab
              members={loyaltyQ.data?.members ?? []}
              log={loyaltyQ.data?.log ?? []}
              stampsForFree={loyaltyQ.data?.stampsForFree ?? 9}
              onSaved={say}
              onFail={fail}
            />
          )}

          {tab === 'inventory' && <InventoryTab onSaved={say} onFail={fail} />}

          {tab === 'expenses' && <ExpensesTab onSaved={say} onFail={fail} budget={reportQ.data?.budget ?? []} />}

          {tab === 'settings' && <SettingsTab onSaved={say} onFail={fail} />}
        </main>
      </div>
    </div>
  );
}

// ─── BARBERS ────────────────────────────────────────────────────────────────

function BarbersTab({ barbers, money, range, showAdd, onCloseAdd, onSaved, onFail }: {
  barbers: BarberRow[];
  money: Report['byBarber'];
  range: Range;
  showAdd: boolean;
  onCloseAdd: () => void;
  onSaved: (m: string) => void;
  onFail: (e: unknown) => void;
}) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [commission, setCommission] = useState('50');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [editingPin, setEditingPin] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<BarberRow | null>(null);

  const uploadPhoto = async (f: File | null) => {
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Upload failed');
      setPhoto(j.url);
      onSaved('Profile photo uploaded — it now shows on the website and every dashboard.');
    } catch (e) {
      onFail(e);
    } finally {
      setUploading(false);
    }
  };

  const add = async () => {
    if (name.trim().length < 2) return onFail(new Error('Barber name is required.'));
    try {
      await api('/api/barbers', {
        method: 'POST',
        body: JSON.stringify({ name, title, commission: Number(commission) / 100, bio, image: photo || undefined }),
      });
      setName(''); setTitle(''); setCommission('50'); setBio(''); setPhoto('');
      onCloseAdd();
      onSaved(`Barber ${name} created — bookable on the website and allocatable at reception, right now.`);
    } catch (e) { onFail(e); }
  };

  const toggle = async (b: BarberRow) => {
    try {
      await api('/api/barbers', { method: 'PATCH', body: JSON.stringify({ id: b.id, active: !b.active }) });
      onSaved(`${b.name} is now ${b.active ? 'retired (hidden from booking)' : 'active (bookable again)'}.`);
    } catch (e) { onFail(e); }
  };

  const saveCommission = async (b: BarberRow) => {
    const v = Number(editing[b.id] ?? b.commission * 100);
    if (isNaN(v) || v < 0 || v > 100) return onFail(new Error('Commission must be 0–100%.'));
    try {
      await api('/api/barbers', { method: 'PATCH', body: JSON.stringify({ id: b.id, commission: v / 100 }) });
      onSaved(`${b.name} now earns ${v}% commission.`);
    } catch (e) { onFail(e); }
  };

  const savePin = async (b: BarberRow) => {
    const v = String(editingPin[b.id] ?? b.pin ?? '').trim();
    if (!/^\d{4}$/.test(v)) return onFail(new Error('PIN must be exactly 4 digits.'));
    try {
      await api('/api/barbers', { method: 'PATCH', body: JSON.stringify({ id: b.id, pin: v }) });
      onSaved(`${b.name}'s PIN is now ${v} — tell them before they try to sign in again.`);
    } catch (e) { onFail(e); }
  };

  return (
    <div className="space-y-6">
      {showAdd && (
        <Card className="border-bronze/40 p-6">
          <div className="flex items-center justify-between">
            <div className="font-display text-lg font-semibold text-white">New barber profile</div>
            <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={onCloseAdd}>✕ Close</button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[140px_1fr]">
            <div>
              <span className="label">Profile photo</span>
              {photo ? (
                <img src={photo} alt="preview" className="h-32 w-32 rounded-xl border border-bronze/40 object-cover" />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-white/20 text-xs text-white/30">
                  {uploading ? 'Uploading…' : 'No photo yet'}
                </div>
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="input mt-2 !py-1.5 text-xs"
                onChange={(e) => uploadPhoto(e.target.files?.[0] ?? null)} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Full name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mpho Nkwe" /></Field>
              <Field label="Title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Detail Specialist" /></Field>
              <Field label="Commission %">
                <input className="input" value={commission} onChange={(e) => setCommission(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
              </Field>
              <Field label="Bio (shown on the website)"><input className="input" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="One line that sells him" /></Field>
              <div className="md:col-span-2">
                <button className="btn-gold" onClick={add}>Create profile & open for bookings</button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {barbers.map((b) => {
          const m = money.find((x) => x.barberId === b.id);
          return (
            <Card key={b.id} className={`p-5 ${!b.active ? 'opacity-60' : ''}`}>
              <div className="flex gap-4">
                <img src={b.image} alt={b.name} className="h-16 w-16 rounded-xl border border-bronze/40 object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-display text-lg font-semibold text-white">{b.name}</div>
                    <span className={`chip ${b.active ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/15 bg-white/5 text-white/40'}`}>
                      {b.active ? 'Active' : 'Retired'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold tracking-wider text-bronze-light uppercase">{b.title}</div>
                  {b.bio && <div className="mt-1 truncate text-xs text-white/40">{b.bio}</div>}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-ink px-2 py-2">
                  <div className="text-[9px] tracking-wider text-white/35 uppercase">{range === 'month' ? 'Month' : range} revenue</div>
                  <div className="font-display text-base font-bold text-white">{fmtR(m?.revenue ?? 0)}</div>
                </div>
                <div className="rounded-lg bg-ink px-2 py-2">
                  <div className="text-[9px] tracking-wider text-white/35 uppercase">Payout</div>
                  <div className="font-display text-base font-bold text-bronze-light">{fmtR(m?.payout ?? 0)}</div>
                </div>
                <div className="rounded-lg bg-ink px-2 py-2">
                  <div className="text-[9px] tracking-wider text-white/35 uppercase">Services</div>
                  <div className="font-display text-base font-bold text-white">{m?.completed ?? 0}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/40">Commission</span>
                <input
                  className="input !w-16 !py-1.5 text-sm"
                  value={editing[b.id] ?? String(Math.round(b.commission * 100))}
                  onChange={(e) => setEditing({ ...editing, [b.id]: e.target.value.replace(/\D/g, '') })}
                />
                <span className="text-xs text-white/40">%</span>
                <button className="btn-ghost !px-2.5 !py-1.5 text-[11px]" onClick={() => saveCommission(b)}>Save</button>
                <div className="ml-auto flex gap-2">
                  <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setDetail(b)}>Revenue detail →</button>
                  <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => toggle(b)}>{b.active ? 'Retire' : 'Reinstate'}</button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/40">Sign-in PIN</span>
                <input
                  className="input !w-20 !py-1.5 text-center font-mono text-sm tracking-[0.25em]"
                  value={editingPin[b.id] ?? b.pin ?? ''}
                  placeholder="••••"
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(e) => setEditingPin({ ...editingPin, [b.id]: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                />
                <button className="btn-gold !px-2.5 !py-1.5 text-[11px]" onClick={() => savePin(b)}>Save PIN</button>
                <span className="ml-1 text-[10px] tracking-wide text-white/25">Issued here — each barber signs in with their own code.</span>
              </div>
            </Card>
          );
        })}
      </div>

      {detail && <BarberDetail barber={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function BarberDetail({ barber, onClose }: { barber: BarberRow; onClose: () => void }) {
  const q = useEngineData<Report>(`/api/financials?range=30d&barberId=${barber.id}`);
  const bq = useEngineData<{ rows: BookingRow[] }>(`/api/bookings?barberId=${barber.id}`);
  const data = q.data;
  const maxDaily = Math.max(1, ...(data?.daily ?? []).map((d) => d.revenue));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-bronze/30 bg-coal p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <img src={barber.image} alt={barber.name} className="h-14 w-14 rounded-xl border border-bronze/40 object-cover" />
            <div>
              <div className="font-display text-xl font-semibold text-white">{barber.name}</div>
              <div className="text-xs tracking-wider text-bronze-light uppercase">{barber.title}</div>
            </div>
          </div>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={onClose}>✕ Close</button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="card p-4"><div className="text-[10px] tracking-wider text-white/35 uppercase">30-day revenue</div><div className="font-display text-2xl font-bold text-white">{fmtR(data?.kpi.revenue ?? 0)}</div></div>
          <div className="card p-4"><div className="text-[10px] tracking-wider text-white/35 uppercase">30-day payout</div><div className="font-display text-2xl font-bold text-bronze-light">{fmtR((data?.byBarber[0]?.payout) ?? 0)}</div></div>
        </div>

        <div className="card mt-4 p-4">
          <div className="mb-3 text-xs font-semibold tracking-wider text-white/40 uppercase">Last 14 days</div>
          <div className="flex h-28 items-end gap-1">
            {(data?.daily ?? []).map((d) => (
              <div key={d.date} className="group relative flex-1">
                <div className="w-full rounded-t bg-gradient-to-t from-bronze-deep to-bronze-light" style={{ height: `${Math.max(3, (d.revenue / maxDaily) * 110)}px` }} />
                <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-smoke px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                  {d.date.slice(5)} · {fmtR(d.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card mt-4 p-4">
          <div className="mb-2 text-xs font-semibold tracking-wider text-white/40 uppercase">Top services (30d)</div>
          {(data?.byService ?? []).slice(0, 4).map((s) => (
            <div key={s.serviceId} className="flex justify-between py-1 text-sm">
              <span className="text-white/70">{s.name}</span>
              <span className="font-semibold text-white">{s.count}× · {fmtR(s.revenue)}</span>
            </div>
          ))}
        </div>

        <div className="card mt-4 p-4">
          <div className="mb-2 text-xs font-semibold tracking-wider text-white/40 uppercase">Latest bookings</div>
          {(bq.data?.rows ?? []).slice(0, 8).map((b) => (
            <div key={b.id} className="flex items-center justify-between border-b border-white/5 py-2 text-sm last:border-0">
              <div>
                <div className="font-medium text-white">{b.clientName}</div>
                <div className="text-xs text-white/40">{b.service} · {fmtDate(b.date)} {b.time}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-white">{fmtR(b.price + (b.tip ?? 0))}</div>
                <div className="text-[10px] uppercase text-white/35">{b.status.replace('_', ' ')}</div>
              </div>
            </div>
          ))}
          {(bq.data?.rows ?? []).length === 0 && <div className="py-4 text-sm text-white/35">No bookings yet.</div>}
        </div>
      </div>
    </div>
  );
}

// ─── SERVICES & PRICES ──────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  hair_cut: 'Hair cut',
  beard: 'Beard',
  kids: 'Kids',
  senior: 'Senior',
  colour: 'Colour',
};

function PricesTab({ services, onSaved, onFail }: { services: ServiceRow[]; onSaved: (m: string) => void; onFail: (e: unknown) => void }) {
  const histQ = useEngineData<{ history: PriceChange[] }>('/api/price-history');
  const [price, setPrice] = useState<Record<string, string>>({});
  const [cost, setCost] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [p, setP] = useState('');
  const [c, setC] = useState('');
  const [dur, setDur] = useState('30');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('hair_cut');
  const [fromFlag, setFromFlag] = useState(false);
  const [addOnFlag, setAddOnFlag] = useState(false);
  const [addOnOnlyFlag, setAddOnOnlyFlag] = useState(false);

  const publish = async (s: ServiceRow) => {
    const np = Number(price[s.id] ?? s.price);
    if (isNaN(np) || np <= 0) return onFail(new Error('Enter a valid price.'));
    try {
      await api('/api/services', { method: 'PATCH', body: JSON.stringify({ id: s.id, price: np, cost: Number(cost[s.id] ?? s.cost) }) });
      onSaved(np !== s.price
        ? `New price issued: ${s.name} ${fmtR(s.price)} → ${fmtR(np)}. The client menu updated instantly and the change is logged in price history.`
        : `${s.name} saved — price list unchanged.`);
    } catch (e) { onFail(e); }
  };

  const toggle = async (s: ServiceRow) => {
    try {
      await api('/api/services', { method: 'PATCH', body: JSON.stringify({ id: s.id, active: !s.active }) });
      onSaved(`${s.name} ${s.active ? 'retired — removed from the client menu (history kept)' : 'is back on the menu'}.`);
    } catch (e) { onFail(e); }
  };

  const add = async () => {
    if (name.trim().length < 2) return onFail(new Error('Service name is required.'));
    try {
      await api('/api/services', {
        method: 'POST',
        body: JSON.stringify({ name, price: Number(p), cost: Number(c), durationMin: Number(dur), description: desc, category, from: fromFlag, addOn: addOnFlag, addOnOnly: addOnOnlyFlag }),
      });
      setName(''); setP(''); setC(''); setDesc(''); setFromFlag(false); setAddOnFlag(false); setAddOnOnlyFlag(false);
      onSaved(`“${name}” published to the client menu with price ${fmtR(Number(p))}.`);
    } catch (e) { onFail(e); }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.2em] text-bronze uppercase">Price list</div>
            <div className="font-display text-lg font-semibold text-white">Issue new prices — live on the website the moment you save</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] tracking-wider text-white/35 uppercase">
                <th className="px-6 py-2.5">Service</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Price (R)</th><th className="px-4 py-2.5">Cost (R)</th>
                <th className="px-4 py-2.5">Duration</th><th className="px-4 py-2.5">Status</th><th className="px-6 py-2.5 text-right">Publish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {services.map((s) => (
                <tr key={s.id} className={`hover:bg-white/[0.02] ${!s.active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-3">
                    <div className="font-medium text-white">{s.name}</div>
                    <div className="max-w-52 truncate text-xs text-white/35">{s.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="chip border-white/15 bg-white/5 text-white/60">{CATEGORY_LABELS[s.category] ?? s.category}</span>
                      {s.addOn && (
                        <span className={`chip ${s.addOnOnly ? 'border-bronze/50 bg-bronze/15 text-bronze-light' : 'border-gold/40 bg-gold/10 text-gold-light'}`}>
                          {s.addOnOnly ? 'add-on only' : 'add-on'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {s.from && <span className="text-[10px] font-semibold tracking-wider text-bronze-light uppercase">from</span>}
                      <input className="input !w-20 !py-1.5" value={price[s.id] ?? String(s.price)} onChange={(e) => setPrice({ ...price, [s.id]: e.target.value.replace(/\D/g, '') })} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input className="input !w-20 !py-1.5" value={cost[s.id] ?? String(s.cost)} onChange={(e) => setCost({ ...cost, [s.id]: e.target.value.replace(/\D/g, '') })} />
                  </td>
                  <td className="px-4 py-3 text-white/60">{s.durationMin} min</td>
                  <td className="px-4 py-3">
                    <button className={`chip cursor-pointer ${s.active ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/15 bg-white/5 text-white/40'}`} onClick={() => toggle(s)}>
                      {s.active ? 'On menu' : 'Retired'}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button className="btn-gold !px-3 !py-1.5 text-xs" onClick={() => publish(s)}>Publish</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="font-display text-lg font-semibold text-white">New service</div>
          <div className="mt-4 space-y-3">
            <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bridal Cut" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (R)"><input className="input" value={p} onChange={(e) => setP(e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></Field>
              <Field label="Cost (R)"><input className="input" value={c} onChange={(e) => setC(e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></Field>
            </div>
            <Field label="Duration">
              <select className="input" value={dur} onChange={(e) => setDur(e.target.value)}>
                <option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option>
              </select>
            </Field>
            <Field label="Type">
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{label}{id === 'hair_cut' ? ' (earns a loyalty stamp)' : ''}</option>
                ))}
              </select>
            </Field>
            <Field label="Description"><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="One line on the menu" /></Field>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/60">
              <input type="checkbox" className="h-4 w-4 accent-[#D4AF37]" checked={fromFlag} onChange={(e) => setFromFlag(e.target.checked)} />
              “From” price — extras settled at the chair
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/60">
              <input type="checkbox" className="h-4 w-4 accent-[#D4AF37]" checked={addOnFlag} onChange={(e) => { setAddOnFlag(e.target.checked); if (e.target.checked) setAddOnOnlyFlag(true); }} />
              Offer as add-on (can be stacked on another service)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/60">
              <input type="checkbox" className="h-4 w-4 accent-[#D4AF37]" checked={addOnOnlyFlag} onChange={(e) => { setAddOnOnlyFlag(e.target.checked); if (e.target.checked) setAddOnFlag(true); }} />
              Add-on only — can&apos;t be booked on its own
            </label>
            <button className="btn-gold w-full" onClick={add}>Publish to menu</button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-3 font-display text-lg font-semibold text-white">Price history</div>
          {(histQ.data?.history ?? []).length === 0 && <div className="text-sm text-white/35">No price changes yet.</div>}
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {(histQ.data?.history ?? []).map((h) => (
              <div key={h.id} className="rounded-lg border border-white/10 bg-ink px-3 py-2 text-xs">
                <div className="font-medium text-white">{h.serviceName}</div>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className={h.newPrice > h.oldPrice ? 'text-rose-300' : 'text-emerald-300'}>
                    {fmtR(h.oldPrice)} → {fmtR(h.newPrice)}
                  </span>
                  <span className="text-white/30">{new Date(h.at).toLocaleDateString('en-ZA')}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── MONEY ──────────────────────────────────────────────────────────────────

function MoneyTab({ report }: { report: Report | null }) {
  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ['Barber', 'Completed', 'Revenue', 'Commission', 'Tips', 'Payout'],
      ...report.byBarber.map((b) => [b.name, b.completed, b.revenue.toFixed(2), b.commission.toFixed(2), b.tips.toFixed(2), b.payout.toFixed(2)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `the-one-barber-payouts-${report.from}-${report.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.2em] text-bronze uppercase">Barber payouts</div>
          <div className="font-display text-lg font-semibold text-white">Commission + tips, per barber</div>
        </div>
        <button className="btn-ghost !py-2 text-xs" onClick={exportCsv}>Export CSV</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] tracking-wider text-white/35 uppercase">
              <th className="px-6 py-2.5">Barber</th><th className="px-4 py-2.5">Completed</th><th className="px-4 py-2.5">Revenue</th>
              <th className="px-4 py-2.5">Commission</th><th className="px-4 py-2.5">Tips</th><th className="px-6 py-2.5 text-right">Payout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(report?.byBarber ?? []).map((b) => (
              <tr key={b.barberId} className="hover:bg-white/[0.02]">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <img src={b.image} alt={b.name} className="h-9 w-9 rounded-full border border-bronze/30 object-cover" />
                    <span className="font-medium text-white">{b.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/60">{b.completed}</td>
                <td className="px-4 py-3 text-white/80">{fmtR(b.revenue)}</td>
                <td className="px-4 py-3 text-white/70">{fmtR(b.commission)}</td>
                <td className="px-4 py-3 text-white/70">{fmtR(b.tips)}</td>
                <td className="px-6 py-3 text-right font-display text-base font-bold text-bronze-light">{fmtR(b.payout)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── CUSTOMERS (CRM) ────────────────────────────────────────────────────────

function EliteWayAd({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="https://www.eliteway.co.za"
      target="_blank"
      rel="noreferrer"
      className={`block rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/15 via-ink to-ink p-4 transition hover:border-gold/70 ${compact ? '' : 'flex items-center justify-between gap-4'}`}
    >
      <div>
        <div className="text-[10px] font-semibold tracking-[0.25em] text-gold uppercase">Elite Way Holdings · CRM Upgrade</div>
        <div className={`font-display font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
          Add R500 to your monthly sub for dedicated CRM management by Elite Way Holdings.
        </div>
        <div className="mt-1 text-xs text-gold-light">elite → the customer list you already have, managed for you. →</div>
      </div>
      {!compact && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gold/50 font-display text-lg font-bold text-gold">E</div>}
    </a>
  );
}

function CustomersTab({ clients }: { clients: ClientRow[] }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => clients.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q.toLowerCase()))),
    [clients, q],
  );
  const withEmail = clients.filter((c) => c.email).length;

  return (
    <div className="space-y-6">
      <EliteWayAd />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.2em] text-bronze uppercase">Customer register</div>
            <div className="font-display text-lg font-semibold text-white">
              {clients.length} clients · {withEmail} with email · {fmtR(clients.reduce((s, c) => s + c.spend, 0))} lifetime spend
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input className="input !w-52 !py-2 text-xs" placeholder="Search name / phone / email" value={q} onChange={(e) => setQ(e.target.value)} />
            <a href="/api/clients/export" className="btn-gold !py-2 text-xs">Download for CRM (CSV)</a>
          </div>
        </div>
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-coal">
              <tr className="border-b border-white/10 text-[11px] tracking-wider text-white/35 uppercase">
                <th className="px-6 py-2.5">Client</th><th className="px-4 py-2.5">Contact</th><th className="px-4 py-2.5">Visits</th>
                <th className="px-4 py-2.5">Spend</th><th className="px-4 py-2.5">Last visit</th><th className="px-6 py-2.5">Loyalty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((c) => {
                const st = c.stamps;
                return (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3">
                    <div className="text-white/80">{c.phone}</div>
                    <div className="text-xs text-white/35">{c.email || 'no email yet'}</div>
                  </td>
                  <td className="px-4 py-3 text-white/60">{c.visits}</td>
                  <td className="px-4 py-3 font-semibold text-white">{fmtR(c.spend)}</td>
                  <td className="px-4 py-3 text-white/50">{c.lastVisit ? fmtDate(c.lastVisit) : '—'}</td>
                  <td className="px-6 py-3">
                    {st === null ? (
                      <span className="text-xs text-white/25">not on the card</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 9 }, (_, i) => (
                            <span key={i} className={`h-2 w-2 rounded-full ${i < st ? 'bg-bronze' : 'bg-white/10'}`} />
                          ))}
                        </div>
                        <span className="text-xs text-white/50">{st}/9</span>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-white/35">No clients match.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t border-white/10 px-6 py-3 text-[11px] text-white/35">
          The CSV download is ready for import into Elite Way Holding&apos;s CRM — names, phones, emails, visit history and spend.
        </div>
      </Card>
    </div>
  );
}

// ─── LOYALTY CARD (9 stamps → 10th cut free) ───────────────────────────────

function LoyaltyTab({ members, log, stampsForFree, onSaved, onFail }: {
  members: MemberRow[];
  log: LoyaltyLogRow[];
  stampsForFree: number;
  onSaved: (m: string) => void;
  onFail: (e: unknown) => void;
}) {
  const [busyPhone, setBusyPhone] = useState<string | null>(null);

  const act = async (m: MemberRow, action: 'stamp' | 'redeem') => {
    setBusyPhone(m.phone);
    try {
      await api('/api/loyalty/stamp', { method: 'POST', body: JSON.stringify({ phone: m.phone, action, note: action === 'redeem' ? 'Redeemed at the front desk' : undefined }) });
      onSaved(
        action === 'redeem'
          ? `${m.name}'s 10th cut redeemed — card restarted at 0 stamps. A FREE-cut record is on the books.`
          : `Stamp tapped for ${m.name}.`,
      );
      setBusyPhone(null);
    } catch (e) {
      onFail(e);
      setBusyPhone(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="text-[11px] font-semibold tracking-[0.2em] text-bronze uppercase">The stamp card</div>
          <div className="font-display text-lg font-semibold text-white">
            {stampsForFree} stamps on completed hair cuts → the 10th cut is free
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {members.map((m) => {
            const full = m.stamps >= stampsForFree;
            return (
              <div key={m.phone} className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{m.name}</span>
                      {full && <span className="chip border-bronze/40 bg-bronze/15 text-bronze-light">10th cut ready</span>}
                    </div>
                    <div className="text-xs text-white/40">
                      {m.phone} · {fmtR(m.lifetimeSpend)} lifetime · {m.freeCutsClaimed} free cut{m.freeCutsClaimed === 1 ? '' : 's'} claimed
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: stampsForFree }, (_, i) => (
                      <span key={i} className={`h-3.5 w-3.5 rounded-full border ${i < m.stamps ? 'border-bronze bg-bronze' : 'border-white/15 bg-ink'}`} />
                    ))}
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg font-bold text-bronze-light">{m.stamps}<span className="text-xs text-white/35">/{stampsForFree}</span></div>
                  </div>
                  <button
                    className="btn-ghost !px-3 !py-1.5 text-xs disabled:opacity-40"
                    disabled={busyPhone === m.phone || full}
                    onClick={() => act(m, 'stamp')}
                  >
                    + Stamp
                  </button>
                  <button
                    className={`btn-gold !px-3 !py-1.5 text-xs disabled:opacity-40`}
                    disabled={busyPhone === m.phone || !full}
                    onClick={() => act(m, 'redeem')}
                  >
                    Redeem free cut
                  </button>
                </div>
              </div>
            );
          })}
          {members.length === 0 && <div className="p-6"><Empty text="No members yet — clients sign up on the website." /></div>}
        </div>
      </Card>

      <Card className="h-fit p-6">
        <div className="mb-3 font-display text-lg font-semibold text-white">Recent card activity</div>
        {log.length === 0 && <div className="text-sm text-white/35">No stamps tapped yet.</div>}
        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {log.map((r) => (
            <div key={r.id} className="rounded-lg border border-white/10 bg-ink px-3 py-2 text-xs">
              <div className="flex justify-between">
                <span className="font-medium text-white">{r.memberName}</span>
                <span className={r.action === 'redeem' ? 'text-emerald-300' : 'text-bronze-light'}>
                  {r.action === 'redeem' ? '10th cut free' : '+1 stamp'}
                </span>
              </div>
              <div className="mt-0.5 flex justify-between text-white/35">
                <span className="truncate pr-2">{r.note}</span>
                <span className="shrink-0">{new Date(r.at).toLocaleDateString('en-ZA')}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}


// ─── INVENTORY ──────────────────────────────────────────────────────────────

function InventoryTab({ onSaved, onFail }: { onSaved: (m: string) => void; onFail: (e: unknown) => void }) {
  const listQ = useEngineData<{ inventory: InventoryRow[] }>('/api/inventory');
  const items = listQ.data?.inventory ?? [];
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('bottle');
  const [unitCost, setUnitCost] = useState('');
  const [stock, setStock] = useState('');
  const [lowAt, setLowAt] = useState('5');

  const adjust = async (id: string, delta: number, it: InventoryRow) => {
    try {
      await api('/api/inventory', { method: 'POST', body: JSON.stringify({ id, delta }) });
      if (delta > 0 && it.stock <= it.lowAt && it.stock + delta > it.lowAt) onSaved(`Restocked ${it.name} — back above the low-stock line.`);
      else bumpRefresh();
    } catch (e) { onFail(e); }
  };

  const add = async () => {
    if (name.trim().length < 2) return onFail(new Error('Item name is required.'));
    try {
      await api('/api/inventory', { method: 'POST', body: JSON.stringify({ name, unit, unitCost: Number(unitCost), stock: Number(stock), lowAt: Number(lowAt) }) });
      setName(''); setUnitCost(''); setStock('');
      onSaved(`Inventory item “${name}” added.`);
    } catch (e) { onFail(e); }
  };

  const low = items.filter((i) => i.stock <= i.lowAt);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.2em] text-bronze uppercase">Product stock</div>
            <div className="font-display text-lg font-semibold text-white">What&apos;s on the shelf</div>
          </div>
          {low.length > 0 && <span className="chip border-rose-400/30 bg-rose-400/10 text-rose-300">{low.length} low on stock</span>}
        </div>
        <div className="divide-y divide-white/5">
          {items.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium text-white">
                  {i.name}
                  {i.stock <= i.lowAt && <span className="chip border-rose-400/30 bg-rose-400/10 text-rose-300">low</span>}
                </div>
                <div className="text-xs text-white/40">{fmtR(i.unitCost)} per {i.unit} · alert at {i.lowAt}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => adjust(i.id, -1, i)}>−1</button>
                <div className={`w-16 rounded-lg border px-2 py-1.5 text-center font-display text-base font-bold ${i.stock <= i.lowAt ? 'border-rose-400/40 text-rose-300' : 'border-white/15 text-white'}`}>{i.stock}</div>
                <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => adjust(i.id, 10, i)}>+10</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="p-6"><Empty text="No items yet — add your first product on the right." /></div>}
        </div>
      </Card>
      <Card className="h-fit p-6">
        <div className="font-display text-lg font-semibold text-white">Add product</div>
        <div className="mt-4 space-y-3">
          <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beard balm (60ml)" /></Field>
          <Field label="Unit"><input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cost (R)"><input className="input" value={unitCost} onChange={(e) => setUnitCost(e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></Field>
            <Field label="Stock"><input className="input" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></Field>
            <Field label="Alert at"><input className="input" value={lowAt} onChange={(e) => setLowAt(e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></Field>
          </div>
          <button className="btn-gold w-full" onClick={add}>Add to inventory</button>
        </div>
      </Card>
    </div>
  );
}

// ─── EXPENSES & BUDGET ──────────────────────────────────────────────────────

function ExpensesTab({ onSaved, onFail, budget }: { onSaved: (m: string) => void; onFail: (e: unknown) => void; budget: Report['budget'] }) {
  const listQ = useEngineData<{ expenses: ExpenseRow[] }>('/api/expenses');
  const [category, setCategory] = useState('Products');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const cats = useMemo(() => Array.from(new Set(['Rent', 'Utilities', 'Products', 'Marketing', 'Maintenance', 'Misc', ...(listQ.data?.expenses ?? []).map((e) => e.category)])), [listQ.data]);

  const add = async () => {
    if (!amount) return onFail(new Error('Enter an amount.'));
    try {
      await api('/api/expense', { method: 'POST', body: JSON.stringify({ category, amount: Number(amount), note }) });
      setAmount(''); setNote('');
      onSaved(`Expense of ${fmtR(Number(amount))} logged under ${category}.`);
    } catch (e) { onFail(e); }
  };

  const saveBudget = async (cat: string) => {
    try {
      await api('/api/budget', { method: 'POST', body: JSON.stringify({ category: cat, amount: Number(budgets[cat] ?? 0) }) });
      onSaved(`Monthly budget for ${cat} set.`);
    } catch (e) { onFail(e); }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="p-6">
        <div className="font-display text-lg font-semibold text-white">Log an expense</div>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Amount (R)"><input className="input" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></Field>
          </div>
          <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. blade restock" /></Field>
          <button className="btn-gold w-full" onClick={add}>Log expense</button>
        </div>
        <div className="mt-6 space-y-3">
          <div className="font-display text-lg font-semibold text-white">Monthly budgets</div>
          {budget.map((b) => (
            <div key={b.category} className="rounded-xl border border-white/10 bg-ink p-3">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm font-medium text-white/80">{b.category}</span>
                <input className="input !w-28 !py-1.5 text-right" value={budgets[b.category] ?? String(b.budget)} onChange={(e) => setBudgets({ ...budgets, [b.category]: e.target.value.replace(/\D/g, '') })} />
                <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => saveBudget(b.category)}>Set</button>
              </div>
              <div className="mt-2"><Progress pct={b.pct} /></div>
              <div className="mt-1 text-[11px] text-white/35">{fmtR(b.actual)} spent this month</div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="text-[11px] font-semibold tracking-[0.2em] text-bronze uppercase">This month</div>
          <div className="font-display text-lg font-semibold text-white">Expense log</div>
        </div>
        <div className="max-h-[560px] divide-y divide-white/5 overflow-y-auto">
          {(listQ.data?.expenses ?? []).map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 px-6 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">{e.note}</div>
                <div className="text-xs text-white/35">{e.category} · {e.date}</div>
              </div>
              <div className="font-semibold text-white/80">{fmtR(e.amount)}</div>
            </div>
          ))}
          {(listQ.data?.expenses ?? []).length === 0 && <div className="p-6"><Empty text="No expenses this month. Suspiciously good." /></div>}
        </div>
      </Card>
    </div>
  );
}

// ─── SETTINGS ───────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function SettingsTab({ onSaved, onFail }: { onSaved: (m: string) => void; onFail: (e: unknown) => void }) {
  const settingsQ = useEngineData<{
    settings: { dayHours: { open: string; close: string }[]; taxRate: number; address: string; phone: string; addressNote: string };
  }>('/api/settings');
  const s = settingsQ.data?.settings;
  const [hours, setHours] = useState<Record<string, string>>({});
  const [tax, setTax] = useState(s ? String(Math.round(s.taxRate * 100)) : '15');
  const [confirmReset, setConfirmReset] = useState(false);

  const dh = s?.dayHours ?? [];
  const openOf = (i: number) => hours[`${i}-open`] ?? dh[i]?.open ?? '09:00';
  const closeOf = (i: number) => hours[`${i}-close`] ?? dh[i]?.close ?? '19:00';
  const setH = (i: number, k: 'open' | 'close', v: string) => setHours((p) => ({ ...p, [`${i}-${k}`]: v }));

  const save = async () => {
    try {
      const dayHours = DAY_LABELS.map((_, i) => ({ open: openOf(i), close: closeOf(i) }));
      await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ dayHours, taxRate: Number(tax) / 100 }) });
      onSaved('Trading hours saved — booking slots update on every screen immediately.');
    } catch (e) { onFail(e); }
  };

  const reset = async () => {
    try {
      await api('/api/reset', { method: 'POST' });
      setConfirmReset(false);
      onSaved('Fresh demo data loaded. All dashboards synced.');
    } catch (e) { onFail(e); }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="p-6">
        <div className="font-display text-lg font-semibold text-white">Trading hours</div>
        <p className="mt-1 text-xs text-white/45">
          We trade 7 days — the slot grid on every dashboard follows these hours. If open = close, that day reads as closed.
        </p>
        <div className="mt-4 space-y-2">
          {DAY_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-28 text-sm font-medium ${i === 0 ? 'text-bronze-light' : 'text-white/70'}`}>
                {label}
                {i === 0 && <span className="ml-1.5 text-[10px] text-white/35">& PH</span>}
              </div>
              <input className="input !w-28 !py-1.5" type="time" value={openOf(i)} onChange={(e) => setH(i, 'open', e.target.value)} />
              <span className="text-white/30">–</span>
              <input className="input !w-28 !py-1.5" type="time" value={closeOf(i)} onChange={(e) => setH(i, 'close', e.target.value)} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Field label="Tax set-aside %">
            <input className="input !w-24" value={tax} onChange={(e) => setTax(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
          </Field>
          <button className="btn-gold mt-5" onClick={save}>Save settings</button>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="font-display text-lg font-semibold text-white">Shop details</div>
          <p className="mt-1 text-xs text-white/45">Shown on the website footer and reception desk.</p>
          <div className="mt-4 space-y-1.5 text-sm text-white/70">
            <div className="font-medium text-white">{s?.address || '—'}</div>
            <div className="text-xs text-white/40">{s?.addressNote || ''}</div>
            <div className="pt-2">{s?.phone || '—'} · walk-ins welcome · appointments available</div>
          </div>
        </Card>
        <Card className="h-fit border-rose-400/20 p-6">
          <div className="font-display text-lg font-semibold text-rose-300">Danger zone</div>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            Reset all demo data: barbers, bookings, payments, loyalty cards, expenses — everything regenerates fresh around today&apos;s date.
          </p>
          {!confirmReset ? (
            <button className="btn-danger mt-5" onClick={() => setConfirmReset(true)}>Reset demo data…</button>
          ) : (
            <div className="mt-5 flex gap-2">
              <button className="btn-danger" onClick={reset}>Yes, wipe & reseed</button>
              <button className="btn-ghost" onClick={() => setConfirmReset(false)}>Keep my data</button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
