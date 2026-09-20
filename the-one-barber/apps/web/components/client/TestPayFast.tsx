'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate, fmtR } from '@/lib/format';
import { Logo } from '../ui';

interface Preview {
  mode: 'demo' | 'payfast';
  payment: { ref: string; amount: number; status: string };
  booking: {
    ref: string;
    clientName: string;
    service: string;
    barber: string;
    date: string;
    time: string;
    price: number;
    discount: number;
  };
}

export default function TestPayFast({
  payRef,
  status,
}: {
  payRef?: string;
  status?: string;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [phase, setPhase] = useState<'loading' | 'pay' | 'processing' | 'done' | 'failed' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const polled = useRef(0);

  const load = async (checkStatus: boolean) => {
    if (!payRef) {
      setPhase('error');
      setError('Missing payment reference.');
      return;
    }
    try {
      const j = await api<Preview>(`/api/payments/preview?ref=${encodeURIComponent(payRef)}`);
      setPreview(j);
      if (j.payment.status === 'captured') {
        setPhase('done');
        return;
      }
      if (j.payment.status === 'failed' || j.payment.status === 'refunded') {
        setPhase('failed');
        return;
      }
      // live mode: IPN may arrive a beat after the redirect — poll briefly
      if (checkStatus && polled.current < 20) {
        polled.current += 1;
        setTimeout(() => load(true), 1500);
        return;
      }
      setPhase('pay');
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Could not load payment.');
    }
  };

  useEffect(() => {
    // If PayFast redirected us back with a status, trust the IPN poll.
    const checkStatus = Boolean(status) || true;
    load(checkStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const complete = async (ok: boolean) => {
    setPhase('processing');
    try {
      await api('/api/payments/complete', { method: 'POST', body: JSON.stringify({ ref: payRef, ok }) });
      await load(false);
      const target = ok ? `/?done=${encodeURIComponent(preview?.booking.ref ?? '')}` : `/?canceled=${encodeURIComponent(preview?.booking.ref ?? '')}`;
      setTimeout(() => (window.location.href = target), ok ? 1800 : 1200);
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Payment processing failed.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 py-10">
      {/* gateway chrome */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00b900] font-display text-lg font-bold text-black">P</div>
        <div>
          <div className="font-display text-lg font-bold text-white">
            PayFast <span className="text-white/50">Secure Checkout</span>
          </div>
          <div className="text-[10px] tracking-[0.25em] text-white/40 uppercase">
            {preview?.mode === 'payfast' ? 'Gateway environment' : 'Sandbox simulation'}
          </div>
        </div>
      </div>

      <div className="w-full max-w-md">
        {phase === 'loading' && (
          <div className="card p-8 text-center text-sm text-white/50">Loading your payment…</div>
        )}

        {phase === 'error' && (
          <div className="card border-rose-400/30 p-8 text-center">
            <div className="font-display text-lg text-white">Payment problem</div>
            <div className="mt-2 text-sm text-white/50">{error}</div>
            <a href="/" className="btn-gold mt-5">Back to The One Barber</a>
          </div>
        )}

        {(phase === 'pay' || phase === 'processing') && preview && (
          <div className="card-gold overflow-hidden">
            <div className="border-b border-white/10 bg-ink/40 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/50">Paying</div>
                <Logo small />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="font-display text-3xl font-bold text-gold">{fmtR(preview.payment.amount)}</div>
                  <div className="text-xs text-white/45">
                    {preview.booking.service} · {fmtDate(preview.booking.date)} {preview.booking.time}
                  </div>
                </div>
                <div className="text-right text-xs text-white/45">
                  <div>{preview.booking.clientName}</div>
                  <div>with {preview.booking.barber}</div>
                  <div className="mt-1 text-gold-light">Ref {preview.booking.ref}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3 px-6 py-5">
              <div className="text-[11px] font-semibold tracking-[0.2em] text-white/40 uppercase">Card payment</div>
              <input className="input" defaultValue="4242 4242 4242 4242" readOnly />
              <div className="grid grid-cols-2 gap-3">
                <input className="input" defaultValue="09 / 27" readOnly />
                <input className="input" defaultValue="123" readOnly />
              </div>
              <div className="rounded-lg border border-white/10 bg-ink/50 px-3 py-2 text-[11px] leading-relaxed text-white/40">
                {preview.mode === 'payfast'
                  ? 'Live PayFast environment. Confirmation arrives via the encrypted IPN webhook — this page verifies it automatically.'
                  : 'Demo mode: PayFast credentials not configured, so this simulated gateway runs the full flow. Add your merchant keys in .env to go live.'}
              </div>
              {phase === 'processing' ? (
                <button className="btn-gold w-full" disabled>
                  Processing your payment…
                </button>
              ) : (
                <button className="btn-gold w-full !py-3" onClick={() => complete(true)}>
                  Pay {fmtR(preview.payment.amount)}
                </button>
              )}
              {phase === 'pay' && (
                <button className="w-full cursor-pointer text-center text-xs text-white/40 transition hover:text-white/70" onClick={() => complete(false)}>
                  Cancel payment
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'done' && preview && (
          <div className="card-gold p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold text-2xl text-black">✓</div>
            <div className="mt-4 font-display text-2xl font-bold text-white">Payment captured</div>
            <div className="mt-2 text-sm text-white/55">
              {fmtR(preview.payment.amount)} received for booking <b className="text-gold-light">{preview.booking.ref}</b>.
            </div>
            <div className="mt-1 text-xs text-white/40">Your chair is confirmed. Taking you back…</div>
          </div>
        )}

        {phase === 'failed' && preview && (
          <div className="card border-rose-400/30 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 text-2xl text-rose-300">!</div>
            <div className="mt-4 font-display text-2xl font-bold text-white">Payment not completed</div>
            <div className="mt-2 text-sm text-white/55">No charge was made. You can re-book anytime.</div>
          </div>
        )}
      </div>

      <div className="mt-8 text-[11px] text-white/30">
        The One Barber accepts payments via PayFast · Demo build
      </div>
    </div>
  );
}
