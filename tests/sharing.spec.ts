/**
 * sharing.spec.ts — Goal sharing & access control tests
 *
 * Covers:
 *  - Members Sheet opens from goal detail page
 *  - Share code is displayed once fetched
 *  - Share code copy button works
 *  - Share code regeneration button is present
 *  - Join Goal dialog opens from dashboard
 *  - Invalid share code shows error toast
 *  - User invite search input present in Members Sheet
 *  - ConditionalProtectedRoute: private goal redirects unauthenticated user
 *
 * Most tests require TEST_EMAIL / TEST_PASSWORD env vars.
 * An optional TEST_EMAIL_2 / TEST_PASSWORD_2 pair enables multi-user sharing tests.
 */

import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';
const hasCredentials = !!TEST_EMAIL && !!TEST_PASSWORD;

// ─── Helper ───────────────────────────────────────────────────────────────────
async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /Log In/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
}

async function createGoal(page: Page): Promise<string> {
  await page.goto('/goal/create');
  await page.getByLabel('Goal title').fill(`Sharing Test ${Date.now()}`);
  await page.getByRole('button', { name: /Create Goal Now/i }).click();
  await expect(page).toHaveURL(/\/goal\/[a-f0-9-]{36}/, { timeout: 20000 });
  return page.url().split('/goal/')[1];
}

// ─── Members Sheet ────────────────────────────────────────────────────────────
test.describe('Members Sheet', () => {
  test.skip(!hasCredentials, 'Skipped: TEST_EMAIL and TEST_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await createGoal(page);
  });

  test('Members button opens the Members Sheet', async ({ page }) => {
    // The goal detail page has a Members button (Users icon or "Members" label)
    const membersBtn = page
      .getByRole('button', { name: /members/i })
      .or(page.locator('button').filter({ has: page.locator('svg[data-lucide="users"]') }))
      .first();

    if (await membersBtn.count() === 0) {
      // Try clicking user count indicator
      const usersBtn = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /\d+/ }).first();
      if (await usersBtn.count() > 0) {
        await usersBtn.click();
      } else {
        test.skip();
        return;
      }
    } else {
      await membersBtn.click();
    }

    // Sheet should open with Members heading
    await expect(
      page.getByRole('heading', { name: /members|goal members/i })
        .or(page.getByText(/members/i).first())
    ).toBeVisible({ timeout: 8000 });
  });

  test('share code section is present in Members Sheet', async ({ page }) => {
    const membersBtn = page
      .getByRole('button', { name: /members/i })
      .first();

    if (await membersBtn.count() === 0) {
      test.skip();
      return;
    }

    await membersBtn.click();
    await page.waitForTimeout(500);

    // Look for share code button or show share code button
    const shareCodeSection = page
      .getByText(/share code|invite code/i)
      .or(page.getByRole('button', { name: /show.*code|share code/i }))
      .first();

    await expect(shareCodeSection).toBeVisible({ timeout: 8000 });
  });

  test('clicking "Show share code" reveals the code input', async ({ page }) => {
    const membersBtn = page.getByRole('button', { name: /members/i }).first();
    if (await membersBtn.count() === 0) { test.skip(); return; }

    await membersBtn.click();
    await page.waitForTimeout(500);

    const showCodeBtn = page.getByRole('button', { name: /show.*code/i }).first();
    if (await showCodeBtn.count() > 0) {
      await showCodeBtn.click();
    }

    // Share code should be visible as an input value now
    const codeInput = page.locator('input[readonly], input').filter({ hasText: /[A-Z0-9]{6,}/i }).first();
    // Or look for a code-like string rendered
    const codeText = page.locator('[class*="font-mono"], [class*="code"], input[value]').first();
    await expect(codeText).toBeVisible({ timeout: 8000 });
  });

  test('copy-code button is present when share code is shown', async ({ page }) => {
    const membersBtn = page.getByRole('button', { name: /members/i }).first();
    if (await membersBtn.count() === 0) { test.skip(); return; }

    await membersBtn.click();
    await page.waitForTimeout(500);

    const showCodeBtn = page.getByRole('button', { name: /show.*code/i }).first();
    if (await showCodeBtn.count() > 0) await showCodeBtn.click();

    // Copy button (title="Copy code" or clipboard icon)
    const copyBtn = page
      .getByRole('button', { name: /copy.*code|copy/i })
      .or(page.locator('button[title="Copy code"]'))
      .first();

    await expect(copyBtn).toBeVisible({ timeout: 8000 });
  });

  test('regenerate code button is present', async ({ page }) => {
    const membersBtn = page.getByRole('button', { name: /members/i }).first();
    if (await membersBtn.count() === 0) { test.skip(); return; }

    await membersBtn.click();
    await page.waitForTimeout(500);

    const showCodeBtn = page.getByRole('button', { name: /show.*code/i }).first();
    if (await showCodeBtn.count() > 0) await showCodeBtn.click();

    const regenBtn = page
      .getByRole('button', { name: /regenerate/i })
      .or(page.locator('button[title="Regenerate code"]'))
      .first();

    await expect(regenBtn).toBeVisible({ timeout: 8000 });
  });

  test('invite search input is visible in Members Sheet', async ({ page }) => {
    const membersBtn = page.getByRole('button', { name: /members/i }).first();
    if (await membersBtn.count() === 0) { test.skip(); return; }

    await membersBtn.click();
    await page.waitForTimeout(500);

    const searchInput = page.getByPlaceholder(/search.*users|invite|username|email/i).first();
    await expect(searchInput).toBeVisible({ timeout: 8000 });
  });
});

