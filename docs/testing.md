# Testing

The acceptance suite is intentionally layered:

- `npm test`: deterministic policy, hashing, redaction, publication, mock-adapter, live-gate, and live-result mapping tests, including refusal, unsupported evidence, forged acceptance, audit tampering, repeated publication, low provider confidence, incomplete calls, and historical-state preservation.
- `npm run test:e2e`: desktop and mobile browser journeys using installed Microsoft Edge, including simulation to publication and unauthorized Live API rejection.
- `npm run typecheck`: strict TypeScript across UI, routes, database schema, tests, and CALL-E adapter.
- `npm run lint`: active application surface only; the scaffold ships a large unused shadcn catalog with upstream lint findings.
- `npm run verify:no-secrets`: scans project source and tests for credential-shaped values.
- `npm run build`: production Vinext/Cloudflare Worker build.

No command above places a real call. A live smoke test is intentionally absent until the operator supplies credentials and separately authorizes the exact destination.

Run `npm run db:local` before the first development or browser-test run. The browser suite checks reload persistence, isolated sessions, stale-version rejection, refusal, and the saved proof chain. Local D1 availability is required; storage failures return 503 and block changes.
