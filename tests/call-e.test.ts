import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthorizedLiveCall } from '../lib/call-e/live.server.ts';
import { MockCallProvider } from '../lib/call-e/mock-provider.ts';

const request = {
  listingId: 'northstar-pantry',
  destination: '+919876543210',
  locale: 'en-IN' as const,
  idempotencyKey: 'opendoor:northstar:rev7:v1',
  purpose: 'Verify Saturday hours and wheelchair access.',
};

test('mock provider is deterministic and returns only normalized CALL-E statuses', async () => {
  const provider = new MockCallProvider();
  const first = await provider.create(request);
  const second = await provider.create(request);
  assert.deepEqual(first, second);
  const result = await provider.get(first.callId);
  assert.equal(result.provider, 'mock');
  assert.equal(result.status, 'completed');
  assert.equal(result.changes.length, 3);
});

test('live adapter fails before network when live mode is disabled', async () => {
  await assert.rejects(
    createAuthorizedLiveCall(request, { apiKey: 'test-key', liveEnabled: false, approvedDestination: request.destination, approvedPurpose: request.purpose, approvalToken: 'approved', suppliedApprovalToken: 'approved' }),
    /disabled/,
  );
});

test('live adapter rejects missing exact token and destination mismatch', async () => {
  await assert.rejects(
    createAuthorizedLiveCall(request, { apiKey: 'test-key', liveEnabled: true, approvedDestination: request.destination, approvedPurpose: request.purpose, approvalToken: 'approved', suppliedApprovalToken: 'wrong' }),
    /approval token/,
  );
  await assert.rejects(
    createAuthorizedLiveCall(request, { apiKey: 'test-key', liveEnabled: true, approvedDestination: '+919999999999', approvedPurpose: request.purpose, approvalToken: 'approved', suppliedApprovalToken: 'approved' }),
    /server-approved/,
  );
  await assert.rejects(
    createAuthorizedLiveCall({ ...request, purpose: 'Different task that was not approved.' }, { apiKey: 'test-key', liveEnabled: true, approvedDestination: request.destination, approvedPurpose: request.purpose, approvalToken: 'approved', suppliedApprovalToken: 'approved' }),
    /server-approved test plan/,
  );
});
