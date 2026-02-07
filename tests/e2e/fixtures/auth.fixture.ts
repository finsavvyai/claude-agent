/**
 * Authentication fixtures for E2E tests
 */

import { test as base, expect } from '@playwright/test';
import { Page } from '@playwright/test';

// Define custom fixture types
type AuthFixtures = {
  authenticatedPage: Page;
  authenticatedUser: {
    id: string;
    email: string;
    name: string;
    token: string;
  };
  testUser: {
    email: string;
    password: string;
    name: string;
  };
};

// Extend base test with custom fixtures
export const test = base.extend<AuthFixtures>({
  // Test user credentials
  testUser: [
    async ({}, use) => {
      const user = {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test User',
      };
      await use(user);
    },
    { scope: 'test' },
  ],

  // Authenticated user
  authenticatedUser: [
    async ({ testUser, page }, use) => {
      // Register user
      const registerResponse = await page.post('/api/auth/register', {
        data: {
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        },
      });

      expect(registerResponse.ok()).toBeTruthy();

      const registerData = await registerResponse.json();

      // Login user
      const loginResponse = await page.post('/api/auth/login', {
        data: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      expect(loginResponse.ok()).toBeTruthy();

      const loginData = await loginResponse.json();

      const user = {
        id: registerData.user.id,
        email: testUser.email,
        name: testUser.name,
        token: loginData.token,
      };

      await use(user);
    },
    { scope: 'test' },
  ],

  // Authenticated page
  authenticatedPage: [
    async ({ page, authenticatedUser }, use) => {
      // Set authorization header for API requests
      await page.route('**/api/**', async (route) => {
        const headers = route.request().headers();
        headers['authorization'] = `Bearer ${authenticatedUser.token}`;
        await route.continue({ headers });
      });

      // Store token in local storage for client-side usage
      await page.goto('/login');
      await page.evaluate(({ token }) => {
        localStorage.setItem('auth_token', token);
      }, { token: authenticatedUser.token });

      await use(page);
    },
    { scope: 'test' },
  ],
});

// Export expect from extended test
export { expect };
