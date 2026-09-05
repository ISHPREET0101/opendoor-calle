import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { initialWorkflow, stageResult, reviewField, publishRevision, verifyChain, type WorkflowState, type Scenario } from '@/lib/domain/workflow';
import { scenarioResult } from '@/lib/call-e/scenarios';

const COOKIE = 'opendoor_session';
function sessionId(request: Request) {
  const value = request.headers.get('cookie')?.split(';').map(c => c.trim()).find(c => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  return value && /^[a-f0-9-]{36}$/.test(value) ? value : null;
}
function response(request: Request, data: unknown, id?: string, status = 200) {
  const result = NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  if (id) result.cookies.set(COOKIE, id, { httpOnly: true, sameSite: 'strict', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 604800 });
  return result;
}
async function createSession() {
  const id = crypto.randomUUID();
  const state = initialWorkflow();
  await env.DB.prepare('INSERT INTO demo_sessions (id, state_json, updated_at) VALUES (?, ?, ?)').bind(id, JSON.stringify(state), new Date().toISOString()).run();
  return { id, state };
}
export async function GET(request: Request) {
  try {
    const id = sessionId(request);
    const row = id ? await env.DB.prepare('SELECT state_json FROM demo_sessions WHERE id = ?').bind(id).first<{ state_json: string }>() : null;
    if (!row) {
      const created = await createSession();
      return response(request, { state: created.state, persisted: true }, created.id);
    }
    const state = JSON.parse(row.state_json) as WorkflowState;
    if (new URL(request.url).searchParams.get('proof') === '1') {
      return response(request, { project: 'OpenDoor', provider: 'simulation', chainValid: await verifyChain(state.events), events: state.events, revisions: state.revisions, note: 'SHA-256 detects changes against a trusted chain head; this is not an externally signed attestation.' });
    }
    return response(request, { state, persisted: true });
  } catch {
    return response(request, { error: 'Storage is unavailable. No changes have been saved. Please try again.' }, undefined, 503);
  }
}
export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return response(request, { error: 'Cross-origin changes are not accepted.' }, undefined, 403);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return response(request, { error: 'Request too large.' }, undefined, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch { return response(request, { error: 'Expected a JSON command.' }, undefined, 400); }
  try {
    const id = sessionId(request);
    if (!id) return response(request, { error: 'Load the demo before making changes.' }, undefined, 401);
    const row = await env.DB.prepare('SELECT state_json FROM demo_sessions WHERE id = ?').bind(id).first<{ state_json: string }>();
    if (!row) return response(request, { error: 'Session expired. Reload the page.' }, undefined, 401);
    const current = JSON.parse(row.state_json) as WorkflowState;
    if (body.expectedVersion !== current.version) return response(request, { error: 'This review changed in another tab. The latest state has been loaded.', state: current }, undefined, 409);
    if (body.action === 'reset') {
      const created = await createSession();
      return response(request, { state: created.state, persisted: true }, created.id);
    }
    let next: WorkflowState;
    try {
      if (current.events.length >= 100) throw new Error('Start a fresh demo to continue.');
      if (body.action === 'simulate') {
        if (body.authorized !== true) throw new Error('Confirm the fictional contact authorization.');
        if (!['confirmed', 'refused', 'missing-evidence'].includes(String(body.scenario))) throw new Error('Unknown scenario.');
        next = await stageResult(current, await scenarioResult(body.scenario as Scenario), body.scenario as Scenario);
      } else if (body.action === 'review') next = await reviewField(current, body.field, body.decision);
      else if (body.action === 'publish') next = await publishRevision(current);
      else throw new Error('Unknown command. Arbitrary state replacement is not permitted.');
    } catch (error) { return response(request, { error: (error as Error).message }, undefined, 400); }
    const saved = await env.DB.prepare('UPDATE demo_sessions SET state_json = ?, updated_at = ? WHERE id = ? AND state_json = ?').bind(JSON.stringify(next), new Date().toISOString(), id, row.state_json).run();
    if (saved.meta.changes !== 1) return response(request, { error: 'Concurrent update detected. Reload before trying again.' }, undefined, 409);
    return response(request, { state: next, persisted: true });
  } catch { return response(request, { error: 'Storage is unavailable. No changes have been saved.' }, undefined, 503); }
}
