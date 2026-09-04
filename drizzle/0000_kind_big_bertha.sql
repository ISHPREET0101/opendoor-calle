CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`aggregate_id` text NOT NULL,
	`event_type` text NOT NULL,
	`event_json` text NOT NULL,
	`previous_hash` text,
	`event_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_events_aggregate_created_idx` ON `audit_events` (`aggregate_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `demo_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `listing_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`revision` integer NOT NULL,
	`base_revision` integer NOT NULL,
	`public_json` text NOT NULL,
	`evidence_hash` text NOT NULL,
	`published_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listing_revisions_listing_revision_uq` ON `listing_revisions` (`listing_id`,`revision`);--> statement-breakpoint
CREATE INDEX `listing_revisions_listing_id_idx` ON `listing_revisions` (`listing_id`);--> statement-breakpoint
CREATE TABLE `verification_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`preview_hash` text NOT NULL,
	`evidence_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verification_runs_idempotency_key_uq` ON `verification_runs` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `verification_runs_preview_hash_uq` ON `verification_runs` (`preview_hash`);--> statement-breakpoint
CREATE INDEX `verification_runs_listing_id_idx` ON `verification_runs` (`listing_id`);