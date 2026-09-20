'use client';

import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { DEMO_PINS, writeStaff, type Staff, type StaffRole } from '@/lib/staff';
import { Logo } from '../ui';
import { useRouter } from 'next/navigation';

const ROLES: Record<StaffRole, { label: string; desc: string }> = {
  barber: { label: 'Barber', desc: 'Your line, your chair, your earnings' },
  reception: { label: 'Reception', desc: 'Walk-ins, allocation & the loyalty card' },
  admin: { label: 'Admin', desc: 'Barbers, money & the money room' },
};

export default function StaffGate({ role, onAuthed }: { role: StaffRole; onAuthed: (s: Staff) => void }) {
  const [pin, setPin] = useState('');
  const [barberId, setBarberId] = useState('');
  const [barbers, setBarbers] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  // hidden super-admin reveal: 5 clicks on the logo in the admin gate
  const [clicks, setClicks] = useState(0);
  const [showSuper, setShowSuper] = useState(false);
  const [superPw, setSuperPw] = useState('');
  const [superErr, setSuperErr] = useState<string | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const needsBarber = role === 'barber';
  const isAdminGate = role === 'admin';

  useEffect(() => {
    if (!needsBarber) return;
    api<{ barbers: { id: string; name: string; active: boolean }[] }>('/api/barbers')
      .then((j) => setBarbers(j.barbers.filter((b) => b.active)))
      .catch(() => setBarbers([]));
  }, [needsBarber]);

  const logoClick = () => {
    if (!isAdminGate || showSuper) return;
    const next = clicks + 1;
    setClicks(next);
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => setClicks(0), 2000);
    if (next >= 5) {
      setShowSuper(true);
      setClicks(0);
    }
  };

  const submitSuper = () => {
    setSuperErr(null);
    if (superPw === 'Eliteflow26') {
      try {
        window.sessionStorage.setItem('obb_super', '1');
      } catch {}
      router.push('/superadmin');
    } else {
      setSuperErr('Wrong password.');
    }
  };

  const submit = async () => {
    setError(null);
    if (needsBarber) {
      if (!barberId) {
        setError('Choose which barber you are.');
        return;
      }
      const b = barbers.find((x) => x.id === barberId);
      if (!b) {
        setError('Pick your name from the list.');
        return;
      }
      setBusy(true);
      try {
        const res = await api<{ ok: boolean; barber: { id: string; name: string } }>('/api/barbers/verify', {
          method: 'POST',
          body: JSON.stringify({ barberId, pin }),
        });
        const name = res.barber?.name ?? b.name;
        writeStaff({ role: 'barber', name, barberId });
        onAuthed({ role: 'barber', name, barberId });
      } catch (e) {
        setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not verify PIN.');
      } finally {
        setBusy(false);
      }
      return;
    }
    // reception / admin still use shared PINs
    const expected = DEMO_PINS[role as Exclude<StaffRole, 'barber'>];
    if (pin !== expected) {
      setError(`Wrong PIN for ${ROLES[role].label} sign-in.`);
      return;
    }
    writeStaff({ role, name: ROLES[role].label });
    onAuthed({ role, name: ROLES[role].label });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <button
            type="button"
            onClick={logoClick}
            aria-label="The One Barber"
            className={`rounded-xl p-1 transition ${isAdminGate ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
            title={isAdminGate ? 'The One Barber' : undefined}
          >
            <Logo />
          </button>
        </div>
        <div className="card-gold p-8">
          <h1 className="font-display text-2xl font-semibold text-white">{ROLES[role].label} sign in</h1>
          <p className="mt-1 text-sm text-white/50">{ROLES[role].desc}</p>

          {needsBarber && (
            <div className="mt-6">
              <span className="label">Which barber are you?</span>
              <select className="input" value={barberId} onChange={(e) => setBarberId(e.target.value)}>
                <option value="">Choose your name…</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4">
            <span className="label">PIN {needsBarber ? '(issued by admin — 4 digits)' : ''}</span>
            <input
              className="input text-center text-lg tracking-[0.5em]"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>

          {error && <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}

          <button className="btn-gold mt-5 w-full" onClick={submit} disabled={busy || pin.length < 4}>
            {busy ? 'Checking…' : 'Enter dashboard'}
          </button>

          {isAdminGate && showSuper && (
            <div className="mt-6 rounded-xl border border-gold/30 bg-ink p-4">
              <div className="text-sm font-semibold text-gold-light">Super-admin access</div>
              <p className="mt-1 text-xs text-white/45">Enter the super-admin password to open the hidden dashboard.</p>
              <input
                className="input mt-3"
                type="password"
                placeholder="Password"
                value={superPw}
                onChange={(e) => setSuperPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitSuper()}
              />
              {superErr && <div className="mt-2 text-xs text-rose-300">{superErr}</div>}
              <button className="btn-gold mt-3 w-full !py-2 text-sm" onClick={submitSuper}>
                Open super-admin
              </button>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-white/10 bg-ink/60 px-3 py-2 text-[11px] leading-relaxed text-white/40">
            {needsBarber ? (
              <>Each barber has their own 4-digit PIN — ask the admin (money room) to issue or change yours.</>
            ) : (
              <>
                Demo PINs — reception <b className="text-white/70">4477</b> · admin{' '}
                <b className="text-white/70">9201</b>. Barbers use per-barber PINs (see admin → Barbers). In production this gate is
                replaced by real authentication (NextAuth / SSO).
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
