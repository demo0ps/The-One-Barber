'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate, fmtR } from '@/lib/format';
import { Card, Empty, StatusChip } from '../ui';

interface Row {
  id: string;
  ref: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  price: number;
  status: string;
  type: string;
}

export default function MyBookings() {
  const [phone, setPhone] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    setError(null);
    if (phone.replace(/\D/g, '').length < 9) return setError('Enter your phone number (9+ digits).');
    try {
      const j = await api<{ rows: Row[] }>(`/api/clients?phone=${encodeURIComponent(phone)}`);
      setRows(j.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <span className="label">Phone number</span>
          <input className="input" placeholder="072 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel"
            onKeyDown={(e) => e.key === 'Enter' && lookup()} />
        </div>
        <button className="btn-gold" onClick={lookup}>Find my bookings</button>
      </div>
      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>}

      {rows && (
        rows.length === 0 ? (
          <Empty text="No bookings under that number yet. Your first chair is one tap away." />
        ) : (
          <Card className="divide-y divide-white/5 overflow-hidden">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <div className="font-semibold text-white">{r.service}</div>
                  <div className="text-xs text-white/45">
                    {fmtDate(r.date)} · {r.time} · {r.barber} {r.type === 'walk_in' && '· walk-in'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gold">{fmtR(r.price)}</span>
                  <StatusChip status={r.status} />
                </div>
              </div>
            ))}
          </Card>
        )
      )}
    </div>
  );
}
