'use client';

import { useEffect, useState } from 'react';
import ReceptionDashboard from '@/components/reception/ReceptionDashboard';
import StaffGate from '@/components/staff/StaffGate';
import { readStaff, type Staff } from '@/lib/staff';

export default function ReceptionPage() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const s = readStaff();
    if (s?.role === 'reception') setStaff(s);
    setChecked(true);
  }, []);

  if (!checked) return <div className="min-h-screen bg-ink" />;
  if (!staff) {
    return (
      <StaffGate
        role="reception"
        onAuthed={(s) => {
          window.localStorage.setItem('obb_staff', JSON.stringify(s));
          setStaff(s);
        }}
      />
    );
  }
  return <ReceptionDashboard staff={staff} />;
}
