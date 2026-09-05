# OpenDoor

OpenDoor is a consent-first CALL-E workflow for community-service directories. It turns a bounded provider call into evidence-linked candidate facts, forces a human decision on every requested field, quarantines conflicts, and publishes one reviewable revision.

The default demo is deliberately safe: it uses fictional providers, a reserved-looking fictional number, and a deterministic adapter that performs **zero external network calls**. The live adapter is present but fails closed unless five independent server-side gates are configured.

## Why this is different

Freshness alone is not trust. OpenDoor treats a verification result as a proposed revision transaction:

1. Preview a bounded purpose and authorized destination.
2. Re-check policy and claim a durable idempotency key.
3. Create a CALL-E call and preserve its stable ID.
4. Attach every candidate value to an evidence excerpt.
5. Quarantine contradictions and unrequested facts.
6. Require field-level human decisions.
7. Publish accepted facts together as a new revision.

## Run locally

Requirements: Node.js 22.13+ and npm.

```bash
npm ci
npm run db:local
npm run dev
```

Open <http://localhost:3000>. Select **Run verification simulation**, approve the fictional plan, accept or reject the two requested facts, and publish revision 8.

Choose **Recipient refuses verification** or **Result has no supporting evidence** in the same dialog to demonstrate why some calls must not update a directory. Reset starts a new isolated session and preserves the previous saved history. Each visitor has an HttpOnly session cookie; reload resumes the saved review.

## What is implemented and what still needs evidence

The simulation workflow is server controlled: commands stage known fixtures, record field decisions, and publish a revision only after eligible fields are resolved and at least one is accepted. One atomic D1 compare-and-swap saves the state, revision snapshot, and SHA-256-linked audit event together. Stale tabs receive HTTP 409. Arbitrary browser state replacement is rejected.

The audit screen verifies the actual event chain and links to a JSON proof export. This is tamper detection against a trusted chain head, not an external signature or protection against a database administrator rewriting the entire chain. Revision snapshots are immutable through application commands and are stored inside each session record; the separate listing_revisions and audit_events tables are reserved for a future multi-listing service.

Live CALL-E creation and operator-only result retrieval are implemented. No real call has been executed or validated. Live results are **not yet connected to the visual review/publication workflow**; do not describe the simulated browser journey as a proven live integration. Automated suppression-list and time-window services are not implemented; the operator must verify consent and calling time before enabling the exact test plan.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run verify:no-secrets
npm run build
```

Playwright uses an installed Microsoft Edge browser on Windows. Change the `channel` in `playwright.config.ts` if another browser is required.

## CALL-E configuration

The official `@call-e/calle@0.7.0` SDK is imported only by `lib/call-e/live.server.ts`. Live requests are accepted only when all of these server-side values are present and match:

- `CALLE_API_KEY`
- `CALLE_LIVE_ENABLED=true`
- `CALLE_APPROVED_DESTINATION` equal to the exact E.164 destination
- `CALLE_APPROVED_PURPOSE` equal to the exact bounded test script
- `CALLE_APPROVAL_TOKEN` equal to the one-time token supplied by an authorized operator

Do not put secrets in `.env.example`, browser code, screenshots, logs, or issue reports. The public UI intentionally offers no Live-mode control. A real call must be separately authorized for the exact owned or consenting test number.

Before the provider request, OpenDoor records a non-sensitive live-call intent in D1 using the durable idempotency key. A duplicate key or unavailable audit store blocks the call; an accepted CALL-E ID is then attached to that same audit record.

An approval token is also uniquely claimed, so changing the idempotency key cannot reuse it. Treat a timeout or 502 as an unknown outcome requiring reconciliation, not proof that dialing failed. Never generate a fresh key to retry an uncertain call. Retrieve an accepted run with `GET /api/calls/{auditRunId}` and an `Authorization: Bearer <approval-token>` header; results omit phone numbers and stay behind the operator gate. Polling does not dial.

## Side effects and rollback

- Simulation mode: no external network calls; it changes only the local demo state.
- Live mode: may place one real phone call through CALL-E after all server gates pass. It never blindly retries.
- Publishing: the demo increments the fictional listing revision and shows a public-safe projection. Use **Reset demo** to return to revision 7.
- D1: `drizzle/0000_kind_big_bertha.sql` creates the persisted demo session, verification-run, revision, and audit tables.

## Privacy and safety boundary

The project excludes emergency workflows, beneficiary records, medical/legal/financial advice, passwords, OTPs, and payments. The public directory never exposes a phone number, transcript, internal confidence, or reviewer identity. Transcript text is rendered as inert evidence and cannot trigger a call or publication.

See [architecture](docs/architecture.md), [safety model](docs/safety-model.md), [testing](docs/testing.md), and the [150-second demo script](docs/demo-script.md).
