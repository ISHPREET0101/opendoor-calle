import { BASELINE_FIELD_VALUES, type CandidateChange } from '../domain/verification.ts';

import type { NormalizedCallStatus, VerificationResult } from './contract.ts';

export interface ObservedLiveCall {
  id: string;
  status: NormalizedCallStatus;
  summary: string | null;
  evidence: string[];
  taskCompleted: boolean | null;
  completionConfidence: { score: number; label: string } | null;
  recipients: Array<{ structuredResult: unknown; summary: string | null }>;
}

// The live recipient schema approved for the OpenDoor test plan. Any other key in a
// structured result is unrequested and must not become a publishable candidate.
const LIVE_FIELDS: ReadonlyArray<{ field: CandidateChange['field']; label: string }> = [
  { field: 'saturday_hours', label: 'Saturday hours' },
  { field: 'wheelchair_access', label: 'Wheelchair access' },
];

/**
 * Maps an observed CALL-E call into review candidates. A machine-extracted value is
 * never high confidence: it is capped at medium, and drops to low (auto-quarantined by
 * normalizeDecisions) unless CALL-E itself reports high completion confidence. Missing,
 * empty, or "unknown" values and calls without transcript evidence are quarantined the
 * same way. A call that did not complete its task stages nothing at all.
 */
export function mapLiveCallToVerificationResult(
  call: ObservedLiveCall,
  currentValues: Record<CandidateChange['field'], string> = BASELINE_FIELD_VALUES,
): VerificationResult {
  const evidence = call.evidence.filter((line) => line.trim().length > 0);
  const summary = call.summary?.trim() || 'CALL-E returned no summary.';
  if (call.status !== 'completed' || call.taskCompleted !== true) {
    return {
      callId: call.id,
      status: call.status,
      provider: 'call-e',
      summary: `${summary} The call did not complete its task, so no facts are staged.`,
      evidence,
      changes: [],
    };
  }
  const structured: Record<string, unknown> = {};
  for (const recipient of call.recipients) {
    if (recipient.structuredResult && typeof recipient.structuredResult === 'object') {
      Object.assign(structured, recipient.structuredResult);
    }
  }
  const confidence: CandidateChange['confidence'] =
    call.completionConfidence?.label === 'high' ? 'medium' : 'low';
  const quotedEvidence = evidence.map((line) => `“${line}”`).join(' ');
  const changes: CandidateChange[] = LIVE_FIELDS.map(({ field, label }) => {
    const raw = structured[field];
    return {
      field,
      label,
      currentValue: currentValues[field],
      proposedValue: typeof raw === 'string' ? raw.trim() : '',
      evidence: quotedEvidence,
      confidence,
      requested: true,
      conflict: false,
      decision: 'pending',
    };
  });
  return { callId: call.id, status: call.status, provider: 'call-e', summary, evidence, changes };
}
