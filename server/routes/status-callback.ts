import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { messages } from '../db/schema';
import { validateTwilioSignature } from '../middleware/twilio-sig';

export const statusCallbackRouter = Router();

statusCallbackRouter.post('/', validateTwilioSignature, async (req, res) => {
  res.sendStatus(204);

  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } =
    req.body as Record<string, string>;

  if (!MessageSid || !MessageStatus) return;

  await db
    .update(messages)
    .set({
      deliveryStatus: MessageStatus,
      errorCode: ErrorCode ?? null,
      errorMessage: ErrorMessage ?? null,
    })
    .where(eq(messages.twilioMessageSid, MessageSid));
});
