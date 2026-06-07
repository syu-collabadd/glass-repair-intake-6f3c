import { Router } from 'express';
import { eq, desc, count } from 'drizzle-orm';
import { db } from '../db/index';
import {
  callers,
  messages,
  media,
  leadFacts,
  summaries,
} from '../db/schema';
import { requireDashboardAuth } from '../middleware/auth';
import { sendSMS } from '../lib/twilio-client';

export const leadsRouter = Router();

leadsRouter.use(requireDashboardAuth);

// GET /api/leads — list all leads newest-first
leadsRouter.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: callers.id,
        phoneNumber: callers.phoneNumber,
        optedOut: callers.optedOut,
        createdAt: callers.createdAt,
        status: leadFacts.status,
        hasPhoto: leadFacts.hasPhoto,
        hasLocation: leadFacts.hasLocation,
        suburb: leadFacts.suburb,
        postcode: leadFacts.postcode,
        updatedAt: leadFacts.updatedAt,
        summary: summaries.summaryText,
      })
      .from(callers)
      .leftJoin(leadFacts, eq(leadFacts.callerId, callers.id))
      .leftJoin(summaries, eq(summaries.callerId, callers.id))
      .orderBy(desc(leadFacts.updatedAt));

    // Get photo counts in one query per lead (batch for small dashboards)
    const leads = await Promise.all(
      rows.map(async row => {
        const [{ value: photoCount }] = await db
          .select({ value: count() })
          .from(media)
          .innerJoin(messages, eq(messages.id, media.messageId))
          .where(eq(messages.callerId, row.id));

        // Get last inbound message preview
        const [lastMsg] = await db
          .select({ body: messages.body, createdAt: messages.createdAt })
          .from(messages)
          .where(eq(messages.callerId, row.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        return {
          ...row,
          photoCount: Number(photoCount),
          lastMessage: lastMsg?.body ?? null,
          lastMessageAt: lastMsg?.createdAt ?? null,
        };
      })
    );

    res.json(leads);
  } catch (err) {
    console.error('[leads] list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/leads/:id — full lead detail with message thread
leadsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [caller] = await db
      .select()
      .from(callers)
      .where(eq(callers.id, id))
      .limit(1);

    if (!caller) return res.status(404).json({ error: 'Not found' });

    const [facts] = await db
      .select()
      .from(leadFacts)
      .where(eq(leadFacts.callerId, id))
      .limit(1);

    const [summary] = await db
      .select()
      .from(summaries)
      .where(eq(summaries.callerId, id))
      .orderBy(desc(summaries.generatedAt))
      .limit(1);

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.callerId, id))
      .orderBy(messages.createdAt);

    const msgsWithMedia = await Promise.all(
      msgs.map(async msg => {
        const attachments = await db
          .select({
            id: media.id,
            sid: media.twilioMediaSid,
            contentType: media.contentType,
          })
          .from(media)
          .where(eq(media.messageId, msg.id));
        return { ...msg, media: attachments };
      })
    );

    res.json({
      ...caller,
      status: facts?.status ?? 'waiting',
      hasPhoto: facts?.hasPhoto ?? false,
      hasLocation: facts?.hasLocation ?? false,
      suburb: facts?.suburb ?? null,
      postcode: facts?.postcode ?? null,
      updatedAt: facts?.updatedAt ?? caller.createdAt,
      summary: summary?.summaryText ?? null,
      messages: msgsWithMedia,
    });
  } catch (err) {
    console.error('[leads] detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/leads/:id/reply — operator sends manual SMS reply
leadsRouter.post('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { body: replyBody } = req.body as { body: string };

    if (!replyBody?.trim()) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const [caller] = await db
      .select()
      .from(callers)
      .where(eq(callers.id, id))
      .limit(1);

    if (!caller) return res.status(404).json({ error: 'Not found' });
    if (caller.optedOut) return res.status(403).json({ error: 'Caller has opted out' });

    const sid = await sendSMS(caller.phoneNumber, replyBody.trim());

    await db.insert(messages).values({
      callerId: caller.id,
      twilioMessageSid: sid,
      direction: 'outbound',
      body: replyBody.trim(),
      deliveryStatus: 'queued',
    });

    res.json({ success: true, sid });
  } catch (err) {
    console.error('[leads] reply error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
