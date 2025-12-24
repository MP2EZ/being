/**
 * E2E Test Setup
 *
 * Provides utilities for crisis access timing tests.
 * Critical requirement: Crisis accessible within 3 seconds from any screen.
 */

import { device, expect, element, by } from 'detox';

/**
 * Performance thresholds for crisis access (in milliseconds)
 */
export const CRISIS_ACCESS_THRESHOLDS = {
  /** Maximum time allowed to access crisis resources from any screen */
  MAX_ACCESS_TIME_MS: 3000,
  /** Target time for crisis button response */
  BUTTON_RESPONSE_MS: 200,
  /** Maximum navigation time */
  NAVIGATION_MS: 1000,
} as const;

/**
 * Timing constants for UI interactions
 */
export const TIMING = {
  /** Wait time for intro animation to complete (2s pause + 0.9s scroll + 0.4s fade) */
  INTRO_ANIMATION_MS: 4000,
  /** Wait time for tab content to load */
  TAB_LOAD_MS: 500,
  /** Wait time for navigation transitions */
  NAVIGATION_MS: 300,
} as const;

/**
 * Test IDs used across crisis access tests
 */
export const TEST_IDS = {
  // Crisis buttons - testID is appended with "-icon" for collapsed state
  // Each screen has its own testID for the crisis button
  CRISIS_BUTTON_HOME: 'crisis-home-icon',
  CRISIS_BUTTON_LEARN: 'crisis-button-icon', // Learn uses 'crisis-button'
  CRISIS_BUTTON_INSIGHTS: 'crisis-insights-icon',
  CRISIS_BUTTON_PROFILE: 'crisis-profile-icon', // Profile uses 'crisis-profile'

  // Main screen testIDs
  CRISIS_RESOURCES_SCREEN: 'crisis-resources-screen',
  HOME_SCREEN: 'home-screen',
  LEARN_SCREEN: 'learn-screen',
  INSIGHTS_SCREEN: 'insights-screen',
  PROFILE_SCREEN: 'profile-screen',
} as const;

/**
 * Tab bar accessibility labels (React Navigation default format)
 * Format: "{TabName}, tab, {position} of {total}"
 * Also includes simple text fallbacks for when accessibility labels don't work
 */
export const TAB_LABELS = {
  HOME: 'Home, tab, 1 of 4',
  LEARN: 'Learn, tab, 2 of 4',
  INSIGHTS: 'Insights, tab, 3 of 4',
  PROFILE: 'Profile, tab, 4 of 4',
} as const;

/**
 * Simple tab labels as text (fallback)
 */
export const TAB_TEXT = {
  HOME: 'Home',
  LEARN: 'Learn',
  INSIGHTS: 'Insights',
  PROFILE: 'Profile',
} as const;

/**
 * Waits for the intro animation to complete.
 * The intro shows for first launch or after 30+ minutes of inactivity.
 */
export async function waitForIntroToComplete(): Promise<void> {
  // Wait for intro animation (2s pause + animations)
  await new Promise(resolve => setTimeout(resolve, TIMING.INTRO_ANIMATION_MS));
}

/**
 * Completes the legal gate screen (age verification + consent).
 * This is shown on first app launch for COPPA compliance.
 */
