import { acceptedPatch, canPublish, normalizeDecisions, type CandidateChange } from './verification.ts';
import type { VerificationResult } from '../call-e/contract.ts';

export type Scenario = 'confirmed' | 'refused' | 'missing-evidence';
export type ResultSource = 'simulation' | 'live';
export interface ProofEvent { sequence: number; type: string; detail: string; at: string; previousHash: string; hash: string }
export interface Revision { revision: number; fields: Record<string, string>; callId: string; publishedAt: string }
export interface WorkflowState {
  view: 'operations' | 'review' | 'directory' | 'audit';
  status: 'idle' | 'completed' | 'published';
  callId: string | null; changes: CandidateChange[]; revision: number;
  publishedPatch: Record<string, string>; announcement: string; version: number;
  events: ProofEvent[]; revisions: Revision[]; summary: string; scenario: Scenario;
  source: ResultSource;
}
export const initialWorkflow = (): WorkflowState => ({ view: 'operations', status: 'idle', callId: null, changes: [], revision: 7, publishedPatch: {}, announcement: '', version: 0, events: [], revisions: [], summary: '', scenario: 'confirmed', source: 'simulation' });
export async function digest(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function append(state: WorkflowState, type: string, detail: string): Promise<void> {
  const event = { sequence: state.events.length + 1, type, detail, at: new Date().toISOString(), previousHash: state.events.at(-1)?.hash ?? 'GENESIS' };
  state.events.push({ ...event, hash: await digest(event) });
}
export async function verifyChain(events: ProofEvent[]): Promise<boolean> {
  let previous = 'GENESIS';
  for (const [index, event] of events.entries()) {
    const { hash, ...payload } = event;
    if (event.sequence !== index + 1 || event.previousHash !== previous || await digest(payload) !== hash) return false;
    previous = hash;
  }
  return true;
}
export async function stageResult(current: WorkflowState, result: VerificationResult, scenario: Scenario, source: ResultSource = 'simulation'): Promise<WorkflowState> {
  if (current.status !== 'idle') throw new Error('Start a fresh demo before running another scenario.');
  const state = structuredClone(current);
  state.callId = result.callId; state.summary = result.summary; state.scenario = scenario; state.source = source;
  state.changes = result.status === 'completed' ? normalizeDecisions(result.changes) : []; state.status = 'completed'; state.view = 'review'; state.version++;
  state.announcement = result.summary;
  await append(
    state,
    source === 'live' ? 'live_result_imported' : 'simulation_completed',
    source === 'live'
      ? `CALL-E call ${result.callId} imported by an operator: ${state.changes.length} candidate fields await human review. Evidence digest: ${await digest(result)}.`
      : `${scenario}: ${state.changes.length} candidate fields; zero phone calls. Evidence digest: ${await digest(result)}.`,
  );
  return state;
}
export async function reviewField(current: WorkflowState, field: unknown, decision: unknown): Promise<WorkflowState> {
  if (current.status !== 'completed') throw new Error('Only an unpublished result can be reviewed.');
  if (decision !== 'accepted' && decision !== 'rejected') throw new Error('Choose accept or reject.');
  const state = structuredClone(current);
  const change = state.changes.find(candidate => candidate.field === field);
  if (!change || change.decision === 'quarantined' || !change.requested || change.conflict) throw new Error('This field is quarantined or not requested.');
  change.decision = decision; state.version++;
  state.announcement = `${change.label} ${decision}.`;
  await append(state, 'field_reviewed', `${change.label}: ${decision}.`);
  return state;
}
export async function publishRevision(current: WorkflowState): Promise<WorkflowState> {
  if (current.status !== 'completed' || !canPublish(current.changes) || !current.callId) throw new Error('Resolve all eligible fields and accept at least one before publishing.');
  const state = structuredClone(current);
  state.publishedPatch = { ...state.publishedPatch, ...acceptedPatch(state.changes) };
  state.revision++; state.version++; state.status = 'published'; state.view = 'directory';
  state.revisions.push({ revision: state.revision, fields: { ...state.publishedPatch }, callId: state.callId!, publishedAt: new Date().toISOString() });
  state.announcement = `Revision ${state.revision} published.`;
  await append(state, 'revision_published', `Revision ${state.revision}; ${Object.keys(acceptedPatch(state.changes)).length} accepted fields; ${state.changes.filter(c => c.decision === 'quarantined').length} quarantined. Revision digest: ${await digest(state.revisions.at(-1))}.`);
  return state;
}
