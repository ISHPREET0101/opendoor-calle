import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';

import { createAuthorizedLiveCall } from '@/lib/call-e/live.server';
import { MockCallProvider } from '@/lib/call-e/mock-provider';
import { evaluatePreflight } from '@/lib/domain/verification';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    mode?: 'simulation' | 'live'; destination?: string; idempotencyKey?: string; purpose?: string;
    locale?: 'en-IN' | 'hi-IN'; listingId?: string; authorized?: boolean; approvalToken?: string;
  };
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
  try {
    const created = await createAuthorizedLiveCall(callRequest, {
      apiKey: bindings.CALLE_API_KEY, liveEnabled: bindings.CALLE_LIVE_ENABLED === 'true',
      approvedDestination: bindings.CALLE_APPROVED_DESTINATION, approvalToken: bindings.CALLE_APPROVAL_TOKEN,
      suppliedApprovalToken: body.approvalToken,
    });
    return NextResponse.json({ ...created, provider: 'call-e' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Live call rejected' }, { status: 403 });
  }
}
