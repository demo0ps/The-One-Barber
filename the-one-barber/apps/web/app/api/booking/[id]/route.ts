import { eng, err, json, num } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const action = String(body.action ?? '');
    if (!['start', 'complete', 'no_show', 'cancel'].includes(action)) return err(new Error('Unknown action.'), 400);
    const tip = body.tip != null ? num(body.tip) : undefined;
    const booking = eng().setBookingStatus(id, action as 'start' | 'complete' | 'no_show' | 'cancel', tip);
    return json({ booking });
  } catch (e) {
    return err(e);
  }
}
