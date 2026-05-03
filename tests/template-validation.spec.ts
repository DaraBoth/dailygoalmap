import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';
const hasCredentials = !!TEST_EMAIL && !!TEST_PASSWORD;

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /Log In/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
}

test.describe('Template form validation', () => {
  test.skip(!hasCredentials, 'Skipped: TEST_EMAIL and TEST_PASSWORD not set');

  test('does not move to next step when required fields are missing', async ({ page }) => {
    await signIn(page);
    await page.goto('/goal/create');

    const firstTemplateCard = page.locator('div[class*="grid"] [class*="cursor-pointer"]').first();
    await expect(firstTemplateCard).toBeVisible({ timeout: 10000 });
    await firstTemplateCard.click();

    await expect(page).toHaveURL(/\/goal\/create-from-template\//, { timeout: 10000 });
    await expect(page.getByText(/Step 1 of/i)).toBeVisible();

    await page.getByRole('button', { name: /^Next$/i }).click();

    await expect(page.getByText(/Validation Error/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Step 1 of/i)).toBeVisible();
  });
});
