import path from 'path';
import { getEngine } from '@the-one-barber/engine';

// Server-only: the single engine instance for the whole app.
export function eng() {
  return getEngine(path.join(process.cwd(), '.data'));
}

export function isPlatformEnabled(): boolean {
  const d = eng().db as unknown as { platformEnabled?: boolean };
  return d.platformEnabled !== false;
}

const PLATFORM_ALLOWLIST = ['/api/platform/status', '/api/superadmin/toggle', '/api/state', '/superadmin'];

/** Returns a 503 response if the platform kill-switch is OFF and the request is not whitelisted; otherwise null. */
export function platformGuard(req: Request): Response | null {
  if (isPlatformEnabled()) return null;
  try {
    const u = new URL(req.url);
    if (PLATFORM_ALLOWLIST.some((p) => u.pathname === p || u.pathname.startsWith(p + '/'))) return null;
  } catch {
    // if URL parse fails, be safe and block
  }
  return json({ error: 'The platform is temporarily unavailable.', code: 'PLATFORM_DISABLED' }, 503);
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function err(e: unknown, status = 400): Response {
  return Response.json({ error: e instanceof Error ? e.message : 'Something went wrong.' }, { status });
}

export function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
