'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtR } from '@/lib/format';
import { Progress } from '../ui';

interface LoyaltyInfo {
  stampsForFree: number;
  member: { phone: string; name: string; stamps: number; freeCutsClaimed: number; lifetimeSpend: number; joinedAt: string } | null;
}

export default function LoyaltyPanel() {
  const [info, setInfo] = useState<LoyaltyInfo | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = () =>
      api<LoyaltyInfo>(`/api/loyalty${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`)
        .then(setInfo)
        .catch(() => undefined);
    load();
    const t = setTimeout(load, 600);
    return () => clearTimeout(t);
  }, [phone]);

  const signup = async () => {
    setMsg(null);
    if (name.trim().length < 2) return setMsg('Enter your name first.');
    if (phone.replace(/\D/g, '').length < 9) return setMsg('Enter a valid phone number.');
    setBusy(true);
    try {
      await api('/api/loyalty', { method: 'POST', body: JSON.stringify({ name, phone }) });
      setMsg('You\u2019re on the card. Every completed hair cut taps a stamp — the barber does it at the chair.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not sign up.');
    } finally {
      setBusy(false);
    }
  };

  const m = info?.member ?? null;
  const need = info?.stampsForFree ?? 9;
  const full = m && m.stamps >= need;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-5">
        <div className="font-display text-lg font-semibold text-white">Join the card</div>
        <p className="mt-1 text-xs text-white/45">
          Free. Hair cuts earn a stamp — 9 stamps, your 10th cut is on us. No points, no tiers.
        </p>
        <div className="mt-4 space-y-3">
          <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          <button className="btn-gold w-full" onClick={signup} disabled={busy}>
            {busy ? 'Signing up…' : 'Sign me up'}
          </button>
        </div>
        {msg && <div className="mt-3 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold-light">{msg}</div>}
      </div>

      <div className="card-gold p-5">
        {m ? (
          <div>
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-semibold text-white">{m.name}</div>
              <div className="text-[11px] text-white/40">member since {new Date(m.joinedAt).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}</div>
            </div>
            {/* stamp card */}
            <div className="mt-4 grid grid-cols-9 gap-1.5">
              {Array.from({ length: need }, (_, i) => (
                <div
                  key={i}
                  className={`flex h-9 items-center justify-center rounded-full border text-sm font-bold transition ${
                    i < m.stamps ? 'border-gold bg-gold text-black' : 'border-dashed border-white/25 text-white/25'
                  }`}
                  title={i < m.stamps ? 'Stamped' : 'Awaiting a hair cut'}
                >
                  {i < m.stamps ? '★' : i + 1}
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="mb-1.5 flex justify-between text-[11px] text-white/45">
                <span>{full ? 'Card full — your next cut is FREE' : `Hair cuts to go: ${need - m.stamps}`}</span>
                <span>{m.stamps} / {need}</span>
              </div>
              <Progress pct={m.stamps / need} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-white/45">
              <span>{m.freeCutsClaimed} free cut{m.freeCutsClaimed === 1 ? '' : 's'} claimed</span>
              <span>{fmtR(m.lifetimeSpend)} lifetime with us</span>
            </div>
            {full && (
              <div className="mt-3 rounded-lg border border-gold/50 bg-gold/15 px-3 py-2.5 text-xs font-semibold text-gold-light">
                Show this screen at the chair — your 10th haircut is on the house.
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-start justify-center">
            <div className="text-sm font-semibold text-white/70">Enter your number on the left</div>
            <div className="mt-1 text-xs text-white/40">
              and your card appears here — the same stamps the barbers and front desk see. Not a member yet? Sign up and start collecting.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
