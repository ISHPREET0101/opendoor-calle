import { env } from 'cloudflare:workers';
import { CalleClient } from '@call-e/calle';
import { NextResponse } from 'next/server';

import type { NormalizedCallStatus } from '@/lib/call-e/contract';
import { mapLiveCallToVerificationResult } from '@/lib/call-e/live-result';
import { BASELINE_FIELD_VALUES } from '@/lib/domain/verification';

// Operator-only read. Polling never creates or retries a phone call.
export async function GET(request: Request, context: { params: Promise<{ runId: string }> }) {
  const bindings = env as unknown as Record<string, string | undefined>;
  const token = bindings.CALLE_APPROVAL_TOKEN;
  if (!token || request.headers.get('authorization') !== `Bearer ${token}` || !bindings.CALLE_API_KEY) return NextResponse.json({ error: 'Operator credentials required.' }, { status: 403 });
  const { runId } = await context.params;
  try {
    const row = await env.DB.prepare('SELECT evidence_json FROM verification_runs WHERE id = ? AND preview_hash = ?').bind(runId, await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(['approval', token]))).then(bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join(''))).first<{ evidence_json: string }>();
    if (!row) return NextResponse.json({ error: 'Run not found for this approval.' }, { status: 404 });
    const saved = JSON.parse(row.evidence_json);
    if (!saved.callId) return NextResponse.json({ error: 'Provider ID unavailable; reconcile the original idempotency key before redialing.' }, { status: 409 });
    const client = new CalleClient({ apiKey: bindings.CALLE_API_KEY, baseUrl: 'https://api.heycall-e.com' });
    const call = await client.calls.get(saved.callId);
    const observed = {
      id: call.id, status: call.status as NormalizedCallStatus, summary: call.summary, evidence: call.evidence,
      taskCompleted: call.taskCompleted, completionConfidence: call.completionConfidence,
      recipients: call.recipients.map(recipient => ({ structuredResult: recipient.structuredResult, summary: recipient.summary })),
    };
    // Map the observed call into review candidates now, so a later operator import stages
    // exactly what was observed, bound to its evidence, with nothing published silently.
    const mapped = mapLiveCallToVerificationResult(observed, BASELINE_FIELD_VALUES);
    const result = { callId: observed.id, provider: 'call-e', status: observed.status, summary: observed.summary, evidence: observed.evidence, taskCompleted: observed.taskCompleted, recipients: observed.recipients };
    await env.DB.prepare('UPDATE verification_runs SET status = ?, evidence_json = ? WHERE id = ?').bind(call.status, JSON.stringify({ ...result, changes: mapped.changes, state: 'provider_observed' }), runId).run();
    return NextResponse.json({ ...result, stagedCandidates: mapped.changes.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Result could not be fetched. No new call was placed.' }, { status: 502 }); }
}
