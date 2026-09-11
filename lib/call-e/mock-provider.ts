import { BASELINE_FIELD_VALUES } from '../domain/verification.ts';

import type { CallProvider, VerificationRequest, VerificationResult } from './contract';

const DEMO_CALL_ID = 'call_demo_northstar_01';

export class MockCallProvider implements CallProvider {
  async create(_request: VerificationRequest) {
    return { callId: DEMO_CALL_ID, status: 'queued' as const };
  }

  async get(callId: string): Promise<VerificationResult> {
    if (callId !== DEMO_CALL_ID) throw new Error('Unknown simulated call ID');
    return {
      callId,
      status: 'completed',
      provider: 'mock',
      summary: 'Authorized provider confirmed two requested facts. A conflicting address statement was quarantined.',
      evidence: [
        'We now open Saturdays from ten in the morning until four.',
        'Yes, the side entrance has step-free access and an accessible washroom.',
        'Someone mentioned a different unit number, but I cannot confirm that today.',
      ],
      changes: [
        {
          field: 'saturday_hours', label: 'Saturday hours', currentValue: BASELINE_FIELD_VALUES.saturday_hours, proposedValue: '10:00–16:00',
          evidence: '“We now open Saturdays from ten in the morning until four.”', confidence: 'high', requested: true, conflict: false, decision: 'pending',
        },
        {
          field: 'wheelchair_access', label: 'Wheelchair access', currentValue: BASELINE_FIELD_VALUES.wheelchair_access, proposedValue: 'Step-free entrance + accessible washroom',
          evidence: '“The side entrance has step-free access and an accessible washroom.”', confidence: 'high', requested: true, conflict: false, decision: 'pending',
        },
        {
          field: 'address', label: 'Street address', currentValue: BASELINE_FIELD_VALUES.address, proposedValue: 'Unit 4, 18 Cedar Lane',
          evidence: '“Someone mentioned a different unit number, but I cannot confirm that today.”', confidence: 'low', requested: false, conflict: true, decision: 'quarantined',
        },
      ],
    };
  }
}
