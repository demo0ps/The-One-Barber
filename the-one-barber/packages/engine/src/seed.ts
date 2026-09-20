// ---------------------------------------------------------------------------
// Deterministic demo seed. Uses a fixed PRNG so every fresh seed looks the
// same, and anchors all dates to "today" so the demo always looks alive.
// ---------------------------------------------------------------------------

import { addDays, dayIndex, slotIndex, slotsFor, spanFor, toMin, todayStr } from './calendar';
import type {
  Barber,
  Budget,
  Client,
  DB,
  Expense,
  InventoryItem,
  LoyaltyEvent,
  LoyaltyMember,
  Payment,
  PaymentMethod,
  Service,
  Settings,
  Booking,
} from './types';

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(a ^ (a >>> 7), 61 | a)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rnd: () => number, arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

export const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Products', 'Marketing', 'Maintenance', 'Misc'];

export function defaultSettings(): Settings {
  return {
    shopName: 'The One Barber',
    tagline: "It's more than a haircut. It's the One.",
    currency: 'ZAR',
    // Mon–Thu 09–19 · Fri 09–20 · Sat 08–18 · Sun & PH 08–13
    dayHours: [
      { open: '08:00', close: '13:00' }, // Sun
      { open: '09:00', close: '19:00' }, // Mon
      { open: '09:00', close: '19:00' }, // Tue
      { open: '09:00', close: '19:00' }, // Wed
      { open: '09:00', close: '19:00' }, // Thu
      { open: '09:00', close: '20:00' }, // Fri
      { open: '08:00', close: '18:00' }, // Sat
    ],
    slotMinutes: 30,
    taxRate: 0.15,
    loyalty: { stampsForFree: 9 },
    address: 'Shop 22, Michael House, 472 Stanza Bopape Street, Arcadia, Pretoria, 0007',
    addressNote: 'Next to VW — by the passage next to AJ’s Kitchen',
    phone: '081 487 5017',
    whatsapp: '081 487 5017',
    instagram: '@theonebarberstudio_',
    instagramUrl: 'https://www.instagram.com/theonebarberstudio_',
    facebook: 'The One Barber Studio',
    facebookUrl: 'https://www.facebook.com/profile.php?id=100089811536139',
    paymentNote: 'Card or cash at the chair · Online via PayFast',
  };
}

