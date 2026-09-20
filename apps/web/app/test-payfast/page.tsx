import TestPayFast from '@/components/client/TestPayFast';

// PayFast checkout landing page.
//  - demo mode:  our simulated sandbox gateway (no credentials configured)
//  - live mode:  PayFast redirects the customer back here after paying;
//                the real confirmation arrives via the IPN webhook, which
//                this page polls until it lands.
export default async function TestPayFastPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <TestPayFast
      payRef={one(sp.ref) ?? one(sp.m_payment_id)}
      status={one(sp.payment_status)}
    />
  );
}
