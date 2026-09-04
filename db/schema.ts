import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const demoSessions = sqliteTable('demo_sessions', {
  id: text('id').primaryKey(),
  stateJson: text('state_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const verificationRuns = sqliteTable(
  'verification_runs',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id').notNull(),
    provider: text('provider', { enum: ['mock', 'call-e'] }).notNull(),
    status: text('status', { enum: ['queued', 'in_progress', 'completed', 'failed', 'canceled'] }).notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    previewHash: text('preview_hash').notNull(),
    evidenceJson: text('evidence_json').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('verification_runs_idempotency_key_uq').on(table.idempotencyKey),
    uniqueIndex('verification_runs_preview_hash_uq').on(table.previewHash),
    index('verification_runs_listing_id_idx').on(table.listingId),
  ],
);

export const listingRevisions = sqliteTable(
  'listing_revisions',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id').notNull(),
    revision: integer('revision').notNull(),
    baseRevision: integer('base_revision').notNull(),
    publicJson: text('public_json').notNull(),
    evidenceHash: text('evidence_hash').notNull(),
    publishedAt: text('published_at').notNull(),
  },
  (table) => [
    uniqueIndex('listing_revisions_listing_revision_uq').on(table.listingId, table.revision),
    index('listing_revisions_listing_id_idx').on(table.listingId),
  ],
);

export const auditEvents = sqliteTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    aggregateId: text('aggregate_id').notNull(),
    eventType: text('event_type').notNull(),
    eventJson: text('event_json').notNull(),
    previousHash: text('previous_hash'),
    eventHash: text('event_hash').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('audit_events_aggregate_created_idx').on(table.aggregateId, table.createdAt)],
);
