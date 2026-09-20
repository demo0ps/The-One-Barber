import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// Barber profile photo upload → stored in .data/uploads, served by /api/uploads/[name]
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return Response.json({ error: 'No file uploaded.' }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return Response.json({ error: 'Image must be under 4MB.' }, { status: 413 });
    const ext = path.extname(file.name).toLowerCase();
    const mime = ALLOWED[ext];
    if (!mime) return Response.json({ error: 'Use a JPG, PNG or WebP image.' }, { status: 400 });
    const name = `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${ext}`;
    const dir = path.join(process.cwd(), '.data', 'uploads');
    mkdirSync(dir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    writeFileSync(path.join(dir, name), buf);
    return Response.json({ url: `/api/uploads/${name}` }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Upload failed.' }, { status: 500 });
  }
}
