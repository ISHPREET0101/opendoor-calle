import { eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { verificationRuns } from '@/db/schema';
import { stablePreviewHash } from '@/lib/domain/verification';

import type { VerificationRequest } from './contract';

function runIdFor(idempotencyKey: string) {
  return `run_${stablePreviewHash(['call-e', idempotencyKey])}`;
}

export async function claimLiveCallIntent(request: VerificationRequest): Promise<string> {
  const db = getDb();
  const [existing] = await db
    .select({ id: verificationRuns.id })
    .from(verificationRuns)
    .where(eq(verificationRuns.idempotencyKey, request.idempotencyKey))
    .limit(1);

  if (existing) {
    throw new Error('A call already exists for this idempotency key; review it before retrying');
  }

  const id = runIdFor(request.idempotencyKey);
  await db.insert(verificationRuns).values({
    id,
    listingId: request.listingId,
    provider: 'call-e',
    status: 'queued',
    idempotencyKey: request.idempotencyKey,
    previewHash: stablePreviewHash([request.listingId, request.idempotencyKey, request.purpose]),
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

export async function recordLiveCallRejected(runId: string): Promise<void> {
  const db = getDb();
  await db
    .update(verificationRuns)
    .set({ status: 'failed', evidenceJson: JSON.stringify({ state: 'provider_rejected' }) })
    .where(eq(verificationRuns.id, runId));
}
