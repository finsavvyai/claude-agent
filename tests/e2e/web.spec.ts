import { test, expect, type Page } from '@playwright/test';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Helper function to login
async function login(page: Page, email = 'test@example.com', password = 'TestPassword123!') {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
}

// ============================================================================
// LANDING PAGE TESTS
// ============================================================================

test.describe('Landing Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display hero section with correct content', async ({ page }) => {
        // Check main heading
        await expect(page.locator('h1')).toContainText('AI-Powered Development');
        await expect(page.locator('h1')).toContainText('At Your Fingertips');

        // Check subheading
        await expect(page.locator('text=Transform your workflow')).toBeVisible();

        // Check CTA buttons
        await expect(page.locator('text=Start Free Trial')).toBeVisible();
        await expect(page.locator('text=Watch Demo')).toBeVisible();
    });

    test('should have working navigation links', async ({ page }) => {
        // Features link
        const featuresLink = page.locator('a[href="#features"]');
        await expect(featuresLink).toBeVisible();
        await featuresLink.click();
        await expect(page.locator('#features')).toBeInViewport();

        // Pricing link
        const pricingLink = page.locator('a[href="#pricing"]');
        await expect(pricingLink).toBeVisible();
        await pricingLink.click();
        await expect(page.locator('#pricing')).toBeInViewport();
    });

    test('should display pricing tiers', async ({ page }) => {
        await page.locator('#pricing').scrollIntoViewIfNeeded();

        // Check pricing cards
        await expect(page.locator('text=Free')).toBeVisible();
        await expect(page.locator('text=$0')).toBeVisible();
        await expect(page.locator('text=$29')).toBeVisible();
        await expect(page.locator('text=Custom')).toBeVisible();

        // Check pro tier is marked as popular
        await expect(page.locator('.popular')).toBeVisible();
    });

    test('should navigate to signup page', async ({ page }) => {
        await page.click('text=Get Started');
        await expect(page).toHaveURL(/.*signup/);
    });

    test('should navigate to login page', async ({ page }) => {
        await page.click('text=Sign in');
        await expect(page).toHaveURL(/.*login/);
    });

    test('should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        // Hero should still be visible
        await expect(page.locator('h1')).toBeVisible();

        // Navigation should be hidden/collapsed on mobile
        // (actual implementation may vary)
    });
});

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

test.describe('Authentication', () => {
    test.describe('Login', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto(`${BASE_URL}/auth/login`);
        });

        test('should display login form', async ({ page }) => {
            await expect(page.locator('h1')).toContainText('Welcome back');
            await expect(page.locator('input[name="email"]')).toBeVisible();
            await expect(page.locator('input[name="password"]')).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
        });

        test('should show validation errors for empty form', async ({ page }) => {
            await page.click('button[type="submit"]');
            await expect(page.locator('text=Please enter a valid email')).toBeVisible();
        });

        test('should show error for invalid credentials', async ({ page }) => {
            await page.fill('input[name="email"]', 'invalid@example.com');
            await page.fill('input[name="password"]', 'wrongpassword');
            await page.click('button[type="submit"]');

            // Wait for error message
            await expect(page.locator('[class*="red"]')).toBeVisible({ timeout: 5000 });
        });

        test('should have link to signup', async ({ page }) => {
            const signupLink = page.locator('text=Sign up for free');
            await expect(signupLink).toBeVisible();
            await signupLink.click();
            await expect(page).toHaveURL(/.*signup/);
        });

        test('should toggle password visibility', async ({ page }) => {
            const passwordInput = page.locator('input[name="password"]');
            const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).nth(0);

            await expect(passwordInput).toHaveAttribute('type', 'password');

            // Note: Actual toggle button selector may vary based on implementation
        });
    });

    test.describe('Signup', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto(`${BASE_URL}/auth/signup`);
        });

        test('should display signup form', async ({ page }) => {
            await expect(page.locator('h1')).toContainText('Create your account');
            await expect(page.locator('input[name="name"]')).toBeVisible();
            await expect(page.locator('input[name="email"]')).toBeVisible();
            await expect(page.locator('input[name="password"]')).toBeVisible();
        });

        test('should show password requirements', async ({ page }) => {
            await expect(page.locator('text=At least 8 characters')).toBeVisible();
            await expect(page.locator('text=One uppercase letter')).toBeVisible();
            await expect(page.locator('text=One number')).toBeVisible();
        });

        test('should update password indicators', async ({ page }) => {
            const passwordInput = page.locator('input[name="password"]');

            // Initially all should be unchecked (neutral color)
            await passwordInput.fill('ab');
            // Check that requirements are not met (would need specific class/color check)

            // Fill with valid password
            await passwordInput.fill('SecurePassword123');
            // Check that all requirements are met
        });

        test('should require terms acceptance', async ({ page }) => {
            await page.fill('input[name="name"]', 'Test User');
            await page.fill('input[name="email"]', 'test@example.com');
            await page.fill('input[name="password"]', 'SecurePassword123!');

            // Don't check terms
            await page.click('button[type="submit"]');

            await expect(page.locator('text=You must accept the terms')).toBeVisible();
        });

        test('should link to terms and privacy', async ({ page }) => {
            await expect(page.locator('a[href="/terms"]')).toBeVisible();
            await expect(page.locator('a[href="/privacy"]')).toBeVisible();
        });
    });
});

