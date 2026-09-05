# Architecture

Current authoritative path: the UI sends `simulate`, `review`, and `publish` commands to `/api/state`. D1 session records contain versioned workflow state, immutable application-level revision snapshots, and SHA-256-linked events. A conditional single-row update atomically saves each transition and rejects concurrent changes. HttpOnly session cookies isolate visitors. `/api/state?proof=1` exports the session’s public proof, excluding candidate evidence.

The diagram below describes component boundaries. The separate `listing_revisions` and `audit_events` schema tables are reserved and are not currently used by the session workflow. Live creation writes `verification_runs`; `/api/calls/{runId}` retrieves and saves provider results behind an operator token. Live result-to-UI review remains outstanding.

```text
Steward UI
  -> policy preview
  -> /api/calls
       -> deterministic MockCallProvider (default, zero network)
       -> guarded CALL-E SDK adapter (server only)
  -> evidence reconciliation
  -> field decisions
  -> public-safe revision + audit trail

Cloudflare D1
  -> demo_sessions
  -> verification_runs (unique idempotency key + preview hash)
  -> listing_revisions (unique listing + revision)
  -> audit_events (hash-linked event metadata)
```

The UI is a Vinext/React application built from the official OpenAI Sites scaffold. Route handlers run in the Cloudflare Worker boundary. Drizzle provides typed D1 queries and generated migrations.

`CallProvider` normalizes both adapters. Simulation returns the same stable call ID and structured candidate shape on every run. The live adapter uses the official CALL-E Calls API with `calls.create(payload, { idempotencyKey })`; it never exposes the SDK, API key, or raw authorization values to the browser.

The public projection is intentionally smaller than the steward state. Phone numbers, transcripts, internal confidence, reviewer metadata, and quarantined candidates are private.
