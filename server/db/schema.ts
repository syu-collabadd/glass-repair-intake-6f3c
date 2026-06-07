import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  jsonb,
} from 'drizzle-orm/pg-core';

export const callers = pgTable('callers', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  optedOut: boolean('opted_out').notNull().default(false),
  optedOutAt: timestamp('opted_out_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const calls = pgTable('calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  callerId: uuid('caller_id')
    .notNull()
    .references(() => callers.id),
  twilioCallSid: varchar('twilio_call_sid', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 30 }).notNull().default('initiated'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  callerId: uuid('caller_id')
    .notNull()
    .references(() => callers.id),
  twilioMessageSid: varchar('twilio_message_sid', { length: 50 }).notNull().unique(),
  direction: varchar('direction', { length: 10 }).notNull(), // inbound | outbound
  body: text('body'),
  deliveryStatus: varchar('delivery_status', { length: 30 }),
  errorCode: varchar('error_code', { length: 20 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id),
  twilioMediaSid: varchar('twilio_media_sid', { length: 50 }).notNull().unique(),
  mediaUrl: text('media_url').notNull(),
  contentType: varchar('content_type', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const leadFacts = pgTable('lead_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  callerId: uuid('caller_id')
    .notNull()
    .references(() => callers.id)
    .unique(),
  status: varchar('status', { length: 30 }).notNull().default('waiting'),
  hasPhoto: boolean('has_photo').notNull().default(false),
  hasLocation: boolean('has_location').notNull().default(false),
  suburb: varchar('suburb', { length: 100 }),
  postcode: varchar('postcode', { length: 10 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const summaries = pgTable('summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  callerId: uuid('caller_id')
    .notNull()
    .references(() => callers.id),
  summaryText: text('summary_text').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const integrationEvents = pgTable('integration_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 100 }).notNull().unique(),
  payload: jsonb('payload'),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});
