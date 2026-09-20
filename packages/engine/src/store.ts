// ---------------------------------------------------------------------------
// Persistence layer. Ships with a JSON-file store (zero dependencies, atomic
// writes). The interface is deliberately thin so it can be swapped for
// Postgres/Mongo later without touching any dashboard code.
// ---------------------------------------------------------------------------

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import path from 'path';
import type { Barber, DB, LoyaltyMember } from './types';
import { seedDB } from './seed';

export class Store {
  db: DB;
  private file: string;

  constructor(dataDir: string) {
    try {
      mkdirSync(dataDir, { recursive: true });
    } catch {
      // Vercel read-only edge: fall back to memory-only
    }
    this.file = path.join(dataDir, 'db.json');
    if (existsSync(this.file)) {
      try {
        this.db = JSON.parse(readFileSync(this.file, 'utf8')) as DB;
        this.migrate();
      } catch {
        this.db = seedDB();
        this.persist();
      }
    } else {
      this.db = seedDB();
      this.persist();
    }
  }

  /** Backfill fields added after the original seed (forward migration). */
  private migrate() {
    const db = this.db;
    if (typeof (db as { platformEnabled?: unknown }).platformEnabled !== 'boolean') {
      (db as { platformEnabled: boolean }).platformEnabled = true;
    }
    if (!Array.isArray(db.priceHistory)) db.priceHistory = [];
    if (!Array.isArray(db.loyaltyLog)) db.loyaltyLog = [];
    for (const s of db.services) {
      if (s.active === undefined) s.active = true;
      if (!s.category) s.category = 'hair_cut';
    }
    // v2 settings: per-weekday hours + shop details
    if (!Array.isArray((db.settings as { dayHours?: unknown[] }).dayHours)) {
      const fresh = seedDB().settings;
      db.settings.dayHours = fresh.dayHours;
    }
    const st = db.settings as { address?: string; paymentNote?: string; facebookUrl?: string };
    if (!st.address) Object.assign(db.settings, { address: '', addressNote: '', phone: '', whatsapp: '', instagram: '', instagramUrl: '', facebook: '', facebookUrl: '', paymentNote: '' });
    if (!(db.settings as { facebookUrl?: string }).facebookUrl) {
      (db.settings as { facebookUrl: string }).facebookUrl = 'https://www.facebook.com/profile.php?id=100089811536139';
    }
    const loy = db.settings.loyalty as unknown as { tiers?: unknown; stampsForFree?: number };
    if (loy.tiers || typeof loy.stampsForFree !== 'number') {
      db.settings.loyalty = { stampsForFree: typeof loy.stampsForFree === 'number' ? loy.stampsForFree : 9 };
    }
    // v2 loyalty members: points/tier → stamps card
    for (const m of db.loyalty) {
      const mm = m as LoyaltyMember & { points?: number; tier?: string; redemptions?: number };
      if (mm.points !== undefined) {
        mm.stamps = 0;
        mm.freeCutsClaimed = 0;
        delete mm.points;
        delete mm.tier;
        delete mm.redemptions;
        if (typeof mm.lifetimeSpend !== 'number') mm.lifetimeSpend = 0;
      }
    }
    // per-barber PINs: migrate old DBs that had no pin
    const tempPins = ['1111', '2222', '3333', '4444'];
    for (let i = 0; i < db.barbers.length; i++) {
      const b = db.barbers[i] as Barber & { pin?: string };
      if (!b.pin || !/^\d{4}$/.test(b.pin)) {
        b.pin = tempPins[i % tempPins.length];
      }
    }
    this.persist();
  }

  private persist() {
    try {
      const tmp = `${this.file}.tmp`;
      writeFileSync(tmp, JSON.stringify(this.db, null, 2));
      renameSync(tmp, this.file);
    } catch {
      // ephemeral env (Vercel) may reject writes — keep in-memory DB alive
    }
  }

  /** Apply a mutation, bump the sync version, persist atomically. */
  mutate(fn: (db: DB) => void) {
    fn(this.db);
    this.db.version += 1;
    this.persist();
  }

  /** Replace the whole dataset (used by "Reset demo data"). */
  replace(newDb: DB) {
    this.db = newDb;
    this.db.version += 1;
    this.persist();
  }
}
