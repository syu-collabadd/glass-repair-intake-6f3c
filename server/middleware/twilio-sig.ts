import twilio from 'twilio';
import { Request, Response, NextFunction } from 'express';

export function validateTwilioSignature(req: Request, res: Response, next: NextFunction): void {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    // Dev mode: skip validation when no auth token configured
    next();
    return;
  }

  const signature = req.headers['x-twilio-signature'] as string | undefined;
  if (!signature) {
    res.status(403).json({ error: 'Missing Twilio signature' });
    return;
  }

  // Reconstruct URL the same way Twilio signed it
  const base = process.env.TWILIO_WEBHOOK_BASE_URL;
  const proto =
    (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host =
    (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost';
  const url = base
    ? `${base}${req.path}`
    : `${proto}://${host}${req.originalUrl}`;

  const isValid = twilio.validateRequest(authToken, signature, url, req.body as Record<string, string>);
  if (!isValid) {
    res.status(403).json({ error: 'Invalid Twilio signature' });
    return;
  }

  next();
}
