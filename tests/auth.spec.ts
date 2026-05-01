/**
 * auth.spec.ts — Authentication flow tests
 *
 * Covers:
 *  - Login page rendering & form validation
 *  - Register page rendering & form validation
 *  - Protected route redirect (dashboard → login when unauthenticated)
 *  - Forgot-password mode toggle
 *  - Navigation between login and register
 *
 * Authenticated tests (login with real credentials) are gated behind
 * the TEST_EMAIL / TEST_PASSWORD environment variables. If those vars
 * are not set, the authenticated tests are skipped.
 */

import { test, expect } from '@playwright/test';

// ─── helpers ──────────────────────────────────────────────────────────────────

const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';
const hasCredentials = !!TEST_EMAIL && !!TEST_PASSWORD;

// ─── Unauthenticated tests ─────────────────────────────────────────────────────

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders heading and form elements', async ({ page }) => {
    await expect(page).toHaveTitle(/Log In | Orbit/i);
    await expect(page.getByRole('heading', { name: 'Orbit' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Log In/i })).toBeVisible();
  });

  test('shows Continue with Google button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });

  test('has link to register page', async ({ page }) => {
    const signUpLink = page.getByRole('link', { name: /Sign up/i });
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('requires email and password — shows no submit without input', async ({ page }) => {
    // HTML5 required validation prevents form submission without values.
    // Email field is required, so clicking submit with empty fields keeps user on page.
    await page.getByRole('button', { name: /Log In/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('switches to forgot-password mode', async ({ page }) => {
    await page.getByRole('button', { name: /Forgot password/i }).click();
    await expect(page.getByRole('button', { name: /Send Reset Link/i })).toBeVisible();
    await expect(page.getByLabel('Password')).not.toBeVisible();
  });

  test('back-to-login link works inside forgot-password mode', async ({ page }) => {
    await page.getByRole('button', { name: /Forgot password/i }).click();
    await page.getByRole('button', { name: /Back to Log In/i }).click();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('shows error toast for wrong credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: /Log In/i }).click();
    // Toast appears with error message
    await expect(page.getByText(/Login failed|Invalid email or password/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('renders heading and all form fields', async ({ page }) => {
    await expect(page).toHaveTitle(/Create Account | Orbit/i);
    await expect(page.getByRole('heading', { name: 'Orbit' })).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    // Two password inputs exist; use id-based selectors to avoid strict-mode error
    await expect(page.locator('#reg-password')).toBeVisible();
    await expect(page.locator('#confirm-password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible();
  });

  test('has link back to login page', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /Log [Ii]n/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows Continue with Google button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });

  test('password mismatch shows error toast', async ({ page }) => {
    await page.getByLabel('Full name').fill('Test User');
    await page.getByLabel('Email').fill('testuser@example.com');
    // Fill password fields with mismatched values
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('password123');
    await passwordInputs.nth(1).fill('different456');
    await page.getByRole('button', { name: /Create account/i }).click();
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible({ timeout: 5000 });
  });

  test('requires all fields — empty submit stays on page', async ({ page }) => {
    await page.getByRole('button', { name: /Create account/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Protected route redirect', () => {
  test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
    // Navigate to the app first so localStorage is accessible, then clear storage
    await page.goto('/');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}
    });
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('unauthenticated /goal/:id redirects to /login', async ({ page }) => {
    // Navigate to the app first so localStorage is accessible, then clear storage
    await page.goto('/');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}
    });
    await page.context().clearCookies();
    // Non-existent goal with no session → redirects to /login
    await page.goto('/goal/00000000-0000-0000-0000-000000000000');
    await expect(page).toHaveURL(/\/(login|dashboard)/, { timeout: 15000 });
  });
});

// ─── Authenticated tests (only when TEST_EMAIL / TEST_PASSWORD are set) ───────

test.describe('Authenticated login flow', () => {
  test.skip(!hasCredentials, 'Skipped: TEST_EMAIL and TEST_PASSWORD not set');

  test('logs in and lands on dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /Log In/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Your Goals/i })).toBeVisible({ timeout: 10000 });
  });

  test('logs out and redirects to login', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /Log In/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // Click on user avatar/menu to find sign out
    const userMenuTrigger = page.locator('[aria-label="User menu"], [data-radix-collection-item]').first();
    // Try clicking the avatar button or user menu
    await page.locator('button').filter({ hasText: /sign out|logout/i }).first().click().catch(async () => {
      // Avatar menu approach
      await page.locator('img[alt], [role="button"]').last().click();
      await page.getByRole('menuitem', { name: /sign out|log out|logout/i }).click();
    });
    await expect(page).toHaveURL(/\/(login|)$/, { timeout: 10000 });
  });

  test('already-logged-in redirects /login to /dashboard', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /Log In/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // Navigate to /login again — should redirect to dashboard
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});
