import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';

import { claimLiveCallIntent, recordLiveCallAccepted, recordLiveCallUncertain } from '@/lib/call-e/live-audit.server';
import { createAuthorizedLiveCall, validateLiveAuthorization } from '@/lib/call-e/live.server';
import { MockCallProvider } from '@/lib/call-e/mock-provider';
import { evaluatePreflight } from '@/lib/domain/verification';

export async function POST(request: Request) {
  let parsed: unknown;
  try { parsed = await request.json(); } catch { return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 }); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return NextResponse.json({ error: 'Expected a call request.' }, { status: 400 });
  const body = parsed as {
    mode?: 'simulation' | 'live'; destination?: string; idempotencyKey?: string; purpose?: string;
    locale?: 'en-IN' | 'hi-IN'; listingId?: string; authorized?: boolean; approvalToken?: string;
  };
  if ([body.destination, body.idempotencyKey, body.purpose].some(value => typeof value !== 'string' || value.length > 2000) || (body.mode !== undefined && !['live', 'simulation'].includes(body.mode)) || (body.locale !== undefined && !['en-IN', 'hi-IN'].includes(body.locale))) return NextResponse.json({ error: 'Invalid call fields.' }, { status: 400 });
  const preflight = evaluatePreflight({
    mode: body.mode ?? 'simulation', purpose: body.purpose ?? '', destination: body.destination ?? '',
    authorized: body.authorized === true, suppressed: false, withinCallingWindow: true, globalStop: false,
    idempotencyKey: body.idempotencyKey ?? '',
  });
  if (!preflight.allowed) return NextResponse.json({ error: 'Preflight failed', checks: preflight.checks }, { status: 400 });

  const callRequest = {
    listingId: body.listingId ?? 'northstar-pantry', destination: body.destination!, locale: body.locale ?? 'en-IN',
    idempotencyKey: body.idempotencyKey!, purpose: body.purpose!,
  };
  if (body.mode !== 'live') {
    const provider = new MockCallProvider();
    const created = await provider.create(callRequest);
    return NextResponse.json(await provider.get(created.callId));
  }

  const bindings = env as unknown as Record<string, string | undefined>;
  const authorization = {
    apiKey: bindings.CALLE_API_KEY, liveEnabled: bindings.CALLE_LIVE_ENABLED === 'true',
    approvedDestination: bindings.CALLE_APPROVED_DESTINATION, approvedPurpose: bindings.CALLE_APPROVED_PURPOSE,
    approvalToken: bindings.CALLE_APPROVAL_TOKEN, suppliedApprovalToken: body.approvalToken,
  };
  let auditRunId: string | undefined;
  let created: { callId: string; status: string } | undefined;
  try {
    validateLiveAuthorization(callRequest, authorization);
    auditRunId = await claimLiveCallIntent(callRequest, authorization.approvalToken!);
    created = await createAuthorizedLiveCall(callRequest, authorization);
    await recordLiveCallAccepted(auditRunId, created);
    return NextResponse.json({ ...created, auditRunId, provider: 'call-e' });
  } catch (error) {
    if (auditRunId) {
      // Even when the provider accepted the call, keep its ID on the run record so the
      // outcome can be reconciled; a dialed call must never become untracked.
      await recordLiveCallUncertain(auditRunId, created?.callId).catch(() => undefined);
      return NextResponse.json({ error: 'Call outcome requires reconciliation. Do not create another call.', auditRunId }, { status: 502 });
    }
    return NextResponse.json({ error: error instanceof Error && /disabled|credentials|approval token|server-approved/.test(error.message) ? error.message : 'Call intent could not be claimed. Check approval usage and storage.' }, { status: 403 });
  }
}
