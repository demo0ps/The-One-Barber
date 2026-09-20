'use client';

import { useEffect, useState } from 'react';
import { api, bumpRefresh } from '@/lib/api';
import { useEngineData } from '@/lib/sync';
import { localToday, weekdayName } from '@/lib/dates';
import { fmtDate, fmtR, timeAgo } from '@/lib/format';
import type { Staff } from '@/lib/staff';
import AllCalendar from '../AllCalendar';
import { Empty, Field, Progress, Spinner } from '../ui';

interface WalkInRow {
  id: string;
  ref: string;
  clientName: string;
  clientPhone: string;
  service: string;
  price: number;
  status: string;
  createdAt: string;
}

interface TodayStats {
  total: number;
  completed: number;
  revenue: number;
  walkIns: number;
  unassigned: number;
  inProgress: number;
}

interface ServiceItem { id: string; name: string; price: number; from?: boolean; addOnOnly?: boolean }
interface BarberItem { id: string; name: string; image: string; active: boolean }

type PayMethod = 'cash' | 'card';

function LiveClock() {
  const [now, setNow] = useState('');
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setNow(d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-2xl font-bold tracking-widest text-steel-light tabular-nums">{now}</span>;
}

function Counter({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${accent ? 'border-steel/50 bg-steel/10' : 'border-white/10 bg-ink'}`}>
      <div className="text-[10px] font-semibold tracking-[0.18em] text-white/40 uppercase">{label}</div>
      <div className={`font-display text-3xl font-bold ${accent ? 'text-steel-light' : 'text-white'}`}>{value}</div>
    </div>
  );
}

/** Loyalty card at the chair: look up by phone, tap stamps, redeem the free 10th. */
function LoyaltyCard() {
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState<{ name: string; stamps: number; freeCutsClaimed: number } | null>(null);
  const [checked, setChecked] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [need, setNeed] = useState(9);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ stampsForFree: number; member: { name: string; stamps: number; freeCutsClaimed: number } | null }>(
      `/api/loyalty?phone=${encodeURIComponent(phone)}`,
    )
      .then((j) => {
        setNeed(j.stampsForFree);
        setMember(j.member);
        setChecked(phone.replace(/\D/g, '').length >= 9);
      })
      .catch(() => setChecked(false));
  }, [phone]);

  const act = async (action: 'stamp' | 'redeem') => {
    setBusy(true);
    setMsg(null);
    try {
      await api('/api/loyalty/stamp', { method: 'POST', body: JSON.stringify({ phone, action }) });
      bumpRefresh();
      const j = await api<{ stampsForFree: number; member: { name: string; stamps: number; freeCutsClaimed: number } | null }>(
        `/api/loyalty?phone=${encodeURIComponent(phone)}`,
      );
      setMember(j.member);
      setMsg(
        action === 'stamp'
          ? j.member && j.member.stamps >= j.stampsForFree
            ? `Stamp added — ${j.member.name}'s card is FULL. Their next haircut is FREE.`
            : `Stamp added: ${j.member?.stamps} of ${j.stampsForFree}.`
          : 'Free cut redeemed — card restarted at 0. No charge today.',
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const full = Boolean(member && member.stamps >= need);

  return (
    <div className="card-gold p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">★</span>
        <div>
          <div className="font-display text-lg font-semibold text-white">Loyalty card</div>
          <div className="text-[11px] text-white/45">9 stamps on hair cuts → the 10th cut is free</div>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Client phone…"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setChecked(false); setMsg(null); }}
          inputMode="tel"
        />
      </div>
      {checked && !member && (
        <div className="mt-3 rounded-lg border border-white/10 bg-ink px-3 py-2 text-xs text-white/50">
          Not on the card yet — ask them to sign up on the website (Loyalty section) or add them from Admin.
        </div>
      )}
      {member && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-white">{member.name}</div>
            <div className="text-xs text-white/45">{member.freeCutsClaimed} free cut{member.freeCutsClaimed === 1 ? '' : 's'} claimed</div>
          </div>
          {/* stamp grid */}
          <div className="mt-3 grid grid-cols-9 gap-1.5">
            {Array.from({ length: need }, (_, i) => (
              <div
                key={i}
                className={`flex h-8 items-center justify-center rounded-full border text-xs font-bold ${
                  i < member.stamps ? 'border-gold bg-gold text-black' : 'border-dashed border-white/20 text-white/25'
                }`}
              >
                {i < member.stamps ? '★' : i + 1}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-[11px] text-white/45">
              <span>{full ? 'Card full — 10th cut ready' : 'Towards the free cut'}</span>
              <span>{member.stamps} / {need}</span>
            </div>
            <Progress pct={member.stamps / need} />
          </div>
          <div className="mt-3 flex gap-2">
            <button className="btn-gold flex-1 !py-2 text-xs" disabled={busy || full} onClick={() => act('stamp')}>
              Tap stamp
            </button>
            <button className="btn-ghost flex-1 !py-2 text-xs" disabled={busy || !full} onClick={() => act('redeem')}>
              Redeem 10th free
            </button>
          </div>
          {msg && <div className="mt-3 rounded-lg border border-steel/40 bg-steel/5 px-3 py-2 text-xs text-steel-light">{msg}</div>}
        </div>
      )}
    </div>
  );
}

export default function ReceptionDashboard({ staff }: { staff: Staff }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [notes, setNotes] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // per-ticket slot booking state
  const [bookTicket, setBookTicket] = useState<string | null>(null);
  const [slotBarber, setSlotBarber] = useState('');
  const [slotDate, setSlotDate] = useState(() => localToday());
  const [slots, setSlots] = useState<string[] | null>(null);
  const [chosenSlot, setChosenSlot] = useState('');

  // calendar slot-click booking state
  const [slotPick, setSlotPick] = useState<{ barberId: string; time: string; date: string } | null>(null);
  const [pickName, setPickName] = useState('');
  const [pickPhone, setPickPhone] = useState('');
  const [pickService, setPickService] = useState('');

  const servicesQ = useEngineData<{ services: ServiceItem[] }>('/api/services');
  const barbersQ = useEngineData<{ barbers: BarberItem[] }>('/api/barbers');
  const queueQ = useEngineData<{ rows: WalkInRow[] }>('/api/bookings?queue=1');
  const statsQ = useEngineData<TodayStats>('/api/today');

  const services = servicesQ.data?.services ?? [];
  const barbers = (barbersQ.data?.barbers ?? []).filter((b) => b.active);
  const queue = queueQ.data?.rows ?? [];
  const s = statsQ.data;
  const today = localToday();

  const payLabel = (m: PayMethod, amount: number) =>
    m === 'card' ? `Card ${fmtR(amount)} captured at the chair (payment machine)` : `Cash ${fmtR(amount)} recorded`;

  // live slots for the ticket's chosen barber + day
  useEffect(() => {
    if (!bookTicket || !slotBarber || !serviceId) {
      setSlots(null);
      return;
    }
    setSlots(null);
    setChosenSlot('');
    api<{ slots: string[] }>(`/api/availability?barberId=${slotBarber}&date=${slotDate}&serviceId=${serviceId}`)
      .then((j) => setSlots(j.slots))
      .catch(() => setSlots([]));
  }, [bookTicket, slotBarber, slotDate, serviceId]);

  const addWalkIn = async (preset?: { barberId: string; time: string; date: string }) => {
    setErr(null);
    const useName = preset ? pickName : name;
    const usePhone = preset ? pickPhone : phone;
    const useService = preset ? pickService : serviceId;
    if (useName.trim().length < 2) return setErr('Client name is required.');
    if (!useService) return setErr('Pick a service.');
    try {
      const { booking } = await api<{ booking: { ref: string } }>('/api/walkins', {
        method: 'POST',
        body: JSON.stringify({
          name: useName,
          phone: usePhone,
          serviceId: useService,
          notes: preset ? undefined : notes,
          method: payMethod,
          tip: tip>0 ? tip : undefined,
          presetBarber: preset?.barberId,
          presetTime: preset?.time,
          presetDate: preset?.date,
          presetTip: tip>0 ? tip : undefined,
        }),
      });
      if (preset) {
        setMsg(`${booking.ref} booked on the calendar — ${payLabel(payMethod, 0).replace(/R[\d,\s]+/, '')} at the chair. Everyone's screens just updated.`);
        setSlotPick(null);
        setPickName(''); setPickPhone(''); setPickService('');
      } else {
        setName(''); setPhone(''); setNotes('');
        setMsg(`${booking.ref} is on the counter. Book a specific slot, or send them to the next free chair.`);
      }
      bumpRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add walk-in.');
    }
  };

  // rush = let the engine pick the soonest free chair (tries each active barber)
  const rushAuto = async (bookingId: string, clientName: string, price: number) => {
    setErr(null);
    for (const b of barbers) {
      try {
        const { booking } = await api<{ booking: { date: string; time: string } }>('/api/assign', {
          method: 'POST',
          body: JSON.stringify({ bookingId, barberId: b.id, date: slotDate, method: payMethod, tip: tip>0 ? tip : undefined }),
        });
        setMsg(`${clientName} → next free chair found (${fmtDate(booking.date)} ${booking.time}). ${payLabel(payMethod, price + (tip||0))}${tip>0 ? ` includes ${fmtR(tip)} tip` : ''}.`);
        setTip(0); setCustomTip('');
        bumpRefresh();
        return;
      } catch {
        // this barber had no slots — try the next one
      }
    }
    setErr('No free chairs in the next 7 days. Pick a specific slot later.');
  };

  const confirmSlot = async (ticketId: string, clientName: string, price: number) => {
    setErr(null);
    if (!slotBarber) return setErr('Choose a barber.');
    if (!chosenSlot) return setErr('Pick a time on the grid.');
    try {
      await api('/api/assign', {
        method: 'POST',
        body: JSON.stringify({ bookingId: ticketId, barberId: slotBarber, time: chosenSlot, date: slotDate, method: payMethod, tip: tip>0 ? tip : undefined }),
      });
      setMsg(`${clientName} booked for ${fmtDate(slotDate)} ${chosenSlot}. ${payLabel(payMethod, price + (tip||0))}${tip>0 ? ` includes ${fmtR(tip)} tip` : ''}.`);
      setBookTicket(null);
      setSlotBarber('');
      setChosenSlot('');
      setTip(0); setCustomTip('');
      bumpRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Slot not free anymore — pick another.');
    }
  };

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-40 border-b border-steel/25 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <img src="/images/logo.png" alt="The One Barber" className="h-11 w-auto" />
            <div>
              <div className="font-display text-lg font-semibold text-white">
                The Front Desk <span className="text-steel/60">·</span>{' '}
                <span className="text-steel-light">Reception</span>
              </div>
              <div className="text-xs text-white/40">Walk-ins welcome. Appointments available. The calendar is the truth.</div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-[10px] font-semibold tracking-[0.2em] text-steel/70 uppercase">Shop time</div>
              <LiveClock />
            </div>
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

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Counter label="On the books today" value={s?.total ?? 0} />
          <Counter label="Waiting for a chair" value={s?.unassigned ?? 0} accent />
          <Counter label="In the chair now" value={s?.inProgress ?? 0} />
          <Counter label="Walk-ins today" value={s?.walkIns ?? 0} />
          <Counter label="Card + cash today" value={fmtR(Math.round(s?.revenue ?? 0))} />
        </div>

        {msg && <div className="card border-steel/40 bg-steel/5 px-4 py-3 text-sm text-steel-light">{msg}</div>}
        {err && <div className="card border-rose-400/30 px-4 py-3 text-sm text-rose-300">{err}</div>}

        <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
          {/* LEFT — the walk-in platform */}
          <div className="space-y-6">
            <div className="card-gold p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-steel" />
                <span className="font-display text-lg font-semibold text-white">Walk-in counter</span>
              </div>
              <div className="space-y-3">
                <Field label="Client name">
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Who walked in?" />
                </Field>
                <Field label="Phone (optional — enables the loyalty card)">
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="072 000 0000" inputMode="tel" />
                </Field>
                <Field label="Service">
                  <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                    <option value="">Choose service…</option>
                    {services.map((sv) => (
                      <option key={sv.id} value={sv.id} disabled={sv.addOnOnly}>
                        {sv.name} — {sv.from ? 'from ' : ''}{fmtR(sv.price)}{sv.addOnOnly ? '  (add-on · books with a cut)' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[11px] text-white/35">
                    Line design &amp; enhancement are add-ons — put the cut on the counter, they go with it.
                  </span>
                </Field>
                <Field label="Notes (optional)">
                  <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Chiskop blade + line design" />
                </Field>
                <div>
                  <span className="label">Payment at the chair</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPayMethod('card')}
                      className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                        payMethod === 'card' ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/10 bg-ink text-white/60 hover:border-white/25'
                      }`}
                    >
                      💳 Card (payment machine)
                    </button>
                    <button
                      onClick={() => setPayMethod('cash')}
                      className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                        payMethod === 'cash' ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/10 bg-ink text-white/60 hover:border-white/25'
                      }`}
                    >
                      💵 Cash
                    </button>
                  </div>
                </div>
                <div>
                  <span className="label">Tip for barber <span className="normal-case text-white/30">(optional — R10/R20/R30/R50 or custom, 100% to barber)</span></span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[10,20,30,50].map(v=>(
                      <button key={v} onClick={()=>{ setTip(v); setCustomTip(''); }} className={`cursor-pointer rounded-lg border py-2 text-xs font-semibold transition \${tip===v ? 'border-gold bg-gold text-black' : 'border-white/10 bg-ink text-white/60 hover:border-gold/40'}`}>R{v}</button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={()=>{ setTip(0); setCustomTip(''); }} className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition \${tip===0 && !customTip ? 'border-white/30 bg-white/5 text-white' : 'border-white/10 bg-ink text-white/40'}`}>No tip</button>
                    <span className="text-xs text-white/40">Custom R</span>
                    <input className="input !py-1.5 text-xs" placeholder="e.g. 35" value={customTip} onChange={e=>{ const v=e.target.value.replace(/\D/g,'').slice(0,3); setCustomTip(v); const n=Number(v); if(v && !isNaN(n) && n>=5) setTip(n); else if(!v) setTip(0); }} inputMode="numeric" />
                    {tip>0 && <span className="text-xs font-semibold text-gold-light">{fmtR(tip)} tip</span>}
                  </div>
                </div>
                <button className="btn-gold w-full" onClick={() => addWalkIn()}>
                  Put on the counter {tip>0 ? `· ${fmtR(tip)} tip` : ''}
                </button>
              </div>
            </div>

            <LoyaltyCard />

            <div className="card overflow-hidden">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-[11px] font-semibold tracking-[0.2em] text-steel uppercase">Waiting for a chair</div>
                <div className="font-display text-lg font-semibold text-white">
                  {queue.length} {queue.length === 1 ? 'ticket' : 'tickets'}
                </div>
              </div>
              {queue.length === 0 ? (
                <div className="p-5">
                  <Empty text="Counter is clear. Enjoy it while it lasts." />
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {queue.map((w, i) => (
                    <div key={w.id} className="border-l-4 border-steel/70 px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-steel/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-steel-light">
                              #{String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="font-semibold text-white">{w.clientName}</span>
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            {w.service} · {fmtR(w.price)} · arrived {timeAgo(w.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="btn-gold flex-1 !py-2 text-xs"
                          onClick={() => {
                            setBookTicket(bookTicket === w.id ? null : w.id);
                            setSlotBarber('');
                            setChosenSlot('');
                          }}
                        >
                          Book a specific slot
                        </button>
                        <button className="btn-ghost flex-1 !py-2 text-xs" onClick={() => rushAuto(w.id, w.clientName, w.price)}>
                          ⚡ Next free chair
                        </button>
                      </div>

                      {bookTicket === w.id && (
                        <div className="mt-3 rounded-xl border border-steel/40 bg-steel/5 p-3">
                          <div className="grid grid-cols-2 gap-2">
                            <select className="input !py-2 text-xs" value={slotBarber} onChange={(e) => setSlotBarber(e.target.value)}>
                              <option value="">Barber…</option>
                              {barbers.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                            <select className="input !py-2 text-xs" value={slotDate} onChange={(e) => setSlotDate(e.target.value)}>
                              {Array.from({ length: 7 }, (_, i) => {
                                const d = new Date(); d.setDate(d.getDate() + i);
                                const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                return (
                                  <option key={ds} value={ds}>
                                    {ds === today ? 'Today' : `${weekdayName(ds)} ${ds.slice(8, 10)}`}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          {!slotBarber ? (
                            <div className="mt-2 text-xs text-white/40">Choose a barber to see his free slots.</div>
                          ) : slots === null ? (
                            <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
                              <Spinner /><span>Checking live availability…</span>
                            </div>
                          ) : slots.length === 0 ? (
                            <div className="mt-2 text-xs text-amber-300">No free slots that day — try another day.</div>
                          ) : (
                            <div className="mt-2 grid max-h-40 grid-cols-4 gap-1.5 overflow-y-auto pr-1">
                              {slots.map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setChosenSlot(t)}
                                  className={`cursor-pointer rounded-md border px-1 py-1.5 text-xs font-medium transition ${
                                    chosenSlot === t ? 'border-gold bg-gold text-black' : 'border-white/10 bg-ink text-white/70 hover:border-steel'
                                  }`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 rounded-lg border border-gold/20 bg-gold/5 p-2">
                            <div className="text-[10px] font-semibold tracking-wider text-gold/70 uppercase">Tip at the chair {tip>0 ? `· ${fmtR(tip)}` : '(optional)'}</div>
                            <div className="mt-1.5 grid grid-cols-4 gap-1">
                              {[10,20,30,50].map(v=>(
                                <button key={v} onClick={()=>{ setTip(v); setCustomTip(''); }} className={`cursor-pointer rounded-md border py-1.5 text-xs font-semibold transition \${tip===v ? 'border-gold bg-gold text-black' : 'border-white/10 bg-ink text-white/60'}`}>R{v}</button>
                              ))}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <button onClick={()=>{ setTip(0); setCustomTip(''); }} className={`cursor-pointer rounded-md border px-2 py-1 text-xs \${tip===0 && !customTip ? 'border-white/20 bg-white/5 text-white' : 'border-white/10 bg-ink text-white/40'}`}>No tip</button>
                              <input className="input !py-1 text-xs" placeholder="Custom R" value={customTip} onChange={e=>{ const v=e.target.value.replace(/\D/g,'').slice(0,3); setCustomTip(v); const n=Number(v); if(v && !isNaN(n) && n>=5) setTip(n); else if(!v) setTip(0); }} inputMode="numeric" />
                            </div>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              className="btn-gold flex-1 !py-2 text-xs"
                              disabled={!slotBarber || !chosenSlot}
                              onClick={() => confirmSlot(w.id, w.clientName, w.price)}
                            >
                              {chosenSlot ? `Confirm ${chosenSlot} · ${payMethod === 'card' ? 'card' : 'cash'} ${fmtR(w.price)}` : 'Confirm booking'}
                            </button>
                            <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setBookTicket(null)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — the all-calendar with click-to-book */}
          <div className="space-y-4">
            {slotPick && (
              <div className="card-gold p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-white/70">
                    <b className="text-gold-light">Book this slot:</b>{' '}
                    {barbers.find((b) => b.id === slotPick.barberId)?.name} · {fmtDate(slotPick.date)} {slotPick.time}
                  </div>
                  <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setSlotPick(null)}>✕ Close</button>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <input className="input !py-2 text-xs" placeholder="Client name *" value={pickName} onChange={(e) => setPickName(e.target.value)} />
                  <input className="input !py-2 text-xs" placeholder="Phone (optional — loyalty card)" value={pickPhone} onChange={(e) => setPickPhone(e.target.value)} />
                  <select className="input !py-2 text-xs" value={pickService} onChange={(e) => setPickService(e.target.value)}>
                    <option value="">Service *</option>
                    {services.map((sv) => (
                      <option key={sv.id} value={sv.id} disabled={sv.addOnOnly}>
                        {sv.name} — {sv.from ? 'from ' : ''}{fmtR(sv.price)}{sv.addOnOnly ? '  (add-on · books with a cut)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 rounded-xl border border-gold/20 bg-gold/5 p-3">
                  <div className="text-[10px] font-semibold tracking-wider text-gold/60 uppercase">Tip at the chair {tip>0 ? `· ${fmtR(tip)}` : '(optional)'}</div>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {[10,20,30,50].map(v=>(
                      <button key={v} onClick={()=>{ setTip(v); setCustomTip(''); }} className={`cursor-pointer rounded-lg border py-1.5 text-xs font-semibold transition \${tip===v ? 'border-gold bg-gold text-black' : 'border-white/10 bg-ink text-white/60'}`}>R{v}</button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <button onClick={()=>{ setTip(0); setCustomTip(''); }} className={`cursor-pointer rounded-md border px-2 py-1 text-xs \${tip===0 && !customTip ? 'border-white/20 bg-white/5 text-white' : 'border-white/10 bg-ink text-white/40'}`}>No tip</button>
                    <input className="input !py-1 text-xs" placeholder="Custom R" value={customTip} onChange={e=>{ const v=e.target.value.replace(/\D/g,'').slice(0,3); setCustomTip(v); const n=Number(v); if(v && !isNaN(n) && n>=5) setTip(n); else if(!v) setTip(0); }} inputMode="numeric" />
                    {tip>0 && <span className="text-xs font-semibold text-gold-light">{fmtR(tip)} tip with {fmtR(services.find(s=>s.id===pickService)?.price ?? 0)} service</span>}
                  </div>
                </div>
                <button
                  className="btn-gold mt-3 w-full !py-2 text-xs"
                  disabled={pickName.trim().length < 2 || !pickService}
                  onClick={() => addWalkIn(slotPick)}
                >
                  Book & take {payMethod === 'card' ? 'card at the payment machine' : 'cash'} on the spot
                </button>
              </div>
            )}
            <AllCalendar title="All-calendar — live · click an empty slot to book it" onSlotClick={(barberId, time, date) => setSlotPick({ barberId, time, date })} />
          </div>
        </div>

        <footer className="border-t border-white/5 pt-5 text-center text-xs text-white/30">
          Shop 22, Michael House, 472 Stanza Bopape Street, Arcadia, Pretoria, 0007 · {''}
          <a href="tel:0814875017" className="text-white/50">081 487 5017</a> ·{' '}
          <a href="https://wa.me/27814875017" target="_blank" rel="noreferrer" className="text-white/50">WhatsApp</a> ·{' '}
          <a href="https://www.instagram.com/theonebarberstudio_" target="_blank" rel="noreferrer" className="text-white/50">@theonebarberstudio_</a>
        </footer>
      </main>
    </div>
  );
}
