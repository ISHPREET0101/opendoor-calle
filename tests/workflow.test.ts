import assert from 'node:assert/strict';
import test from 'node:test';
import { initialWorkflow, stageResult, reviewField, publishRevision, verifyChain } from '../lib/domain/workflow.ts';
import { scenarioResult } from '../lib/call-e/scenarios.ts';
import { canPublish, acceptedPatch } from '../lib/domain/verification.ts';

test('publication enforces review, preserves prior state, and records verifiable proof', async () => {
  const staged = await stageResult(initialWorkflow(), await scenarioResult('confirmed'), 'confirmed');
  await assert.rejects(publishRevision(staged));
  await assert.rejects(reviewField(staged, 'address', 'accepted'));
  const first = await reviewField(staged, 'saturday_hours', 'accepted');
  const second = await reviewField(first, 'wheelchair_access', 'rejected');
  const published = await publishRevision(second);
  assert.equal(staged.revision, 7);
  assert.equal(published.revision, 8);
  assert.deepEqual(published.publishedPatch, { saturday_hours: '10:00–16:00' });
  assert.equal(await verifyChain(published.events), true);
  assert.match(published.events.at(-1)!.detail, /1 accepted fields/);
  await assert.rejects(publishRevision(published));
  await assert.rejects(reviewField(published, 'saturday_hours', 'rejected'));
  const tampered = structuredClone(published.events);
  tampered[1].detail = 'Forged acceptance';
  assert.equal(await verifyChain(tampered), false);
  assert.equal(await verifyChain(published.events.slice(1)), false);
});

for (const scenario of ['refused', 'missing-evidence'] as const) {
  test(`${scenario} cannot publish or mutate baseline facts`, async () => {
    const state = await stageResult(initialWorkflow(), await scenarioResult(scenario), scenario);
    assert.equal(canPublish(state.changes), false);
    await assert.rejects(publishRevision(state));
    assert.deepEqual(acceptedPatch(state.changes.map(change => ({ ...change, decision: 'accepted' }))), {});
    assert.equal(state.revision, 7);
  });
}
test('an empty or entirely rejected review cannot create a verification claim', async () => {
  assert.equal(canPublish([]), false);
  let state = await stageResult(initialWorkflow(), await scenarioResult('confirmed'), 'confirmed');
  state = await reviewField(state, 'saturday_hours', 'rejected');
  state = await reviewField(state, 'wheelchair_access', 'rejected');
  await assert.rejects(publishRevision(state));
});