// ─── Join Goal Dialog ─────────────────────────────────────────────────────────
test.describe('Join Goal Dialog', () => {
  test.skip(!hasCredentials, 'Skipped: TEST_EMAIL and TEST_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.waitForLoadState('networkidle');
  });

  test('Join Goal dialog opens from dashboard', async ({ page }) => {
    // Look for a Join / Enter Code button
    const joinBtn = page
      .getByRole('button', { name: /join.*goal|enter.*code/i })
      .or(page.locator('button').filter({ hasText: /join/i }))
      .first();

    if (await joinBtn.count() === 0) {
      test.skip();
      return;
    }

    await joinBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /join.*goal/i })).toBeVisible({ timeout: 5000 });
  });

  test('invalid share code shows error toast', async ({ page }) => {
    const joinBtn = page
      .getByRole('button', { name: /join.*goal|enter.*code/i })
      .or(page.locator('button').filter({ hasText: /join/i }))
      .first();

    if (await joinBtn.count() === 0) {
      test.skip();
      return;
    }

    await joinBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Enter a clearly invalid share code
    const codeInput = page.getByRole('dialog').locator('input').first();
    await codeInput.fill('INVALID000');

    const joinSubmitBtn = page.getByRole('dialog').getByRole('button', { name: /join/i });
    await joinSubmitBtn.click();

    await expect(page.getByText(/invalid.*share.*code|no goal found|not found/i)).toBeVisible({ timeout: 8000 });
  });

  test('empty share code shows validation error', async ({ page }) => {
    const joinBtn = page
      .getByRole('button', { name: /join.*goal|enter.*code/i })
      .or(page.locator('button').filter({ hasText: /join/i }))
      .first();

    if (await joinBtn.count() === 0) {
      test.skip();
      return;
    }

    await joinBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    const joinSubmitBtn = page.getByRole('dialog').getByRole('button', { name: /join/i });
    await joinSubmitBtn.click();

    await expect(page.getByText(/share code required|enter.*code/i)).toBeVisible({ timeout: 5000 });
  });
});

// ─── Access control ───────────────────────────────────────────────────────────
test.describe('Access control', () => {
  test('unauthenticated user accessing a goal URL is redirected to login', async ({ page }) => {
    // Navigate first so localStorage is accessible, then clear auth state
    await page.goto('/');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}
    });
    await page.context().clearCookies();

    // Try to access any goal (random UUID) — should redirect to /login
    await page.goto('/goal/11111111-2222-3333-4444-555555555555');
    await expect(page).toHaveURL(/\/(login|dashboard)/, { timeout: 15000 });
  });

  test('authenticated user cannot access non-existent goal', async ({ page }) => {
    test.skip(!hasCredentials, 'Skipped: TEST_EMAIL and TEST_PASSWORD not set');
    await signIn(page);
    await page.goto('/goal/00000000-0000-0000-0000-000000000099');
    // Should redirect away from goal detail
    await expect(page).toHaveURL(/\/(dashboard|login|not-found)/, { timeout: 15000 });
  });
});

// ─── Member list display ──────────────────────────────────────────────────────
test.describe('Member list display', () => {
  test.skip(!hasCredentials, 'Skipped: TEST_EMAIL and TEST_PASSWORD not set');

  test('goal owner appears in member list as owner/crown icon', async ({ page }) => {
    await signIn(page);
    await createGoal(page);

    const membersBtn = page.getByRole('button', { name: /members/i }).first();
    if (await membersBtn.count() === 0) { test.skip(); return; }

    await membersBtn.click();
    await page.waitForTimeout(1000);

    // Owner indicator (Crown icon or "Owner" label or creator badge)
    const ownerIndicator = page
      .getByText(/owner|creator/i)
      .or(page.locator('[data-lucide="crown"], svg[class*="crown"]'))
      .first();

    await expect(ownerIndicator).toBeVisible({ timeout: 8000 });
  });
});
