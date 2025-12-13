/**
 * CRISIS ACCESS E2E TESTS
 *
 * MAINT-119: Validates the 3-second crisis access requirement.
 *
 * CRITICAL SAFETY REQUIREMENT:
 * Users must be able to access crisis resources within 3 seconds
 * from ANY screen in the application.
 *
 * Test coverage:
 * - Home screen → Crisis Resources
 * - Learn tab → Crisis Resources
 * - Insights tab → Crisis Resources
 * - Profile tab → Crisis Resources
 *
 * Each test:
 * 1. Navigates to the source screen
 * 2. Measures time from tap to crisis screen visible
 * 3. Asserts time is under 3000ms
 * 4. Logs results for trend analysis
 */

import { device, expect, element, by } from 'detox';
import {
  TEST_IDS,
  TAB_LABELS,
  assertCrisisAccessTime,
  waitForHomeScreen,
  navigateToTab,
} from './setup';

describe('Crisis Access <3s Validation', () => {
  beforeAll(async () => {
    // Launch fresh and complete onboarding once for the entire suite
    await device.launchApp({ newInstance: true });
    await waitForHomeScreen();
    console.log('[CRISIS-ACCESS] Setup complete - home screen visible');
  });

  beforeEach(async () => {
    // Relaunch without clearing data to preserve onboarding state
    await device.launchApp({ newInstance: false });
    // Wait for app to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if we're on crisis resources screen (from previous test)
    try {
      await expect(element(by.id(TEST_IDS.CRISIS_RESOURCES_SCREEN))).toBeVisible();
      // We're on crisis screen - try to go back using React Navigation back button
      try {
        // React Navigation default back button accessibility label
        await element(by.label('Go back')).tap();
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {
        // Try alternative back button labels
        try {
          await element(by.label('Back')).tap();
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch {
          // If no back button, try navigating to Home (tabs might be visible now)
          console.log('[SETUP] No back button found, trying tab navigation');
        }
      }
    } catch {
      // Not on crisis screen, continue
    }

    // Ensure we're on home screen
    try {
      await expect(element(by.id(TEST_IDS.HOME_SCREEN))).toBeVisible();
    } catch {
      // Try to navigate to home
      await navigateToTab(TAB_LABELS.HOME);
    }
  });

  afterAll(async () => {
    // Final summary log
    console.log('[CRISIS-ACCESS] E2E Test Suite Complete');
  });

  describe('Home Screen', () => {
    it('should access crisis resources within 3 seconds from Home', async () => {
      // Verify we're on home screen
      await expect(element(by.id(TEST_IDS.HOME_SCREEN))).toBeVisible();

      // Record start time
      const startTime = Date.now();

      // Tap the crisis button
      await element(by.id(TEST_IDS.CRISIS_BUTTON_HOME)).tap();

      // Wait for crisis resources screen
      await expect(element(by.id(TEST_IDS.CRISIS_RESOURCES_SCREEN))).toBeVisible();

      // Calculate and validate time (throws if over threshold)
      const accessTime = Date.now() - startTime;
      assertCrisisAccessTime(accessTime, 'Home Screen');
    });
  });

  describe('Tab Navigation', () => {
    it('should access crisis resources within 3 seconds from Learn tab', async () => {
      // Navigate to Learn tab
      await navigateToTab(TAB_LABELS.LEARN);
      await expect(element(by.id(TEST_IDS.LEARN_SCREEN))).toBeVisible();

      const startTime = Date.now();

      // Tap crisis button
      await element(by.id(TEST_IDS.CRISIS_BUTTON_LEARN)).tap();

      await expect(element(by.id(TEST_IDS.CRISIS_RESOURCES_SCREEN))).toBeVisible();

      const accessTime = Date.now() - startTime;
      assertCrisisAccessTime(accessTime, 'Learn Tab');
    });

    it('should access crisis resources within 3 seconds from Insights tab', async () => {
      // Navigate to Insights tab
      await navigateToTab(TAB_LABELS.INSIGHTS);
      // Wait for screen to render
      await new Promise(resolve => setTimeout(resolve, 500));
      await expect(element(by.id(TEST_IDS.INSIGHTS_SCREEN))).toBeVisible();

      const startTime = Date.now();

      await element(by.id(TEST_IDS.CRISIS_BUTTON_INSIGHTS)).tap();

      await expect(element(by.id(TEST_IDS.CRISIS_RESOURCES_SCREEN))).toBeVisible();

      const accessTime = Date.now() - startTime;
      assertCrisisAccessTime(accessTime, 'Insights Tab');
    });

    it('should access crisis resources within 3 seconds from Profile tab', async () => {
      // Navigate to Profile tab
      await navigateToTab(TAB_LABELS.PROFILE);
      await expect(element(by.id(TEST_IDS.PROFILE_SCREEN))).toBeVisible();

      const startTime = Date.now();

      await element(by.id(TEST_IDS.CRISIS_BUTTON_PROFILE)).tap();

      await expect(element(by.id(TEST_IDS.CRISIS_RESOURCES_SCREEN))).toBeVisible();

      const accessTime = Date.now() - startTime;
      assertCrisisAccessTime(accessTime, 'Profile Tab');
    });
  });

  describe('Performance Regression', () => {
    it('should maintain consistent access times across multiple attempts', async () => {
      // Ensure we start on home screen
      await expect(element(by.id(TEST_IDS.HOME_SCREEN))).toBeVisible();

      const iterations = 3;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await element(by.id(TEST_IDS.CRISIS_BUTTON_HOME)).tap();
        await expect(element(by.id(TEST_IDS.CRISIS_RESOURCES_SCREEN))).toBeVisible();
        times.push(Date.now() - startTime);

        // Go back using React Navigation back button (tabs hidden on crisis screen)
        try {
          await element(by.label('Go back')).tap();
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch {
          try {
            await element(by.label('Back')).tap();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch {
            console.log(`[CRISIS-ACCESS] Could not find back button on iteration ${i + 1}`);
          }
        }
        await expect(element(by.id(TEST_IDS.HOME_SCREEN))).toBeVisible();
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`[CRISIS-ACCESS] Average access time over ${iterations} iterations: ${avgTime}ms`);

      // Validate all iterations (assertCrisisAccessTime throws if over threshold)
      times.forEach((time, index) => {
        console.log(`[CRISIS-ACCESS] Iteration ${index + 1}: ${time}ms`);
        assertCrisisAccessTime(time, `Home Screen (iteration ${index + 1})`);
      });
    });
  });
});
