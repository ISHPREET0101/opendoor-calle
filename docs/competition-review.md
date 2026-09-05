# OpenDoor improvement review

## Highest-value correction

The initial application demonstrated a valuable idea but overstated server enforcement. Browser state controlled publication, audit entries were hard-coded, and all visitors shared one record. Passing the original happy-path tests did not prove the claims.

The improvement implements server-owned transitions, isolated sessions, atomic revision/history saving, optimistic concurrency checks, SHA-256 event verification, refusal and missing-evidence scenarios, dynamic decision counts, and explicit error states. Low-confidence, unknown, empty, unsupported, conflicting, and unrequested facts cannot be published, even when a client marks them accepted. Empty and all-rejected reviews cannot create a new verified revision.

## Demonstration

1. Run the confirmed scenario. Show the changed opening hours, accessible entrance, and quarantined address.
2. Accept hours and reject accessibility to show that publication follows actual decisions, not a scripted success screen.
3. Publish, reload, and inspect the saved proof. Show that the audit count reflects one accepted field.
4. Reset and run recipient refusal. Show that no verification badge or new revision is earned.
5. Run the missing-evidence scenario. Show that even plausible extracted values cannot be published without evidence.

This demonstrates a focused product advantage: fewer unsupported directory updates. It does not establish real-world accuracy or time savings.

## Remaining competition priorities

1. Configure a CALL-E key privately and run one explicitly authorized test number. Record a real provider call ID and terminal result.
2. Map that actual result into field-level review with source evidence, then demonstrate the live journey. Current operator polling is groundwork, not completed visual integration.
3. Obtain feedback from an actual directory steward and report observations without inventing outcomes or endorsements.
4. Provide a public contribution PR, public video shorter than three minutes, CALL-E account email, and judge access. The private GitHub repository alone does not satisfy the public PR requirement.

Official rules checked September 5, 2026: https://call-e.devpost.com/rules . Submission deadline September 14, 2026, 23:45 SGT. These changes target technical implementation and demo quality; impact still needs user evidence. No implementation can guarantee a prize.