export function seedDB(): DB {
  const rnd = mulberry32(20260919);
  const settings = defaultSettings();
  const today = todayStr();

  const barbers: Barber[] = [
    {
      id: 'b1',
      name: 'Thabo Mokoena',
      title: 'Master Barber',
      image: '/images/barber-1.jpg',
      commission: 0.5,
      active: true,
      bio: '15 years behind the chair. The standard is his name.',
      pin: '1111',
    },
    {
      id: 'b2',
      name: 'Sbu Dlamini',
      title: 'Fade Specialist',
      image: '/images/barber-2.jpg',
      commission: 0.48,
      active: true,
      bio: 'Fades so clean they should be inspected.',
      pin: '2222',
    },
    {
      id: 'b3',
      name: 'Kagiso Nkosi',
      title: 'Beard Architect',
      image: '/images/barber-3.jpg',
      commission: 0.45,
      active: true,
      bio: 'Beards are architecture. He is the engineer.',
      pin: '3333',
    },
    {
      id: 'b4',
      name: 'Lerato Molefe',
      title: 'Classic Cuts',
      image: '/images/barber-4.jpg',
      commission: 0.42,
      active: true,
      bio: 'Classic cuts, modern precision.',
      pin: '4444',
    },
  ];

  // The real menu — Chiskop is the shop's own name for that style.
  const services: Service[] = [
    { id: 's1', name: 'Hair Cut', price: 150, cost: 20, durationMin: 45, description: 'Wash, precision cut, line-up and style finish.', active: true, category: 'hair_cut' },
    { id: 's2', name: 'Chiskop Clipper', price: 70, cost: 8, durationMin: 30, description: 'The Chiskop — clipper finish, razor clean.', active: true, category: 'hair_cut' },
    { id: 's3', name: 'Chiskop Blade', price: 100, cost: 10, durationMin: 30, description: 'The Chiskop — blade finish, extra crisp.', active: true, category: 'hair_cut' },
    { id: 's4', name: 'Student Cut', price: 120, cost: 15, durationMin: 30, description: 'Sharp standard at a student price.', active: true, category: 'hair_cut' },
    { id: 's5', name: 'Line Design', price: 50, cost: 5, durationMin: 30, description: 'From R50 — detailed designs settle at the chair. Add-on to a cut.', active: true, category: 'hair_cut', from: true, addOn: true, addOnOnly: true },
    { id: 's6', name: 'Beard Trim', price: 40, cost: 6, durationMin: 30, description: 'Shape, line-up and oil finish.', active: true, category: 'beard', addOn: true },
    { id: 's7', name: 'Beard Shave', price: 60, cost: 8, durationMin: 30, description: 'Straight-razor shave, hot towel, balm.', active: true, category: 'beard', addOn: true },
    { id: 's8', name: 'Beard Dye (Black)', price: 100, cost: 25, durationMin: 45, description: 'Grey coverage, natural finish.', active: true, category: 'beard', addOn: true },
    { id: 's9', name: 'Kids Cut', price: 100, cost: 12, durationMin: 30, description: 'Kids & high school learners. Patience included.', active: true, category: 'kids' },
    { id: 's10', name: 'Senior Cut', price: 100, cost: 12, durationMin: 30, description: 'Pensioners. The same standard, the same respect.', active: true, category: 'senior' },
    { id: 's11', name: 'Black Enhancement (Spray)', price: 50, cost: 10, durationMin: 30, description: 'Instant depth and shine. Add-on to a cut or colour.', active: true, category: 'colour', addOn: true, addOnOnly: true },
    { id: 's12', name: 'Black Dye', price: 100, cost: 30, durationMin: 45, description: 'Rich, natural black coverage.', active: true, category: 'colour', addOn: true },
    { id: 's13', name: 'Full Hair Colour', price: 200, cost: 80, durationMin: 90, description: 'From R200 — varies with hair length.', active: true, category: 'colour', from: true, addOn: true },
    { id: 's14', name: 'Bleach', price: 300, cost: 120, durationMin: 90, description: 'From R300 — varies with length & applications.', active: true, category: 'colour', from: true, addOn: true },
    { id: 's15', name: 'Fashion Colours', price: 350, cost: 150, durationMin: 90, description: 'From R350 — grey, blue, red, silver and more.', active: true, category: 'colour', from: true, addOn: true },
  ];

  const clientSeeds: [string, string][] = [
    ['Naledi Khumalo', '072 314 8821'],
    ['Jayden Mthembu', '083 552 9034'],
    ['Tumelo Radebe', '079 884 2210'],
    ['Ayo Okafor', '071 240 6688'],
    ['Sipho Ndlovu', '082 907 4412'],
    ['Lwazi Shabangu', '073 118 2950'],
    ['Thabo Mngadi', '076 342 5561'],
    ['Zanele Dube', '081 776 3324'],
    ['Kgodiso Molefe', '074 509 8873'],
    ['Keanu van der Merwe', '084 221 7745'],
    ['Sibusiso Ngcobo', '078 445 1209'],
    ['Amara Eze', '079 663 8842'],
    ['Dylan Petersen', '083 900 4471'],
    ['Mpho Segamonye', '072 887 3316'],
  ];
  const emailDomains = ['gmail.com', 'gmail.com', 'yahoo.com', 'outlook.com', 'gmail.com', 'icloud.com', 'gmail.com'];
  const toEmail = (name: string, i: number) => {
    const [first, last] = name.toLowerCase().split(' ');
    return `${first}.${last}${i % 9 === 0 ? '' : i % 3}@${emailDomains[i % emailDomains.length]}`;
  };
  const clients: Client[] = clientSeeds.map(([name, phone], i) => ({
    id: `c${i + 1}`,
    name,
    phone,
    email: toEmail(name, i),
  }));

  const bookings: Booking[] = [];
  const payments: Payment[] = [];
  let pn = 1000;
  const nextPayId = () => `pay${++pn}`;

  const occupied = new Map<string, Set<number>>();
  const occKey = (d: string, b: string) => `${d}|${b}`;
  const slotFree = (d: string, b: string, svc: Service, time: string): boolean => {
    const s = occupied.get(occKey(d, b));
    if (!s) return true;
    const i0 = slotIndex(settings, d, time);
    const span = spanFor(settings, svc.durationMin);
    for (let i = i0; i < i0 + span; i++) if (s.has(i)) return false;
    return true;
  };
  const markOcc = (d: string, b: string, svc: Service, time: string) => {
    const k = occKey(d, b);
    let s = occupied.get(k);
    if (!s) {
      s = new Set();
      occupied.set(k, s);
    }
    const i0 = slotIndex(settings, d, time);
    const span = spanFor(settings, svc.durationMin);
    for (let i = i0; i < i0 + span; i++) s.add(i);
  };

  // Weight toward the big sellers (hair cuts) so the mix looks real.
  const weightService = (): Service => {
    const r = rnd();
    if (r < 0.42) return pick(rnd, services.slice(0, 5)); // hair cuts
    if (r < 0.6) return pick(rnd, services.slice(5, 8)); // beard
    if (r < 0.72) return pick(rnd, services.slice(8, 10)); // kids/senior
    return pick(rnd, services.slice(10, 15)); // colour
  };

  // --- 30 days of history + 6 days of upcoming, per barber (open 7 days) ---
  for (let d = -30; d <= 6; d++) {
    const date = addDays(today, d);
    const slots = slotsFor(settings, date);
    if (slots.length === 0) continue;
    for (const barber of barbers) {
      const count = d < 0 ? 2 + Math.floor(rnd() * 4) : 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < count; k++) {
        const svc = weightService();
        const time = pick(rnd, slots);
        if (!slotFree(date, barber.id, svc, time)) continue;
        const client = pick(rnd, clients);
        const isPast = d < 0;
        const canceled = rnd() < (isPast ? 0.05 : 0.04);
        const status = canceled ? 'canceled' : isPast ? 'completed' : 'confirmed';
        const bId = `bk${bookings.length + 1}`;
        const isWalkIn = rnd() < 0.3;
        let tip: number | undefined;
        let pay: Payment | undefined;
        if (!canceled) {
          tip = rnd() < 0.38 ? Math.max(10, Math.round((svc.price * (0.05 + rnd() * 0.1)) / 5) * 5) : undefined;
          const method: PaymentMethod = isWalkIn ? (rnd() < 0.55 ? 'card_chair' : 'cash') : 'card_payfast';
          const when = `${date}T${time}:00`;
          pay = {
            id: nextPayId(),
            ref: `PAY-${100000 + ((pn * 7919) % 89999)}`,
            bookingId: bId,
            method,
            amount: svc.price,
            status: 'captured',
            createdAt: when,
            capturedAt: when,
          };
          payments.push(pay);
        }
        bookings.push({
          id: bId,
          ref: `OB-${1000 + bookings.length}`,
          clientId: client.id,
          clientName: client.name,
          clientPhone: client.phone,
          serviceId: svc.id,
          barberId: barber.id,
          date,
          time,
          durationMin: svc.durationMin,
          status,
          type: isWalkIn ? 'walk_in' : 'online',
          price: svc.price,
          tip,
          paymentId: pay?.id,
          createdAt: `${date}T${time}:00`,
          completedAt: isPast && !canceled ? `${date}T${time}:00` : undefined,
        });
        markOcc(date, barber.id, svc, time);
      }
    }
  }

  // --- Guarantee today has completed work (prefer already-passed slots) ----
  {
    const need = Math.max(0, 2 - bookings.filter((b) => b.date === today && b.status === 'completed').length);
    if (need > 0) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      const allSlots = slotsFor(settings, today);
      const ordered = [...allSlots].sort((a, b) => {
        const aPast = toMin(a) <= nowMin ? 0 : 1;
        const bPast = toMin(b) <= nowMin ? 0 : 1;
        return aPast - bPast || a.localeCompare(b);
      });
      let placed = 0;
      for (const t of ordered) {
        if (placed >= need) break;
        for (const barber of barbers) {
          if (placed >= need) break;
          const svc = services[placed % 2 === 0 ? 0 : 5];
          if (!slotFree(today, barber.id, svc, t)) continue;
          const client = clients[bookings.length % clients.length];
          const bId = `bk${bookings.length + 1}`;
          const pay: Payment = {
            id: nextPayId(),
            ref: `PAY-${100000 + ((pn * 104729) % 89999)}`,
            bookingId: bId,
            method: placed === 0 ? 'card_payfast' : 'card_chair',
            amount: svc.price,
            status: 'captured',
            createdAt: `${today}T${t}:00`,
            capturedAt: `${today}T${t}:00`,
          };
          payments.push(pay);
          bookings.push({
            id: bId,
            ref: `OB-${1000 + bookings.length}`,
            clientId: client.id,
            clientName: client.name,
            clientPhone: client.phone,
            serviceId: svc.id,
            barberId: barber.id,
            date: today,
            time: t,
            durationMin: svc.durationMin,
            status: 'completed',
            type: 'online',
            price: svc.price,
            tip: 20,
            paymentId: pay.id,
            createdAt: `${today}T${t}:00`,
            completedAt: `${today}T${t}:00`,
          });
          markOcc(today, barber.id, svc, t);
          placed++;
        }
      }
    }
  }

  // Unassigned walk-ins waiting in the reception queue right now.
  const walkinToday: [string, string, number][] = [
    ['Palesa Mkhize', '079 210 4477', 0], // Hair Cut
    ['Ravi Naidoo', '082 665 1290', 1], // Chiskop Clipper
  ];
  for (const [name, phone, svcIdx] of walkinToday) {
    const svc = services[svcIdx];
    bookings.push({
      id: `bk${bookings.length + 1}`,
      ref: `WK-${900 + bookings.length}`,
      clientName: name,
      clientPhone: phone,
      serviceId: svc.id,
      durationMin: svc.durationMin,
      date: today,
      time: '',
      status: 'confirmed',
      type: 'walk_in',
      price: svc.price,
      createdAt: new Date().toISOString(),
    });
  }

  // --- Loyalty members — the stamp card (9 stamps → 10th cut free) ---------
  const member = (clientId: string, stamps: number, spend: number, claimed: number): LoyaltyMember => {
    const c = clients.find((x) => x.id === clientId)!;
    return {
      id: `loy_${clientId}`,
      phone: c.phone,
      name: c.name,
      email: c.email,
      stamps,
      freeCutsClaimed: claimed,
      lifetimeSpend: spend,
      joinedAt: addDays(today, -120),
    };
  };
  const loyalty: LoyaltyMember[] = [
    member('c1', 9, 6850, 1), // ready to redeem the free cut right now
    member('c2', 5, 5420, 0),
    member('c3', 2, 2860, 0),
    member('c4', 7, 4310, 1),
    member('c5', 0, 640, 0),
    member('c6', 1, 310, 0),
  ];
  const loyaltyLog: LoyaltyEvent[] = [
    { id: 'lw1', phone: loyalty[0].phone, memberName: loyalty[0].name, action: 'redeem', note: '10th haircut free — card restarted', at: `${addDays(today, -6)}T10:12:00` },
    { id: 'lw2', phone: loyalty[3].phone, memberName: loyalty[3].name, action: 'stamp', note: 'Hair Cut completed by Thabo', at: `${addDays(today, -2)}T11:40:00` },
    { id: 'lw3', phone: loyalty[1].phone, memberName: loyalty[1].name, action: 'stamp', note: 'Chiskop Blade completed by Sbu', at: `${addDays(today, -1)}T15:05:00` },
  ];

  // --- Budgets (monthly) & this month's actual expenses ----------------------
  const budgetRows: [string, number][] = [
    ['Rent', 18000],
    ['Utilities', 2600],
    ['Products', 4500],
    ['Marketing', 1800],
    ['Maintenance', 1200],
  ];
  const budgets: Budget[] = budgetRows.map(([category, amount], i) => ({ id: `bud${i + 1}`, category, amount }));

  const notesFor: Record<string, string[]> = {
    Rent: ['Monthly rent — Shop 22, Michael House'],
    Utilities: ['Eskom + water', 'Municipal levy'],
    Products: ['Clipper blades + oil', 'Clay, gel, aftershave restock', 'Black dye + enhancement spray'],
    Marketing: ['Instagram boost', 'Window print refresh'],
    Maintenance: ['Chair hydraulic repair', 'Deep clean + floor care'],
    Misc: ['Card machine fees', 'Misc shop top-up'],
  };
  const expenses: Expense[] = [];
  const day1 = `${today.slice(0, 8)}01`;
  const daysSoFar = Number(today.slice(8, 10));
  for (const [category, amount] of budgetRows) {
    const n = 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const day = 1 + Math.floor(rnd() * Math.max(1, Math.min(daysSoFar, 15)));
      const date = `${day1.slice(0, 8)}${String(day).padStart(2, '0')}`;
      if (date > today) continue;
      const pool = notesFor[category] ?? ['Shop expense'];
      expenses.push({
        id: `exp${expenses.length + 1}`,
        category,
        amount: Math.round(amount * (0.25 + rnd() * 0.3)),
        note: pick(rnd, pool),
        date,
      });
    }
  }

  // --- Inventory ----------------------------------------------------------------
  const inventory: InventoryItem[] = [
    { id: 'inv1', name: 'Beard oil (30ml)', unit: 'bottle', unitCost: 45, stock: 14, lowAt: 6 },
    { id: 'inv2', name: 'Styling clay (150g)', unit: 'jar', unitCost: 60, stock: 9, lowAt: 5 },
    { id: 'inv3', name: 'Matte gel (200ml)', unit: 'bottle', unitCost: 55, stock: 4, lowAt: 6 },
    { id: 'inv4', name: 'Single-edge blades', unit: 'blade', unitCost: 12, stock: 80, lowAt: 30 },
    { id: 'inv5', name: 'Black dye (50g)', unit: 'tube', unitCost: 58, stock: 11, lowAt: 5 },
    { id: 'inv6', name: 'Black enhancement spray', unit: 'bottle', unitCost: 32, stock: 3, lowAt: 6 },
  ];

  return {
    version: 1,
    platformEnabled: true,
    barbers,
    services,
    clients,
    bookings,
    payments,
    loyalty,
    loyaltyLog,
    budgets,
    expenses,
    inventory,
    priceHistory: [],
    settings,
  };
}
