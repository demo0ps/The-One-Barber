import { eng, json } from '@/lib/engine';
export const dynamic = 'force-dynamic';

export async function GET() {
  const d = eng().db as unknown as { platformEnabled?: boolean };
  return json({ enabled: d.platformEnabled !== false, version: eng().db.version });
}
