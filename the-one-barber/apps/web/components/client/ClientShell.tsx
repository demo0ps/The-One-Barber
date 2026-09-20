'use client';

import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtR } from '@/lib/format';
import { Logo, SectionTitle, Spinner } from '../ui';
import BookingWizard from './BookingWizard';
import LoyaltyPanel from './LoyaltyPanel';
import MyBookings from './MyBookings';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  description: string;
  category: string;
  from?: boolean;
  addOn?: boolean;
  addOnOnly?: boolean;
}
interface BarberItem { id: string; name: string; title: string; image: string; bio: string; active: boolean }
interface Settings {
  shopName: string;
  tagline: string;
  dayHours: { open: string; close: string }[];
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

const CATEGORY_TITLES: Record<string, { title: string; sub: string }> = {
  hair_cut: { title: 'Hair cuts', sub: 'Every cut earns one stamp on your loyalty card.' },
  beard: { title: 'Beard', sub: 'Architecture, not neglect.' },
  kids: { title: 'Kids', sub: 'Kids & high school learners — patience included.' },
  senior: { title: 'Senior', sub: 'Pensioners. The same standard, the same respect.' },
  colour: { title: 'Colour & bleach', sub: 'From-prices — final price settled at the chair with your barber.' },
};

function Notice({ doneRef, canceledRef }: { doneRef?: string; canceledRef?: string }) {
  if (doneRef) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <div className="card-gold flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-black">✓</div>
            <div>
              <div className="font-semibold text-white">Payment captured — booking confirmed.</div>
              <div className="text-sm text-white/60">Reference {doneRef}. Show this at the door. We&apos;ve locked in your chair.</div>
            </div>
          </div>
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.href = '/'; }} className="btn-ghost shrink-0 !py-2 text-xs">Close</a>
        </div>
      </div>
    );
  }
  if (canceledRef) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <div className="card flex items-center justify-between gap-4 border-rose-400/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/20 text-rose-300">!</div>
            <div>
              <div className="font-semibold text-white">Payment was not completed.</div>
              <div className="text-sm text-white/60">No charge was made. Re-book anytime — your chair is one tap away.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ClientInner() {
  const [services, setServices] = useState<ServiceItem[] | null>(null);
  const [barbers, setBarbers] = useState<BarberItem[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [search, setSearch] = useState({ done: undefined as string | undefined, canceled: undefined as string | undefined });

  useEffect(() => {
    api<{ services: ServiceItem[] }>('/api/services').then((j) => setServices(j.services)).catch(() => setServices([]));
    api<{ barbers: BarberItem[] }>('/api/barbers').then((j) => setBarbers(j.barbers.filter((b) => b.active))).catch(() => setBarbers([]));
    api<{ settings: Settings }>('/api/settings').then((j) => setSettings(j.settings)).catch(() => undefined);
    const p = new URLSearchParams(window.location.search);
    if (p.get('done') || p.get('canceled')) {
      setSearch({ done: p.get('done') ?? undefined, canceled: p.get('canceled') ?? undefined });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const grouped = services
    ? Object.entries(CATEGORY_TITLES).map(([cat, meta]) => ({
        cat,
        meta,
        items: services.filter((s) => s.category === cat),
      })).filter((g) => g.items.length > 0)
    : [];

  return (
    <div className="min-h-screen bg-ink">
      <Notice doneRef={search.done} canceledRef={search.canceled} />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo small />
          <nav className="hidden items-center gap-6 text-sm text-white/60 md:flex">
            <a href="#services" className="transition hover:text-gold-light">Services</a>
            <a href="#barbers" className="transition hover:text-gold-light">Barbers</a>
            <a href="#loyalty" className="transition hover:text-gold-light">Loyalty</a>
            <a href="#mybookings" className="transition hover:text-gold-light">My Bookings</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="#book" className="btn-gold !px-4 !py-2 text-sm">Book now</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <img src="/images/hero.jpg" alt="The One Barber" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/60" />
        <div className="relative mx-auto max-w-6xl px-4 py-28 md:py-36">
          <div className="mb-5 flex items-center gap-3 text-[11px] font-semibold tracking-[0.3em] text-gold uppercase">
            <span className="h-px w-10 bg-gold" /> Arcadia, Pretoria · open 7 days
          </div>
          <h1 className="max-w-3xl font-display text-5xl leading-[1.02] font-bold text-white md:text-7xl">
            It&apos;s more than a haircut. <span className="gold-text">It&apos;s the One.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-white/60 md:text-lg">
            Precision cuts, sharp beards and colour in the heart of Arcadia. We don&apos;t just cut hair —
            we elevate your presence. Walk-ins welcome. Appointments available.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a href="#book" className="btn-gold !px-8 !py-3.5 text-base">Book your standard</a>
            <a href="#barbers" className="btn-ghost !px-8 !py-3.5 text-base">Meet the barbers</a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/45">
            <span>{settings?.paymentNote || 'Card or cash at the chair · Online via PayFast'}</span>
            <a href={`tel:${(settings?.phone ?? '081 487 5017').replace(/\s+/g, '')}`} className="text-white/60 transition hover:text-gold-light">
              ☎ {settings?.phone ?? '081 487 5017'}
            </a>
          </div>
        </div>
      </section>

      {/* THE STANDARD STRIP */}
      <section className="border-b border-white/5 bg-coal/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-white/5 md:grid-cols-4">
          {['Precision every cut', 'Confidence every visit', 'Quality every time', 'Experience the difference'].map((t) => (
            <div key={t} className="px-4 py-5 text-center">
              <div className="text-[11px] font-semibold tracking-[0.22em] text-gold uppercase">{t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-20">
        <SectionTitle
          kicker="The Menu"
          title="Services & prices"
          sub="Straight prices, no surprises. Look sharp. Feel confident. Be the One."
        />
        {!services ? (
          <Spinner />
        ) : (
          <div className="space-y-12">
            {grouped.map((g) => (
              <div key={g.cat}>
                <div className="mb-4 flex items-baseline gap-3">
                  <h3 className="font-display text-xl font-semibold text-white">{g.meta.title}</h3>
                  <span className="text-xs text-white/35">{g.meta.sub}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((s) => (
                    <div key={s.id} className={`card group flex flex-col p-6 transition hover:border-gold/40 ${s.addOnOnly ? 'border-gold/25 bg-gold/[0.03]' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-display text-lg font-semibold text-white">
                          {s.name}
                          {s.addOn && (
                            <span className="ml-2 inline-block rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 align-middle text-[9px] font-bold tracking-wider text-gold-light uppercase">
                              Add-on
                            </span>
                          )}
                        </h4>
                        <div className="font-display text-xl font-semibold text-gold">
                          {s.from && <span className="mr-1 align-middle text-[10px] font-bold tracking-wider text-white/40 uppercase">from</span>}
                          {fmtR(s.price)}
                        </div>
                      </div>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-white/50">{s.description}</p>
                      <div className="mt-5 flex items-center justify-between">
                        <span className="text-xs text-white/35">{s.durationMin} min</span>
                        {s.addOnOnly ? (
                          <span className="text-xs font-semibold text-gold-light/70">Books with a cut — add it in the booking</span>
                        ) : (
                          <a href="#book" className="text-sm font-semibold text-gold-light opacity-0 transition group-hover:opacity-100">
                            Book this →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* BARBERS */}
      <section id="barbers" className="border-y border-white/5 bg-coal/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle
            kicker="The Team"
            title={barbers ? `${barbers.length} chairs. ${barbers.length} specialists.` : 'The team'}
            sub="Every chair is led. Pick your barber — or leave it to us and get whoever is free first."
          />
          {!barbers ? (
            <Spinner />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {barbers.map((b) => (
                <div key={b.id} className="card group overflow-hidden transition hover:border-gold/40">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img src={b.image} alt={b.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <div className="font-display text-lg font-semibold text-white">{b.name}</div>
                      <div className="text-xs font-semibold tracking-wider text-gold uppercase">{b.title}</div>
                    </div>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-xs leading-relaxed text-white/45">{b.bio}</p>
                    <a href="#book" className="mt-3 inline-block text-sm font-semibold text-gold-light">Book with {b.name.split(' ')[0]} →</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* LOYALTY */}
      <section id="loyalty" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative">
            <img src="/images/loyalty.jpg" alt="The One Barber loyalty member" className="w-full rounded-2xl border border-gold/20 object-cover" />
            <div className="card-gold absolute -bottom-5 -right-3 px-5 py-4 md:-right-5">
              <div className="text-[10px] font-semibold tracking-[0.25em] text-gold uppercase">Members get</div>
              <div className="mt-1 font-display text-lg font-semibold text-white">The 10th cut free</div>
              <div className="text-xs text-white/50">9 stamps on hair cuts → your next one is on us</div>
            </div>
          </div>
          <div>
            <SectionTitle
              kicker="Loyalty"
              title="The stamp card"
              sub="Sign up in 10 seconds. Every completed hair cut taps a stamp on your card — the barber taps it right at the chair. Nine stamps and your 10th cut is free. No points, no tiers, no small print."
            />
            <LoyaltyPanel />
          </div>
        </div>
      </section>

      {/* BOOKING */}
      <section id="book" className="border-t border-white/5 bg-coal/40 py-20">
        <div className="mx-auto max-w-4xl px-4">
          <SectionTitle
            kicker="Book"
            title="Lock in your chair"
            sub="Pick a service, a barber, and a time. Payment is handled securely by PayFast — your card details never touch our servers."
          />
          <BookingWizard services={services ?? []} barbers={barbers ?? []} />
        </div>
      </section>

      {/* MY BOOKINGS */}
      <section id="mybookings" className="mx-auto max-w-4xl px-4 py-20">
        <SectionTitle
          kicker="Your Chair"
          title="My bookings"
          sub="Enter your phone number to see your appointments — the same list our reception sees."
        />
        <MyBookings />
      </section>

      <footer className="border-t border-white/10 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <Logo small />
              <p className="mt-4 max-w-xs text-sm text-white/50">
                It&apos;s more than a haircut. It&apos;s the One. Great cuts, easy to find.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <a href={settings?.instagramUrl || 'https://www.instagram.com/theonebarberstudio_'} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-1.5 text-white/60 transition hover:border-gold/50 hover:text-gold-light">
                  IG {settings?.instagram ?? '@theonebarberstudio_'}
                </a>
                <a href={settings?.facebookUrl || 'https://www.facebook.com/profile.php?id=100089811536139'} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-1.5 text-white/60 transition hover:border-gold/50 hover:text-gold-light">
                  FB {settings?.facebook ?? 'The One Barber Studio'}
                </a>
                <a href="https://wa.me/27814875017" target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-1.5 text-white/60 transition hover:border-gold/50 hover:text-gold-light">
                  WhatsApp us
                </a>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.25em] text-gold uppercase">Find us</div>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{settings?.address || 'Shop 22, Michael House, 472 Stanza Bopape Street, Arcadia, Pretoria, 0007'}</p>
              <p className="mt-2 text-xs text-white/35">{settings?.addressNote || 'Next to VW — by the passage next to AJ’s Kitchen'}</p>
              <a href={`tel:${(settings?.phone ?? '081 487 5017').replace(/\s+/g, '')}`} className="mt-3 inline-block text-sm font-semibold text-white/70 transition hover:text-gold-light">
                ☎ {settings?.phone ?? '081 487 5017'} <span className="ml-1 text-xs font-normal text-white/35">(calls & WhatsApp)</span>
              </a>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.25em] text-gold uppercase">Trading hours</div>
              <div className="mt-3 space-y-1 text-sm">
                {(settings?.dayHours ?? []).map((h, i) => (
                  <div key={i} className="flex justify-between gap-6 text-white/55">
                    <span className="text-white/40">{DAY_NAMES[i]}{i === 0 ? ' & PH' : ''}</span>
                    <span>{toMin(h.open) < toMin(h.close) ? `${h.open} – ${h.close}` : 'Closed'}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-white/35">Walk-ins welcome · Appointments available</div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-white/30 md:flex-row">
            <div>© {new Date().getFullYear()} {settings?.shopName ?? 'The One Barber'} · Pretoria</div>
            <div className="flex items-center gap-2">
              <a href="https://www.eliteway.co.za" target="_blank" rel="noreferrer" className="text-white/50 underline-offset-2 transition hover:text-gold-light hover:underline">
                Product of Elite Way Holding
              </a>
              {/* hidden super-admin door — tiny dot at the far end, only you know */}
              <a href="/superadmin" aria-label="superadmin" title="super-admin" className="select-none text-[7px] leading-none opacity-[0.07] hover:opacity-40 transition px-1">·</a>
            </div>
          </div>
          {/* second hidden door — 3×3px fixed dot in the extreme bottom-right corner */}
          <a href="/superadmin" aria-label="superadmin" title="superadmin" className="fixed bottom-1 right-1 z-50 block h-[5px] w-[5px] rounded-full bg-white/[0.06] hover:bg-gold/40 transition" />
        </div>
      </footer>
    </div>
  );
}

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function ClientShell() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-ink"><Spinner /></div>}>
      <ClientInner />
    </Suspense>
  );
}
