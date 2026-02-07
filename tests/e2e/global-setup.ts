/**
 * Global setup for Playwright E2E tests
 * Runs once before all E2E test suites
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Setting up E2E test environment...');

  const baseURL = config.webServer?.[0]?.port
    ? `http://localhost:${config.webServer[0].port}`
    : process.env.BASE_URL || 'http://localhost:3000';

  const apiURL = config.webServer?.[1]?.port
    ? `http://localhost:${config.webServer[1].port}`
    : process.env.API_URL || 'http://localhost:3001';

  console.log(`Web UI: ${baseURL}`);
  console.log(`API: ${apiURL}`);

  // Wait for services to be ready
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for web UI to be ready
    console.log('Waiting for web UI to be ready...');
    await page.goto(baseURL, { waitUntil: 'networkidle' });

    // Wait for API to be ready
    console.log('Waiting for API to be ready...');
    const apiResponse = await page.fetch(`${apiURL}/health`);
    if (!apiResponse.ok()) {
      throw new Error(`API health check failed: ${apiResponse.status()}`);
    }

    console.log('E2E test environment ready');

  } catch (error) {
    console.error('Failed to setup E2E test environment:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  // Store URLs for tests
  process.env.E2E_BASE_URL = baseURL;
  process.env.E2E_API_URL = apiURL;
}

export default globalSetup;
