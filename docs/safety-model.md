# Safety model

OpenDoor assumes phone calls and transcripts are untrusted side effects and inputs.

## Call gates

A live call requires a server flag, API key, exact approved destination and purpose, a matching approval token, and a durable idempotency key. D1 uniquely claims both the key and a SHA-256 digest of the token before dialing. Storage failure blocks dialing. A network failure is an unknown outcome, not proof of rejection. Operator polling fetches an existing call and never dials.

The simulation previews suppression and calling-window checks, but no automated suppression service or calling-window scheduler is implemented. Operators must verify current consent and an appropriate calling time before enabling a test plan. The server live flag is the available stop for future requests; it does not cancel an already accepted provider call.

## Evidence gates

A completed call cannot directly mutate a listing. Every fact must be in scope, evidence-backed, individually decided, and based on the pinned revision. Conflicts and unrequested facts are quarantined. Transcript strings remain escaped text and are never executed as instructions.

These publication invariants are implemented for simulated results through server commands. Low confidence, unknown values, and missing evidence are also quarantined. An all-rejected or empty review cannot produce a verified revision. Live results are not yet connected to that workflow.

## Privacy

The demo uses fictional data. The public projection excludes phone numbers, transcripts, confidence scores, and reviewer identities. Diagnostic redaction covers E.164 numbers and credential-shaped values.

## Exclusions

No emergency response, medical/legal/financial advice, beneficiary data, password/OTP collection, payment, cold-calling list, recurrence, or automatic retry is implemented.
