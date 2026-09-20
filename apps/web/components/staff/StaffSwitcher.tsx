'use client';

import { staffUrl, type StaffRole } from '@/lib/staff';

const LABELS: Record<StaffRole, string> = {
  barber: 'Barber',
  reception: 'Reception',
  admin: 'Admin',
};

/** Quiet "open another dashboard" links — shown only on staff screens, never on the public site. */
export default function StaffSwitcher({ current }: { current: StaffRole }) {
  const others = (['barber', 'reception', 'admin'] as StaffRole[]).filter((r) => r !== current);
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="font-semibold tracking-[0.15em] text-white/25 uppercase">Open</span>
      {others.map((r) => (
        <a
          key={r}
          href={staffUrl(r)}
          className="text-white/45 underline-offset-2 transition hover:text-white hover:underline"
        >
          {LABELS[r]}
        </a>
      ))}
    </div>
  );
}