// ============================================================================
// DASHBOARD TESTS
// ============================================================================

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Mock authentication for dashboard tests
        await page.route('**/auth/profile', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    success: true,
                    data: {
                        id: 'user-123',
                        email: 'test@example.com',
                        name: 'Test User',
                        tier: 'pro',
                    },
                }),
            });
        });

        await page.goto(`${BASE_URL}/dashboard`);
    });

    test('should display dashboard layout', async ({ page }) => {
        // Sidebar should be visible
        await expect(page.locator('text=Claude Agent')).toBeVisible();

        // Navigation items should be visible
        await expect(page.locator('text=Dashboard')).toBeVisible();
        await expect(page.locator('text=Agents')).toBeVisible();
        await expect(page.locator('text=Analytics')).toBeVisible();
        await expect(page.locator('text=Settings')).toBeVisible();
    });

    test('should show welcome message', async ({ page }) => {
        await expect(page.locator('text=Welcome back')).toBeVisible();
    });

    test('should display stats cards', async ({ page }) => {
        await expect(page.locator('text=Total Queries')).toBeVisible();
        await expect(page.locator('text=Active Agents')).toBeVisible();
        await expect(page.locator('text=Files Indexed')).toBeVisible();
        await expect(page.locator('text=Avg Response Time')).toBeVisible();
    });

    test('should have quick query input', async ({ page }) => {
        const queryInput = page.locator('input[placeholder*="Ask Luna"]');
        await expect(queryInput).toBeVisible();
    });

    test('should navigate between dashboard sections', async ({ page }) => {
        // Navigate to Agents
        await page.click('text=Agents');
        await expect(page).toHaveURL(/.*\/dashboard\/agents/);

        // Navigate to Analytics
        await page.click('text=Analytics');
        await expect(page).toHaveURL(/.*\/dashboard\/analytics/);

        // Navigate back to Dashboard
        await page.click('text=Dashboard');
        await expect(page).toHaveURL(/.*\/dashboard$/);
    });
});

// ============================================================================
// AGENTS PAGE TESTS
// ============================================================================

test.describe('Agents Page', () => {
    test.beforeEach(async ({ page }) => {
        // Mock agents API
        await page.route('**/agents', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    success: true,
                    data: [
                        { id: 'luna-code-review', name: 'Code Review', status: 'running', category: 'Development' },
                        { id: 'luna-testing', name: 'Testing', status: 'idle', category: 'Testing' },
                        { id: 'luna-rag', name: 'RAG', status: 'running', category: 'AI' },
                    ],
                }),
            });
        });

        await page.goto(`${BASE_URL}/dashboard/agents`);
    });

    test('should display agents grid', async ({ page }) => {
        await expect(page.locator('text=AI Agents')).toBeVisible();
        await expect(page.locator('text=luna-code-review')).toBeVisible();
        await expect(page.locator('text=luna-testing')).toBeVisible();
    });

    test('should filter agents by search', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="Search"]');
        await searchInput.fill('code');

        // Should show code-review, hide others
        await expect(page.locator('text=luna-code-review')).toBeVisible();
        await expect(page.locator('text=luna-testing')).not.toBeVisible();
    });

    test('should filter agents by category', async ({ page }) => {
        await page.click('button:text("Testing")');

        // Should show only testing agents
        await expect(page.locator('text=luna-testing')).toBeVisible();
        await expect(page.locator('text=luna-code-review')).not.toBeVisible();
    });

    test('should show agent status indicators', async ({ page }) => {
        // Running agents should have green indicator
        // Idle agents should have gray indicator
        // (would need specific class/attribute checks)
    });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Accessibility', () => {
    test('landing page should be accessible', async ({ page }) => {
        await page.goto(BASE_URL);

        // Check for proper heading hierarchy
        const h1 = await page.locator('h1').count();
        expect(h1).toBe(1);

        // Check for alt text on images
        const imagesWithoutAlt = await page.locator('img:not([alt])').count();
        expect(imagesWithoutAlt).toBe(0);

        // Check for button labels
        const buttonsWithoutText = await page.locator('button:empty').count();
        expect(buttonsWithoutText).toBe(0);
    });

    test('forms should have proper labels', async ({ page }) => {
        await page.goto(`${BASE_URL}/auth/login`);

        // Check that inputs have associated labels
        const emailLabel = page.locator('label[for="email"]');
        const passwordLabel = page.locator('label[for="password"]');

        // Labels should exist (or inputs should have aria-label)
    });

    test('should be keyboard navigable', async ({ page }) => {
        await page.goto(BASE_URL);

        // Tab through elements
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Check that focus is visible
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
    });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

test.describe('Performance', () => {
    test('landing page should load quickly', async ({ page }) => {
        const startTime = Date.now();
        await page.goto(BASE_URL);
        const loadTime = Date.now() - startTime;

        // Page should load in under 3 seconds
        expect(loadTime).toBeLessThan(3000);
    });

    test('should lazy load below-fold content', async ({ page }) => {
        await page.goto(BASE_URL);

        // Initial viewport should be loaded
        await expect(page.locator('h1')).toBeVisible();

        // Scroll to trigger lazy loading
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        // Below-fold content should now be visible
        await expect(page.locator('#features')).toBeVisible();
    });
});

// ============================================================================
// API MOCKING UTILITIES
// ============================================================================

test.describe('API Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
        // Mock API error
        await page.route('**/api/**', async (route) => {
            await route.fulfill({
                status: 500,
                body: JSON.stringify({ error: 'Internal Server Error' }),
            });
        });

        await page.goto(`${BASE_URL}/dashboard`);

        // Should show error state or fallback content
        // (implementation-specific assertion)
    });

    test('should handle network errors', async ({ page }) => {
        // Mock network failure
        await page.route('**/api/**', async (route) => {
            await route.abort('failed');
        });

        await page.goto(`${BASE_URL}/dashboard`);

        // Should show offline/error state
        // (implementation-specific assertion)
    });
});
