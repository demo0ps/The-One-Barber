'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import OfflineScreen from './OfflineScreen';

export default function PlatformGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSuper = pathname === '/superadmin' || pathname?.startsWith('/superadmin/');
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let dead = false;
    const check = async () => {
      try {
        const r = await fetch('/api/platform/status', { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (!dead) setEnabled(j.enabled !== false);
      } catch {
        if (!dead) setEnabled(true);
      }
    };
    check();
    const id = setInterval(check, 3000);
    const onVis = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('obb:refresh', check as EventListener);
    return () => {
      dead = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('obb:refresh', check as EventListener);
    };
  }, []);

  if (isSuper) return <>{children}</>;
  if (enabled === false) return <OfflineScreen />;
  return <>{children}</>;
}
