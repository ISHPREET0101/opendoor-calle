# Architecture

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
