# Deploy The One Barber to Vercel (Free plan) — 1 project → 4 links

You asked for **4 links on Vercel's free Hobby plan**. The cheapest way is **one Vercel project** that gives you all 4 dashboards as paths — this is already coded and ready.

> **1 project = 1 vercel.app domain = 4 shareable URLs**
> No need to create 4 separate Vercel projects.

---

## Your 4 client links (after deploy)

Replace `YOUR-PROJECT` with the name you pick in Vercel:

| # | Dashboard | What the client sees | URL |
|---|-----------|----------------------|-----|
| **1** | **CLIENT WEBSITE** | Public booking site — hero, barbers, services, 9→10th free loyalty, tips, PayFast | `https://YOUR-PROJECT.vercel.app/` |
| **2** | **RECEPTION** | Walk-ins, allocate to barber, calendar, cash/card + tip at chair | `https://YOUR-PROJECT.vercel.app/reception` |
| **3** | **BARBER** | My line, my chair, earnings (per-barber PIN) | `https://YOUR-PROJECT.vercel.app/barber` |
| **4** | **ADMIN / MONEY ROOM** | Prices, barbers, payouts + tips, CRM export, loyalty, budgets | `https://YOUR-PROJECT.vercel.app/admin` |
| *hidden* | **SUPER-ADMIN** (kill-switch) | Platform ON/OFF — only you | `https://YOUR-PROJECT.vercel.app/superadmin` |

**PIN cheat-sheet for the demo:**

| Role | PIN |
|------|-----|
| `Admin / Money Room` | `9201` |
| `Reception` | `4477` |
| `Thabo Mokoena (Master Barber)` | `1111` |
| `Sbu Dlamini (Fade Specialist)` | `2222` |
| `Kagiso Nkosi (Beard Architect)` | `3333` |
| `Thando Cele (No.4)` | `4444` |
| `Super-admin` | `Eliteflow26` |

Subdomains also work if you later attach a custom domain (middleware is ready):
`admin.yourdomain.co.za → /admin`, `reception.yourdomain.co.za → /reception`, `barber.yourdomain.co.za → /barber`. On the free `vercel.app` domain just use the **paths** above.

---

## What was made Vercel-ready

1. **`vercel.json` at repo root** (`the-one-barber/vercel.json`):
   ```json
   {
     "buildCommand": "npm run build --workspace @the-one-barber/web",
     "outputDirectory": "apps/web/.next",
     "installCommand": "npm install",
     "framework": "nextjs",
     "regions": ["fra1"]
   }
   ```
   Frankfurt (`fra1`) = closest to Pretoria / Johannesburg for best latency.

