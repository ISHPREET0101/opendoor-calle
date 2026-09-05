import { expect, test } from '@playwright/test';

test('simulation to evidence review to immutable public revision', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Simulation · zero network calls')).toBeVisible();
  await expect(page.locator('html[data-opendoor-ready="true"]')).toHaveCount(1, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Run verification simulation' }).click();
  await expect(page.getByText('Approve the safe simulation plan')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Confirm fictional contact authorization' }).click();
  await page.getByRole('button', { name: /Approve and simulate/ }).click();

  await expect(page.getByRole('heading', { name: 'Choose each field. Publish one revision.' })).toBeVisible();
  await expect(page.getByText('call_demo_northstar_01')).toBeVisible();
  await expect(page.getByText('quarantined', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Accept Saturday hours change' }).click();
  await expect(page.getByRole('button', { name: 'Accept Wheelchair access change' })).toBeEnabled();
  await page.getByRole('button', { name: 'Accept Wheelchair access change' }).click();
  const publish = page.getByRole('button', { name: /Publish immutable revision/ });
  await expect(publish).toBeEnabled();
  await publish.click();

  await expect(page.getByRole('heading', { name: 'Northstar Community Pantry' })).toBeVisible();
  await expect(page.getByText('Verified revision 8')).toBeVisible();
  await expect(page.getByText('10:00–16:00')).toBeVisible();
  await expect(page.getByText('Step-free entrance + accessible washroom')).toBeVisible();
  await expect(page.getByText('18 Cedar Lane')).toBeVisible();
  await expect(page.getByText('Unit 4, 18 Cedar Lane')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Verified revision 8')).toBeVisible();
  await page.getByRole('button', { name: 'View public proof' }).click();
  await expect(page.getByText('Proof chain verified')).toBeVisible();
  await expect(page.getByText(/2 accepted fields; 1 quarantined/)).toBeVisible();
});

test('refusal preserves baseline and blocks publication', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html[data-opendoor-ready="true"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Run verification simulation' }).click();
  await page.getByLabel('Test scenario').selectOption('refused');
  await page.getByRole('checkbox', { name: 'Confirm fictional contact authorization' }).click();
  await page.getByRole('button', { name: /Approve and simulate/ }).click();
  await expect(page.getByText(/No evidence to review/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Publish immutable revision/ })).toBeDisabled();
});

test('server rejects tampering and stale review; isolated sessions stay untouched', async ({ request, playwright }) => {
  const a = await request.get('/api/state');
  let state = (await a.json()).state;
  expect((await request.post('/api/state', { data: { ...state, revision: 999 } })).status()).toBe(409);
  const simulated = await request.post('/api/state', { data: { action: 'simulate', expectedVersion: 0, scenario: 'confirmed', authorized: true } });
  expect(simulated.status()).toBe(200);
  state = (await simulated.json()).state;
  expect((await request.post('/api/state', { data: { action: 'review', expectedVersion: state.version, field: 'address', decision: 'accepted' } })).status()).toBe(400);
  expect((await request.post('/api/state', { data: { action: 'publish', expectedVersion: 0 } })).status()).toBe(409);
  const race = await Promise.all(['accepted', 'rejected'].map(decision => request.post('/api/state', { data: { action: 'review', expectedVersion: state.version, field: 'saturday_hours', decision } })));
  expect(race.map(result => result.status()).sort()).toEqual([200, 409]);
  const b = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  expect((await (await b.get('/api/state')).json()).state.status).toBe('idle');
  await b.dispose();
});

test('invalid call input is rejected without a server crash', async ({ request }) => {
  expect((await request.post('/api/calls', { data: { purpose: 42, destination: '+919876543210' } })).status()).toBe(400);
  expect((await request.get('/api/calls/run_not_authorized')).status()).toBe(403);
});

test('live mode is never offered by the public UI', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Simulation · zero network calls')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable live calling' })).toHaveCount(0);
});

test('server rejects an unauthorized live call before provider access', async ({ request }) => {
  const response = await request.post('/api/calls', {
    data: {
      mode: 'live',
      destination: '+919876543210',
      idempotencyKey: 'opendoor:unauthorized:live:v1',
      purpose: 'Verify Saturday hours and accessibility.',
      locale: 'en-IN',
      listingId: 'northstar-pantry',
      authorized: true,
      approvalToken: 'not-approved',
    },
  });
  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({ error: 'Live calling is disabled' });
});
