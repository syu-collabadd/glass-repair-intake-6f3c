import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { media } from '../db/schema';
import { requireDashboardAuth } from '../middleware/auth';

export const mediaRouter = Router();

mediaRouter.use(requireDashboardAuth);

// GET /api/media/:sid — proxy Twilio media without exposing credentials
mediaRouter.get('/:sid', async (req, res) => {
  try {
    const { sid } = req.params;

    const [row] = await db
      .select()
      .from(media)
      .where(eq(media.twilioMediaSid, sid))
      .limit(1);

    if (!row) return res.status(404).json({ error: 'Not found' });

    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;

    const upstream = await fetch(row.mediaUrl, {
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Media fetch failed' });
    }

    const contentType = upstream.headers.get('content-type') || row.contentType || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[media] proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
