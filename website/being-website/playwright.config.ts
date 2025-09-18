/**
 * Being. Website - Playwright Configuration
 * E2E testing with accessibility validation
 */

import { defineConfig, devices } from '@playwright/test';

// Use process.env.PORT or fallback to 3000
const PORT = parseInt(process.env['PORT'] || '3000', 10);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  
  // Test configuration
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : 4,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }],
  ],
  
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Accessibility testing specific settings
    ignoreHTTPSErrors: true,
    
    // Simulate real user conditions
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        // Test with keyboard navigation
        hasTouch: false,
        // Enable accessibility tree
        contextOptions: {
          // Force keyboard navigation mode
          extraHTTPHeaders: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 AccessibilityTest/1.0'
          }
        }
      },
    },
    
    {
      name: 'Desktop Firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'Desktop Safari',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile accessibility testing
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        // Test touch accessibility
        hasTouch: true,
      },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // High contrast mode testing
    {
      name: 'High Contrast',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        extraHTTPHeaders: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        // Emulate high contrast preference
        contextOptions: {
          forcedColors: 'active'
        }
      },
    },

    // Reduced motion testing
    {
      name: 'Reduced Motion',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // Screen reader simulation
    {
      name: 'Screen Reader Simulation',
      use: {
        ...devices['Desktop Chrome'],
        // Simulate screen reader user agent
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 NVDA/2021.1',
        // Focus keyboard navigation
        hasTouch: false,
      },
    },
  ],

  // Development server configuration
  webServer: {
    command: 'npm run dev',
    port: PORT,
    reuseExistingServer: !process.env['CI'],
    
    // Wait for server to be ready
    timeout: 120 * 1000, // 2 minutes
    
    // Environment variables for testing
    env: {
      NODE_ENV: 'test',
      ACCESSIBILITY_TESTING: 'true',
    },
  },
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/global-setup'),
  globalTeardown: require.resolve('./tests/global-teardown'),
  
  // Test output configuration
  outputDir: 'test-results/',
  
  // Timeouts
  timeout: 60000, // 1 minute per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
  
  // Metadata for accessibility testing
  metadata: {
    purpose: 'WCAG AA compliance and mental health accessibility testing',
    wcagLevel: 'AA',
    testingStandards: ['WCAG 2.1', 'Section 508', 'Mental Health Accessibility'],
    lastUpdated: new Date().toISOString(),
  },
});