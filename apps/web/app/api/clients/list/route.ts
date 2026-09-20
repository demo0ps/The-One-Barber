import { eng, json } from '@/lib/engine';

export const dynamic = 'force-dynamic';

// Admin CRM view: every client with visits, spend & loyalty detail.
export async function GET() {
  return json({ clients: eng().crmClients() });
}
