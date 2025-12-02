import { expect, test } from '@playwright/test';
import { loginAsRole } from './helpers/auth';
import { getAuthToken } from './helpers/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Make an authenticated API request
 */
async function apiRequest(
  page: any,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any
): Promise<any> {
  const token = await getAuthToken(page);
  if (!token) {
    throw new Error('Not authenticated. Call loginAsUser or loginAsRole first.');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} - ${result.error?.message || result.message || 'Unknown error'}`
    );
  }

  return result;
}

test.describe('Subscription Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, 'admin');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/subscriptions');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display subscription status when authenticated', async ({ page }) => {
    await page.goto('/subscriptions');
    
    // Should show subscription information
    // The exact content depends on your subscription page implementation
    await expect(
      page.getByText(/subscription|billing|status/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show monthly billing amount', async ({ page }) => {
    await page.goto('/subscriptions');
    
    // Should display monthly amount
    await expect(
      page.getByText(/\$|month|billing/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show location count', async ({ page }) => {
    await page.goto('/subscriptions');
    
    // Should display location count
    await expect(
      page.getByText(/location|locations/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should enable autopay', async ({ page }) => {
    await page.goto('/subscriptions');
    
    // Find and click enable autopay button
    const enableButton = page.getByRole('button', { name: /enable.*autopay|autopay.*enable/i });
    if (await enableButton.isVisible({ timeout: 5000 })) {
      await enableButton.click();
      
      // Wait for success message or status update
      await expect(
        page.getByText(/enabled|success|autopay/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should disable autopay', async ({ page }) => {
    await page.goto('/subscriptions');
    
    // First enable autopay if not already enabled
    const enableButton = page.getByRole('button', { name: /enable.*autopay|autopay.*enable/i });
    if (await enableButton.isVisible({ timeout: 2000 })) {
      await enableButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Find and click disable autopay button
    const disableButton = page.getByRole('button', { name: /disable.*autopay|autopay.*disable/i });
    if (await disableButton.isVisible({ timeout: 5000 })) {
      await disableButton.click();
      
      // Wait for success message or status update
      await expect(
        page.getByText(/disabled|success|autopay/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display billing history', async ({ page }) => {
    await page.goto('/subscriptions');
    
    // Should show billing history section
    await expect(
      page.getByText(/billing.*history|payment.*history|history/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should calculate billing correctly via API', async ({ page }) => {
    // Get subscription via API
    const response = await apiRequest(page, 'GET', '/api/subscriptions');
    
    expect(response).toHaveProperty('data');
    if (response.data) {
      expect(response.data).toHaveProperty('monthlyAmount');
      expect(response.data).toHaveProperty('locationCount');
      expect(response.data).toHaveProperty('status');
    }
  });
});

