'use client';

import type { ReactNode } from 'react';
import { fmtR } from '@/lib/format';

export function Card({ children, className = '', gold = false }: { children: ReactNode; className?: string; gold?: boolean }) {
  return <div className={`${gold ? 'card-gold' : 'card'} ${className}`}>{children}</div>;
}

export function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div className="mb-8">
      {kicker && (
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.25em] text-gold uppercase">
          <span className="h-px w-8 bg-gold/60" />
          {kicker}
        </div>
      )}
      <h2 className="font-display text-3xl font-semibold text-white md:text-4xl">{title}</h2>
      {sub && <p className="mt-2 max-w-2xl text-sm text-white/50">{sub}</p>}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={`p-5 ${accent ? '!border-gold/40' : ''}`}>
      <div className="text-[11px] font-semibold tracking-[0.18em] text-white/40 uppercase">{label}</div>
      <div className={`mt-2 font-display text-2xl font-semibold md:text-3xl ${accent ? 'gold-text' : 'text-white'}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-white/40">{sub}</div>}
    </Card>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending_payment: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  confirmed: 'border-gold/40 bg-gold/10 text-gold-light',
  in_progress: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  completed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  canceled: 'border-white/15 bg-white/5 text-white/40',
  no_show: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  canceled: 'Canceled',
  no_show: 'No-show',
};

export function StatusChip({ status }: { status: string }) {
  return <span className={`chip ${STATUS_STYLES[status] ?? STATUS_STYLES.canceled}`}>{STATUS_LABELS[status] ?? status}</span>;
}

export function TierChip({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    gold: 'border-gold/50 bg-gold/15 text-gold-light',
    silver: 'border-zinc-300/40 bg-zinc-300/10 text-zinc-200',
    bronze: 'border-amber-700/50 bg-amber-800/20 text-amber-500',
  };
  return <span className={`chip capitalize ${styles[tier] ?? styles.bronze}`}>{tier}</span>;
}

export function Money({ value, className = '' }: { value: number; className?: string }) {
  return <span className={className}>{fmtR(value)}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

export function Progress({ pct, className = '' }: { pct: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-gold-deep to-gold-light transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }}
      />
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-ink p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition ${
            active === t.id ? 'bg-gold text-black' : 'text-white/60 hover:text-white'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
      <div className="font-display text-lg text-white/40">Nothing here yet</div>
      <div className="text-sm text-white/30">{text}</div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
    </div>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  if (small) {
    return <img src="/images/logo.png" alt="The One Barber" className="h-8 w-auto" />;
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <img src="/images/logo.png" alt="The One Barber" className="h-16 w-auto" />
      <span className="text-[10px] tracking-[0.3em] text-white/40 uppercase">One chair. One standard.</span>
    </div>
  );
}
