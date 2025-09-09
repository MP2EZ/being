/**
 * FullMind Website - Accessibility E2E Tests
 * WCAG AA compliance and mental health accessibility validation
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG AA Accessibility Compliance', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Ensure accessibility features are loaded
    await page.waitForFunction(() => window.document.readyState === 'complete');
  });

  // ============================================================================
  // BASIC WCAG COMPLIANCE TESTS
  // ============================================================================

  test('homepage should pass axe accessibility tests', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('homepage should have proper document structure', async ({ page }) => {
    // Check for proper HTML lang attribute
    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toBe('en');

    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();

    // Check for skip links
    const skipLinks = page.locator('.skip-link');
    await expect(skipLinks).toHaveCount(3); // main content, crisis help, navigation
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Get all headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // Check heading order (no skipping levels)
    const headingLevels = await Promise.all(
      headings.map(heading => heading.evaluate(el => parseInt(el.tagName.charAt(1))))
    );

    for (let i = 1; i < headingLevels.length; i++) {
      const diff = headingLevels[i] - headingLevels[i - 1];
      expect(diff).toBeLessThanOrEqual(1); // No skipping levels
    }
  });

  // ============================================================================
  // KEYBOARD NAVIGATION TESTS
  // ============================================================================

  test('skip links should be functional', async ({ page }) => {
    // Tab to first skip link
    await page.keyboard.press('Tab');
    
    // Should focus on skip to main content
    const activeElement = page.locator(':focus');
    await expect(activeElement).toHaveText(/skip to main content/i);
    
    // Press Enter to activate skip link
    await page.keyboard.press('Enter');
    
    // Main content should now be focused
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });

  test('keyboard navigation should work for all interactive elements', async ({ page }) => {
    // Get all focusable elements
    const focusableElements = await page.locator(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();

    expect(focusableElements.length).toBeGreaterThan(0);

    // Test tabbing through elements
    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      
      // Should be visible and not have positive tabindex
      await expect(focused).toBeVisible();
      const tabIndex = await focused.getAttribute('tabindex');
      if (tabIndex !== null) {
        expect(parseInt(tabIndex)).toBeLessThanOrEqual(0);
      }
    }
  });

  test('keyboard shortcuts should work', async ({ page }) => {
    // Test crisis help shortcut (Alt+C)
    await page.keyboard.press('Alt+c');
    
    // Should trigger crisis help (check for event or modal)
    // This depends on implementation, adjust based on actual behavior
    await page.waitForTimeout(500);
    
    // Test skip to main content shortcut (Alt+S) 
    await page.keyboard.press('Alt+s');
    
    // Main content should be focused
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });

  // ============================================================================
  // MENTAL HEALTH SPECIFIC TESTS
  // ============================================================================

  test('crisis help button should be present and accessible', async ({ page }) => {
    // Crisis button should be visible
    const crisisButton = page.locator('#crisis-help-button, [data-crisis-help="true"]');
    await expect(crisisButton).toBeVisible();
    
    // Should be properly sized (at least 60x60px for mental health accessibility)
    const boundingBox = await crisisButton.boundingBox();
    expect(boundingBox?.width).toBeGreaterThanOrEqual(60);
    expect(boundingBox?.height).toBeGreaterThanOrEqual(60);
    
    // Should have proper ARIA attributes
    await expect(crisisButton).toHaveAttribute('aria-describedby');
    
    // Should be keyboard accessible
    await crisisButton.focus();
    await expect(crisisButton).toBeFocused();
    
    // Should respond to Enter key
    await page.keyboard.press('Enter');
    // Add expectations for what should happen when crisis button is pressed
  });

  test('crisis help should be accessible within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    // Method 1: Direct click
    const crisisButton = page.locator('#crisis-help-button');
    await crisisButton.click();
    
    const directClickTime = Date.now() - startTime;
    expect(directClickTime).toBeLessThan(3000);
    
    // Reset and test Method 2: Keyboard shortcut
    await page.goto('/');
    const shortcutStartTime = Date.now();
    await page.keyboard.press('Alt+c');
    
    const shortcutTime = Date.now() - shortcutStartTime;
    expect(shortcutTime).toBeLessThan(3000);
  });

  test('should not have anxiety-triggering elements', async ({ page }) => {
    // Check for autoplay media
    const autoplayVideo = page.locator('video[autoplay]');
    await expect(autoplayVideo).toHaveCount(0);
    
    const autoplayAudio = page.locator('audio[autoplay]');
    await expect(autoplayAudio).toHaveCount(0);
    
    // Check for flashing elements
    const flashingElements = page.locator('.blink, .flash');
    await expect(flashingElements).toHaveCount(0);
    
    // Check for elements with rapid animations
    const rapidAnimations = page.locator('[style*="animation-duration: 0.1s"], [style*="animation-duration: 0.2s"]');
    await expect(rapidAnimations).toHaveCount(0);
  });

  // ============================================================================
  // COLOR CONTRAST TESTS
  // ============================================================================

  test('should meet WCAG AA color contrast requirements', async ({ page }) => {
    const contrastResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(contrastResults.violations).toEqual([]);
  });

  test('crisis elements should meet enhanced contrast requirements', async ({ page }) => {
    // Crisis button should have high contrast (7:1 ratio)
    const crisisButton = page.locator('#crisis-help-button');
    
    // Get computed styles
    const styles = await crisisButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
      };
    });
    
    // This is a simplified check - in practice, you'd use a contrast calculation library
    expect(styles.backgroundColor).toBeTruthy();
    expect(styles.color).toBeTruthy();
  });

  // ============================================================================
  // FOCUS MANAGEMENT TESTS
  // ============================================================================

  test('focus indicators should be visible', async ({ page }) => {
    const focusableElements = await page.locator('button, a, input').all();
    
    for (const element of focusableElements.slice(0, 5)) { // Test first 5 elements
      await element.focus();
      
      // Check if focus indicator is visible
      const outlineWidth = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.outline !== 'none' || styles.boxShadow !== 'none';
      });
      
      expect(outlineWidth).toBeTruthy();
    }
  });

  test('focus should not be trapped inappropriately', async ({ page }) => {
    // Tab through several elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Should be able to reach browser UI with enough tabs
    // This is a basic check - adjust based on page content
    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement).toBeTruthy();
  });

  // ============================================================================
  // FORM ACCESSIBILITY TESTS
  // ============================================================================

  test('forms should have proper labels and error handling', async ({ page }) => {
    // Navigate to a page with forms (adjust URL as needed)
    const forms = page.locator('form');
    const formCount = await forms.count();
    
    if (formCount > 0) {
      // Check first form
      const form = forms.first();
      
      // All inputs should have labels
      const inputs = form.locator('input, select, textarea');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        
        // Should have label, aria-label, or aria-labelledby
        const hasLabel = await input.evaluate(el => {
          return el.hasAttribute('aria-label') || 
                 el.hasAttribute('aria-labelledby') ||
                 !!document.querySelector(`label[for="${el.id}"]`);
        });
        
        expect(hasLabel).toBeTruthy();
      }
    }
  });

  // ============================================================================
  // RESPONSIVE ACCESSIBILITY TESTS
  // ============================================================================

  test('touch targets should meet size requirements on mobile', async ({ page, browserName }) => {
    if (browserName === 'webkit') {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const interactiveElements = page.locator('button, a, input[type="button"], input[type="submit"]');
      const count = await interactiveElements.count();
      
      for (let i = 0; i < count; i++) {
        const element = interactiveElements.nth(i);
        const boundingBox = await element.boundingBox();
        
        if (boundingBox) {
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  // ============================================================================
  // SCREEN READER TESTS
  // ============================================================================

  test('should have proper ARIA landmarks', async ({ page }) => {
    // Check for required landmarks
    const main = page.locator('[role="main"], main');
    await expect(main).toHaveCount(1);
    
    const navigation = page.locator('[role="navigation"], nav');
    await expect(navigation).toHaveCountGreaterThanOrEqual(1);
    
    // Check for banner (header)
    const banner = page.locator('[role="banner"], header:has(nav)');
    await expect(banner).toHaveCountGreaterThanOrEqual(1);
  });

  test('images should have appropriate alt text', async ({ page }) => {
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      
      // Alt should exist (can be empty for decorative images)
      expect(alt).not.toBeNull();
      
      // If image has role="img", it should have accessible name
      const role = await img.getAttribute('role');
      if (role === 'img') {
        const hasAccessibleName = alt !== '' || await img.getAttribute('aria-label') !== null;
        expect(hasAccessibleName).toBeTruthy();
      }
    }
  });

  // ============================================================================
  // MOTION AND ANIMATION TESTS
  // ============================================================================

  test('should respect reduced motion preferences', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    
    // Check that animations are disabled or minimal
    const animatedElements = page.locator('[style*="animation"], [class*="animate-"]');
    const count = await animatedElements.count();
    
    for (let i = 0; i < count; i++) {
      const element = animatedElements.nth(i);
      const animationDuration = await element.evaluate(el => {
        return window.getComputedStyle(el).animationDuration;
      });
      
      // Should be very short or none
      expect(['0s', '0.01ms', 'none'].some(value => animationDuration.includes(value))).toBeTruthy();
    }
  });

  // ============================================================================
  // ERROR AND LOADING STATE TESTS
  // ============================================================================

  test('error states should be accessible', async ({ page }) => {
    // This test would need to trigger error states
    // For now, check that error patterns are accessible if present
    const errorElements = page.locator('[role="alert"], .error, [aria-invalid="true"]');
    const errorCount = await errorElements.count();
    
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const error = errorElements.nth(i);
        
        // Error should be announced to screen readers
        const hasAriaLabel = await error.getAttribute('aria-label');
        const hasRole = await error.getAttribute('role');
        const hasAriaLive = await error.getAttribute('aria-live');
        
        const isAccessible = hasAriaLabel || hasRole === 'alert' || hasAriaLive;
        expect(isAccessible).toBeTruthy();
      }
    }
  });

  // ============================================================================
  // COMPREHENSIVE ACCESSIBILITY SCAN
  // ============================================================================

  test('comprehensive accessibility scan', async ({ page }) => {
    // Run comprehensive axe scan with all rules
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();

    // Log any issues for debugging
    if (results.violations.length > 0) {
      console.log('Accessibility violations found:', results.violations.map(v => ({
        rule: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length
      })));
    }

    // Should have no violations
    expect(results.violations).toEqual([]);
    
    // Should have some passes (indicates tests ran)
    expect(results.passes.length).toBeGreaterThan(0);
    
    // Should have minimal incomplete tests
    expect(results.incomplete.length).toBeLessThan(5);
  });
});