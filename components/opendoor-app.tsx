'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CirclePause,
  Clock3,
  ExternalLink,
  FileCheck2,
  History,
  LockKeyhole,
  PhoneCall,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { VerificationResult } from '@/lib/call-e/contract';
import {
  acceptedPatch,
  canPublish,
  evaluatePreflight,
  maskPhone,
  normalizeDecisions,
  stablePreviewHash,
  type CandidateChange,
  type Decision,
} from '@/lib/domain/verification';

type View = 'operations' | 'review' | 'directory' | 'audit';
type RunStatus = 'idle' | 'queued' | 'in_progress' | 'completed' | 'published';

interface DemoState {
  view: View;
  status: RunStatus;
  callId: string | null;
  changes: CandidateChange[];
  revision: number;
  publishedPatch: Record<string, string>;
  announcement: string;
}

const DESTINATION = '+919876543210';
const IDEMPOTENCY_KEY = 'opendoor:northstar:rev7:hours-access:v1';
const PURPOSE = 'Verify Saturday hours and accessibility for the public directory.';
const INITIAL_STATE: DemoState = {
  view: 'operations', status: 'idle', callId: null, changes: [], revision: 7, publishedPatch: {}, announcement: '',
};

const listings = [
  { name: 'Northstar Community Pantry', category: 'Food support', freshness: '142 days', status: 'Review due', tone: 'warning' },
  { name: 'Harbor Night Shelter', category: 'Housing', freshness: '12 days', status: 'Verified', tone: 'verified' },
  { name: 'Willow Family Centre', category: 'Family support', freshness: '63 days', status: 'Needs evidence', tone: 'danger' },
  { name: 'Bridge Skills Hub', category: 'Employment', freshness: '28 days', status: 'Verified', tone: 'verified' },
];

const statusClass = {
  warning: 'border-amber-300 bg-amber-50 text-amber-800', verified: 'border-teal-300 bg-teal-50 text-teal-800', danger: 'border-rose-300 bg-rose-50 text-rose-800',
} as const;

function ModeBadge() {
  return <Badge className="border border-sky-300 bg-sky-50 text-sky-800">Simulation · zero network calls</Badge>;
}

function PrimaryNav({ state, setView }: { state: DemoState; setView: (view: View) => void }) {
  return (
    <nav aria-label="Primary" className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <button type="button" onClick={() => setView('operations')} className="flex min-h-11 items-center gap-3 text-left">
          <span className="grid size-10 place-items-center bg-slate-950 text-white"><FileCheck2 aria-hidden="true" className="size-5" /></span>
          <span><strong className="block text-lg tracking-[-0.03em]">OpenDoor</strong><span className="hidden text-xs font-medium uppercase tracking-[0.15em] text-slate-500 sm:block">Evidence control room</span></span>
        </button>
        <div className="hidden items-center gap-1 md:flex">
          {(['operations', 'directory', 'audit'] as View[]).map((view) => (
            <Button key={view} variant={state.view === view ? 'secondary' : 'ghost'} size="lg" onClick={() => setView(view)} className="capitalize">{view}</Button>
          ))}
        </div>
        <div className="flex items-center gap-2"><ModeBadge /><Button variant="outline" size="icon-lg" aria-label="Global stop is available in Live mode"><CirclePause /></Button></div>
      </div>
    </nav>
  );
}

