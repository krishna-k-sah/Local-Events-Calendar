import { test, expect } from '@playwright/test';

test.describe('Organizer Browser End-to-End Persona Workflow', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Organizer should login, view personal events, and navigate creation wizard', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.getByRole('heading', { name: /Sign in to your account/i }).waitFor({ state: 'visible', timeout: 10000 });
    const loginForm = page.locator('form').filter({ has: page.getByRole('button', { name: /Sign In/i }) });
    await loginForm.locator('input[type="email"]').fill('elena@novatech.io');
    await loginForm.locator('input[type="password"]').fill('password123');
    await loginForm.getByRole('button', { name: /Sign In/i }).click();

    // 2. Redirect to Organizer Events
    await page.waitForURL('**/organizer/events', { timeout: 15000 });
    const heading = page.locator('h1');
    await heading.waitFor({ state: 'visible', timeout: 15000 });
    await expect(heading).toContainText(/Organized/i);

    // 3. Open Create Event Wizard
    await page.goto('/events/create');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Host|Create/i);

    // 4. Return to My Events list
    await page.goto('/organizer/events');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Organized/i);
  });
});
