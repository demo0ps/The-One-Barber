import { eng, err, json, num } from '@/lib/engine';
import { isRealMode, verifyIpnSignature } from '@the-one-barber/engine';

export const dynamic = 'force-dynamic';

// Real PayFast Instant Payment Notification (IPN) webhook.
// PayFast POSTs the payment parameters here after the customer pays.
// We verify the official MD5 signature before touching the engine.
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    const q: Record<string, string | string[] | undefined> = {};
    for (const [k, v] of params.entries()) q[k] = v;

    if (isRealMode()) {
      if (!verifyIpnSignature(q)) {
        console.error('[payfast-ipn] signature verification failed');
        return new Response('invalid signature', { status: 400 });
      }
    }

    const passPhrase = typeof q.pass_phrase === 'string' ? q.pass_phrase : q.pass_phrase?.[0];
    const amount = typeof q.amount === 'string' ? q.amount : undefined;
    const res = eng().processIpn({ ref: passPhrase ?? '', ok: true, amount: amount ? num(amount) : undefined });
    return json({ ok: res.ok });
  } catch (e) {
    return err(e);
  }
}
