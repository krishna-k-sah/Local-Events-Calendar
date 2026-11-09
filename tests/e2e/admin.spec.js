import { test, expect } from '@playwright/test';

test.describe('Admin Browser End-to-End Persona Workflow', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Admin should login, inspect metrics, manage categories, and audit reports', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('/login');

    // 2. Fill Admin Credentials
    await page.getByRole('heading', { name: /Sign in to your account/i }).waitFor({ state: 'visible', timeout: 10000 });
    const loginForm = page.locator('form').filter({ has: page.getByRole('button', { name: /Sign In/i }) });
    await loginForm.locator('input[type="email"]').fill('admin@eventhub.com');
    await loginForm.locator('input[type="password"]').fill('password123');
    await loginForm.getByRole('button', { name: /Sign In/i }).click();

    // 3. Should redirect to Admin Dashboard
    await page.waitForURL('**/admin', { timeout: 15000 });
    const heading = page.locator('h1');
    await heading.waitFor({ state: 'visible', timeout: 15000 });
    await expect(heading).toContainText(/Admin/i);

    // 4. Verify telemetry cards loaded from real database
    await expect(page.getByText('Total Events')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Users')).toBeVisible({ timeout: 10000 });

    // 5. Navigate to User Management
    await page.goto('/admin/users');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/User/i);

    // 6. Navigate to Event Approvals
    await page.goto('/admin/approvals');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Approvals/i);

    // 7. Navigate to Categories
    await page.goto('/admin/categories');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Categories/i);

    // 8. Navigate to Reports & Analytics
    await page.goto('/admin/reports');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Reports/i);
    await expect(page.getByRole('button', { name: 'Events Ledger' })).toBeVisible({ timeout: 10000 });

    // 9. Navigate to Settings
    await page.goto('/settings');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Settings/i);
  });
});
