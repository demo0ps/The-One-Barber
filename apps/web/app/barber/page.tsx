'use client';

import { useEffect, useState } from 'react';
import BarberDashboard from '@/components/barber/BarberDashboard';
import StaffGate from '@/components/staff/StaffGate';
import { readStaff, type Staff } from '@/lib/staff';

export default function BarberPage() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const s = readStaff();
    if (s?.role === 'barber' && s.barberId) setStaff(s);
    setChecked(true);
  }, []);

  if (!checked) return <div className="min-h-screen bg-ink" />;
  if (!staff) {
    return (
      <StaffGate
        role="barber"
        onAuthed={(s) => {
          window.localStorage.setItem('obb_staff', JSON.stringify(s));
          setStaff(s);
        }}
      />
    );
  }
  return <BarberDashboard staff={staff} />;
}
