import 'dotenv/config';
import express from 'express';
import path from 'path';
import { runMigrations } from './db/migrate';
import { voiceRouter } from './routes/voice';
import { smsRouter } from './routes/sms';
import { statusCallbackRouter } from './routes/status-callback';
import { leadsRouter } from './routes/leads';
import { mediaRouter } from './routes/media';

const app = express();
const PORT = parseInt(process.env.PORT || '8000', 10);

// Twilio webhooks arrive as urlencoded — parse before JSON so body is available for sig verification
app.use('/api/voice', express.urlencoded({ extended: false }));
app.use('/api/sms', express.urlencoded({ extended: false }));
app.use('/api/status-callback', express.urlencoded({ extended: false }));

// JSON for all other routes
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Dashboard auth check endpoint
app.get('/api/auth/check', (req, res) => {
  const token = process.env.DASHBOARD_TOKEN;
  if (!token) return res.json({ required: false });

  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === token) {
    return res.json({ required: true, valid: true });
  }
  return res.json({ required: true, valid: false });
});

// Twilio webhook routes
app.use('/api/voice', voiceRouter);
app.use('/api/sms', smsRouter);
app.use('/api/status-callback', statusCallbackRouter);

// Dashboard API routes
app.use('/api/leads', leadsRouter);
app.use('/api/media', mediaRouter);

// Serve built frontend
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

async function start() {
  try {
    await runMigrations();
  } catch (err) {
    console.warn('[server] migration warning (may be OK if DB not configured):', err);
  }

  app.listen(PORT, '::', () => {
    console.log(`[server] listening on port ${PORT}`);
    console.log(`[server] dashboard: http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('[server] fatal startup error:', err);
  process.exit(1);
});
