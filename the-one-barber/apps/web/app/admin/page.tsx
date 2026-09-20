'use client';

import { useEffect, useState } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import StaffGate from '@/components/staff/StaffGate';
import { readStaff, type Staff } from '@/lib/staff';

export default function AdminPage() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const s = readStaff();
    if (s?.role === 'admin') setStaff(s);
    setChecked(true);
  }, []);

  if (!checked) return <div className="min-h-screen bg-ink" />;
  if (!staff) {
    return (
      <StaffGate
        role="admin"
        onAuthed={(s) => {
          window.localStorage.setItem('obb_staff', JSON.stringify(s));
          setStaff(s);
        }}
      />
    );
  }
  return <AdminDashboard staff={staff} />;
}
