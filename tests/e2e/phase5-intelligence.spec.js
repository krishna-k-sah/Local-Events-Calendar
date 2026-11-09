import { test, expect } from '@playwright/test';

test.describe('Phase 5 – Advanced Intelligence & Event Passes E2E Workflow', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Attendee views digital QR ticket pass and discovers personalized recommendations', async ({ page }) => {
    // 1. Login as Attendee
    await page.goto('/login');
    await page.getByRole('heading', { name: /Sign in to your account/i }).waitFor({ state: 'visible', timeout: 10000 });
    const loginForm = page.locator('form').filter({ has: page.getByRole('button', { name: /Sign In/i }) });
    await loginForm.locator('input[type="email"]').fill('sarah.j@gmail.com');
    await loginForm.locator('input[type="password"]').fill('password123');
    await loginForm.getByRole('button', { name: /Sign In/i }).click();

    // 2. Redirect to Dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.locator('h1').waitFor({ state: 'visible' });

    // 3. Check Personalized Recommendations on Dashboard
    await expect(page.getByText('Personalized For You')).toBeVisible({ timeout: 10000 });

    // 4. Visit My Registrations
    await page.goto('/my-registrations');
    await page.locator('h1').waitFor({ state: 'visible' });

    // 5. Open QR Ticket Pass Modal
    const viewPassBtn = page.getByRole('button', { name: /View Pass/i }).first();
    if (await viewPassBtn.isVisible()) {
      await viewPassBtn.click();
      await expect(page.getByText('Digital Event Pass')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('img[alt*="QR Code"]')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: /Download Official PDF Pass/i })).toBeVisible();

      // Close modal
      await page.getByRole('button', { name: 'Close' }).click();
      await expect(page.getByText('Digital Event Pass')).not.toBeVisible();
    }

    // 6. Visit Discovery Page with Recommendations
    await page.goto('/discover');
    await page.locator('h1').waitFor({ state: 'visible' });
    await expect(page.getByText('Curated Recommendations')).toBeVisible({ timeout: 10000 });
  });

  test('Organizer audits intelligence telemetry and operates Door Attendance Scanner', async ({ page }) => {
    // 1. Login as Organizer
    await page.goto('/login');
    await page.getByRole('heading', { name: /Sign in to your account/i }).waitFor({ state: 'visible', timeout: 10000 });
    const loginForm = page.locator('form').filter({ has: page.getByRole('button', { name: /Sign In/i }) });
    await loginForm.locator('input[type="email"]').fill('elena@novatech.io');
    await loginForm.locator('input[type="password"]').fill('password123');
    await loginForm.getByRole('button', { name: /Sign In/i }).click();

    // 2. Redirect to Organizer Events
    await page.waitForURL('**/organizer/events', { timeout: 15000 });
    await page.locator('h1').waitFor({ state: 'visible' });

    // 3. Verify Telemetry Cards loaded from real database
    await expect(page.getByText('Events Hosted')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Capacity Utilization')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Door Check-in Rate')).toBeVisible({ timeout: 10000 });

    // 4. Open Attendance Door Scanner Modal
    const scanBtn = page.locator('button[title*="Scan Door Tickets"]').first();
    if (await scanBtn.isVisible()) {
      await scanBtn.click();
      await expect(page.getByText('Attendance Check-in Scanner')).toBeVisible({ timeout: 10000 });
      await expect(page.getByPlaceholder(/EVT-ABCD-1234/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible();

      // Switch to Roster tab
      await page.getByRole('button', { name: /Roster/i }).click();
      await expect(page.getByRole('button', { name: /Scanner/i })).toBeVisible();

      // Close modal
      const closeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
      await closeBtn.click();
    }
  });
});

