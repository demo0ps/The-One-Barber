// Client-safe date helpers — always LOCAL time (Pretoria), never UTC.
// (new Date().toISOString() gives the UTC date, which is wrong before 02:00 SAST.)

const pad = (n: number) => String(n).padStart(2, '0');

export function localToday(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysLocal(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return localToday(new Date(y, m - 1, d + n));
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function weekdayName(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-ZA', { weekday: 'long' });
}
