import { eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { verificationRuns } from '@/db/schema';
import { digest } from '@/lib/domain/workflow';

import type { VerificationRequest } from './contract';

export async function claimLiveCallIntent(request: VerificationRequest, approvalToken: string): Promise<string> {
  const db = getDb();
  const [existing] = await db
    .select({ id: verificationRuns.id })
    .from(verificationRuns)
    .where(eq(verificationRuns.idempotencyKey, request.idempotencyKey))
    .limit(1);

  if (existing) {
    throw new Error('A call already exists for this idempotency key; review it before retrying');
  }

  const id = `run_${await digest(['call-e', request.idempotencyKey])}`;
  await db.insert(verificationRuns).values({
    id,
    listingId: request.listingId,
    provider: 'call-e',
    status: 'queued',
    idempotencyKey: request.idempotencyKey,
    // Unique constraint consumes the approval even if a caller changes the key.
    previewHash: await digest(['approval', approvalToken]),
    evidenceJson: JSON.stringify({ state: 'intent_recorded' }),
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function recordLiveCallAccepted(
  runId: string,
  created: { callId: string; status: string },
): Promise<void> {
  const db = getDb();
  await db
    .update(verificationRuns)
    .set({
      status: created.status as 'queued' | 'in_progress' | 'completed' | 'failed' | 'canceled',
      evidenceJson: JSON.stringify({ callId: created.callId, state: 'provider_accepted' }),
    })
    .where(eq(verificationRuns.id, runId));
}

export async function recordLiveCallUncertain(runId: string): Promise<void> {
  const db = getDb();
  await db
    .update(verificationRuns)
    .set({ evidenceJson: JSON.stringify({ state: 'provider_outcome_unknown', instruction: 'Reconcile using the original idempotency key before any further call.' }) })
    .where(eq(verificationRuns.id, runId));
}