export async function completeLegalGate(): Promise<void> {
  try {
    // Check if we're on legal gate by finding age verification text
    await expect(element(by.text('What year were you born?'))).toBeVisible();
    console.log('[SETUP] Legal gate detected - completing...');

    // The picker shows years from 2025 down to 1926
    // We need to scroll DOWN (swipe up direction) to get to earlier years like 1990
    const picker = element(by.label('Select your birth year'));

    // Scroll the picker significantly to reach ~1990 (about 35 years down)
    // Each swipe moves roughly 3-5 items, so 10-12 swipes should be enough
    for (let i = 0; i < 12; i++) {
      await picker.swipe('up', 'fast');
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Wait for picker to settle
    await new Promise(resolve => setTimeout(resolve, 300));

    // Try to find and tap a year in the 1985-1995 range
    const adultYears = ['1990', '1991', '1989', '1988', '1992', '1987', '1993', '1985', '1995', '2000'];
    let yearSelected = false;

    for (const year of adultYears) {
      try {
        await element(by.text(year)).tap();
        console.log(`[SETUP] Selected birth year: ${year}`);
        yearSelected = true;
        break;
      } catch {
        // Try next year
      }
    }

    if (!yearSelected) {
      // If no specific year found, try tapping on any picker label that looks like a year
      console.log('[SETUP] Could not select specific year, trying picker tap');
      try {
        await picker.tap();
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch {
        console.log('[SETUP] Could not interact with picker');
      }
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    // Scroll down to see the checkbox and continue button
    try {
      const scrollView = element(by.type('RCTScrollView')).atIndex(0);
      await scrollView.scroll(300, 'down');
    } catch {
      // Try scrolling the content view
      console.log('[SETUP] Scrolling to checkbox area');
    }

    // Check the terms checkbox
    try {
      const termsCheckbox = element(by.label('Terms of Service and Privacy Policy agreement'));
      await termsCheckbox.tap();
      console.log('[SETUP] Terms checkbox tapped');
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch {
      console.log('[SETUP] Terms checkbox not found or already checked');
    }

    // Tap Continue button
    try {
      const continueButton = element(by.label('Continue'));
      await continueButton.tap();
      console.log('[SETUP] Continue button tapped');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('[SETUP] Legal gate completed');
    } catch {
      console.log('[SETUP] Continue button not found');
    }
  } catch {
    // Not on legal gate screen, that's fine
    console.log('[SETUP] Legal gate not found or already completed');
  }
}

/**
 * Completes any initial assessment that may appear (PHQ-9, GAD-7, etc).
 * The app may show this after legal gate but before the main onboarding.
 */
export async function completeInitialAssessment(): Promise<void> {
  // Check for assessment patterns
  const isOnAssessment = async (): Promise<boolean> => {
    try {
      // Look for "Question X of Y" pattern
      await expect(element(by.text(/Question \d+ of \d+/))).toBeVisible();
      return true;
    } catch {
      // Also check for specific patterns
      const patterns = ['Question 1 of 9', 'Question 1 of 7'];
      for (const pattern of patterns) {
        try {
          await expect(element(by.text(pattern))).toBeVisible();
          return true;
        } catch {
          // Try next
        }
      }
      return false;
    }
  };

  if (!(await isOnAssessment())) {
    return; // No assessment visible
  }

  console.log('[SETUP] Assessment detected - completing by answering questions...');

  // Complete assessment by answering each question with "Not at all" (lowest score)
  // PHQ-9 has 9 questions, GAD-7 has 7 questions
  for (let q = 0; q < 10; q++) {
    try {
      // Check if still on assessment
      if (!(await isOnAssessment())) {
        console.log('[SETUP] Assessment completed or exited');
        break;
      }

      // Try to select "Not at all" answer
      try {
        await element(by.text('Not at all')).tap();
        console.log(`[SETUP] Answered question ${q + 1} with "Not at all"`);
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch {
        // Try by label
        try {
          await element(by.label('Not at all')).tap();
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch {
          console.log('[SETUP] Could not find answer option');
        }
      }

      // Tap Continue/Next to move to next question
      try {
        await element(by.label('Continue')).tap();
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch {
        try {
          await element(by.label('Next')).tap();
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch {
          try {
            await element(by.text('Continue')).tap();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch {
            // Maybe auto-advances
          }
        }
      }
    } catch (e) {
      console.log(`[SETUP] Error on question ${q + 1}:`, e);
      break;
    }
  }

  // Wait for assessment to complete
  await new Promise(resolve => setTimeout(resolve, 500));

  // Try to dismiss results screen if shown
  const dismissLabels = ['Done', 'Continue', 'Close', 'Finish', 'Got it'];
  for (const label of dismissLabels) {
    try {
      await element(by.label(label)).tap();
      console.log(`[SETUP] Assessment results dismissed via "${label}"`);
      await new Promise(resolve => setTimeout(resolve, 300));
      break;
    } catch {
      // Try next
    }
  }
}

/**
 * Completes the onboarding flow to reach the main screen.
 */
export async function completeOnboarding(): Promise<void> {
  try {
    // First, check and skip any assessment overlay
    await completeInitialAssessment();
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check if we're on welcome/onboarding screen
    const beginButton = element(by.label('Begin Your Practice'));
    await expect(beginButton).toBeVisible();
    console.log('[SETUP] Onboarding detected - completing...');
    await beginButton.tap();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Navigate through onboarding screens
    // Keep pressing Continue until we reach the end
    for (let i = 0; i < 10; i++) {
      try {
        const exploreButton = element(by.label('Explore App'));
        await expect(exploreButton).toBeVisible();
        await exploreButton.tap();
        console.log('[SETUP] Onboarding complete');
        return;
      } catch {
        // Not at the end yet, try Continue
        try {
          const continueButton = element(by.label('Continue'));
          await continueButton.tap();
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch {
          // No Continue button, maybe there's a Skip option
          try {
            const skipButton = element(by.label('Set up later'));
            await skipButton.tap();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch {
            break; // No more buttons to press
          }
        }
      }
    }
  } catch {
    // Not on onboarding screen, that's fine
    console.log('[SETUP] Onboarding not found or already completed');
  }
}

/**
 * Waits for home screen to be visible, handling legal gate, onboarding, and intro animation.
 * Retries multiple times to handle various app states.
 */
export async function waitForHomeScreen(): Promise<void> {
  // Give app time to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Retry loop to handle various screens that may appear
  for (let attempt = 0; attempt < 5; attempt++) {
    console.log(`[SETUP] Attempt ${attempt + 1} to reach home screen...`);

    // Try to find home screen
    try {
      await expect(element(by.id(TEST_IDS.HOME_SCREEN))).toBeVisible();
      console.log('[SETUP] Home screen found!');
      return;
    } catch {
      // Not visible yet, try to handle blocking screens
    }

    // Try to skip/complete any initial assessment
    await completeInitialAssessment();
    await new Promise(resolve => setTimeout(resolve, 300));

    // Complete legal gate if shown
    await completeLegalGate();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Complete onboarding if shown
    await completeOnboarding();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Wait for intro animation (if applicable)
    if (attempt === 0) {
      await waitForIntroToComplete();
    }
  }

  // Final check - if we still can't find home screen, dump the view hierarchy for debugging
  try {
    await expect(element(by.id(TEST_IDS.HOME_SCREEN))).toBeVisible();
    console.log('[SETUP] Home screen found after retries!');
  } catch (error) {
    console.log('[SETUP] ERROR: Could not reach home screen after all attempts');
    throw error;
  }
}

/**
 * Measures the time taken to access crisis resources from current screen.
 *
 * @returns Time in milliseconds from tap to crisis screen visible
 */
export async function measureCrisisAccessTime(crisisButtonTestID: string): Promise<number> {
  const startTime = Date.now();

  // Tap the crisis button
  await element(by.id(crisisButtonTestID)).tap();

  // Wait for crisis resources screen to be visible
  await expect(element(by.id(TEST_IDS.CRISIS_RESOURCES_SCREEN))).toBeVisible();

  const endTime = Date.now();
  return endTime - startTime;
}

/**
 * Asserts that crisis access time is within the 3-second threshold.
 * Logs the actual time for trend analysis.
 *
 * @param accessTimeMs - Measured access time in milliseconds
 * @param screenName - Name of the screen for logging
 */
export function assertCrisisAccessTime(accessTimeMs: number, screenName: string): void {
  console.log(`[CRISIS-ACCESS] ${screenName}: ${accessTimeMs}ms`);

  if (accessTimeMs > CRISIS_ACCESS_THRESHOLDS.MAX_ACCESS_TIME_MS) {
    throw new Error(
      `CRISIS ACCESS VIOLATION: ${screenName} took ${accessTimeMs}ms ` +
      `(threshold: ${CRISIS_ACCESS_THRESHOLDS.MAX_ACCESS_TIME_MS}ms)`
    );
  }
}

/**
 * Navigates back from crisis resources screen.
 * Use after each test to reset state.
 */
export async function dismissCrisisScreen(): Promise<void> {
  // Tap back button or swipe to dismiss
  await device.pressBack();
}

/**
 * Navigate to a tab using accessibility label with fallbacks.
 *
 * @param tabLabel - Accessibility label of the tab (use TAB_LABELS constant)
 */
export async function navigateToTab(tabLabel: string): Promise<void> {
  // Extract tab name from label (e.g., "Home, tab, 1 of 4" -> "Home")
  const tabName = tabLabel.split(',')[0];

  // Try accessibility label first
  try {
    await element(by.label(tabLabel)).tap();
    await new Promise(resolve => setTimeout(resolve, TIMING.TAB_LOAD_MS));
    return;
  } catch {
    // Fallback to text-based selection
  }

  // Try by text (tab name)
  try {
    await element(by.text(tabName)).atIndex(0).tap();
    await new Promise(resolve => setTimeout(resolve, TIMING.TAB_LOAD_MS));
    return;
  } catch {
    // Fallback failed
  }

  // Try by label with just the tab name
  try {
    await element(by.label(tabName)).tap();
    await new Promise(resolve => setTimeout(resolve, TIMING.TAB_LOAD_MS));
    return;
  } catch {
    console.log(`[SETUP] Failed to navigate to tab: ${tabLabel}`);
    throw new Error(`Could not navigate to tab: ${tabLabel}`);
  }
}

/**
 * Navigate to a specific screen and wait for it to be visible.
 *
 * @param tabLabel - Accessibility label of the tab
 * @param screenTestID - Test ID of the screen to wait for
 */
export async function navigateToScreen(tabLabel: string, screenTestID: string): Promise<void> {
  await navigateToTab(tabLabel);
  await expect(element(by.id(screenTestID))).toBeVisible();
}
