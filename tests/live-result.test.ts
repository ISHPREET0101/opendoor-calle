import assert from 'node:assert/strict';
import test from 'node:test';

import { mapLiveCallToVerificationResult } from '../lib/call-e/live-result.ts';
import { BASELINE_FIELD_VALUES, canPublish } from '../lib/domain/verification.ts';
import { initialWorkflow, publishRevision, reviewField, stageResult, verifyChain } from '../lib/domain/workflow.ts';

const completedCall = {
  id: 'call_live_9f2e',
  status: 'completed' as const,
  summary: 'The authorized contact confirmed Saturday hours and step-free access.',
  evidence: [
    'We open Saturdays from ten until four.',
    'The side entrance is step-free and has an accessible washroom.',
  ],
  taskCompleted: true,
  completionConfidence: { score: 0.93, label: 'high' },
  recipients: [
    { structuredResult: { saturday_hours: '10:00–16:00', wheelchair_access: 'available' }, summary: null },
  ],
};

test('a completed high-confidence live call stages evidence-bound candidates for human review', async () => {
  const result = mapLiveCallToVerificationResult(completedCall, BASELINE_FIELD_VALUES);
  assert.equal(result.provider, 'call-e');
  assert.equal(result.callId, 'call_live_9f2e');
  assert.equal(result.changes.length, 2);
  for (const change of result.changes) {
    assert.equal(change.requested, true);
    assert.equal(change.decision, 'pending');
    // Machine-extracted facts are capped at medium confidence; humans decide.
    assert.equal(change.confidence, 'medium');
    assert.ok(change.evidence.includes('Saturdays from ten until four'));
  }

  const staged = await stageResult(initialWorkflow(), result, 'confirmed', 'live');
  assert.equal(staged.source, 'live');
  assert.equal(staged.events.at(-1)!.type, 'live_result_imported');
  assert.match(staged.events.at(-1)!.detail, /call_live_9f2e/);

  // The live result flows through the exact same review and publication gates.
  await assert.rejects(publishRevision(staged));
  let state = await reviewField(staged, 'saturday_hours', 'accepted');
  state = await reviewField(state, 'wheelchair_access', 'accepted');
  const published = await publishRevision(state);
  assert.equal(published.revision, 8);
  assert.deepEqual(published.publishedPatch, { saturday_hours: '10:00–16:00', wheelchair_access: 'available' });
  assert.equal(await verifyChain(published.events), true);
});

test('low provider completion confidence quarantines every staged value', async () => {
  const result = mapLiveCallToVerificationResult(
    { ...completedCall, completionConfidence: { score: 0.41, label: 'low' } },
    BASELINE_FIELD_VALUES,
  );
  const staged = await stageResult(initialWorkflow(), result, 'confirmed', 'live');
  assert.ok(staged.changes.length > 0);
  assert.ok(staged.changes.every((change) => change.decision === 'quarantined'));
  assert.equal(canPublish(staged.changes), false);
  await assert.rejects(publishRevision(staged));
});

test('a call that did not complete its task stages nothing', async () => {
  for (const call of [
    { ...completedCall, status: 'failed' as const, taskCompleted: false, completionConfidence: null },
    { ...completedCall, taskCompleted: null, completionConfidence: null },
  ]) {
    const result = mapLiveCallToVerificationResult(call, BASELINE_FIELD_VALUES);
    assert.equal(result.changes.length, 0);
    assert.match(result.summary, /did not complete its task/);
    const staged = await stageResult(initialWorkflow(), result, 'confirmed', 'live');
    assert.equal(staged.changes.length, 0);
    await assert.rejects(publishRevision(staged));
  }
});

test('missing or unknown structured values and missing evidence are quarantined', async () => {
  const unknownValues = await stageResult(
    initialWorkflow(),
    mapLiveCallToVerificationResult(
      { ...completedCall, recipients: [{ structuredResult: { saturday_hours: 'unknown' }, summary: null }] },
      BASELINE_FIELD_VALUES,
    ),
    'confirmed',
    'live',
  );
  assert.ok(unknownValues.changes.every((change) => change.decision === 'quarantined'));

  const noEvidence = await stageResult(
    initialWorkflow(),
    mapLiveCallToVerificationResult({ ...completedCall, evidence: [] }, BASELINE_FIELD_VALUES),
    'confirmed',
    'live',
  );
  assert.ok(noEvidence.changes.every((change) => change.decision === 'quarantined'));
  assert.equal(canPublish(noEvidence.changes), false);
});

test('simulation staging remains the default source', async () => {
  const result = mapLiveCallToVerificationResult(completedCall, BASELINE_FIELD_VALUES);
  const staged = await stageResult(initialWorkflow(), result, 'confirmed');
  assert.equal(staged.source, 'simulation');
  assert.equal(staged.events.at(-1)!.type, 'simulation_completed');
});
