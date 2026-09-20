// ---------------------------------------------------------------------------
// PayFast integration.
//
//  - With PAYFAST_MERCHANT_ID + PAYFAST_KEY set: we return the real PayFast
//    hosted-checkout form fields, and /api/payments/payfast-ipn verifies the
//    callback with the official MD5/base64 signature check.
//  - Without them: "demo mode" — the same flow runs against a simulated
//    gateway page inside the app, so the entire workflow works end-to-end.
// ---------------------------------------------------------------------------

import crypto from 'crypto';
import type { Booking, Payment } from './types';

export interface PayFastForm {
  action: string;
  fields: Record<string, string>;
}

export interface PaymentSession {
  mode: 'demo' | 'payfast';
  paymentRef: string;
  /** demo mode: internal simulated gateway URL */
  url?: string;
  /** payfast mode: real hosted checkout form */
  form?: PayFastForm;
}

const SANDBOX = 'https://www.sandbox.payfast.co.za/eng-process';
const LIVE = 'https://www.payfast.co.za/eng-process';

export function payfastCreds() {
  return {
    merchantId: process.env.PAYFAST_MERCHANT_ID || '',
    key: process.env.PAYFAST_KEY || '',
    live: process.env.PAYFAST_MODE === 'live',
  };
}

export function isRealMode(): boolean {
  const c = payfastCreds();
  return Boolean(c.merchantId && c.key);
}

export function buildSession(booking: Booking, payment: Payment, host: string): PaymentSession {
  const c = payfastCreds();
  if (!c.merchantId || !c.key) {
    return { mode: 'demo', paymentRef: payment.ref, url: `/test-payfast?ref=${encodeURIComponent(payment.ref)}` };
  }
  const base = `https://${host}`;
  const [first, ...rest] = booking.clientName.trim().split(/\s+/);
  return {
    mode: 'payfast',
    paymentRef: payment.ref,
    form: {
      action: c.live ? LIVE : SANDBOX,
      fields: {
        merchant_id: c.merchantId,
        merchant_key: c.key,
        amount: payment.amount.toFixed(2),
        item_name: `The One Barber — booking ${booking.ref}`,
        m_payment_id: payment.ref,
        pass_phrase: booking.ref,
        email_address: booking.clientEmail || 'no-email@example.com',
        first_name: first,
        last_name: rest.join(' ') || 'Client',
        return_url: `${base}/test-payfast`,
        cancel_url: `${base}/test-payfast`,
        notify_url: `${base}/api/payments/payfast-ipn`,
      },
    },
  };
}

/**
 * Official PayFast IPN signature check:
 * base64( md5( amount + merchant_id + merchant_key + pass_phrase ) )
 */
export function verifyIpnSignature(query: Record<string, string | string[] | undefined>): boolean {
  const c = payfastCreds();
  const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined);
  const amount = one(query.amount);
  const merchantId = one(query.merchant_id) || c.merchantId;
  const passPhrase = one(query.pass_phrase);
  const md5sig = one(query.md5sig);
  if (!c.key || !amount || !passPhrase || !md5sig) return false;
  const hash = crypto
    .createHash('md5')
    .update(`${amount}${merchantId}${c.key}${passPhrase}`)
    .digest('base64');
  return hash === md5sig;
}
