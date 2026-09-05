import { CalleClient } from '@call-e/calle';

import type { VerificationRequest, VerificationResult } from './contract';

export interface LiveAuthorization {
  apiKey: string | undefined;
  liveEnabled: boolean;
  approvedDestination: string | undefined;
  approvedPurpose: string | undefined;
  approvalToken: string | undefined;
  suppliedApprovalToken: string | undefined;
}

export function validateLiveAuthorization(
  request: VerificationRequest,
  authorization: LiveAuthorization,
): void {
  if (!authorization.liveEnabled) throw new Error('Live calling is disabled');
  if (!authorization.apiKey) throw new Error('CALL-E credentials are unavailable');
  if (!authorization.approvalToken || authorization.suppliedApprovalToken !== authorization.approvalToken) {
    throw new Error('Exact live-call approval token is required');
  }
  if (!authorization.approvedDestination || request.destination !== authorization.approvedDestination) {
    throw new Error('Destination is not the server-approved test number');
  }
  if (!authorization.approvedPurpose || request.purpose !== authorization.approvedPurpose) {
    throw new Error('Purpose does not match the server-approved test plan');
  }
}

export async function createAuthorizedLiveCall(
  request: VerificationRequest,
  authorization: LiveAuthorization,
): Promise<{ callId: string; status: string }> {
  validateLiveAuthorization(request, authorization);

  const client = new CalleClient({ apiKey: authorization.apiKey!, baseUrl: 'https://api.heycall-e.com' });
  const call = await client.calls.create(
    {
      task: request.purpose,
      recipients: [{ phones: [request.destination], region: 'IN', locale: request.locale }],
      recipientResultSchema: {
        type: 'object',
        additionalProperties: false,
        required: ['saturday_hours', 'wheelchair_access'],
        properties: {
          saturday_hours: { type: 'string', description: 'Confirmed Saturday opening hours, or unknown.' },
          wheelchair_access: { type: 'string', enum: ['available', 'unavailable', 'unknown'] },
        },
      },
      metadata: { listing_id: request.listingId, workflow: 'opendoor' },
    },
    { idempotencyKey: request.idempotencyKey },
  );
  return { callId: call.id, status: call.status };
}

export function normalizeLiveResult(call: {
  id: string;
  status: VerificationResult['status'];
  summary: string | null;
  evidence: string[];
}): Pick<VerificationResult, 'callId' | 'status' | 'provider' | 'summary' | 'evidence'> {
  return {
    callId: call.id,
    status: call.status,
    provider: 'call-e',
    summary: call.summary ?? 'CALL-E returned no summary.',
    evidence: call.evidence,
  };
}
