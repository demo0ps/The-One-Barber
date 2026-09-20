'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { fmtDate, fmtR } from '@/lib/format';
import { Card, Field } from '../ui';

interface ServiceItem { id: string; name: string; price: number; durationMin: number; from?: boolean; addOn?: boolean; addOnOnly?: boolean }
interface BarberItem { id: string; name: string; title: string; image: string; active: boolean }

interface LoyaltyPreview {
  stampsForFree: number;
  member: { phone: string; name: string; stamps: number } | null;
}

const STEPS = ['Service', 'Barber', 'Time', 'Details', 'Pay'];

function daysAhead(n: number): string {
  const d = new Date(Date.now() + n * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BookingWizard({ services, barbers }: { services: ServiceItem[]; barbers: BarberItem[] }) {
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState('');
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loyalty, setLoyalty] = useState<LoyaltyPreview | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState('');

  const service = services.find((s) => s.id === serviceId);
  const barber = barbers.find((b) => b.id === barberId);
  // main service candidates: everything except add-on-only services
  // (line design & black enhancement spray go WITH a cut, never on their own)
  const primaries = services.filter((s) => !s.addOnOnly);
  const addOns = services.filter((s) => s.addOn && s.id !== serviceId);
  const chosenAddOns = addOns.filter((s) => addOnIds.includes(s.id));

  // loyalty card lookup when phone stabilises
  useEffect(() => {
    if (phone.replace(/\D/g, '').length < 9) {
      setLoyalty({ stampsForFree: 9, member: null });
      return;
    }
    api<LoyaltyPreview>(`/api/loyalty?phone=${encodeURIComponent(phone)}`)
      .then((j) => setLoyalty(j))
      .catch(() => setLoyalty({ stampsForFree: 9, member: null }));
  }, [phone]);

  // slots when barber + date + service chosen (duration includes add-ons)
  useEffect(() => {
    if (!barberId || !date || !serviceId) {
      setSlots(null);
      return;
    }
    setSlots(null);
    const totalMin = (service?.durationMin ?? 0) + chosenAddOns.reduce((s, a) => s + a.durationMin, 0);
    api<{ slots: string[] }>(
      `/api/availability?barberId=${barberId}&date=${date}&serviceId=${serviceId}&duration=${totalMin}`,
    )
      .then((j) => setSlots(j.slots))
      .catch(() => setSlots([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId, date, serviceId, addOnIds.join(',')]);

  // We trade 7 days — every day of the next two weeks is bookable.
  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => daysAhead(i)), []);

  const total = (service?.price ?? 0) + chosenAddOns.reduce((s, a) => s + a.price, 0);
  const totalWithTip = total + (tip || 0);

  const stepValid = [
    Boolean(serviceId),
    Boolean(barberId),
    Boolean(date && time),
    name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 9,
    true,
  ][step];

  const pay = async () => {
    setError(null);
    setPaying(true);
    try {
      const { booking } = await api<{ booking: { id: string } }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceId,
          barberId,
          date,
          time,
          name,
          phone,
          email,
          addOnIds,
          tip: tip > 0 ? tip : undefined,
        }),
      });
      const session = await api<{ mode: string; url?: string; form?: { action: string; fields: Record<string, string> } }>(
        '/api/payments/session',
        { method: 'POST', body: JSON.stringify({ bookingId: booking.id }) },
      );
      if (session.mode === 'payfast' && session.form) {
        // real PayFast hosted checkout — submit hidden form to the gateway
        const f = document.createElement('form');
        f.method = 'POST';
        f.action = session.form.action;
        for (const [k, v] of Object.entries(session.form.fields)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = k;
          input.value = v;
          f.appendChild(input);
        }
        document.body.appendChild(f);
        f.submit();
      } else if (session.url) {
        window.location.href = session.url;
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      setPaying(false);
    }
  };

  return (
    <Card className="p-6 md:p-8">
      {/* stepper */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border text-xs font-bold transition ${
                i < step
                  ? 'border-gold/60 bg-gold/15 text-gold-light'
                  : i === step
                    ? 'border-gold bg-gold text-black'
                    : 'border-white/15 text-white/30'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </button>
            <span className={`hidden text-xs font-medium sm:block ${i === step ? 'text-white' : 'text-white/35'}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-white/10" />}
          </div>
        ))}
      </div>

      {/* STEP 1 — service (+ add-ons) */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="grid gap-2">
            {primaries.map((s) => (
              <button
                key={s.id}
                onClick={() => { setServiceId(s.id); setTime(''); setAddOnIds([]); }}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3.5 text-left transition ${
                  serviceId === s.id ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-ink hover:border-white/25'
                }`}
              >
                <div>
                  <div className="font-semibold text-white">{s.name}</div>
                  <div className="text-xs text-white/40">{s.durationMin} min{s.from ? ' · final price settled at the chair' : ''}</div>
                </div>
                <div className="font-display text-lg font-semibold text-gold">
                  {s.from && <span className="mr-1 align-middle text-[10px] font-bold tracking-wider text-white/40 uppercase">from</span>}
                  {fmtR(s.price)}
                </div>
              </button>
            ))}
          </div>

          {/* add-ons — line design, enhancement, beard & colour can stack onto the main service */}
          {service && addOns.length > 0 && (
            <div className="rounded-xl border border-gold/25 bg-gold/5 p-4">
              <div className="text-sm font-semibold text-gold-light">Add-ons for your visit <span className="text-xs font-normal text-white/40">(optional)</span></div>
              <p className="mt-1 text-xs text-white/45">Stacked on your {service.name} — one visit, one payment.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {addOns.map((s) => {
                  const on = addOnIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setAddOnIds(on ? addOnIds.filter((x) => x !== s.id) : [...addOnIds, s.id]); setTime(''); }}
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        on ? 'border-gold bg-gold/15 text-white' : 'border-white/10 bg-ink text-white/70 hover:border-white/25'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${on ? 'border-gold bg-gold text-black' : 'border-white/30'}`}>
                          {on ? '✓' : ''}
                        </span>
                        {s.name}
                      </span>
                      <span className="font-semibold text-gold-light">{s.from ? 'from ' : ''}{fmtR(s.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2 — barber */}
      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {barbers.map((b) => (
            <button
              key={b.id}
              onClick={() => { setBarberId(b.id); setTime(''); }}
              className={`flex cursor-pointer items-center gap-4 rounded-xl border px-4 py-3 text-left transition ${
                barberId === b.id ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-ink hover:border-white/25'
              }`}
            >
              <img src={b.image} alt={b.name} className="h-12 w-12 rounded-full border border-gold/30 object-cover" />
              <div>
                <div className="font-semibold text-white">{b.name}</div>
                <div className="text-xs tracking-wider text-gold uppercase">{b.title}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* STEP 3 — date & time */}
      {step === 2 && (
        <div>
          <span className="label">Pick a day — we trade 7 days</span>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dates.map((d) => (
              <button
                key={d}
                onClick={() => { setDate(d); setTime(''); }}
                className={`shrink-0 cursor-pointer rounded-xl border px-4 py-3 text-center transition ${
                  date === d ? 'border-gold bg-gold/15 text-white' : 'border-white/10 bg-ink text-white/70 hover:border-white/25'
                }`}
              >
                <div className="text-[10px] font-semibold tracking-wider uppercase">{new Date(`${d}T00:00:00`).toLocaleDateString('en-ZA', { weekday: 'short' })}</div>
                <div className="mt-0.5 text-sm font-semibold">{d.slice(8, 10)} {new Date(`${d}T00:00:00`).toLocaleDateString('en-ZA', { month: 'short' })}</div>
              </button>
            ))}
          </div>
          <span className="label mt-5">Pick a time {barber ? `with ${barber.name.split(' ')[0]}` : ''}</span>
          {!date ? (
            <div className="text-sm text-white/35">Choose a day first.</div>
          ) : slots === null ? (
            <div className="text-sm text-white/35">Checking live availability…</div>
          ) : slots.length === 0 ? (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              No free slots that day — try another day.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
              {slots.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`cursor-pointer rounded-lg border px-2 py-2 text-sm font-medium transition ${
                    time === t ? 'border-gold bg-gold text-black' : 'border-white/10 bg-ink text-white/75 hover:border-gold/40'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 4 — details */}
      {step === 3 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Naledi Khumalo" />
          </Field>
          <Field label="Phone number">
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="072 000 0000" inputMode="tel" />
          </Field>
          <Field label="Email (optional)">
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <div className="rounded-xl border border-gold/25 bg-gold/5 p-4">
            {(() => {
              const mem = loyalty?.member ?? null;
              const need = loyalty?.stampsForFree ?? 9;
              return mem ? (
                <div>
                  <div className="text-sm font-semibold text-white">{mem.name}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1">
                      {Array.from({ length: need }, (_, i) => (
                        <span
                          key={i}
                          className={`h-3.5 w-3.5 rounded-full border ${
                            i < mem.stamps ? 'border-gold bg-gold' : 'border-dashed border-white/25'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-white/50">
                      {mem.stamps} of {need} stamps
                    </span>
                  </div>
                  {mem.stamps >= need && (
                    <div className="mt-3 rounded-lg border border-gold/50 bg-gold/15 px-3 py-2 text-xs font-semibold text-gold-light">
                      Your card is full — your next haircut is FREE. Show the front desk.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-white/50">
                  <span className="font-semibold text-gold-light">New to the shop?</span> Enter your number above and sign up on the
                  loyalty card — every completed hair cut taps a stamp, and the 10th cut is free.
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* STEP 5 — pay */}
      {step === 4 && service && barber && (
        <div>
          <div className="card space-y-3 bg-ink/60 p-5 text-sm">
            <Row k="Service" v={service.name} />
            {chosenAddOns.map((a) => (
              <Row key={a.id} k="Add-on" v={`${a.name} · ${a.from ? 'from ' : ''}${fmtR(a.price)}`} />
            ))}
            <Row k="Barber" v={`${barber.name} · ${barber.title}`} />
            <Row k="When" v={`${fmtDate(date)} · ${time}`} />
            <Row k="Client" v={`${name} · ${phone}`} />
            <div className="hairline pt-3">
              <Row k="Price" v={`${service.from ? 'from ' : ''}${fmtR(service.price)}`} />
              {chosenAddOns.length > 0 && <Row k="Add-ons" v={fmtR(chosenAddOns.reduce((s,a)=>s+a.price,0))} />}
              {service.from && <div className="mt-1 text-right text-[11px] text-white/35">final price settled at the chair</div>}
            </div>

            {/* Tip — goes straight to the barber, added to PayFast total */}
            <div className="rounded-xl border border-gold/20 bg-gold/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gold-light">Tip for {barber.name.split(' ')[0]} <span className="text-xs font-normal text-white/40">(optional — 100% to the barber)</span></span>
                {tip>0 && <span className="text-sm font-bold text-gold">{fmtR(tip)}</span>}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[10,20,30,50].map(v=>(
                  <button key={v} onClick={()=>{ setTip(v); setCustomTip(''); }} className={`cursor-pointer rounded-lg border py-2 text-sm font-semibold transition \${tip===v ? 'border-gold bg-gold text-black' : 'border-white/15 bg-ink text-white/70 hover:border-gold/40'}`}>R{v}</button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={()=>{ setTip(0); setCustomTip(''); }} className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition \${tip===0 && !customTip ? 'border-white/30 bg-white/5 text-white' : 'border-white/10 bg-ink text-white/40 hover:border-white/25'}`}>No tip</button>
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-xs text-white/40">Custom R</span>
                  <input className="input !py-1.5 text-sm" placeholder="e.g. 40" value={customTip} onChange={e=>{ const v=e.target.value.replace(/\D/g,'').slice(0,3); setCustomTip(v); const n=Number(v); if(v && !isNaN(n) && n>=5) setTip(n); else if(!v) setTip(0); }} inputMode="numeric" />
                </div>
              </div>
              {tip>0 && <div className="mt-2 text-right text-xs text-white/45">Service {fmtR(total)} + tip {fmtR(tip)} = <span className="font-semibold text-white">{fmtR(totalWithTip)} total</span> via PayFast</div>}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-display text-base font-semibold text-white">Total {tip>0 ? 'with tip' : ''}</span>
              <span className="font-display text-2xl font-bold text-gold">{fmtR(totalWithTip)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-white/40">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-gold"><path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
            Payments are processed securely by <b className="text-white/70">PayFast</b>. Card details are entered on PayFast&apos;s own
            encrypted page — they never touch The One Barber&apos;s servers.
          </div>
          {error && <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>}
        </div>
      )}

      {/* footer nav */}
      <div className="mt-8 flex items-center justify-between">
        <button className="btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || paying}>
          ← Back
        </button>
        {step < 4 ? (
          <button className="btn-gold" disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
            Continue →
          </button>
        ) : (
          <button className="btn-gold !px-8" onClick={pay} disabled={paying}>
            {paying ? 'Connecting to PayFast…' : `Pay ${fmtR(totalWithTip)} securely`}
          </button>
        )}
      </div>
    </Card>
  );
}

function Row({ k, v, gold = false }: { k: string; v: string; gold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/45">{k}</span>
      <span className={gold ? 'font-semibold text-gold-light' : 'font-medium text-white'}>{v}</span>
    </div>
  );
}