2. **Ephemeral storage fix** (no DB needed for demo):
   - `apps/web/lib/engine.ts` → on Vercel uses `/tmp/.data-obb` (Vercel's only writable folder).
   - `packages/engine/src/store.ts` → wraps `mkdir/write/rename` in try/catch so the app never crashes if the filesystem is read-only — it just runs in-memory.
   - **Result:** Demo is live with no env vars, no database. Data resets on cold start — tap **Settings → Reset demo data** to re-seed instantly. For persistence later, swap the `Store` for Vercel Postgres / Neon (zero dashboard changes).

3. `git init` + first commit at `the-one-barber/` is done (`main` branch). You just need to push to GitHub.

The project already builds (`Next 15.3.4`, 8/8 static, 101kB shared) — verified with `npm run build`.

---

## Deploy in 3 clicks (recommended: GitHub → Vercel)

### Option A — GitHub import (30 seconds, UI only)

1. **Create a GitHub repo**
   ```bash
   cd /home/user/the-one-barber   # or wherever you keep it locally
   # create an empty repo on github.com (no README) — call it the-one-barber
   git remote add origin https://github.com/YOUR-USERNAME/the-one-barber.git
   git push -u origin main
   ```
   > If you downloaded the workspace as a zip, unzip locally first, then the three git commands above.

2. **Vercel → Add New Project**
   - Go to https://vercel.com/new
   - **Import** `the-one-barber`
   - **Root Directory:** leave empty (it must be the repo root, not `apps/web` — vercel.json handles it). If Vercel auto-detects `apps/web`, click `Edit` and clear it.
   - **Framework Preset:** Next.js (auto)
   - **Build Command:** leave as in `vercel.json` (or override with `npm run build --workspace @the-one-barber/web`)
   - **Install Command:** `npm install`
   - **Output Directory:** `apps/web/.next` (from vercel.json)
   - Click **Deploy** — first build ~45s.

3. **Rename the domain (optional, nicer link)**
   - Vercel → Project → Settings → Domains → give it `the-one-barber-demo.vercel.app` or `onebarber.vercel.app`.
   - Your 4 links are now live — copy them into the pitch deck below.

No env vars needed. PayFast is in **simulated** mode until you add real keys — bookings still work.

### Option B — Vercel CLI (no GitHub needed, from your laptop)

```bash
npm i -g vercel          # once
cd the-one-barber
vercel --prod            # answer: Set up? Y, link to existing? N, project name: the-one-barber-demo, Root Directory: ./
# First deploy uploads ~80MB, builds on Vercel, prints your 4 URLs
vercel ls                # see deployments
```

---

## Before the client call — quick QA (2 min)

After deploy, open each link and check:

- [ ] `/` loads hero image, `Book now` → pick service → `Thabo` → slot → tip chips R10/R20/R30/R50 → Pay screen shows `Total Rxxx`
- [ ] `/reception` → PIN `4477` → see today's board, create walk-in → allocate to a barber + tip → confirm green banner
- [ ] `/barber` → choose `Sbu Dlamini` PIN `2222` → see today's line, payout card shows **Tips** included
- [ ] `/admin` → PIN `9201` → Money Room: top-right `⎋ Sign out` (rose) is visible on desktop **and** mobile, publishing a price updates live on `/`
- [ ] `/superadmin` → password `Eliteflow26` → toggle `Platform OFF` → all dashboards show "Platform paused" except `/superadmin` and `/api/platform/status` — toggle back ON before demo

If any page is blank, wait 10s and refresh (cold start on Hobby).

---

## Demo flow that closes (90 seconds)

**Open all 4 links in 4 tabs before you share screen.**

1. **You (25s):** `/admin` → `Max share screen` → "One engine, four dashboards. I issue a new price here — watch." Change `Classic Cut R150 → R160` → `Publish`.
2. **Client (15s):** `/` (refresh) → "It's live on the site already. No re-deploy."
3. **Reception (15s):** Switch tab to `/reception` → "Walk-in arrives — we put a tip R20, cash at chair, the barber's payout updates instantly."
4. **Barber (15s):** Switch tab to `/barber` (2222) → "Thabo sees his line and his tips + commission."
5. **Close (20s):** `/admin` → `Money` → "Commission + tips per barber, export CSV for your accountant, CRM export ready for Elite Way Holdings (`R500/mo` add-on). And I can kill-switch the whole platform from `/superadmin` if you stop paying — you get that control."

Tip: Put `CLIENT_PITCH.html` (in this repo) on your second monitor — it has the 4 QR codes so the client can scan each dashboard on their phone live.

---

## Limits on Vercel Hobby (free)

- 100 GB bandwidth / month, 6 000 execution hours — far more than a barbershop demo/client site needs.
- Serverless: `/tmp` is ephemeral — each cold start re-seeds. For a production shop that needs bookings to survive forever, add **Vercel Postgres** (free) or **Neon** and swap `Store` → one SQL table. Dashboards don't change.
- Custom domain is free to add later; middleware will automatically make `barber.yourshop.co.za` etc. work.

---

## If you want persistence later (one-sentence upgrade)

Add `DATABASE_URL` from Vercel Postgres, change `Store` to `pg` — the engine interface (`mutate/replace/db`) stays the same, so no dashboard rewrites. The file-store is deliberately thin for this swap.

---

**Files changed for this deploy:** `vercel.json` (new), `apps/web/lib/engine.ts` (Vercel /tmp), `packages/engine/src/store.ts` (fault-tolerant persist). No visual changes.

Next step: **push to GitHub + import** — want me to also generate the `CLIENT_PITCH.html` QR sheet so you can just AirDrop it?
