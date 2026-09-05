import { MockCallProvider } from './mock-provider.ts';
import type { Scenario } from '../domain/workflow.ts';

export async function scenarioResult(scenario: Scenario) {
  const result = await new MockCallProvider().get('call_demo_northstar_01');
  if (scenario === 'refused') return { ...result, callId: 'call_demo_refused_01', summary: 'The recipient declined verification. No facts were collected; the listing stays unchanged.', changes: [], evidence: ['I do not consent to this verification. Please end the call.'] };
  if (scenario === 'missing-evidence') return { ...result, callId: 'call_demo_missing_evidence_01', summary: 'Candidate values lack supporting evidence. All changes are quarantined; publication is blocked.', changes: result.changes.map(change => ({ ...change, evidence: '' })), evidence: [] };
  return result;
}
