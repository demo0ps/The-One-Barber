// ---------------------------------------------------------------------------
// THE ONE BARBER — engine domain types
// One shared set of shapes used by the engine and every dashboard.
// ---------------------------------------------------------------------------

export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'canceled'
  | 'no_show';

export type BookingType = 'online' | 'walk_in' | 'loyalty_free';
export type PaymentMethod = 'card_payfast' | 'cash' | 'card_chair';
export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded';

export type ServiceCategory = 'hair_cut' | 'beard' | 'kids' | 'senior' | 'colour';

export interface Barber {
  id: string;
  name: string;
  title: string;
  image: string;
  /** Share of each booking's revenue, 0..1 (e.g. 0.5 = 50%) */
  commission: number;
  active: boolean;
  bio?: string;
  /** 4-digit PIN for barber sign-in — issued by admin (money room) */
  pin: string;
}

export interface Service {
  id: string;
  name: string;
  /** Selling price (ZAR). For "from" prices this is the bookable base price. */
  price: number;
  /** Estimated product cost per service (ZAR) — used for margins */
  cost: number;
  durationMin: number;
  description: string;
  /** Retired services stay in history but leave the client menu */
  active: boolean;
  /** Category drives the loyalty card: only hair cuts earn stamps */
  category: ServiceCategory;
  /** True when the real price can be higher (settled at the chair) */
  from?: boolean;
  /** Offered as an add-on in the booking flow (can be stacked on a main service) */
  addOn?: boolean;
  /** Add-on only — cannot be booked as the main service on its own */
  addOnOnly?: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface Booking {
  id: string;
  /** Human reference, e.g. OB-4821. Also used as PayFast pass_phrase. */
  ref: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceId: string;
  /** Add-on services stacked onto the main service (ids) */
  addOnIds?: string[];
  /** Empty/undefined for unassigned walk-ins */
  barberId?: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
  durationMin: number;
  status: BookingStatus;
  type: BookingType;
  /** Full service price (ZAR). 0 for redeemed free cuts. */
  price: number;
  /** Optional discount applied (ZAR) */
  discount?: number;
  tip?: number;
  paymentId?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Payment {
  id: string;
  /** e.g. PAY-83412. Used as PayFast m_payment_id. */
  ref: string;
  bookingId: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  gatewayRef?: string;
  createdAt: string;
  capturedAt?: string;
}

// ─── Loyalty — the stamp card ─────────────────────────────────────────────
// Collect `stampsForFree` (9) stamps on completed HAIR CUTS → the 10th
// haircut is free. Stamps are added by staff at the chair (manual).

export interface LoyaltyMember {
  id: string;
  phone: string;
  name: string;
  email?: string;
  /** 0..9 — at 9 the client's next cut is free */
  stamps: number;
  /** Free cuts redeemed so far */
  freeCutsClaimed: number;
  lifetimeSpend: number;
  joinedAt: string;
}

export interface LoyaltyEvent {
  id: string;
  phone: string;
  memberName: string;
  action: 'stamp' | 'redeem';
  note: string;
  at: string;
}

export interface LoyaltySettings {
  /** Stamps needed for the free cut (9 → 10th cut free) */
  stampsForFree: number;
}

export interface Budget {
  id: string;
  category: string;
  /** Monthly budget (ZAR) */
  amount: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  note: string;
  /** YYYY-MM-DD */
  date: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  stock: number;
  /** Low-stock alert threshold */
  lowAt: number;
}

export interface PriceChange {
  id: string;
  serviceId: string;
  serviceName: string;
  oldPrice: number;
  newPrice: number;
  at: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────

export interface DayHours {
  /** HH:MM. open >= close means the shop is closed that day. */
  open: string;
  close: string;
}

export interface Settings {
  shopName: string;
  tagline: string;
  currency: string;
  /** Trading hours per weekday — index 0 = Sunday … 6 = Saturday */
  dayHours: DayHours[];
  slotMinutes: number;
  /** Tax set-aside rate, 0..1 */
  taxRate: number;
  loyalty: LoyaltySettings;
  // Shop details (shown on the website & dashboards)
  address: string;
  addressNote: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  instagramUrl: string;
  facebook: string;
  facebookUrl: string;
  paymentNote: string;
}

export interface DB {
  /** Bumped on every mutation — powers cross-dashboard sync. */
  version: number;
  /** Super-admin kill-switch: when false the entire platform shows the offline screen (except /superadmin) */
  platformEnabled: boolean;
  barbers: Barber[];
  services: Service[];
  clients: Client[];
  bookings: Booking[];
  payments: Payment[];
  loyalty: LoyaltyMember[];
  loyaltyLog: LoyaltyEvent[];
  budgets: Budget[];
  expenses: Expense[];
  inventory: InventoryItem[];
  priceHistory: PriceChange[];
  settings: Settings;
}
