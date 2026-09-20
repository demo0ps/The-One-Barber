# The One Barber — one engine, four dashboards

A monorepo for **The One Barber** (Pretoria, South Africa). Black, gold trims, white text.
One shared engine (`packages/engine`) is the single source of truth; four
dashboards in one web app are just four views of it — so they can never drift
out of sync.

## The four dashboards

| Dashboard  | URL          | Who it's for | What it does |
|------------|--------------|--------------|--------------|
| **Client** | `/`          | Clients      | Services & prices, barber portraits (AI imagery), live slot booking, secure **PayFast** checkout, **Bronze/Silver/Gold loyalty** signup & points, "My bookings" by phone |
| **Barber** | `/barber`    | Barbers      | Today's line (start/finish with tips), the all-calendar, earnings: revenue, commission, tips, payout, 14-day chart |
| **Admin**  | `/admin`     | Owner        | Barber accounts & commissions, services/pricing, P&L, budget-vs-actual, 3-month forecast, service profitability, cash/card split, tax set-aside, payouts + CSV export, inventory, expenses, loyalty members, settings, demo reset |
| **Reception** | `/reception` | Front desk  | Walk-in intake → queue, **allocate barber** (cash recorded on the spot), no-shows, live all-calendar — click an empty slot to open a pre-filled walk-in |

The **all-calendar** is one component fed by one endpoint — the same grid on
every dashboard, auto-refreshing as anything changes anywhere. It never opens
on a closed day: if today is a rest day (Sunday), it opens the next trading
day with a clear banner.

## Subdomains — one link per dashboard

The public website contains **no links to staff dashboards** — staff get their
own links. `apps/web/middleware.ts` does host-based routing, so each dashboard
is ready to sit on its own subdomain of your domain (no code changes, just DNS):

| Link | Shows |
|------|-------|
| `theonebarber.co.za` | Public website (clients only) |
| `barber.theonebarber.co.za` | Barber dashboard |
| `reception.theonebarber.co.za` | Reception dashboard |
| `admin.theonebarber.co.za` | Admin dashboard |

It works on any domain — whatever the host's first label is decides the
dashboard (`barber.` / `reception.` / `admin.`), and path access
(`/barber`, `/reception`, `/admin`) keeps working alongside it.

## Per-dashboard identity

Black + gold + white everywhere, but each dashboard has its own accent so no
two screens look the same: **client = gold**, **barber = champagne**,
**reception = cool steel silver**, **admin = deep bronze** ("Money Room").

Admin extras: create barber profiles with **photo upload**, per-barber revenue
drill-down (cards + detail drawer), **issue new prices** (price history logged),
**issue member rewards**, the **customer register** with contact details and
**CSV download for Elite Way Holding's CRM**, plus the Elite Way Holdings
upgrade offer (R500/mo dedicated CRM management). The website footer links
[Elite Way Holding](https://www.eliteway.co.za) as the product owner.

## How sync works

1. Every write (booking, payment, loyalty point, expense, barber edit…) goes
   through `Engine.store.mutate()`, which bumps a **version number** and
   persists atomically.
2. Every dashboard polls `GET /api/state` (4s) and refetches its data when the
   version changes; in-tab actions also fire an instant refresh event.
3. One process, one engine, one `db.json` — there is no second copy of the
   truth to fall out of step.

## Quick start

```bash
npm install
npm run dev        # or: npm run build && npm start
```

Open http://localhost:3000.

Demo staff PINs (shown on the sign-in screen):

- Barber: **1357** (you pick which barber)
- Reception: **4477**
- Admin: **9201**

The system ships **seeded**: 4 barbers, 6 services, ~30 days of bookings &
payments, loyalty members across all three tiers, budgets, expenses and
inventory — so every dashboard looks alive on day one. Admin → Settings →
"Reset demo data" regenerates everything around today's date.

## PayFast integration (ready to work)

The gateway layer is in `packages/engine/src/payments.ts`:

- **No keys configured (default):** demo mode. The full flow runs against a
  simulated gateway page (`/test-payfast`) — booking → checkout → IPN →
  booking confirmed → loyalty points credited. Great for demos and testing.
- **Keys configured (go live):** copy `.env.example` to `.env` and fill in:
  - `PAYFAST_MERCHANT_ID` — your merchant ID
  - `PAYFAST_KEY` — your merchant key (secret)
  - `PAYFAST_MODE` — `sandbox` (test cards) or `live` (real money)

  Then the booking flow submits the **real PayFast hosted checkout** (card
  data is entered on PayFast's own encrypted page — it never touches this
  server), and the IPN webhook `POST /api/payments/payfast-ipn` verifies the
  official MD5/base64 signature before the engine confirms the booking.

## Financial tools (admin → "The Money Room")

- **KPIs** — revenue, net profit, avg ticket, commissions due, tax set-aside (15%, configurable), cash/card split
- **P&L statement** — revenue − product cost − commissions − expenses = net
- **Budget vs actual** — monthly budgets per category (rent, utilities, products, marketing, maintenance, misc) with progress bars
- **3-month forecast** — last-30-day daily average with a growth curve
- **Service profitability** — margin per service (price − product cost)
- **Barber payouts** — per-barber revenue, commission %, tips, total payout + **CSV export**
- **Inventory** — stock levels with low-stock alerts (drives product cost awareness)
- **Expense log** — one-tap logging into budget categories

## Monorepo layout

```
the-one-barber/
├── package.json              # npm workspaces
├── packages/
│   └── engine/               # THE engine — one source of truth
│       └── src/
│           ├── index.ts      # Engine class (bookings, walk-ins, payments, loyalty, admin ops)
│           ├── store.ts      # atomic JSON persistence (swap for Postgres later)
│           ├── calendar.ts   # slots, spans, day math
│           ├── seed.ts       # deterministic demo seed
│           ├── payments.ts   # PayFast adapter (real + demo) & IPN signature check
│           ├── financials.ts # KPIs, P&L, budgets, forecast, payouts
│           └── types.ts      # shared domain types
└── apps/
    └── web/                  # Next.js 15 (App Router) — the four dashboards
        ├── app/
        │   ├── page.tsx      # 1. client
        │   ├── barber/       # 2. barber
        │   ├── admin/        # 3. admin
        │   ├── reception/    # 4. reception
        │   ├── test-payfast/ # PayFast checkout page (real redirect target + demo sim)
        │   └── api/          # engine endpoints (bookings, payments, loyalty, financials…)
        ├── components/       # dashboards, all-calendar, UI kit
        ├── lib/              # api/sync/format/staff helpers
        └── public/images/    # AI-generated hero, barber portraits, loyalty art
```

## Production notes (what I'd do next)

- **Auth:** replace the demo PIN gate with NextAuth (email + 2FA) — the
  dashboards don't change, only the gate does.
- **Storage:** the JSON store is deliberately isolated behind `Store` — swap in
  Postgres for multi-instance deployments.
- **Notifications:** booking confirmations & reminders via SMS/WhatsApp gateway
  (endpoint hooks already exist on every booking lifecycle event).
- **Hosting:** any Node host (Vercel/Fly/Railway); PayFast IPN needs a public
  `notify_url`, which the engine derives from the request host automatically.
