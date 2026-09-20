import { existsSync, readFileSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!/^u_[a-z0-9]+\.(jpg|jpeg|png|webp)$/i.test(name)) {
    return new Response('Not found', { status: 404 });
  }
  const file = path.join(process.cwd(), '.data', 'uploads', name);
  if (!existsSync(file)) return new Response('Not found', { status: 404 });
  const buf = readFileSync(file);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': MIME[path.extname(name).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
