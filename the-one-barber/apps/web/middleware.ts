import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// SUBDOMAIN ROUTING
// Each dashboard is ready for its own link/domain:
//
//   (apex / www)         → client website      e.g.  theonebarber.co.za
//   barber.<domain>      → barber dashboard    e.g.  barber.theonebarber.co.za
//   reception.<domain>   → reception dashboard e.g.  reception.theonebarber.co.za
//   admin.<domain>       → admin dashboard     e.g.  admin.theonebarber.co.za
//
// Domain-agnostic: point any subdomain at this app and it "just works" —
// the first label of the Host header decides which dashboard is served.
// Path access (/barber, /admin, /reception) also keeps working for internal
// use, and the client website contains NO links to staff dashboards.
// ---------------------------------------------------------------------------

const DASH_HOSTS: Record<string, string> = {
  barber: '/barber',
  reception: '/reception',
  admin: '/admin',
};

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];
  const firstLabel = host.split('.')[0];
  const target = DASH_HOSTS[firstLabel];
  if (target && !req.nextUrl.pathname.startsWith(target)) {
    const url = req.nextUrl.clone();
    url.pathname = target;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};
