import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getDb } from '@/db';
import { demoSessions } from '@/db/schema';

const DEMO_ID = 'opendoor-demo-v1';

export async function GET() {
  try {
    const [row] = await getDb().select().from(demoSessions).where(eq(demoSessions.id, DEMO_ID)).limit(1);
    return NextResponse.json({ state: row ? JSON.parse(row.stateJson) : null, persisted: Boolean(row) });
  } catch {
    return NextResponse.json({ state: null, persisted: false, warning: 'D1 is not initialized; using deterministic demo state.' });
  }
}

export async function POST(request: Request) {
  const state: unknown = await request.json();
  const stateJson = JSON.stringify(state);
  if (stateJson.length > 40_000) return NextResponse.json({ error: 'State payload is too large.' }, { status: 413 });

  try {
    const now = new Date().toISOString();
    await getDb()
      .insert(demoSessions)
      .values({ id: DEMO_ID, stateJson, updatedAt: now })
      .onConflictDoUpdate({ target: demoSessions.id, set: { stateJson, updatedAt: now } });
    return NextResponse.json({ persisted: true, updatedAt: now });
  } catch {
    return NextResponse.json({ persisted: false, warning: 'D1 is unavailable; the current browser session still works.' }, { status: 202 });
  }
}
