// ---------------------------------------------------------------------------
// THE ONE BARBER — the Engine.
// Single source of truth. All four dashboards talk to this class only.
// ---------------------------------------------------------------------------

import { addDays, dayIndex, shopOpen, slotsFor, slotIndex, spanFor, toMin, todayStr } from './calendar';
import { seedDB } from './seed';
import { Store } from './store';
import { buildSession, type PaymentSession } from './payments';
import type { Barber, Booking, Client, DB, InventoryItem, LoyaltyEvent, LoyaltyMember, Payment, Service } from './types';

export * from './types';
export * from './calendar';
export { report, todayStats, rangeBounds, type Range, type FinancialsReport } from './financials';
export { buildSession, verifyIpnSignature, isRealMode, type PaymentSession } from './payments';
export { seedDB, defaultSettings, EXPENSE_CATEGORIES } from './seed';

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const refCode = (p: string) => `${p}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const iso = () => new Date().toISOString();

// One engine per server process (API routes share it via the global cache).
declare global {
  // eslint-disable-next-line no-var
  var __obbEngine: Engine | undefined;
}

export function getEngine(dataDir: string): Engine {
  const g = globalThis as unknown as { __obbEngine?: Engine };
  if (!g.__obbEngine) g.__obbEngine = new Engine(dataDir);
  return g.__obbEngine;
}

export class Engine {
  store: Store;

  constructor(dataDir: string) {
    this.store = new Store(dataDir);
  }

  get db(): DB {
    return this.store.db;
  }

  // ─── lookups ───────────────────────────────────────────────────────────────

  private svc(id: string): Service {
    const s = this.db.services.find((x) => x.id === id);
    if (!s) throw new Error('Unknown service.');
    return s;
  }

  private barberById(id?: string): Barber {
    const b = this.db.barbers.find((x) => x.id === id);
    if (!b) throw new Error('Unknown barber.');
    return b;
  }

  // ─── calendar ──────────────────────────────────────────────────────────────

  open(date: string): boolean {
    return shopOpen(this.db.settings, date);
  }

  slots(date: string): string[] {
    return slotsFor(this.db.settings, date);
  }

  /** Slots occupied by any live booking for a barber on a date. */
  private occupiedIn(db: DB, barberId: string, date: string): Set<number> {
    const s = db.settings;
    const out = new Set<number>();
    for (const b of db.bookings) {
      if (b.barberId !== barberId || b.date !== date) continue;
      if (b.status === 'canceled' || b.status === 'no_show') continue;
      const i0 = slotIndex(s, b.date, b.time);
      const span = spanFor(s, b.durationMin);
      for (let i = i0; i < i0 + span; i++) out.add(i);
    }
    return out;
  }

  availableSlots(barberId: string, date: string, serviceId: string, durationMin?: number): string[] {
    return this.freeSlotsIn(this.db, barberId, date, serviceId, durationMin);
  }

  private freeSlotsIn(db: DB, barberId: string, date: string, serviceId: string, durationMin?: number): string[] {
    const s = db.settings;
    const svc = db.services.find((x) => x.id === serviceId);
    if (!svc) return [];
    const all = slotsFor(s, date);
    const occ = this.occupiedIn(db, barberId, date);
    // durationMin override = main service + add-ons combined
    const span = spanFor(s, durationMin ?? svc.durationMin);
    const out: string[] = [];
    for (let i = 0; i + span <= all.length; i++) {
      let free = true;
      for (let j = i; j < i + span; j++) if (occ.has(j)) { free = false; break; }
      if (free) out.push(all[i]);
    }
    return out;
  }

  firstFreeSlot(db: DB, barberId: string, date: string, serviceId: string, notBeforeMin?: number): string | null {
    for (const t of this.freeSlotsIn(db, barberId, date, serviceId)) {
      if (notBeforeMin != null && toMin(t) < notBeforeMin) continue;
      return t;
    }
    return null;
  }

  /** One day, every active barber, every slot — the all-calendar. */
  board(date: string) {
    const s = this.db.settings;
    const slots = slotsFor(s, date);
    const barbers = this.db.barbers.filter((b) => b.active);
    const cells: Record<string, ({ name: string; service: string; status: Booking['status']; time: string; cont?: boolean } | null)[]> = {};
    for (const b of barbers) {
      const row: (typeof cells)[string] = new Array(slots.length).fill(null);
      const dayBookings = this.db.bookings.filter(
        (bk) => bk.barberId === b.id && bk.date === date && bk.status !== 'canceled' && bk.status !== 'no_show',
      );
      for (const bk of dayBookings) {
        if (!bk.time) continue;
        const i0 = slotIndex(s, bk.date, bk.time);
        const span = spanFor(s, bk.durationMin);
        const svcName = this.db.services.find((sv) => sv.id === bk.serviceId)?.name ?? 'Service';
        for (let i = i0; i < i0 + span && i < slots.length; i++) {
          row[i] = { name: bk.clientName, service: svcName, status: bk.status, time: bk.time, cont: i > i0 };
        }
      }
      cells[b.id] = row;
    }
    return { open: this.open(date), slots, barbers, cells };
  }

  // ─── clients & loyalty ────────────────────────────────────────────────────

  private ensureClient(name: string, phone: string, email?: string): Client {
    let c = this.db.clients.find((x) => x.phone === phone);
    if (!c) {
      const fresh: Client = { id: uid('c'), name, phone, email };
      this.store.mutate((db) => db.clients.push(fresh));
      c = fresh;
    }
    return c;
  }

  upsertMember(i: { name: string; phone: string; email?: string }): LoyaltyMember {
    let result!: LoyaltyMember;
    this.store.mutate((db) => {
      const phone = i.phone.replace(/\s+/g, '');
      let m = db.loyalty.find((x) => x.phone.replace(/\s+/g, '') === phone);
      if (m) {
        m.name = i.name;
        m.email = i.email ?? m.email;
        result = m;
        return;
      }
      const member: LoyaltyMember = {
        id: uid('loy'),
        phone: i.phone,
        name: i.name,
        email: i.email,
        stamps: 0,
        freeCutsClaimed: 0,
        lifetimeSpend: 0,
        joinedAt: todayStr(),
      };
      db.loyalty.push(member);
      result = member;
    });
    return result;
  }

  memberByPhone(phone: string): LoyaltyMember | undefined {
    const p = phone.replace(/\s+/g, '');
    return this.db.loyalty.find((x) => x.phone.replace(/\s+/g, '') === p);
  }

  /** Track lifetime spend for a captured payment (CRM + loyalty views). */
  private spendCredit(db: DB, bk: Booking) {
    if (!bk.clientPhone) return;
    const m = db.loyalty.find((x) => x.phone.replace(/\s+/g, '') === bk.clientPhone.replace(/\s+/g, ''));
    if (!m) return;
    const p = db.payments.find((x) => x.bookingId === bk.id && x.status === 'captured');
    const paid = p ? p.amount : bk.price - (bk.discount ?? 0);
    if (paid <= 0) return;
    m.lifetimeSpend += paid;
  }

  // ─── bookings ──────────────────────────────────────────────────────────────

  createOnline(i: {
    serviceId: string;
    barberId: string;
    date: string;
    time: string;
    name: string;
    phone: string;
    email?: string;
    useLoyalty?: boolean;
    notes?: string;
    addOnIds?: string[];
    tip?: number;
  }): Booking {
    const s = this.db.settings;
    const svc = this.svc(i.serviceId);
    if (svc.addOnOnly) throw new Error('That service is an add-on — pick the cut or main service it goes with first.');
    const barber = this.barberById(i.barberId);
    if (!barber.active) throw new Error('This barber is not currently booking.');
    if (!this.open(i.date)) throw new Error('We are closed on that day.');
    if (!this.slots(i.date).includes(i.time)) throw new Error('That time is not a valid slot.');

    // resolve add-ons (active, real, not the main service)
    const addOns = (i.addOnIds ?? [])
      .map((id) => this.db.services.find((x) => x.id === id && x.active))
      .filter((x): x is Service => Boolean(x) && x!.id !== svc.id);
    const price = svc.price + addOns.reduce((sum, a) => sum + a.price, 0);
    const durationMin = svc.durationMin + addOns.reduce((sum, a) => sum + a.durationMin, 0);

    if (!this.availableSlots(i.barberId, i.date, i.serviceId, durationMin).includes(i.time)) {
      throw new Error('Sorry — that slot was just taken. Please pick another time.');
    }
    const client = this.ensureClient(i.name.trim(), i.phone.trim(), i.email?.trim() || undefined);

    const tip = i.tip != null ? Math.max(0, Math.min(500, Math.round(Number(i.tip)))) : undefined;
    if (tip != null && tip > 0 && tip < 5) throw new Error('Tip must be at least R5.');
    const booking: Booking = {
      id: uid('bk'),
      ref: refCode('OB'),
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: i.email?.trim() || undefined,
      serviceId: svc.id,
      addOnIds: addOns.length ? addOns.map((a) => a.id) : undefined,
      barberId: barber.id,
      date: i.date,
      time: i.time,
      durationMin,
      status: 'pending_payment',
      type: 'online',
      price,
      tip: tip && tip > 0 ? tip : undefined,
      notes: i.notes?.trim() || undefined,
      createdAt: iso(),
    };
    this.store.mutate((db) => db.bookings.push(booking));
    return booking;
  }

  createWalkIn(i: { name: string; phone?: string; serviceId: string; notes?: string }): Booking {
    const svc = this.svc(i.serviceId);
    if (svc.addOnOnly) throw new Error('That service is an add-on — put the cut on the counter first, the add-on goes with it.');
    const booking: Booking = {
      id: uid('wk'),
      ref: refCode('WK'),
      clientName: i.name.trim(),
      clientPhone: i.phone?.trim() || '',
      serviceId: svc.id,
      durationMin: svc.durationMin,
      date: todayStr(),
      time: '',
      status: 'confirmed',
      type: 'walk_in',
      price: svc.price,
      notes: i.notes?.trim() || undefined,
      createdAt: iso(),
    };
    this.store.mutate((db) => db.bookings.push(booking));
    return booking;
  }

  /**
   * Allocate a barber (and slot) to a walk-in; payment is recorded on the spot.
   * method: 'cash' (cash at the chair) or 'card' (card machine at the chair).
   * tip is optional — added to payment and credited to the barber's payout.
   */
  assignWalkIn(bookingId: string, barberId: string, time?: string, date?: string, method: 'cash' | 'card' = 'cash', tip?: number): Booking {
    let result!: Booking;
    this.store.mutate((db) => {
      const bk = db.bookings.find((b) => b.id === bookingId);
      if (!bk) throw new Error('Booking not found.');
      if (bk.barberId) throw new Error('Walk-in is already allocated.');
      if (bk.status === 'canceled' || bk.status === 'no_show') throw new Error('This walk-in is closed.');
      const barber = db.barbers.find((x) => x.id === barberId);
      if (!barber || !barber.active) throw new Error('Choose an active barber.');
      const svc = db.services.find((x) => x.id === bk.serviceId)!;
      const now = new Date();
      const today = todayStr();

      let targetDate = date && date !== today ? date : today;
      let t: string | null = time ?? null;
      if (t) {
        // explicit time was picked — on the picked day (default: today)
        if (targetDate === today && slotsFor(db.settings, targetDate).length === 0) {
          throw new Error('We are closed today — pick another day.');
        }
        if (slotsFor(db.settings, targetDate).length === 0) {
          throw new Error('We are closed on that day.');
        }
        if (!this.freeSlotsIn(db, barberId, targetDate, svc.id).includes(t)) {
          throw new Error('That slot is not free for this barber.');
        }
      } else {
        // search forward up to 7 days from the picked day (skips closed days automatically)
        const notBefore = now.getHours() * 60 + now.getMinutes() + 10;
        let found: { date: string; time: string } | null = null;
        const startOffset = targetDate === today ? 0 : 1;
        for (let i = startOffset; i < startOffset + 7 && !found; i++) {
          const d = i === 0 ? today : addDays(today, i);
          const ft = this.firstFreeSlot(db, barberId, d, svc.id, i === 0 ? notBefore : undefined);
          if (ft) found = { date: d, time: ft };
        }
        if (!found) throw new Error('No free slots in the next 7 days — check the all-calendar.');
        targetDate = found.date;
        t = found.time;
      }

      bk.barberId = barberId;
      bk.date = targetDate;
      bk.time = t;
      const tipVal = tip != null ? Math.max(0, Math.min(500, Math.round(Number(tip)))) : 0;
      if (tipVal > 0 && tipVal < 5) throw new Error('Tip must be at least R5.');
      if (tipVal > 0) bk.tip = tipVal;
      const pay: Payment = {
        id: uid('pay'),
        ref: refCode('PAY'),
        bookingId: bk.id,
        method: method === 'card' ? 'card_chair' : 'cash',
        amount: bk.price - (bk.discount ?? 0) + tipVal,
        status: 'captured',
        createdAt: iso(),
        capturedAt: iso(),
      };
      db.payments.push(pay);
      bk.paymentId = pay.id;
      this.spendCredit(db, bk);
      result = bk;
    });
    return result;
  }

  setBookingStatus(bookingId: string, action: 'start' | 'complete' | 'no_show' | 'cancel', tip?: number): Booking {
    let result!: Booking;
    this.store.mutate((db) => {
      const bk = db.bookings.find((b) => b.id === bookingId);
      if (!bk) throw new Error('Booking not found.');
      if (action === 'start' && bk.status === 'confirmed') bk.status = 'in_progress';
      if (action === 'complete' && (bk.status === 'confirmed' || bk.status === 'in_progress')) {
        bk.status = 'completed';
        bk.completedAt = iso();
        if (tip && tip > 0) bk.tip = Math.round(tip);
      }
      if (action === 'no_show' && bk.status === 'confirmed') bk.status = 'no_show';
      if (action === 'cancel' && bk.status !== 'completed') {
        bk.status = 'canceled';
        const pay = db.payments.find((p) => p.bookingId === bk.id);
        if (pay) pay.status = pay.status === 'pending' ? 'failed' : 'refunded';
      }
      result = bk;
    });
    return result;
  }

  // ─── payments (PayFast) ───────────────────────────────────────────────────

  createPaymentSession(bookingId: string, host: string): PaymentSession {
    const booking = this.db.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found.');
    if (booking.status === 'canceled' || booking.status === 'no_show') throw new Error('This booking is closed.');
    let payment = this.db.payments.find((p) => p.bookingId === bookingId && p.status === 'pending');
    if (!payment) {
      const tipVal = booking.tip ?? 0;
      const p: Payment = {
        id: uid('pay'),
        ref: refCode('PAY'),
        bookingId,
        method: 'card_payfast',
        amount: booking.price - (booking.discount ?? 0) + tipVal,
        status: 'pending',
        createdAt: iso(),
      };
      this.store.mutate((db) => db.payments.push(p));
      payment = p;
    }
    return buildSession(booking, payment, host);
  }

  /** Handles both the demo "pay" callback and the real PayFast IPN. */
  processIpn(input: { ref: string; ok: boolean; amount?: number }): { ok: boolean; error?: string } {
    let res: { ok: boolean; error?: string } = { ok: false };
    this.store.mutate((db) => {
      // PayFast sends the booking ref (pass_phrase); the demo flow sends the
      // payment ref. Resolve either.
      const pay = db.payments.find(
        (p) =>
          p.ref === input.ref ||
          p.id === input.ref ||
          p.gatewayRef === input.ref ||
          db.bookings.some((b) => b.id === p.bookingId && b.ref === input.ref),
      );
      if (!pay) {
        res = { ok: false, error: 'Unknown payment reference.' };
        return;
      }
      const bk = db.bookings.find((b) => b.id === pay.bookingId);
      if (pay.status === 'captured') {
        res = { ok: true };
        return;
      }
      if (input.ok) {
        if (input.amount) pay.amount = Number(input.amount);
        pay.status = 'captured';
        pay.capturedAt = iso();
        if (bk && bk.status === 'pending_payment') bk.status = 'confirmed';
        if (bk) this.spendCredit(db, bk);
        res = { ok: true };
      } else {
        pay.status = 'failed';
        if (bk && bk.status === 'pending_payment') bk.status = 'canceled';
        res = { ok: true };
      }
    });
    return res;
  }

  // ─── admin: barbers & services ────────────────────────────────────────────

  addBarber(i: { name: string; title: string; commission: number; bio?: string; image?: string; pin?: string }): Barber {
    const b: Barber = {
      id: uid('b'),
      name: i.name.trim(),
      title: i.title.trim() || 'Barber',
      image: i.image?.trim() || '/images/barber-1.jpg',
      commission: Math.min(1, Math.max(0, i.commission)),
      active: true,
      bio: i.bio?.trim() || '',
      pin: i.pin && /^\d{4}$/.test(String(i.pin).trim()) ? String(i.pin).trim() : String(1000 + Math.floor(Math.random() * 9000)),
    };
    // ensure new pin not duplicated
    this.store.mutate((db) => {
      while (db.barbers.some((x) => x.pin === b.pin)) {
        b.pin = String(1000 + Math.floor(Math.random() * 9000));
      }
      db.barbers.push(b);
    });
    return b;
  }

  patchBarber(id: string, patch: Partial<Barber>) {
    this.store.mutate((db) => {
      const b = db.barbers.find((x) => x.id === id);
      if (!b) throw new Error('Barber not found.');
      if (patch.pin != null) {
        const p = String(patch.pin).trim();
        if (!/^\d{4}$/.test(p)) throw new Error('PIN must be exactly 4 digits.');
        // one PIN per barber — no duplicates
        if (db.barbers.some((x) => x.id !== id && x.pin === p)) throw new Error('That PIN is already in use by another barber.');
        patch.pin = p;
      }
      Object.assign(b, patch, { id: b.id });
      if (patch.commission != null) b.commission = Math.min(1, Math.max(0, patch.commission));
    });
  }

  verifyBarberPin(barberId: string, pin: string): Barber {
    const b = this.db.barbers.find((x) => x.id === barberId);
    if (!b) throw new Error('Unknown barber.');
    if (!b.active) throw new Error('This barber is not active.');
    if (String(pin).trim() !== b.pin) throw new Error('Wrong PIN for this barber.');
    return b;
  }

  // ─── platform kill-switch (super-admin) ─────────────────────────────────
  get platformEnabled(): boolean {
    return (this.db as DB & { platformEnabled?: boolean }).platformEnabled !== false;
  }

  setPlatformEnabled(enabled: boolean) {
    this.store.mutate((db) => {
      (db as DB & { platformEnabled: boolean }).platformEnabled = enabled;
    });
  }

  addService(i: {
    name: string;
    price: number;
    cost: number;
    durationMin: number;
    description?: string;
    category?: Service['category'];
    from?: boolean;
    addOn?: boolean;
    addOnOnly?: boolean;
  }): Service {
    const s: Service = {
      id: uid('s'),
      name: i.name.trim(),
      price: Math.max(0, i.price),
      cost: Math.max(0, i.cost),
      durationMin: [30, 45, 60, 90].includes(i.durationMin) ? i.durationMin : 30,
      description: i.description?.trim() || '',
      active: true,
      category: i.category ?? 'hair_cut',
      from: i.from ?? false,
      addOn: i.addOn ?? false,
      addOnOnly: i.addOnOnly ?? false,
    };
    this.store.mutate((db) => {
      db.services.push(s);
      db.priceHistory.unshift({
        id: uid('ph'),
        serviceId: s.id,
        serviceName: s.name,
        oldPrice: 0,
        newPrice: s.price,
        at: iso(),
      });
    });
    return s;
  }

  patchService(id: string, patch: Partial<Service>) {
    this.store.mutate((db) => {
      const s = db.services.find((x) => x.id === id);
      if (!s) throw new Error('Service not found.');
      // "Issuing a new price" — log the change so the price list has history
      if (patch.price != null && patch.price !== s.price) {
        db.priceHistory.unshift({
          id: uid('ph'),
          serviceId: s.id,
          serviceName: s.name,
          oldPrice: s.price,
          newPrice: patch.price,
          at: iso(),
        });
      }
      Object.assign(s, patch, { id: s.id });
    });
  }

  // ─── admin: money tools ───────────────────────────────────────────────────

  addExpense(i: { category: string; amount: number; note?: string }) {
    const e = {
      id: uid('exp'),
      category: i.category,
      amount: Math.max(0, i.amount),
      note: i.note?.trim() || i.category,
      date: todayStr(),
    };
    this.store.mutate((db) => db.expenses.push(e));
  }

  setBudget(category: string, amount: number) {
    this.store.mutate((db) => {
      const b = db.budgets.find((x) => x.category === category);
      if (b) b.amount = Math.max(0, amount);
      else db.budgets.push({ id: uid('bud'), category, amount: Math.max(0, amount) });
    });
  }

  adjustInventory(id: string, delta: number) {
    this.store.mutate((db) => {
      const it = db.inventory.find((x) => x.id === id);
      if (!it) throw new Error('Item not found.');
      it.stock = Math.max(0, it.stock + delta);
    });
  }

  addInventoryItem(i: { name: string; unit: string; unitCost: number; stock: number; lowAt: number }): InventoryItem {
    const it: InventoryItem = { id: uid('inv'), ...i };
    this.store.mutate((db) => db.inventory.push(it));
    return it;
  }

  // ─── loyalty: the stamp card (9 stamps → 10th haircut free) ─────────────

  /** Staff taps a stamp at the chair after a completed HAIR CUT. */
  addStamp(phone: string, note?: string) {
    let result!: LoyaltyEvent;
    this.store.mutate((db) => {
      const m = db.loyalty.find((x) => x.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));
      if (!m) throw new Error('This client is not on the loyalty card yet. Sign them up first.');
      const need = db.settings.loyalty.stampsForFree;
      if (m.stamps >= need) throw new Error('Card is full — redeem the free cut first.');
      m.stamps += 1;
      const ev: LoyaltyEvent = {
        id: uid('lw'),
        phone: m.phone,
        memberName: m.name,
        action: 'stamp',
        note: note?.trim() || 'Hair cut completed — stamp added at the chair',
        at: iso(),
      };
      db.loyaltyLog.unshift(ev);
      result = ev;
    });
    return result;
  }

  /** Redeem the 10th free cut (requires a full card). */
  redeemFreeCut(phone: string, note?: string) {
    let result!: LoyaltyEvent;
    this.store.mutate((db) => {
      const m = db.loyalty.find((x) => x.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));
      if (!m) throw new Error('This client is not on the loyalty card yet.');
      const need = db.settings.loyalty.stampsForFree;
      if (m.stamps < need) throw new Error(`${m.name} has ${m.stamps} of ${need} stamps — the card is not full yet.`);
      const cut = db.services.find((s) => s.category === 'hair_cut' && s.active) ?? db.services[0];
      const date = todayStr();
      const [h, mi] = [new Date().getHours(), new Date().getMinutes()];
      const bk: Booking = {
        id: uid('bk'),
        ref: refCode('FREE'),
        clientId: db.clients.find((c) => c.phone.replace(/\s+/g, '') === m.phone.replace(/\s+/g, ''))?.id,
        clientName: m.name,
        clientPhone: m.phone,
        serviceId: cut.id,
        date,
        time: `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`,
        durationMin: cut.durationMin,
        status: 'completed',
        type: 'loyalty_free',
        price: 0,
        notes: '10th cut free — loyalty card',
        createdAt: iso(),
        completedAt: iso(),
      };
      db.bookings.push(bk);
      m.stamps = 0;
      m.freeCutsClaimed += 1;
      const ev: LoyaltyEvent = {
        id: uid('lw'),
        phone: m.phone,
        memberName: m.name,
        action: 'redeem',
        note: note?.trim() || '10th haircut free — card restarted',
        at: iso(),
      };
      db.loyaltyLog.unshift(ev);
      result = ev;
    });
    return result;
  }

  // ─── CRM: customer list ──────────────────────────────────────────────────

  /** One row per known client, enriched with visits, spend & loyalty data. */
  crmClients() {
    const db = this.db;
    return db.clients
      .map((c) => {
        const bookings = db.bookings.filter(
          (b) => b.clientPhone.replace(/\s+/g, '') === c.phone.replace(/\s+/g, ''),
        );
        const completed = bookings.filter((b) => b.status === 'completed');
        let spend = 0;
        for (const b of completed) {
          const p = db.payments.find((x) => x.bookingId === b.id && x.status === 'captured');
          spend += p ? p.amount : b.price - (b.discount ?? 0);
        }
        const lastVisit = completed.map((b) => b.date).sort().at(-1);
        const member = db.loyalty.find((m) => m.phone.replace(/\s+/g, '') === c.phone.replace(/\s+/g, ''));
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email ?? '',
          visits: completed.length,
          spend,
          lastVisit: lastVisit ?? '',
          stamps: member?.stamps ?? null,
          freeCutsClaimed: member?.freeCutsClaimed ?? null,
        };
      })
      .sort((a, b) => b.spend - a.spend || b.visits - a.visits);
  }

  // ─── settings & reset ─────────────────────────────────────────────────────

  patchSettings(patch: Partial<DB['settings']>) {
    this.store.mutate((db) => {
      Object.assign(db.settings, patch);
    });
  }

  reset() {
    this.store.replace(seedDB());
  }
}
