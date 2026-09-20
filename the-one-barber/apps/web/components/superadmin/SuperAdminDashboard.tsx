'use client';

import { useEffect, useState } from 'react';
import { api, bumpRefresh } from '@/lib/api';

const SUPER_PW = 'Eliteflow26';

export default function SuperAdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [version, setVersion] = useState<number | null>(null);

  const checkSession = () => {
    try {
      return window.sessionStorage.getItem('obb_super') === '1';
    } catch {
      return false;
    }
  };

  const fetchStatus = async () => {
    try {
      const j = await api<{ enabled: boolean; version: number }>('/api/superadmin/toggle');
      setEnabled(j.enabled);
      setVersion(j.version);
    } catch {
      try {
        const j2 = await api<{ enabled: boolean; version: number }>('/api/platform/status');
        setEnabled(j2.enabled);
        setVersion(j2.version);
      } catch {}
    }
  };

  useEffect(() => {
    if (checkSession()) {
      setAuthed(true);
      fetchStatus();
    }
  }, []);

  const login = () => {
    setErr(null);
    if (pw === SUPER_PW) {
      try {
        window.sessionStorage.setItem('obb_super', '1');
      } catch {}
      setAuthed(true);
      setMsg(null);
      fetchStatus();
    } else {
      setErr('Wrong password.');
    }
  };

  const toggle = async (nextEnabled: boolean) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const j = await api<{ ok: boolean; enabled: boolean; version: number }>('/api/superadmin/toggle', {
        method: 'POST',
        body: JSON.stringify({ password: SUPER_PW, enabled: nextEnabled }),
      });
      setEnabled(j.enabled);
      setVersion(j.version);
      setMsg(j.enabled ? 'Platform is now ON — website and dashboards are live again.' : 'Platform is now OFF — visitors see “temporarily unavailable”.');
      bumpRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Toggle failed.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    try {
      window.sessionStorage.removeItem('obb_super');
    } catch {}
    window.location.href = '/admin';
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center">
            <img src="/images/logo.png" alt="The One Barber" className="h-12 w-auto" />
          </div>
          <div className="card-gold mt-6 p-8">
            <div className="font-display text-xl font-semibold text-white">Super-admin</div>
            <p className="mt-1 text-xs text-white/45">This page is hidden. Enter the super-admin password to continue.</p>
            <input
              className="input mt-5"
              type="password"
              placeholder="Super-admin password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
              autoFocus
            />
            {err && <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{err}</div>}
            <button className="btn-gold mt-4 w-full" onClick={login}>
              Enter
            </button>
            <button className="mt-3 w-full text-center text-xs text-white/35 hover:text-white/60" onClick={() => (window.location.href = '/admin')}>
              ← Back to admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="The One Barber" className="h-10 w-auto" />
            <div>
              <div className="font-display text-lg font-semibold tracking-wider text-white">SUPER-ADMIN</div>
              <div className="text-xs text-white/35">Hidden · controls the whole platform</div>
            </div>
          </div>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={signOut}>
            Sign out
          </button>
        </div>

        <div className="card-gold mt-8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.2em] text-gold uppercase">Platform status</div>
              <div className="mt-1 flex items-center gap-3">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className={`font-display text-2xl font-bold ${enabled ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {enabled === null ? '…' : enabled ? 'ONLINE' : 'OFFLINE'}
                </span>
                <span className="text-xs text-white/35">· v{version ?? '—'}</span>
              </div>
              <div className="mt-1 text-xs text-white/45">
                {enabled ? 'Website, barber, reception and admin are live.' : 'Whole platform shows “temporarily unavailable” to everyone except this page.'}
              </div>
            </div>
            <div className="flex gap-2">
              <button className={`btn-gold !px-5 ${enabled === false ? 'opacity-40' : ''}`} disabled={busy || enabled === true} onClick={() => toggle(true)}>
                Switch ON
              </button>
              <button
                className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
                  enabled === false ? 'border-rose-400/40 bg-rose-500/15 text-rose-200' : 'border-white/15 text-white/70 hover:bg-white/5'
                } disabled:opacity-40`}
                disabled={busy || enabled === false}
                onClick={() => toggle(false)}
              >
                Switch OFF
              </button>
            </div>
          </div>
          {msg && <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">{msg}</div>}
          {err && <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">{err}</div>}
          <div className="mt-6 rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-xs leading-relaxed text-white/35">
            OFF turns off the public website and all three dashboards — every visitor (clients, barbers, reception, admin) sees a neutral black-and-gold
            <span className="font-semibold text-white/60"> “The One Barber is temporarily unavailable — we’ll be back soon.”</span> screen. This super-admin page stays reachable so you can switch the platform back ON.
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <a href="/" className="btn-ghost !py-2">
            View website
          </a>
          <a href="/admin" className="btn-ghost !py-2">
            Admin (money room)
          </a>
          <a href="/reception" className="btn-ghost !py-2">
            Reception
          </a>
          <a href="/barber" className="btn-ghost !py-2">
            Barber
          </a>
        </div>
      </div>
    </div>
  );
}
