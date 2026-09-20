'use client';

// The ALL-CALENDAR. One component, used on every dashboard.
// Reads the same /api/board endpoint → every screen shows the same truth.
// The shop trades 7 days (hours vary per weekday) — the grid always has slots.

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useEngineVersion } from '@/lib/sync';
import { addDaysLocal, localToday, weekdayName } from '@/lib/dates';
import { fmtDate } from '@/lib/format';
import { Spinner } from './ui';

interface BoardData {
  open: boolean;
  slots: string[];
  barbers: { id: string; name: string; image: string }[];
  cells: Record<string, ({ name: string; service: string; status: string; time: string; cont?: boolean } | null)[]>;
}

const CELL_STYLES: Record<string, string> = {
  pending_payment: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  confirmed: 'border-gold/40 bg-gold/10 text-gold-light',
  in_progress: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
  completed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
};

const LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
};

export default function AllCalendar({
  highlightBarberId,
  onSlotClick,
  title = 'All-calendar',
}: {
  highlightBarberId?: string;
  onSlotClick?: (barberId: string, time: string, date: string) => void;
  title?: string;
}) {
  const [date, setDate] = useState(() => localToday());
  const version = useEngineVersion();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api<BoardData>(`/api/board?date=${date}`)
      .then((j) => live && setBoard(j))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [date, version]);

  const today = localToday();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const mins = (t: string) => {
    const [h, mm] = t.split(':').map(Number);
    return h * 60 + mm;
  };
  const isToday = date === today;
  const nowSlot = isToday && board?.slots.length
    ? (() => {
        const nextIdx = board.slots.findIndex((s) => mins(s) > nowMin);
        if (nextIdx === 0) return -1;
        return nextIdx === -1 ? board.slots.length - 1 : nextIdx - 1;
      })()
    : -1;

  if (loading && !board) return <Spinner />;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.2em] text-gold uppercase">{title}</div>
          <div className="font-display text-lg font-semibold text-white">
            {fmtDate(date)}
            <span className="ml-2 text-xs font-normal text-white/40">{weekdayName(date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setDate(addDaysLocal(date, -1))}>← Prev</button>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setDate(today)}>Today</button>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setDate(addDaysLocal(date, 1))}>Next →</button>
        </div>
      </div>

      {!board?.open || board.slots.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-white/40">
          We don&apos;t trade on {weekdayName(date)} — pick another day.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="w-16 border-b border-white/10 px-3 py-2 text-[11px] font-semibold tracking-wider text-white/30 uppercase">
                    Time
                  </th>
                  {(board?.barbers ?? []).map((b) => (
                    <th
                      key={b.id}
                      className={`min-w-36 border-b border-white/10 px-3 py-2 text-left ${
                        highlightBarberId === b.id ? 'bg-gold/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img src={b.image} alt={b.name} className="h-6 w-6 rounded-full object-cover" />
                        <div className={`text-xs font-semibold ${highlightBarberId === b.id ? 'text-gold-light' : 'text-white/80'}`}>
                          {b.name}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(board?.slots ?? []).map((slot, si) => (
                  <tr key={slot} className={isToday && si === nowSlot ? 'bg-gold/5' : ''}>
                    <td className="border-b border-white/5 px-3 py-1 align-top text-[11px] font-medium text-white/35">
                      {slot}
                    </td>
                    {(board?.barbers ?? []).map((b) => {
                      const cell = board?.cells[b.id]?.[si] ?? null;
                      return (
                        <td
                          key={b.id}
                          className={`border-b border-white/5 px-1.5 py-1 align-top ${
                            highlightBarberId === b.id ? 'bg-gold/[0.04]' : ''
                          }`}
                        >
                          {cell?.cont ? (
                            <div className="mx-1 h-2 rounded bg-gold/20" title={`${cell.name} (continued)`} />
                          ) : cell ? (
                            <div
                              className={`mx-0.5 rounded-lg border px-2 py-1.5 ${CELL_STYLES[cell.status] ?? CELL_STYLES.confirmed}`}
                              title={`${cell.name} — ${cell.service} — ${cell.status}`}
                            >
                              <div className="truncate text-xs font-semibold">{cell.name}</div>
                              <div className="truncate text-[10px] opacity-70">{cell.service}</div>
                            </div>
                          ) : onSlotClick ? (
                            <button
                              onClick={() => onSlotClick(b.id, slot, date)}
                              className="mx-0.5 w-full cursor-pointer rounded-lg border border-dashed border-transparent px-2 py-1.5 text-left text-[10px] text-transparent transition hover:border-gold/30 hover:text-gold/60"
                              title={`Add walk-in — ${slot}`}
                            >
                              + slot
                            </button>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-4 px-5 py-3 text-[11px] text-white/40">
            {Object.entries(CELL_STYLES).map(([s, cls]) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm border ${cls}`} />
                {LABELS[s]}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
