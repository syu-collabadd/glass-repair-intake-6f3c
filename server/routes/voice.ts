import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { callers, calls, integrationEvents } from '../db/schema';
import { sendSMS, TWILIO_FROM } from '../lib/twilio-client';
import { getIntroSMS } from '../lib/intake-router';
import { validateTwilioSignature } from '../middleware/twilio-sig';

export const voiceRouter = Router();

const GREETING_TWIML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy-Neural">
    Thank you for calling ClearView Glass Repair.
    We have received your call and will send you a text message shortly
    with instructions to get a quote.
    Please check your messages in a moment.
    Have a great day!
  </Say>
</Response>`;

voiceRouter.post('/', validateTwilioSignature, async (req, res) => {
  res.type('text/xml');

  const { CallSid, From } = req.body as Record<string, string>;

  if (!CallSid || !From) {
    return res.send(GREETING_TWIML);
  }

  // Idempotency: skip if this call was already processed
  const existing = await db
    .select()
    .from(integrationEvents)
    .where(eq(integrationEvents.idempotencyKey, `call:${CallSid}`))
    .limit(1);

  if (existing.length > 0) {
    return res.send(GREETING_TWIML);
  }

  // Find or create caller
  let [caller] = await db
    .select()
    .from(callers)
    .where(eq(callers.phoneNumber, From))
    .limit(1);

  if (!caller) {
    [caller] = await db
      .insert(callers)
      .values({ phoneNumber: From })
      .returning();
  }

  // Record call
  await db.insert(calls).values({
    callerId: caller.id,
    twilioCallSid: CallSid,
    status: 'initiated',
  }).onConflictDoNothing();

  // Record idempotency event
  await db.insert(integrationEvents).values({
    eventType: 'call',
    idempotencyKey: `call:${CallSid}`,
    payload: req.body,
  }).onConflictDoNothing();

  // Send intro SMS (skip if opted out)
  if (!caller.optedOut) {
    try {
      await sendSMS(From, getIntroSMS());
    } catch (err) {
      console.error('[voice] failed to send intro SMS:', err);
    }
  }

  res.send(GREETING_TWIML);
});
