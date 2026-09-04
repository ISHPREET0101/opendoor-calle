# Testing

The acceptance suite is intentionally layered:

- `npm test`: 13 deterministic policy, hashing, redaction, publication, mock-adapter, and live-gate tests.
- `npm run test:e2e`: desktop and mobile browser journeys using installed Microsoft Edge, including simulation to publication and unauthorized Live API rejection.
- `npm run typecheck`: strict TypeScript across UI, routes, database schema, tests, and CALL-E adapter.
- `npm run lint`: active application surface only; the scaffold ships a large unused shadcn catalog with upstream lint findings.
- `npm run verify:no-secrets`: scans project source and tests for credential-shaped values.
- `npm run build`: production Vinext/Cloudflare Worker build.

No command above places a real call. A live smoke test is intentionally absent until the operator supplies credentials and separately authorizes the exact destination.
