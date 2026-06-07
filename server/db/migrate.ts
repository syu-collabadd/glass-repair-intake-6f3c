import { db } from './index';
import { sql } from 'drizzle-orm';

export async function runMigrations(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS callers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_number VARCHAR(20) NOT NULL UNIQUE,
      opted_out BOOLEAN NOT NULL DEFAULT FALSE,
      opted_out_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS calls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      caller_id UUID NOT NULL REFERENCES callers(id),
      twilio_call_sid VARCHAR(50) NOT NULL UNIQUE,
      status VARCHAR(30) NOT NULL DEFAULT 'initiated',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      caller_id UUID NOT NULL REFERENCES callers(id),
      twilio_message_sid VARCHAR(50) NOT NULL UNIQUE,
      direction VARCHAR(10) NOT NULL,
      body TEXT,
      delivery_status VARCHAR(30),
      error_code VARCHAR(20),
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS media (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES messages(id),
      twilio_media_sid VARCHAR(50) NOT NULL UNIQUE,
      media_url TEXT NOT NULL,
      content_type VARCHAR(50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lead_facts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      caller_id UUID NOT NULL REFERENCES callers(id) UNIQUE,
      status VARCHAR(30) NOT NULL DEFAULT 'waiting',
      has_photo BOOLEAN NOT NULL DEFAULT FALSE,
      has_location BOOLEAN NOT NULL DEFAULT FALSE,
      suburb VARCHAR(100),
      postcode VARCHAR(10),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      caller_id UUID NOT NULL REFERENCES callers(id),
      summary_text TEXT NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS integration_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(50) NOT NULL,
      idempotency_key VARCHAR(100) NOT NULL UNIQUE,
      payload JSONB,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('[db] migrations complete');
}