function ProofChain({ state }: { state: DemoState }) {
  const active = state.status === 'idle' ? 1 : state.status === 'published' ? 4 : state.view === 'review' ? 3 : 2;
  return (
    <div className="border border-slate-700 bg-slate-900 p-5">
      <div className="flex items-center justify-between"><p className="font-semibold">Proof chain</p><Badge className="bg-teal-300 text-slate-950">{active}/4 active</Badge></div>
      <ol className="mt-5 space-y-4 text-sm">
        {[
          ['Consent check', 'Authorized contact + quiet hours'], ['CALL-E run', 'Stable ID + structured result'], ['Evidence review', 'Field-level accept or reject'], ['Immutable publish', 'Revision hash + public audit'],
        ].map(([title, detail], index) => (
          <li key={title} className="grid grid-cols-[28px_1fr] gap-3">
            <span className={`grid size-7 place-items-center border text-xs font-bold ${index + 1 <= active ? 'border-teal-400 bg-teal-400/10 text-teal-300' : 'border-slate-600 text-slate-500'}`}>{index + 1}</span>
            <span><strong className="block text-white">{title}</strong><span className="text-slate-400">{detail}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function VerificationDialog({ onRun }: { onRun: () => void }) {
  const [open, setOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const preflight = evaluatePreflight({
    mode: 'simulation', purpose: PURPOSE, destination: DESTINATION, authorized, suppressed: false,
    withinCallingWindow: true, globalStop: false, idempotencyKey: IDEMPOTENCY_KEY,
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="lg" className="min-h-11 bg-teal-300 px-4 text-slate-950 hover:bg-teal-200" onClick={() => setOpen(true)}>
        <PhoneCall data-icon="inline-start" /> Run verification simulation
      </Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle className="text-xl">Approve the safe simulation plan</DialogTitle><DialogDescription>No phone call or external network request will occur. These checks mirror the server gate used for Live mode.</DialogDescription></DialogHeader>
        <div className="grid gap-3 border-y border-slate-200 py-4 text-sm sm:grid-cols-2">
          <div><span className="text-slate-500">Provider</span><strong className="block">Northstar Community Pantry</strong></div>
          <div><span className="text-slate-500">Destination</span><strong className="block font-mono">{maskPhone(DESTINATION)}</strong></div>
          <div className="sm:col-span-2"><span className="text-slate-500">Purpose</span><strong className="block">{PURPOSE}</strong></div>
          <div className="sm:col-span-2"><span className="text-slate-500">Idempotency key</span><strong className="block break-all font-mono text-xs">{IDEMPOTENCY_KEY}</strong></div>
        </div>
        <ul className="grid gap-2 text-sm">
          {preflight.checks.map((check) => <li key={check.label} className="flex items-center gap-2"><span className={`grid size-5 place-items-center rounded-full ${check.passed ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>{check.passed ? <Check className="size-3" /> : '!'}</span>{check.label}</li>)}
        </ul>
        <div className="flex min-h-12 items-start gap-3 border border-slate-300 bg-slate-50 p-3">
          <Checkbox aria-label="Confirm fictional contact authorization" checked={authorized} onCheckedChange={(checked) => setAuthorized(checked === true)} className="mt-1" />
          <span><strong className="block">I confirm this fictional contact is authorized for the demo.</strong><span className="text-slate-600">Live mode additionally requires a server-side approved number and one-time approval token.</span></span>
        </div>
        <DialogFooter>
          <Button disabled={!preflight.allowed} onClick={() => { setOpen(false); onRun(); }} className="min-h-11">Approve and simulate <ArrowRight data-icon="inline-end" /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Operations({ state, onRun, onInspect }: { state: DemoState; onRun: () => void; onInspect: () => void }) {
  return (
    <>
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-8 lg:grid-cols-[1.5fr_1fr] lg:px-8 lg:py-10">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal-300"><ShieldCheck className="size-4" /> Evidence before publication</p>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.02] tracking-[-0.05em] sm:text-5xl">Verify public-service facts without letting a phone call rewrite the truth.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">CALL-E gathers structured facts. OpenDoor binds every proposed change to evidence, quarantines conflicts, and waits for a human decision.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              {state.status === 'idle' ? <VerificationDialog onRun={onRun} /> : <Button size="lg" className="min-h-11 bg-teal-300 text-slate-950" onClick={onInspect}>{state.status === 'completed' ? 'Review evidence' : 'Inspect active run'} <ArrowRight data-icon="inline-end" /></Button>}
            </div>
          </div>
          <ProofChain state={state} />
        </div>
      </section>
      <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
        {state.status !== 'idle' && <Alert className="mb-5 border-sky-300 bg-sky-50"><Sparkles /><AlertTitle>{state.status === 'completed' ? 'Simulation complete — evidence is ready' : 'CALL-E simulation is running'}</AlertTitle><AlertDescription>Stable run ID: <code>{state.callId}</code>. No external request was made.</AlertDescription></Alert>}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-teal-700">Today’s verification health</p><h2 className="mt-1 text-2xl font-bold tracking-[-0.035em]">Four services, two decisions waiting</h2></div><p className="text-sm text-slate-600">Fictional demo data · safe to replay</p></div>
        <div className="mt-5 grid border border-slate-200 bg-white sm:grid-cols-3">
          {[['2', 'Ready to publish', CheckCircle2, 'text-teal-700'], ['1', 'Review overdue', Clock3, 'text-amber-700'], ['1', 'Conflict quarantined', TriangleAlert, 'text-rose-700']].map(([value, label, Icon, color], index) => (
            <div key={String(label)} className={`p-5 ${index ? 'border-t border-slate-200 sm:border-l sm:border-t-0' : ''}`}><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-600">{String(label)}</p><Icon className={`size-5 ${String(color)}`} /></div><p className="mt-2 text-3xl font-bold">{String(value)}</p></div>
          ))}
        </div>
        <div className="mt-5 hidden border border-slate-200 bg-white sm:block"><Table><TableCaption className="sr-only">Community service listings and verification status</TableCaption><TableHeader><TableRow><TableHead scope="col">Provider</TableHead><TableHead scope="col">Category</TableHead><TableHead scope="col">Last verified</TableHead><TableHead scope="col">Status</TableHead><TableHead scope="col" className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{listings.map((listing) => <TableRow key={listing.name}><TableCell className="font-semibold">{listing.name}</TableCell><TableCell>{listing.category}</TableCell><TableCell>{listing.freshness} ago</TableCell><TableCell><Badge variant="outline" className={statusClass[listing.tone as keyof typeof statusClass]}>{listing.status}</Badge></TableCell><TableCell className="text-right"><Button size="lg" variant="outline" aria-label={`Inspect ${listing.name}`} onClick={listing.name.startsWith('Northstar') ? onInspect : undefined}>Inspect</Button></TableCell></TableRow>)}</TableBody></Table></div>
        <div className="mt-5 grid gap-3 sm:hidden">{listings.map((listing) => <article key={listing.name} className="border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{listing.name}</h3><p className="text-sm text-slate-600">{listing.category} · {listing.freshness} ago</p></div><Badge variant="outline" className={statusClass[listing.tone as keyof typeof statusClass]}>{listing.status}</Badge></div><Button className="mt-4 min-h-11 w-full" variant="outline" onClick={listing.name.startsWith('Northstar') ? onInspect : undefined}>Inspect listing</Button></article>)}</div>
      </div>
    </>
  );
}

function EvidenceReview({ state, decide, publish, back }: { state: DemoState; decide: (field: string, decision: Decision) => void; publish: () => void; back: () => void }) {
  const hash = stablePreviewHash(['northstar-pantry', String(state.revision), state.callId ?? 'none', ...state.changes.map((change) => `${change.field}:${change.proposedValue}`)]);
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      <Button variant="ghost" size="lg" onClick={back}><ArrowLeft /> Back to operations</Button>
      <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm font-semibold text-teal-700">Evidence review</p><h1 className="mt-1 text-3xl font-bold tracking-[-0.04em]">Choose each field. Publish one revision.</h1><p className="mt-2 max-w-3xl text-slate-600">Transcript text is treated as untrusted evidence, never as an instruction. Conflicts and unrequested facts are quarantined automatically.</p></div><div className="border border-slate-300 bg-white p-3 font-mono text-xs"><span className="block text-slate-500">Preview hash</span>{hash}</div></div>
      <Alert className="mt-6 border-teal-300 bg-teal-50"><ShieldCheck /><AlertTitle>CALL-E result completed</AlertTitle><AlertDescription>Run <code>{state.callId}</code> · requested fields only · base revision {state.revision}</AlertDescription></Alert>
      <div className="mt-6 grid gap-4">{state.changes.map((change) => (
        <article key={change.field} className={`border bg-white ${change.conflict ? 'border-rose-300' : 'border-slate-200'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4"><div><h2 className="text-lg font-bold">{change.label}</h2><p className="text-sm text-slate-500">Confidence: {change.confidence} · {change.requested ? 'Requested' : 'Not requested'}</p></div><Badge variant="outline" className={change.decision === 'accepted' ? statusClass.verified : change.decision === 'quarantined' ? statusClass.danger : 'bg-slate-50'}>{change.decision}</Badge></div>
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_1.3fr]"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current public value</p><p className="mt-2 font-medium">{change.currentValue}</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proposed value</p><p className="mt-2 font-medium">{change.proposedValue}</p></div><blockquote className="border-l-4 border-sky-300 bg-sky-50 p-3 text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-sky-800">Evidence excerpt</span>{change.evidence}</blockquote></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-3"><p className="text-sm text-slate-600">{change.conflict ? 'Conflict: cannot publish without a new verification.' : 'A reviewer must explicitly decide this field.'}</p>{!change.conflict && <div className="flex gap-2"><Button size="lg" variant="outline" onClick={() => decide(change.field, 'rejected')} aria-label={`Reject ${change.label} change`}><X /> Reject</Button><Button size="lg" onClick={() => decide(change.field, 'accepted')} aria-label={`Accept ${change.label} change`}><Check /> Accept</Button></div>}</div>
        </article>
      ))}</div>
      <div className="sticky bottom-3 mt-6 flex flex-col items-center justify-between gap-3 border border-slate-300 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row"><div><strong>{state.changes.filter((change) => change.decision !== 'pending').length}/{state.changes.length} decisions resolved</strong><p className="text-sm text-slate-600">Accepted fields publish together against revision {state.revision}.</p></div><Button size="lg" className="min-h-11 w-full sm:w-auto" disabled={!canPublish(state.changes)} onClick={publish}><LockKeyhole /> Publish immutable revision</Button></div>
    </div>
  );
}

function PublicDirectory({ state, setView }: { state: DemoState; setView: (view: View) => void }) {
  const hours = state.publishedPatch.saturday_hours ?? '09:00–17:00';
  const access = state.publishedPatch.wheelchair_access ?? 'Not yet verified';
  return <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8"><p className="text-sm font-semibold text-teal-700">Public directory</p><h1 className="mt-1 text-4xl font-bold tracking-[-0.05em]">Northstar Community Pantry</h1><p className="mt-3 max-w-2xl text-lg text-slate-600">Food support for the fictional Cedar Lane community. No private phone, transcript, confidence score, or reviewer data is published.</p><div className="mt-7 grid border border-slate-200 bg-white md:grid-cols-[1.4fr_1fr]"><div className="p-6"><Badge className="bg-teal-100 text-teal-800">Verified revision {state.revision}</Badge><dl className="mt-6 grid gap-5"><div><dt className="text-sm text-slate-500">Saturday hours</dt><dd className="text-xl font-bold">{hours}</dd></div><div><dt className="text-sm text-slate-500">Accessibility</dt><dd className="text-xl font-bold">{access}</dd></div><div><dt className="text-sm text-slate-500">Address</dt><dd className="text-xl font-bold">18 Cedar Lane</dd><p className="text-sm text-amber-700">Conflicting unit detail withheld pending verification.</p></div></dl></div><aside className="border-t border-slate-200 bg-slate-50 p-6 md:border-l md:border-t-0"><ShieldCheck className="size-8 text-teal-700" /><h2 className="mt-3 text-xl font-bold">Why trust this listing?</h2><p className="mt-2 leading-6 text-slate-600">Each displayed fact was requested, supported by call evidence, approved by a human, and committed in one revision.</p><Button variant="outline" size="lg" className="mt-5" onClick={() => setView('audit')}>View public proof <ExternalLink /></Button></aside></div></div>;
}

function AuditTrail({ state }: { state: DemoState }) {
  const events = state.status === 'published' ? ['Revision published', '2 fields accepted; 1 conflict quarantined', 'CALL-E simulation completed', 'Authorized preview approved', 'Base revision 7 loaded'] : ['Base revision 7 loaded', 'No verification run yet'];
  return <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8"><p className="text-sm font-semibold text-teal-700">Append-only audit</p><h1 className="mt-1 text-4xl font-bold tracking-[-0.05em]">Every decision leaves a trail.</h1><p className="mt-3 text-slate-600">The public view stays minimal. The steward view preserves hashes, decisions, and stable run IDs.</p><ol className="mt-8 border border-slate-200 bg-white">{events.map((event, index) => <li key={event} className="grid grid-cols-[40px_1fr] gap-3 border-b border-slate-200 p-4 last:border-b-0"><span className="grid size-8 place-items-center bg-slate-950 text-sm font-bold text-white">{events.length - index}</span><div><strong>{event}</strong><p className="mt-1 font-mono text-xs text-slate-500">audit_{stablePreviewHash([event, String(index)])} · hash-linked</p></div></li>)}</ol></div>;
}

declare global {
  interface Window { modelContext?: { registerTool?: (tool: Record<string, unknown>) => void; unregisterTool?: (name: string) => void } }
}

export function OpenDoorApp() {
  const [state, setState] = useState<DemoState>(INITIAL_STATE);
  const headingRef = useRef<HTMLDivElement>(null);
  const setView = (view: View) => setState((current) => ({ ...current, view }));

  useEffect(() => {
    document.documentElement.dataset.opendoorReady = 'true';
    return () => { delete document.documentElement.dataset.opendoorReady; };
  }, []);
  useEffect(() => {
    fetch('/api/state')
      .then((response) => response.json())
      .then((value) => {
        const data = value as { state?: DemoState | null };
        if (data.state?.revision) setState(data.state);
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => { if (state !== INITIAL_STATE) fetch('/api/state', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state) }).catch(() => undefined); }, [state]);
  useEffect(() => { headingRef.current?.focus(); }, [state.view]);

  const runSimulation = async () => {
    setState((current) => ({ ...current, status: 'in_progress', callId: 'call_demo_northstar_01', announcement: 'Verification simulation started. No phone call was placed.' }));
    const response = await fetch('/api/calls', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'simulation', destination: DESTINATION, idempotencyKey: IDEMPOTENCY_KEY, purpose: PURPOSE, locale: 'en-IN', listingId: 'northstar-pantry', authorized: true }) });
    const result = (await response.json()) as VerificationResult;
    setState((current) => ({ ...current, status: 'completed', callId: result.callId, changes: normalizeDecisions(result.changes), view: 'review', announcement: 'Simulation completed. Three candidate changes are ready for review.' }));
  };
  const decide = (field: string, decision: Decision) => setState((current) => ({ ...current, changes: current.changes.map((change) => change.field === field ? { ...change, decision } : change), announcement: `${field.replace('_', ' ')} marked ${decision}.` }));
  const publish = () => setState((current) => ({ ...current, status: 'published', revision: current.revision + 1, publishedPatch: acceptedPatch(current.changes), view: 'directory', announcement: `Revision ${current.revision + 1} published. Only accepted requested fields are public.` }));
  const reset = () => setState({ ...INITIAL_STATE, announcement: 'Demo reset to revision 7.' });

  useEffect(() => {
    const api = window.modelContext;
    if (!api?.registerTool) return;
    api.registerTool({ name: 'start_opendoor_demo', description: 'Start the safe OpenDoor verification simulation and show its evidence review.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: async () => { await runSimulation(); return { content: [{ type: 'text', text: 'OpenDoor simulation completed and evidence review is visible.' }] }; } });
    api.registerTool({ name: 'show_opendoor_directory', description: 'Show the current public OpenDoor directory listing.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: async () => { setView('directory'); return { content: [{ type: 'text', text: 'The public directory is visible.' }] }; } });
    return () => { api.unregisterTool?.('start_opendoor_demo'); api.unregisterTool?.('show_opendoor_directory'); };
  }, []);

  let content;
  if (state.view === 'review') content = <EvidenceReview state={state} decide={decide} publish={publish} back={() => setView('operations')} />;
  else if (state.view === 'directory') content = <PublicDirectory state={state} setView={setView} />;
  else if (state.view === 'audit') content = <AuditTrail state={state} />;
  else content = <Operations state={state} onRun={runSimulation} onInspect={() => state.changes.length ? setView('review') : undefined} />;

  return <main className="min-h-screen bg-[var(--paper)] text-slate-950"><a href="#main-content" className="sr-only z-50 bg-white p-3 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to main content</a><PrimaryNav state={state} setView={setView} /><div id="main-content" ref={headingRef} tabIndex={-1}>{content}</div><div aria-live="polite" aria-atomic="true" className="sr-only">{state.announcement}</div><footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-3 px-5 py-5 text-sm text-slate-600 sm:flex-row lg:px-8"><p>OpenDoor · fictional data · safe simulation by default</p><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={reset}><RotateCcw /> Reset demo</Button><Button variant="ghost" size="sm" onClick={() => setView('audit')}><History /> Audit</Button></div></div></footer></main>;
}
