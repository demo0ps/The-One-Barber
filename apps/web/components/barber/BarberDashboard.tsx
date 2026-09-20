'use client';

import { useState } from 'react';
import { api, bumpRefresh } from '@/lib/api';
import { useEngineData } from '@/lib/sync';
import { localToday } from '@/lib/dates';
import { fmtDate, fmtR, timeAgo } from '@/lib/format';
import type { Staff } from '@/lib/staff';
import AllCalendar from '../AllCalendar';
import { Card, Empty, Stat, StatusChip, Tabs } from '../ui';

interface BookingRow {
  id: string;
  ref: string;
  clientName: string;
  clientPhone: string;
  service: string;
  serviceCategory: string;
  addOns?: string[];
  date: string;
  time: string;
  price: number;
  status: string;
  type: string;
  tip?: number;
  createdAt: string;
}

interface Report {
  kpi: { revenue: number; completed: number; commission: number; tips: number; net: number };
  byBarber: { name: string; completed: number; revenue: number; commission: number; tips: number; payout: number }[];
  byService: { name: string; count: number; revenue: number }[];
  daily: { date: string; revenue: number; count: number }[];
}

type Tab = 'today' | 'calendar' | 'earnings';
type Range = '7d' | '30d' | 'month';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function BarberDashboard({ staff }: { staff: Staff }) {
  const [tab, setTab] = useState<Tab>('today');
  const [range, setRange] = useState<Range>('30d');
  const [tipping, setTipping] = useState<string | null>(null);
  const [tipVal, setTipVal] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [stampOffer, setStampOffer] = useState<{ name: string; phone: string; stamps: number; free: number } | null>(null);
  const [stampBusy, setStampBusy] = useState(false);

  const today = localToday();
  const todayQ = useEngineData<{ rows: BookingRow[] }>(`/api/bookings?date=${today}&barberId=${staff.barberId}`);
  const reportQ = useEngineData<Report>(`/api/financials?range=${range}&barberId=${staff.barberId}`);
  const barbersQ = useEngineData<{ barbers: { id: string; name: string; image: string; title: string }[] }>('/api/barbers');

  const me = barbersQ.data?.barbers.find((b) => b.id === staff.barberId);
  const mine = (reportQ.data?.byBarber ?? []).find((b) => b.name === staff.name) ?? null;
  const rows = (todayQ.data?.rows ?? []).slice().sort((a, b) => a.time.localeCompare(b.time));
  const todayRevenue = rows.filter((r) => r.status === 'completed').reduce((s, r) => s + r.price, 0);
  const todayCount = rows.filter((r) => r.status !== 'canceled' && r.status !== 'no_show').length;
  const nextUp = rows.find((r) => r.status === 'confirmed' || r.status === 'in_progress');
  const maxDaily = Math.max(1, ...(reportQ.data?.daily ?? []).map((d) => d.revenue));
  const commPct = mine && mine.revenue > 0 ? Math.round((mine.commission / mine.revenue) * 100) : 50;

  const act = async (id: string, action: 'start' | 'complete', tip?: number) => {
    setMsg(null);
    try {
      await api(`/api/booking/${id}`, { method: 'PATCH', body: JSON.stringify({ action, tip }) });
      setTipping(null);
      setTipVal('');
      bumpRefresh();
      if (action === 'start') {
        setMsg('Service started. Clean hands, clean fade.');
        return;
      }
      // completed — offer the loyalty stamp when it counts (hair cuts only)
      const row = rows.find((r) => r.id === id);
      if (row && row.serviceCategory === 'hair_cut' && row.clientPhone) {
        try {
          const j = await api<{ member: { name: string; stamps: number } | null; stampsForFree: number }>(
            `/api/loyalty?phone=${encodeURIComponent(row.clientPhone)}`,
          );
          if (j.member) {
            setStampOffer({ name: j.member.name, phone: row.clientPhone, stamps: j.member.stamps, free: j.stampsForFree });
            setMsg(`Completed — ${row.clientName.split(' ')[0]}'s card has ${j.member.stamps} of ${j.stampsForFree} stamps.`);
            return;
          }
        } catch {
          // not a member — fall through to the plain message
        }
      }
      setMsg('Completed — your scoreboard just updated.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Action failed.');
    }
  };

  const tapStamp = async () => {
    if (!stampOffer) return;
    setStampBusy(true);
    try {
      await api('/api/loyalty/stamp', {
        method: 'POST',
        body: JSON.stringify({ phone: stampOffer.phone, action: 'stamp', note: `Hair cut completed by ${staff.name}` }),
      });
      const j = await api<{ member: { stamps: number } | null; stampsForFree: number }>(`/api/loyalty?phone=${encodeURIComponent(stampOffer.phone)}`);
      setStampOffer((o) => (o ? { ...o, stamps: j.member?.stamps ?? o.stamps, free: j.stampsForFree } : o));
      setMsg(
        j.member && j.member.stamps >= j.stampsForFree
          ? `Stamp added — ${stampOffer.name}'s card is FULL. Their next haircut is on the house.`
          : `Stamp added: ${j.member?.stamps} of ${j.stampsForFree}.`,
      );
      bumpRefresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Stamp failed.');
    } finally {
      setStampBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink">
      {/* Cockpit header — champagne identity */}
      <header className="sticky top-0 z-40 border-b border-champagne/25 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            {me ? (
              <img src={me.image} alt={me.name} className="h-12 w-12 rounded-full border-2 border-champagne/60 object-cover" />
            ) : (
              <img src="/images/logo.png" alt="The One Barber" className="h-12 w-auto" />
            )}
            <div>
              <div className="font-display text-xl font-semibold text-white">
                {greeting()}, <span className="text-champagne-light">{staff.name.split(' ')[0]}</span>
              </div>
              <div className="text-xs text-white/40">
                {me?.title ?? 'Barber'} · {fmtDate(today)} · your chair, your numbers
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {nextUp && (
              <div className="hidden text-right md:block">
                <div className="text-[10px] font-semibold tracking-[0.2em] text-champagne/70 uppercase">Next on your chair</div>
                <div className="text-sm font-semibold text-white">
                  {nextUp.time} · {nextUp.clientName}
                </div>
              </div>
            )}
            <button
              className="btn-ghost !px-4 !py-2 text-xs"
              onClick={() => {
                window.localStorage.removeItem('obb_staff');
                window.location.href = window.location.pathname;
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {/* Personal scoreboard */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-gold !border-champagne/40 p-5">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-white/40 uppercase">Today's line</div>
            <div className="mt-2 font-display text-3xl font-bold text-champagne-light">{todayCount}</div>
            <div className="mt-1 text-xs text-white/40">bookings on your chair</div>
          </div>
          <div className="card-gold !border-champagne/40 p-5">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-white/40 uppercase">Today's revenue</div>
            <div className="mt-2 font-display text-3xl font-bold text-champagne-light">{fmtR(todayRevenue)}</div>
            <div className="mt-1 text-xs text-white/40">completed so far</div>
          </div>
          <div className="card p-5">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-white/40 uppercase">
              {range === 'month' ? 'This month' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}
            </div>
            <div className="mt-2 font-display text-3xl font-bold text-white">{fmtR(mine?.revenue ?? 0)}</div>
            <div className="mt-1 text-xs text-white/40">{mine?.completed ?? 0} completed · {commPct}% commission</div>
          </div>
          <div className="card p-5">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-white/40 uppercase">Your payout</div>
            <div className="mt-2 font-display text-3xl font-bold text-white">{fmtR(mine?.payout ?? 0)}</div>
            <div className="mt-1 text-xs text-white/40">
              {fmtR(mine?.commission ?? 0)} commission + {fmtR(mine?.tips ?? 0)} tips
            </div>
          </div>
        </div>

        {msg && <div className="card border-champagne/40 bg-champagne/5 px-4 py-3 text-sm text-champagne-light">{msg}</div>}

        {stampOffer && (
          <div className="card-gold flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <div className="font-display text-lg font-semibold text-white">
                ★ {stampOffer.name} — stamp the card?
              </div>
              <div className="mt-1 text-xs text-white/50">
                Hair cuts earn one stamp. They&apos;re on <b className="text-champagne-light">{stampOffer.stamps} of {stampOffer.free}</b>
                {stampOffer.stamps >= stampOffer.free ? ' — the 10th cut is FREE, redeem it at the front desk.' : ` — ${stampOffer.free - stampOffer.stamps} to go.`}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-gold !px-5" onClick={tapStamp} disabled={stampBusy || stampOffer.stamps >= stampOffer.free}>
                {stampBusy ? 'Tapping…' : 'Tap stamp'}
              </button>
              <button className="btn-ghost" onClick={() => setStampOffer(null)}>Not a member</button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            tabs={[
              { id: 'today' as Tab, label: 'My line' },
              { id: 'calendar' as Tab, label: 'Calendar' },
              { id: 'earnings' as Tab, label: 'Earnings' },
            ]}
            active={tab}
            onChange={setTab}
          />
          {tab === 'earnings' && (
            <Tabs
              tabs={[
                { id: '7d' as Range, label: '7 days' },
                { id: '30d' as Range, label: '30 days' },
                { id: 'month' as Range, label: 'This month' },
              ]}
              active={range}
              onChange={setRange}
            />
          )}
        </div>

        {tab === 'today' && (
          <Card className="divide-y divide-white/5 overflow-hidden">
            {rows.length === 0 ? (
              <div className="p-6">
                <Empty text="No bookings on your chair today. Check the calendar — Monday calls." />
              </div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="w-14 shrink-0">
                    <div className="font-display text-lg font-semibold text-champagne-light">{r.time}</div>
                    <div className="text-[10px] text-white/30">{timeAgo(r.createdAt)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">{r.clientName}</div>
                    <div className="truncate text-xs text-white/45">
                      {r.service}{r.addOns?.length ? ` + ${r.addOns.join(' + ')}` : ''} · {fmtR(r.price)} {r.type === 'walk_in' && '· walk-in'}
                    </div>
                  </div>
                  <StatusChip status={r.status} />
                  <div className="flex gap-2">
                    {r.status === 'confirmed' && (
                      <>
                        <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => act(r.id, 'start')}>Start</button>
                        <button className="btn-gold !px-3 !py-1.5 text-xs" onClick={() => { setTipping(r.id); setTipVal(''); }}>Complete</button>
                      </>
                    )}
                    {r.status === 'in_progress' && (
                      <button className="btn-gold !px-3 !py-1.5 text-xs" onClick={() => { setTipping(r.id); setTipVal(''); }}>Finish cut</button>
                    )}
                  </div>
                  {tipping === r.id && (
                    <div className="mt-2 flex w-full items-center gap-2 rounded-xl border border-champagne/40 bg-champagne/5 px-4 py-3">
                      <span className="text-sm text-white/60">Tip (optional):</span>
                      <input
                        className="input !w-24 !py-1.5 text-sm"
                        placeholder="R0"
                        value={tipVal}
                        onChange={(e) => setTipVal(e.target.value.replace(/\D/g, ''))}
                      />
                      <button className="btn-gold !px-4 !py-1.5 text-xs" onClick={() => act(r.id, 'complete', tipVal ? Number(tipVal) : undefined)}>
                        Confirm {fmtR(r.price + (tipVal ? Number(tipVal) : 0))}
                      </button>
                      <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setTipping(null)}>Skip</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </Card>
        )}

        {tab === 'calendar' && <AllCalendar highlightBarberId={staff.barberId} title="All-calendar · your column highlighted" />}

        {tab === 'earnings' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <Card className="p-6">
                <div className="font-display text-lg font-semibold text-white">Your earnings</div>
                <div className="mt-4 space-y-3 text-sm">
                  <ERow k="Revenue (your bookings)" v={fmtR(mine?.revenue ?? 0)} />
                  <ERow k={`Commission (${commPct}% share)`} v={fmtR(mine?.commission ?? 0)} />
                  <ERow k="Tips (all yours)" v={fmtR(mine?.tips ?? 0)} />
                  <div className="hairline pt-3">
                    <ERow k="Total payout" v={fmtR(mine?.payout ?? 0)} big gold />
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="mb-4 font-display text-lg font-semibold text-white">Last 14 days — your daily revenue</div>
                <div className="flex h-36 items-end gap-1.5">
                  {(reportQ.data?.daily ?? []).map((d) => (
                    <div key={d.date} className="group relative flex-1">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-champagne-deep to-champagne-light transition group-hover:brightness-125"
                        style={{ height: `${Math.max(3, (d.revenue / maxDaily) * 140)}px` }}
                      />
                      <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-smoke px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                        {fmtR(d.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-white/30">
                  <span>{reportQ.data?.daily[0]?.date.slice(5)}</span>
                  <span>today</span>
                </div>
              </Card>
            </div>
            <div className="card-gold !border-champagne/30 flex flex-col justify-center p-8">
              <div className="text-[11px] font-semibold tracking-[0.25em] text-champagne uppercase">How your payout works</div>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                Every captured payment — online via PayFast, card at the chair&apos;s payment machine, or cash — automatically
                books your share. You get <b className="text-champagne-light">{commPct}% commission on every completed service</b>{' '}
                plus <b className="text-champagne-light">100% of tips</b>. Same numbers the admin sees — one engine, no spreadsheets.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] tracking-wider text-white/40 uppercase">Services</div>
                  <div className="font-display text-2xl font-bold text-white">{mine?.completed ?? 0}</div>
                </div>
                <div>
                  <div className="text-[11px] tracking-wider text-white/40 uppercase">Avg ticket</div>
                  <div className="font-display text-2xl font-bold text-white">
                    {fmtR(mine && mine.completed ? mine.revenue / mine.completed : 0)}
                  </div>
                </div>
              </div>
              {(reportQ.data?.byService ?? []).length > 0 && (
                <div className="mt-6 space-y-1.5 border-t border-white/10 pt-4">
                  <div className="text-[11px] tracking-wider text-white/40 uppercase">Your top services</div>
                  {reportQ.data!.byService.slice(0, 3).map((sv) => (
                    <div key={sv.name} className="flex justify-between text-sm">
                      <span className="text-white/70">{sv.name}</span>
                      <span className="font-semibold text-champagne-light">{sv.count}× · {fmtR(sv.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ERow({ k, v, big = false, gold = false }: { k: string; v: string; big?: boolean; gold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{k}</span>
      <span className={`font-semibold ${big ? 'font-display text-xl' : ''} ${gold ? 'text-champagne-light' : 'text-white'}`}>{v}</span>
    </div>
  );
}
