// Small formatting helpers shared by all dashboards (client-safe, no engine import).

export function fmtR(n: number): string {
  const v = Math.round(n * 100) / 100;
  const s = v.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `R${s}`;
}

export function fmtDate(d: string): string {
  if (!d) return '—';
  const date = new Date(`${d}T00:00:00`);
  const today = new Date();
  const tmr = new Date(today.getTime() + 86400000);
  const key = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const label = date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
  if (key(date) === key(today)) return `Today, ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`;
  if (key(date) === key(tmr)) return `Tomorrow, ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`;
  return label;
}

export function fmtDay(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' });
}

export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
