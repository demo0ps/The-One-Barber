'use client';

export default function OfflineScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 py-16 text-center">
      <img src="/images/logo.png" alt="The One Barber" className="h-16 w-auto opacity-90" />
      <div className="mt-8 h-px w-12 bg-gold/60" />
      <h1 className="mt-6 font-display text-3xl font-semibold tracking-wide text-white md:text-4xl">The One Barber is temporarily unavailable</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/45 md:text-base">We’re doing a bit of maintenance — we’ll be back soon.</p>
      <div className="mt-8 rounded-full border border-gold/20 bg-gold/5 px-4 py-2 text-[11px] tracking-[0.2em] text-gold/70 uppercase">One chair. One standard. Back shortly.</div>
    </div>
  );
}
