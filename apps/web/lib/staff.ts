'use client';

// Demo staff gate. In production this is swapped for real authentication
// (e.g. NextAuth with email + 2FA) — the dashboards themselves don't change.

export type StaffRole = 'barber' | 'admin' | 'reception';

export interface Staff {
  role: StaffRole;
  name: string;
  barberId?: string;
}

const KEY = 'obb_staff';

export const DEMO_PINS: Record<Exclude<StaffRole, 'barber'>, string> = {
  reception: '4477',
  admin: '9201',
} as Record<StaffRole, string>;

// Back-compat for existing imports that reference DEMO_PINS.barber — the real
// barber PIN is now per-barber, stored in the engine and verified server-side.
(DEMO_PINS as Record<string, string>).barber = '—';

export function readStaff(): Staff | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Staff) : null;
  } catch {
    return null;
  }
}

export function writeStaff(staff: Staff | null) {
  if (typeof window === 'undefined') return;
  if (staff) window.localStorage.setItem(KEY, JSON.stringify(staff));
  else window.localStorage.removeItem(KEY);
}

/**
 * URL for a staff dashboard that works everywhere:
 * - on a subdomain (admin.mybarber.co.za) → the other subdomain (reception.mybarber.co.za)
 * - on a bare host / preview (paths) → /reception
 */
export function staffUrl(role: StaffRole): string {
  if (typeof window === 'undefined') return `/${role}`;
  const host = window.location.host;
  const parts = host.split('.');
  if (parts.length > 2 && (['barber', 'reception', 'admin'] as string[]).includes(parts[0])) {
    const base = parts.slice(1).join('.');
    return `${window.location.protocol}//${role}.${base}`;
  }
  return `/${role}`;
}
