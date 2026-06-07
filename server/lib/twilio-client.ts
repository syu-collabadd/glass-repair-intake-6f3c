import twilio from 'twilio';

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER!;

export async function sendSMS(to: string, body: string): Promise<string> {
  const msg = await twilioClient.messages.create({
    from: TWILIO_FROM,
    to,
    body,
    statusCallback: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/status-callback`,
  });
  return msg.sid;
}
