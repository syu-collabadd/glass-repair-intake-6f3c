import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index';
import {
  callers,
  messages,
  media,
  leadFacts,
  summaries,
  integrationEvents,
} from '../db/schema';
import { sendSMS } from '../lib/twilio-client';
import { routeIncoming, LeadStatus } from '../lib/intake-router';
import { generateLeadSummary } from '../lib/ai-summary';
import { validateTwilioSignature } from '../middleware/twilio-sig';

export const smsRouter = Router();

smsRouter.post('/', validateTwilioSignature, async (req, res) => {
  res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response/>');

  const body = req.body as Record<string, string>;
  const {
    MessageSid,
    From,
    Body: msgBody = '',
    NumMedia: numMediaStr = '0',
  } = body;

  if (!MessageSid || !From) return;

  // Idempotency check
  const existing = await db
    .select()
    .from(integrationEvents)
    .where(eq(integrationEvents.idempotencyKey, `sms:${MessageSid}`))
    .limit(1);
  if (existing.length > 0) return;

  // Find or create caller
  let [caller] = await db
    .select()
    .from(callers)
    .where(eq(callers.phoneNumber, From))
    .limit(1);
  if (!caller) {
    [caller] = await db.insert(callers).values({ phoneNumber: From }).returning();
  }

  // Parse media
  const numMedia = parseInt(numMediaStr, 10) || 0;
  const mediaUrls: string[] = [];
  const mediaContentTypes: string[] = [];
  for (let i = 0; i < numMedia; i++) {
    const url = body[`MediaUrl${i}`];
    const ct = body[`MediaContentType${i}`] || 'application/octet-stream';
    if (url) {
      mediaUrls.push(url);
      mediaContentTypes.push(ct);
    }
  }

  // Store inbound message
  const [msg] = await db
    .insert(messages)
    .values({
      callerId: caller.id,
      twilioMessageSid: MessageSid,
      direction: 'inbound',
      body: msgBody,
      deliveryStatus: 'received',
    })
    .onConflictDoNothing()
    .returning();

  if (!msg) return; // duplicate

  // Store media attachments
  for (let i = 0; i < mediaUrls.length; i++) {
    const url = mediaUrls[i];
    // Extract media SID from URL path (last segment)
    const mediaSid = url.split('/').pop() || `manual-${i}`;
    await db.insert(media).values({
      messageId: msg.id,
      twilioMediaSid: mediaSid,
      mediaUrl: url,
      contentType: mediaContentTypes[i],
    }).onConflictDoNothing();
  }

  // Record idempotency event
  await db.insert(integrationEvents).values({
    eventType: 'sms',
    idempotencyKey: `sms:${MessageSid}`,
    payload: { ...body, mediaUrls },
  }).onConflictDoNothing();

  // Load current lead facts
  let [facts] = await db
    .select()
    .from(leadFacts)
    .where(eq(leadFacts.callerId, caller.id))
    .limit(1);

  const currentStatus = (facts?.status ?? 'waiting') as LeadStatus;

  // Route the message
  const decision = routeIncoming(
    {
      messageSid: MessageSid,
      from: From,
      body: msgBody,
      numMedia,
      mediaUrls,
      mediaContentTypes,
    },
    currentStatus,
    facts?.hasPhoto ?? false,
    facts?.hasLocation ?? false,
    facts?.suburb,
    facts?.postcode
  );

  // Apply opt-out to caller record
  if (decision.action === 'opt-out') {
    await db
      .update(callers)
      .set({ optedOut: true, optedOutAt: new Date() })
      .where(eq(callers.id, caller.id));
  }

  // Upsert lead facts
  if (!facts) {
    [facts] = await db
      .insert(leadFacts)
      .values({
        callerId: caller.id,
        status: decision.newStatus,
        hasPhoto: decision.hasPhoto,
        hasLocation: decision.hasLocation,
        suburb: decision.suburb ?? null,
        postcode: decision.postcode ?? null,
        updatedAt: new Date(),
      })
      .returning();
  } else {
    [facts] = await db
      .update(leadFacts)
      .set({
        status: decision.newStatus,
        hasPhoto: decision.hasPhoto,
        hasLocation: decision.hasLocation,
        suburb: decision.suburb ?? facts.suburb,
        postcode: decision.postcode ?? facts.postcode,
        updatedAt: new Date(),
      })
      .where(eq(leadFacts.callerId, caller.id))
      .returning();
  }

  // Send reply if needed (not to opted-out callers)
  if (decision.replyBody && !caller.optedOut && decision.action !== 'opt-out') {
    try {
      const outSid = await sendSMS(From, decision.replyBody);
      await db.insert(messages).values({
        callerId: caller.id,
        twilioMessageSid: outSid,
        direction: 'outbound',
        body: decision.replyBody,
        deliveryStatus: 'queued',
      }).onConflictDoNothing();
    } catch (err) {
      console.error('[sms] failed to send reply:', err);
    }
  }

  // Trigger AI summary when lead is ready
  if (decision.action === 'ready-for-quote') {
    // Fetch last few messages for context
    const recentMessages = await db
      .select({ body: messages.body, direction: messages.direction })
      .from(messages)
      .where(eq(messages.callerId, caller.id))
      .orderBy(desc(messages.createdAt))
      .limit(5);

    const historyText = recentMessages
      .filter(m => m.direction === 'inbound' && m.body)
      .map(m => m.body!)
      .reverse()
      .join(' | ');

    const summary = await generateLeadSummary(
      decision.suburb ?? facts?.suburb,
      decision.postcode ?? facts?.postcode,
      historyText
    );

    if (summary) {
      await db.insert(summaries).values({
        callerId: caller.id,
        summaryText: summary,
        generatedAt: new Date(),
      });
    }
  }
});
