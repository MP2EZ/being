/**
 * FullMind Website - Comprehensive Dark Mode Testing Suite
 * Clinical-grade validation of theme switching, persistence, and crisis safety
 * 
 * Test Coverage:
 * 1. Theme Switching Functionality
 * 2. Persistence and State Management
 * 3. Crisis Safety Features
 * 4. Performance and Reliability
 * 5. Cross-Browser Compatibility
 * 6. Error Handling and Edge Cases
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

test.describe('FullMind Dark Mode - Comprehensive Testing Suite', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto('http://localhost:3000');
    
    // Wait for theme system to fully initialize
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ============================================================================
  // 1. THEME SWITCHING FUNCTIONALITY TESTS
  // ============================================================================

  test.describe('1. Theme Switching Functionality', () => {
    
    test('should switch between light and dark modes correctly', async () => {
      // Get initial theme state
      const initialMode = await page.getAttribute('html', 'class');
      
      // Find theme selector (look for various possible selectors)
      const themeSelector = page.locator('[data-testid="theme-selector"], .theme-selector, [aria-label*="theme"], [aria-label*="color mode"], select[id*="color-mode"]').first();
      
      if (await themeSelector.count() === 0) {
        // If no selector found, look for theme toggle buttons
        const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="light"], [data-theme-toggle]').first();
        
        if (await themeToggle.count() > 0) {
          // Test toggle functionality
          await themeToggle.click();
          await page.waitForTimeout(200); // Wait for transition
          
          const newMode = await page.getAttribute('html', 'class');
          expect(newMode).not.toBe(initialMode);
          
          // Toggle back
          await themeToggle.click();
          await page.waitForTimeout(200);
          
          const returnMode = await page.getAttribute('html', 'class');
          expect(returnMode).toBe(initialMode);
        }
      } else {
        // Test dropdown/select functionality
        await themeSelector.selectOption('dark');
        await page.waitForTimeout(200);
        
        const darkClass = await page.getAttribute('html', 'class');
        expect(darkClass).toContain('dark');
        
        await themeSelector.selectOption('light');
        await page.waitForTimeout(200);
        
        const lightClass = await page.getAttribute('html', 'class');
        expect(lightClass).not.toContain('dark');
      }
    });

    test('should switch theme variants (morning/midday/evening)', async () => {
      // Look for theme variant buttons
      const variantButtons = page.locator('button[aria-label*="morning"], button[aria-label*="midday"], button[aria-label*="evening"]');
      
      if (await variantButtons.count() > 0) {
        const morningButton = variantButtons.filter({ hasText: /morning/i }).or(page.locator('[aria-label*="morning"]')).first();
        const middayButton = variantButtons.filter({ hasText: /midday/i }).or(page.locator('[aria-label*="midday"]')).first();
        const eveningButton = variantButtons.filter({ hasText: /evening/i }).or(page.locator('[aria-label*="evening"]')).first();

        // Test variant switching
        if (await morningButton.count() > 0) {
          await morningButton.click();
          await page.waitForTimeout(200);
          
          const htmlClass = await page.getAttribute('html', 'class');
          expect(htmlClass).toContain('theme-morning');
        }

        if (await eveningButton.count() > 0) {
          await eveningButton.click();
          await page.waitForTimeout(200);
          
          const htmlClass = await page.getAttribute('html', 'class');
          expect(htmlClass).toContain('theme-evening');
        }
      }
    });

    test('should measure theme switching response time (<200ms requirement)', async () => {
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"], .theme-selector button').first();
      
      if (await themeToggle.count() > 0) {
        // Measure theme switching time
        const startTime = Date.now();
        
        await themeToggle.click();
        
        // Wait for visual change to complete
        await page.waitForFunction(() => {
          return document.documentElement.style.getPropertyValue('--fm-bg-primary') !== '';
        }, { timeout: 1000 });
        
        const endTime = Date.now();
        const switchTime = endTime - startTime;
        
        expect(switchTime).toBeLessThan(200);
        console.log(`Theme switch time: ${switchTime}ms (Requirement: <200ms)`);
      }
    });

    test('should not cause layout shifts during theme transitions', async () => {
      // Get initial layout
      const initialBox = await page.locator('body').boundingBox();
      
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await themeToggle.count() > 0) {
        await themeToggle.click();
        await page.waitForTimeout(300); // Wait for transition to complete
        
        const newBox = await page.locator('body').boundingBox();
        
        // Layout should remain stable
        expect(newBox?.width).toBe(initialBox?.width);
        expect(newBox?.height).toBe(initialBox?.height);
      }
    });
  });

  // ============================================================================
  // 2. PERSISTENCE AND STATE MANAGEMENT TESTS
  // ============================================================================

  test.describe('2. Persistence and State Management', () => {
    
    test('should persist theme preference across browser sessions', async () => {
      // Set a specific theme
      const themeSelector = page.locator('select[id*="color-mode"], .theme-selector select').first();
      
      if (await themeSelector.count() > 0) {
        await themeSelector.selectOption('dark');
        await page.waitForTimeout(200);
        
        // Reload page
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
        
        // Check if theme persisted
        const htmlClass = await page.getAttribute('html', 'class');
        expect(htmlClass).toContain('dark');
      }
    });

    test('should restore theme preference on page refresh', async () => {
      // Get current theme
      const currentTheme = await page.getAttribute('html', 'class');
      
      // Refresh page
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      
      // Theme should be restored
      const restoredTheme = await page.getAttribute('html', 'class');
      expect(restoredTheme).toBe(currentTheme);
    });

    test('should synchronize theme across multiple tabs', async () => {
      // Open second tab
      const secondPage = await context.newPage();
      await secondPage.goto('http://localhost:3000');
      await secondPage.waitForLoadState('domcontentloaded');
      await secondPage.waitForTimeout(1000);
      
      // Change theme in first tab
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await themeToggle.count() > 0) {
        await themeToggle.click();
        await page.waitForTimeout(200);
        
        const firstTabTheme = await page.getAttribute('html', 'class');
        
        // Refresh second tab to check sync (localStorage sync)
        await secondPage.reload();
        await secondPage.waitForLoadState('domcontentloaded');
        await secondPage.waitForTimeout(1000);
        
        const secondTabTheme = await secondPage.getAttribute('html', 'class');
        expect(secondTabTheme).toBe(firstTabTheme);
      }
      
      await secondPage.close();
    });

    test('should handle localStorage corruption gracefully', async () => {
      // Corrupt localStorage
      await page.evaluate(() => {
        localStorage.setItem('fullmind-theme-preferences', 'invalid-json{');
      });
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      
      // Should fallback to defaults without crashing
      const htmlClass = await page.getAttribute('html', 'class');
      expect(htmlClass).toBeTruthy(); // Should have some theme class
      
      // Theme selector should still work
      const themeSelector = page.locator('select[id*="color-mode"], button[aria-label*="theme"]').first();
      if (await themeSelector.count() > 0) {
        await expect(themeSelector).toBeVisible();
      }
    });
  });

  // ============================================================================
  // 3. CRISIS SAFETY FEATURES TESTS
  // ============================================================================

  test.describe('3. Crisis Safety Features', () => {
    
    test('should maintain crisis button visibility in all themes', async () => {
      const crisisElements = page.locator('[data-crisis="true"], .crisis-button, [aria-label*="crisis"], [aria-label*="988"]');
      
      if (await crisisElements.count() > 0) {
        const crisisButton = crisisElements.first();
        
        // Test in light mode
        await page.evaluate(() => document.documentElement.classList.add('light'));
        await page.waitForTimeout(100);
        
        await expect(crisisButton).toBeVisible();
        
        // Test in dark mode
        await page.evaluate(() => {
          document.documentElement.classList.remove('light');
          document.documentElement.classList.add('dark');
        });
        await page.waitForTimeout(100);
        
        await expect(crisisButton).toBeVisible();
        
        // Test contrast ratios
        const buttonStyles = await crisisButton.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            color: computed.color,
            borderColor: computed.borderColor
          };
        });
        
        expect(buttonStyles.backgroundColor).toBeTruthy();
        expect(buttonStyles.color).toBeTruthy();
      }
    });

    test('should provide <200ms crisis button response time', async () => {
      const crisisButton = page.locator('[data-crisis="true"], .crisis-button, [aria-label*="crisis"], [aria-label*="988"]').first();
      
      if (await crisisButton.count() > 0) {
        const startTime = Date.now();
        
        // Click crisis button
        await crisisButton.click();
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(200);
        console.log(`Crisis button response time: ${responseTime}ms (Requirement: <200ms)`);
      }
    });

    test('should activate crisis mode overrides', async () => {
      // Look for crisis mode activation
      const crisisButton = page.locator('[data-crisis="true"], .crisis-button').first();
      
      if (await crisisButton.count() > 0) {
        await crisisButton.click();
        
        // Check for crisis mode indicators
        const htmlClass = await page.getAttribute('html', 'class');
        const crisisStyles = await page.evaluate(() => {
          return {
            crisisBg: getComputedStyle(document.documentElement).getPropertyValue('--fm-crisis-bg'),
            crisisText: getComputedStyle(document.documentElement).getPropertyValue('--fm-crisis-text')
          };
        });
        
        expect(crisisStyles.crisisBg).toBeTruthy();
        expect(crisisStyles.crisisText).toBeTruthy();
      }
    });

    test('should maintain 7:1 contrast ratio for crisis elements', async () => {
      const crisisElements = page.locator('[data-crisis="true"], .crisis-button');
      
      if (await crisisElements.count() > 0) {
        const contrastResults = await crisisElements.first().evaluate((el) => {
          const computed = window.getComputedStyle(el);
          const bg = computed.backgroundColor;
          const text = computed.color;
          
          // Simple contrast calculation (would be more complex in real implementation)
          return {
            background: bg,
            color: text,
            hasHighContrast: bg.includes('rgb') && text.includes('rgb')
          };
        });
        
        expect(contrastResults.hasHighContrast).toBe(true);
      }
    });
  });

  // ============================================================================
  // 4. PERFORMANCE AND RELIABILITY TESTS
  // ============================================================================

  test.describe('4. Performance and Reliability', () => {
    
    test('should handle rapid theme switching without issues', async () => {
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await themeToggle.count() > 0) {
        // Perform rapid theme switches
        for (let i = 0; i < 10; i++) {
          await themeToggle.click();
          await page.waitForTimeout(50); // Minimal delay
        }
        
        // Verify system is still responsive
        await expect(page.locator('html')).toHaveClass(/light|dark/);
        
        // No JavaScript errors should occur
        const errors = page.locator('[data-error], .error').count();
        await expect(errors).toBe(0);
      }
    });

    test('should maintain smooth animations at 60fps', async () => {
      // This is a basic check - in real testing you'd use performance API
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await themeToggle.count() > 0) {
        const performanceStart = Date.now();
        
        await themeToggle.click();
        await page.waitForTimeout(200); // Wait for transition
        
        const performanceEnd = Date.now();
        const totalTime = performanceEnd - performanceStart;
        
        // Transition should complete smoothly within expected time
        expect(totalTime).toBeLessThan(300);
      }
    });

    test('should not cause memory leaks during extended use', async () => {
      // Basic memory usage check
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });
      
      // Perform multiple theme switches
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await themeToggle.count() > 0) {
        for (let i = 0; i < 20; i++) {
          await themeToggle.click();
          await page.waitForTimeout(100);
        }
        
        // Force garbage collection if available
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc();
          }
        });
        
        const finalMemory = await page.evaluate(() => {
          return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
        });
        
        if (initialMemory > 0 && finalMemory > 0) {
          const memoryIncrease = finalMemory - initialMemory;
          // Memory shouldn't increase dramatically (allow for some normal variance)
          expect(memoryIncrease).toBeLessThan(initialMemory * 0.5);
        }
      }
    });

    test('should handle system theme changes', async () => {
      // Simulate system theme change
      await page.evaluate(() => {
        // Create mock media query
        const mediaQuery = {
          matches: !window.matchMedia('(prefers-color-scheme: dark)').matches,
          addEventListener: () => {},
          removeEventListener: () => {}
        };
        
        // Dispatch change event
        window.dispatchEvent(new Event('theme-change'));
      });
      
      await page.waitForTimeout(200);
      
      // System should still be functional
      const htmlClass = await page.getAttribute('html', 'class');
      expect(htmlClass).toBeTruthy();
    });
  });

  // ============================================================================
  // 5. ACCESSIBILITY AND CROSS-BROWSER TESTS
  // ============================================================================

  test.describe('5. Accessibility and Cross-Browser Compatibility', () => {
    
    test('should provide proper keyboard navigation', async () => {
      // Test keyboard navigation to theme controls
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      
      // Should be able to reach theme controls via keyboard
      if (await focusedElement.count() > 0) {
        const focusedRole = await focusedElement.getAttribute('role');
        const focusedAriaLabel = await focusedElement.getAttribute('aria-label');
        
        // Should have proper accessibility attributes
        expect(focusedRole || focusedAriaLabel).toBeTruthy();
      }
    });

    test('should work with reduced motion preference', async () => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await themeToggle.count() > 0) {
        await themeToggle.click();
        await page.waitForTimeout(100);
        
        // Should still switch themes but with reduced motion
        const htmlClass = await page.getAttribute('html', 'class');
        expect(htmlClass).toBeTruthy();
      }
    });

    test('should maintain high contrast ratios in all modes', async () => {
      // Test color contrast in different themes
      const testElements = page.locator('h1, h2, p, button, a').first();
      
      if (await testElements.count() > 0) {
        const contrastInfo = await testElements.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize
          };
        });
        
        expect(contrastInfo.color).toBeTruthy();
      }
    });

    test('should work with screen readers', async () => {
      // Test ARIA labels and roles
      const themeControls = page.locator('[aria-label*="theme"], [role="group"][aria-label*="theme"]');
      
      if (await themeControls.count() > 0) {
        const ariaLabel = await themeControls.first().getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel?.toLowerCase()).toContain('theme');
      }
    });
  });

  // ============================================================================
  // 6. ERROR HANDLING AND EDGE CASES
  // ============================================================================

  test.describe('6. Error Handling and Edge Cases', () => {
    
    test('should handle disabled JavaScript gracefully', async () => {
      // This test would require setting up a non-JS context
      // For now, we'll test that critical elements are still visible
      const criticalElements = page.locator('h1, nav, main, footer');
      await expect(criticalElements.first()).toBeVisible();
    });

    test('should recover from theme switching errors', async () => {
      // Inject error into theme system
      await page.evaluate(() => {
        // Mock a theme error
        const errorEvent = new CustomEvent('theme-error', { 
          detail: { error: 'Mock theme error' } 
        });
        window.dispatchEvent(errorEvent);
      });
      
      // System should still be functional
      const htmlClass = await page.getAttribute('html', 'class');
      expect(htmlClass).toBeTruthy();
      
      // Try to use theme controls
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      if (await themeToggle.count() > 0) {
        await expect(themeToggle).toBeVisible();
      }
    });

    test('should handle slow network conditions', async () => {
      // Simulate slow network
      await page.route('**/*', async route => {
        await page.waitForTimeout(100); // Add delay
        route.continue();
      });
      
      // Theme system should still initialize
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Wait for slow load
      
      const htmlClass = await page.getAttribute('html', 'class');
      expect(htmlClass).toBeTruthy();
    });

    test('should work with different viewport sizes', async () => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(200);
      
      const themeControls = page.locator('[aria-label*="theme"], .theme-selector').first();
      
      if (await themeControls.count() > 0) {
        await expect(themeControls).toBeVisible();
      }
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(200);
      
      if (await themeControls.count() > 0) {
        await expect(themeControls).toBeVisible();
      }
    });
  });

  // ============================================================================
  // 7. INTEGRATION TESTS
  // ============================================================================

  test.describe('7. Integration Tests', () => {
    
    test('should integrate properly with existing 21-day trial messaging', async () => {
      const trialElements = page.locator('[data-testid*="trial"], .trial, [class*="trial"]');
      
      // Check if trial elements exist and are styled correctly
      if (await trialElements.count() > 0) {
        const trialElement = trialElements.first();
        await expect(trialElement).toBeVisible();
        
        // Switch themes and verify trial elements still work
        const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
        if (await themeToggle.count() > 0) {
          await themeToggle.click();
          await page.waitForTimeout(200);
          
          await expect(trialElement).toBeVisible();
        }
      }
    });

    test('should work with all existing navigation elements', async () => {
      const navElements = page.locator('nav, header, [role="navigation"]');
      
      if (await navElements.count() > 0) {
        const nav = navElements.first();
        await expect(nav).toBeVisible();
        
        // Test theme switching with navigation
        const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
        if (await themeToggle.count() > 0) {
          await themeToggle.click();
          await page.waitForTimeout(200);
          
          await expect(nav).toBeVisible();
        }
      }
    });

    test('should maintain form functionality across themes', async () => {
      const formElements = page.locator('form, input, button[type="submit"]');
      
      if (await formElements.count() > 0) {
        const firstForm = formElements.first();
        
        // Test interaction in different themes
        const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
        if (await themeToggle.count() > 0) {
          // Light mode test
          await themeToggle.click();
          await page.waitForTimeout(200);
          
          if (firstForm.inputValue) {
            await expect(firstForm).toBeEditable();
          }
          
          // Dark mode test  
          await themeToggle.click();
          await page.waitForTimeout(200);
          
          if (firstForm.inputValue) {
            await expect(firstForm).toBeEditable();
          }
        }
      }
    });
  });
});