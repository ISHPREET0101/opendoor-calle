# Safety model

OpenDoor assumes phone calls and transcripts are untrusted side effects and inputs.

## Call gates

A call is rejected unless the purpose is bounded, the destination is valid E.164, the contact is authorized, suppression is clear, the calling window is allowed, global stop is off, and a durable idempotency key exists. Live mode additionally requires a server flag, API key, exact server allowlisted destination, and matching one-time approval token.

## Evidence gates

A completed call cannot directly mutate a listing. Every fact must be in scope, evidence-backed, individually decided, and based on the pinned revision. Conflicts and unrequested facts are quarantined. Transcript strings remain escaped text and are never executed as instructions.

## Privacy

The demo uses fictional data. The public projection excludes phone numbers, transcripts, confidence scores, and reviewer identities. Diagnostic redaction covers E.164 numbers and credential-shaped values.

## Exclusions

No emergency response, medical/legal/financial advice, beneficiary data, password/OTP collection, payment, cold-calling list, recurrence, or automatic retry is implemented.
