import type { CandidateChange } from '../domain/verification';

export type NormalizedCallStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'canceled';

export interface VerificationRequest {
  listingId: string;
  destination: string;
  locale: 'en-IN' | 'hi-IN';
  idempotencyKey: string;
  purpose: string;
}

export interface VerificationResult {
  callId: string;
  status: NormalizedCallStatus;
  provider: 'mock' | 'call-e';
  summary: string;
  evidence: string[];
  changes: CandidateChange[];
}

export interface CallProvider {
  create(request: VerificationRequest): Promise<{ callId: string; status: NormalizedCallStatus }>;
  get(callId: string): Promise<VerificationResult>;
}
