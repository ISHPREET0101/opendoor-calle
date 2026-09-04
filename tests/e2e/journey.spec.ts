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
