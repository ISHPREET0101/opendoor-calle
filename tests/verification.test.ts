import assert from 'node:assert/strict';
import test from 'node:test';

import {
  acceptedPatch,
  canPublish,
  evaluatePreflight,
  maskPhone,
  normalizeDecisions,
  redactDiagnostic,
  stablePreviewHash,
  type CandidateChange,
} from '../lib/domain/verification.ts';

const goodPreflight = {
  mode: 'simulation' as const,
  purpose: 'Verify Saturday hours and accessibility.',
  destination: '+919876543210',
  authorized: true,
  suppressed: false,
  withinCallingWindow: true,
  globalStop: false,
  idempotencyKey: 'opendoor:test:rev7:v1',
};

test('preflight allows a fully authorized plan', () => {
  const result = evaluatePreflight(goodPreflight);
  assert.equal(result.allowed, true);
  assert.equal(result.checks.every((check) => check.passed), true);
});

for (const [name, mutation] of [
  ['unauthorized contact', { authorized: false }],
  ['suppressed contact', { suppressed: true }],
  ['global stop', { globalStop: true }],
  ['quiet hours', { withinCallingWindow: false }],
  ['invalid destination', { destination: '911' }],
  ['missing idempotency', { idempotencyKey: '' }],
] as const) {
  test(`preflight fails closed for ${name}`, () => {
    assert.equal(evaluatePreflight({ ...goodPreflight, ...mutation }).allowed, false);
  });
}

test('masking and redaction remove sensitive values', () => {
  assert.equal(maskPhone('+919876543210'), '+91••••••10');
  assert.equal(redactDiagnostic('call +919876543210 with calle_super_secret_12345'), 'call [PHONE_REDACTED] with [SECRET_REDACTED]');
});

test('preview hash is deterministic and content-sensitive', () => {
  assert.equal(stablePreviewHash(['a', 'b']), stablePreviewHash(['a', 'b']));
  assert.notEqual(stablePreviewHash(['a', 'b']), stablePreviewHash(['a', 'c']));
});

test('conflicts and unrequested facts are quarantined and never published', () => {
  const changes: CandidateChange[] = [
    { field: 'saturday_hours', label: 'Hours', currentValue: '9-5', proposedValue: '10-4', evidence: 'confirmed', confidence: 'high', requested: true, conflict: false, decision: 'accepted' },
    { field: 'address', label: 'Address', currentValue: 'A', proposedValue: 'B', evidence: 'uncertain', confidence: 'low', requested: false, conflict: true, decision: 'pending' },
  ];
  const normalized = normalizeDecisions(changes);
  assert.equal(normalized[1]?.decision, 'quarantined');
  assert.equal(canPublish(normalized), true);
  assert.deepEqual(acceptedPatch(normalized), { saturday_hours: '10-4' });
});
