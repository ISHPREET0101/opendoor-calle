export type Decision = 'pending' | 'accepted' | 'rejected' | 'quarantined';

export interface CandidateChange {
  field: 'saturday_hours' | 'wheelchair_access' | 'address';
  label: string;
  currentValue: string;
  proposedValue: string;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  requested: boolean;
  conflict: boolean;
  decision: Decision;
}

export interface PreflightInput {
  mode: 'simulation' | 'live';
  purpose: string;
  destination: string;
  authorized: boolean;
  suppressed: boolean;
  withinCallingWindow: boolean;
  globalStop: boolean;
  idempotencyKey: string;
}

export interface PreflightResult {
  allowed: boolean;
  checks: Array<{ label: string; passed: boolean }>;
}

export function evaluatePreflight(input: PreflightInput): PreflightResult {
  const checks = [
    { label: 'Specific service-verification purpose', passed: input.purpose.trim().length >= 12 },
    { label: 'Valid E.164 destination', passed: /^\+[1-9]\d{7,14}$/.test(input.destination) },
    { label: 'Authorized provider contact', passed: input.authorized },
    { label: 'Not on the suppression list', passed: !input.suppressed },
    { label: 'Inside the approved calling window', passed: input.withinCallingWindow },
    { label: 'Global stop is not active', passed: !input.globalStop },
    { label: 'Durable idempotency key prepared', passed: input.idempotencyKey.trim().length >= 12 },
  ];

  return { allowed: checks.every((check) => check.passed), checks };
}

export function maskPhone(phone: string): string {
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return 'invalid destination';
  return `${phone.slice(0, 3)}••••••${phone.slice(-2)}`;
}

export function stablePreviewHash(parts: readonly string[]): string {
  let hash = 2166136261;
  const value = parts.join('\u241f');
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `pv_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function normalizeDecisions(changes: CandidateChange[]): CandidateChange[] {
  return changes.map((change) =>
    change.conflict || !change.requested
      ? { ...change, decision: 'quarantined' as const }
      : change,
  );
}

export function canPublish(changes: CandidateChange[]): boolean {
  return changes.every((change) => change.decision !== 'pending');
}

export function acceptedPatch(changes: CandidateChange[]): Record<string, string> {
  return Object.fromEntries(
    changes
      .filter((change) => change.requested && !change.conflict && change.decision === 'accepted')
      .map((change) => [change.field, change.proposedValue]),
  );
}

export function redactDiagnostic(value: string): string {
  return value
    .replace(/\+[1-9]\d{7,14}/g, '[PHONE_REDACTED]')
    .replace(/(?:sk|calle)_[A-Za-z0-9_-]{10,}/gi, '[SECRET_REDACTED]');
}
