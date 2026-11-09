import { test, expect } from '@playwright/test';

test.describe('Attendee & Public Discovery Browser Persona Workflow', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Attendee should discover events, inspect calendar, login, and view registrations', async ({ page }) => {
    // 1. Visit Landing Page
    await page.goto('/');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toBeVisible();

    // 2. Discover Events
    await page.goto('/discover');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Discover/i);

    // 3. Interactive Calendar
    await page.goto('/calendar');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toBeVisible();

    // 4. Login as Attendee
    await page.goto('/login');
    await page.getByRole('heading', { name: /Sign in to your account/i }).waitFor({ state: 'visible', timeout: 10000 });
    const loginForm = page.locator('form').filter({ has: page.getByRole('button', { name: /Sign In/i }) });
    await loginForm.locator('input[type="email"]').fill('sarah.j@gmail.com');
    await loginForm.locator('input[type="password"]').fill('password123');
    await loginForm.getByRole('button', { name: /Sign In/i }).click();

    // 5. User Dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Dashboard|Welcome/i);

    // 6. My Registrations
    await page.goto('/my-registrations');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Registrations|Passes/i);

    // 7. Favorites
    await page.goto('/favorites');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Favorites|Saved/i);

    // 8. Notifications
    await page.goto('/notifications');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Notifications/i);

    // 9. Profile
    await page.goto('/profile');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Profile/i);
  });
});
