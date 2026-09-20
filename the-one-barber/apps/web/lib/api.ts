// Thin fetch helper + cross-dashboard refresh bus.

export class ApiError extends Error {}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg = body && typeof body === 'object' && 'error' in (body as Record<string, unknown>)
      ? String((body as Record<string, unknown>).error)
      : `Request failed (${res.status})`;
    throw new ApiError(msg);
  }
  return body as T;
}

// Instant in-tab sync: after any mutation, other panels in the same tab
// refetch immediately; the version poller below covers other tabs/windows.
export function bumpRefresh() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('obb:refresh'));
}
