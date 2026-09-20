// ---------------------------------------------------------------------------
// Pure date & slot math. No I/O — safe to reuse anywhere in the engine.
// ---------------------------------------------------------------------------

import type { DayHours, Settings } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function toTime(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function todayStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return todayStr(new Date(y, m - 1, d + n));
}

export function dayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
}

/** Trading hours for a given date (from the per-weekday schedule). */
export function hoursFor(settings: Settings, date: string): DayHours {
  return settings.dayHours[dayIndex(date)] ?? { open: '08:00', close: '18:00' };
}

/** Is the shop trading on this date? (open >= close = closed day) */
export function shopOpen(settings: Settings, date: string): boolean {
  const h = hoursFor(settings, date);
  return toMin(h.open) < toMin(h.close);
}

/** All slot start-times for a day (empty if closed). */
export function slotsFor(settings: Settings, date: string): string[] {
  if (!shopOpen(settings, date)) return [];
  const h = hoursFor(settings, date);
  const open = toMin(h.open);
  const close = toMin(h.close);
  const out: string[] = [];
  for (let m = open; m + settings.slotMinutes <= close; m += settings.slotMinutes) {
    out.push(toTime(m));
  }
  return out;
}

/** Zero-based slot index of a time string (relative to that day's opening). */
export function slotIndex(settings: Settings, date: string, time: string): number {
  return Math.round((toMin(time) - toMin(hoursFor(settings, date).open)) / settings.slotMinutes);
}

/** How many slots a duration occupies. */
export function spanFor(settings: Settings, durationMin: number): number {
  return Math.max(1, Math.ceil(durationMin / settings.slotMinutes));
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
