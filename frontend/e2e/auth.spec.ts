import { expect, test } from '@playwright/test';
import { clearStorageWebKitSafe } from './helpers/webkit-workarounds';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    // Use WebKit-safe storage clearing
    await clearStorageWebKitSafe(page);
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('should show error on invalid login', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Should show error message - wait a bit longer and check for common error patterns
    // Error might be: "Invalid credentials", "Login failed", "Authentication failed", etc.
    await expect(
      page.getByText(/invalid|failed|error|credentials|authentication/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    
    // Click register link (text is "create a new account")
    await page.getByRole('link', { name: /create.*new.*account/i }).click();
    
    // Should be on register page
    await expect(page).toHaveURL(/.*register/);
  });

  test('should display register form', async ({ page }) => {
    await page.goto('/register');
    
    // Check for register form elements
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    // Use name attribute to target the specific password field (not confirmPassword)
    await expect(page.locator('input[type="password"][name="password"]')).toBeVisible();
    // Button text is "Create account" or "Creating account..."
    await expect(page.getByRole('button', { name: /create.*account/i })).toBeVisible();
  });
});





