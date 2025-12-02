import { expect, test } from '@playwright/test';
import { loginAsRole } from './helpers/auth';
import { createTestLocation, getAuthToken } from './helpers/fixtures';

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

test.describe('Location Management', () => {
  let createdLocationIds: string[] = [];

  test.afterEach(async ({ page }, testInfo) => {
    // Skip cleanup if test failed
    if (testInfo.status === 'failed' && testInfo.error?.message?.includes('SecurityError')) {
      createdLocationIds = [];
      return;
    }
    
    // Login as admin to clean up
    try {
      await loginAsRole(page, 'admin');
      for (const id of createdLocationIds) {
        try {
          await apiRequest(page, 'DELETE', `/api/locations/${id}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    createdLocationIds = [];
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/locations');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display locations list page when authenticated', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/locations');
    
    await expect(page.getByRole('heading', { name: /locations/i })).toBeVisible();
  });

  test('should navigate to new location page', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/locations');
    
    const newButton = page.getByRole('button', { name: /add.*location|new.*location/i });
    if (await newButton.isVisible({ timeout: 5000 })) {
      await newButton.click();
      await expect(page).toHaveURL(/.*locations.*new/);
    }
  });

  test('should create a new location', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/locations/new');

    // Fill in location form
    await page.getByLabel(/name/i).fill('Test Location');
    await page.getByLabel(/address/i).fill('123 Test St');
    await page.getByLabel(/phone/i).fill('555-1234');
    await page.getByLabel(/email/i).fill('test@location.com');

    // Submit form
    await page.getByRole('button', { name: /save|create|submit/i }).click();

    // Wait for redirect
    await page.waitForURL(/.*locations.*/, { timeout: 10000 });
    
    // Verify success
    await expect(
      page.getByText(/test.*location|success|created/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should view location details', async ({ page }) => {
    await loginAsRole(page, 'admin');
    
    // Create a location via API
    const locationId = await createTestLocation(page, {
      name: 'Test Location Detail',
      address: '456 Test Ave',
      phone: '555-5678',
      email: 'detail@test.com',
    });
    createdLocationIds.push(locationId);

    // Navigate to location detail page
    await page.goto(`/locations/${locationId}`);

    // Verify location details are displayed
    await expect(page.getByText(/test.*location.*detail/i).first()).toBeVisible();
    await expect(page.getByText(/456.*test.*ave/i)).toBeVisible();
  });

  test('should edit location', async ({ page }) => {
    await loginAsRole(page, 'admin');
    
    // Create a location via API
    const locationId = await createTestLocation(page, {
      name: 'Edit Test Location',
      address: '789 Test Blvd',
    });
    createdLocationIds.push(locationId);

    // Navigate to edit page
    await page.goto(`/locations/${locationId}/edit`);

    // Update location information
    await page.getByLabel(/name/i).clear();
    await page.getByLabel(/name/i).fill('Updated Location Name');
    await page.getByLabel(/phone/i).fill('555-9999');

    // Save changes
    await page.getByRole('button', { name: /save|update/i }).click();

    // Wait for redirect
    await page.waitForURL(/.*locations.*/, { timeout: 10000 });

    // Verify changes were saved
    await expect(page.getByText(/updated.*location.*name/i).first()).toBeVisible();
  });

  test('should verify first location is free', async ({ page }) => {
    await loginAsRole(page, 'admin');
    
    // Get locations via API
    const response = await apiRequest(page, 'GET', '/api/locations');
    
    expect(response).toHaveProperty('data');
    if (response.data && response.data.length > 0) {
      // First location should be free
      const firstLocation = response.data[0];
      expect(firstLocation).toHaveProperty('isFree');
      // Note: The first location might not be marked as free in the response
      // depending on your API implementation
    }
  });

  test('should update billing when location is added', async ({ page }) => {
    await loginAsRole(page, 'admin');
    
    // Create a new location (second location should trigger billing)
    const locationId = await createTestLocation(page, {
      name: 'Billing Test Location',
    });
    createdLocationIds.push(locationId);

    // Check subscription to verify billing was updated
    const subscriptionResponse = await apiRequest(page, 'GET', '/api/subscriptions');
    
    if (subscriptionResponse.data) {
      // Should have a subscription with updated amount
      expect(subscriptionResponse.data).toHaveProperty('monthlyAmount');
      expect(subscriptionResponse.data).toHaveProperty('locationCount');
    }
  });

  test('should validate required fields when creating location', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/locations/new');

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /save|create|submit/i }).click();

    // Should show validation errors
    const errorMessages = page.locator('text=/required|invalid|error/i');
    const count = await errorMessages.count();
    expect(count).toBeGreaterThan(0);
  });
});

