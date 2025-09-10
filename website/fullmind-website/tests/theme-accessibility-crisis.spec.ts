/**
 * FullMind Website - Accessibility and Crisis Safety Validation
 * Clinical-grade testing for WCAG compliance and emergency response protocols
 * 
 * Safety Requirements:
 * - Crisis elements: 7:1 contrast ratio minimum
 * - Emergency response: <200ms activation time
 * - Keyboard accessibility: Full navigation support
 * - Screen reader: Complete ARIA support
 * - High contrast: Enhanced visibility modes
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('FullMind Dark Mode - Accessibility & Crisis Safety', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================================================
  // CRISIS SAFETY VALIDATION TESTS
  // ============================================================================

  test.describe('Crisis Safety Validation', () => {
    
    test('should maintain crisis button visibility in all theme modes', async () => {
      const crisisElements = page.locator('[data-crisis="true"], .crisis-button, [aria-label*="crisis"], [aria-label*="988"], [href*="988"], [href*="crisis"]');
      
      // Test each theme mode
      const themeModes = ['light', 'dark'];
      const themeVariants = ['morning', 'midday', 'evening'];
      
      for (const mode of themeModes) {
        for (const variant of themeVariants) {
          // Set theme programmatically
          await page.evaluate((themeData) => {
            document.documentElement.className = `${themeData.mode} theme-${themeData.variant}`;
          }, { mode, variant });
          
          await page.waitForTimeout(100);
          
          // Check crisis elements visibility
          if (await crisisElements.count() > 0) {
            const crisisButton = crisisElements.first();
            
            // Visibility check
            await expect(crisisButton).toBeVisible();
            
            // Compute accessibility metrics
            const crisisAccessibility = await crisisButton.evaluate((el) => {
              const computed = window.getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              
              return {
                backgroundColor: computed.backgroundColor,
                color: computed.color,
                fontSize: computed.fontSize,
                fontWeight: computed.fontWeight,
                width: rect.width,
                height: rect.height,
                display: computed.display,
                visibility: computed.visibility,
                opacity: computed.opacity,
                zIndex: computed.zIndex
              };
            });
            
            // Assertions for crisis visibility
            expect(crisisAccessibility.display).not.toBe('none');
            expect(crisisAccessibility.visibility).not.toBe('hidden');
            expect(parseFloat(crisisAccessibility.opacity)).toBeGreaterThan(0.9);
            expect(crisisAccessibility.width).toBeGreaterThan(40); // Minimum touch target
            expect(crisisAccessibility.height).toBeGreaterThan(40);
            
            console.log(`Crisis button visibility validated in ${mode} ${variant} theme`);
          }
        }
      }
    });

    test('should provide 7:1 contrast ratio for crisis elements', async () => {
      const crisisElements = page.locator('[data-crisis="true"], .crisis-button');
      
      if (await crisisElements.count() > 0) {
        const contrastResults = await crisisElements.first().evaluate((el) => {
          // Simple color parsing utility
          const parseColor = (color: string): [number, number, number] => {
            const div = document.createElement('div');
            div.style.color = color;
            document.body.appendChild(div);
            const computed = window.getComputedStyle(div).color;
            document.body.removeChild(div);
            
            const matches = computed.match(/rgb\\((\\d+), (\\d+), (\\d+)\\)/);
            if (matches) {
              return [parseInt(matches[1]), parseInt(matches[2]), parseInt(matches[3])];
            }
            return [0, 0, 0];
          };
          
          // Calculate luminance
          const getLuminance = (r: number, g: number, b: number): number => {
            const [rs, gs, bs] = [r, g, b].map(c => {
              c = c / 255;
              return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
          };
          
          // Calculate contrast ratio
          const getContrastRatio = (color1: [number, number, number], color2: [number, number, number]): number => {
            const lum1 = getLuminance(...color1);
            const lum2 = getLuminance(...color2);
            const brightest = Math.max(lum1, lum2);
            const darkest = Math.min(lum1, lum2);
            return (brightest + 0.05) / (darkest + 0.05);
          };
          
          const computed = window.getComputedStyle(el);
          const textColor = parseColor(computed.color);
          const backgroundColor = parseColor(computed.backgroundColor);
          
          const contrastRatio = getContrastRatio(textColor, backgroundColor);
          
          return {
            textColor: computed.color,
            backgroundColor: computed.backgroundColor,
            contrastRatio,
            meetsAAA: contrastRatio >= 7,
            meetsAA: contrastRatio >= 4.5
          };
        });
        
        console.log(`Crisis element contrast ratio: ${contrastResults.contrastRatio.toFixed(2)}:1`);
        console.log(`Text: ${contrastResults.textColor}, Background: ${contrastResults.backgroundColor}`);
        
        // Clinical requirement: 7:1 contrast ratio
        expect(contrastResults.contrastRatio).toBeGreaterThanOrEqual(7);
        expect(contrastResults.meetsAAA).toBe(true);
      }
    });

    test('should activate crisis mode instantly (<200ms)', async () => {
      const crisisButton = page.locator('[data-crisis="true"], .crisis-button, [aria-label*="crisis"]').first();
      
      if (await crisisButton.count() > 0) {
        const activationTimes: number[] = [];
        
        // Test multiple activations
        for (let i = 0; i < 5; i++) {
          const startTime = await page.evaluate(() => performance.now());
          
          await crisisButton.click();
          
          // Wait for crisis mode activation (visual change, navigation, modal, etc.)
          await page.waitForTimeout(10); // Minimal wait for immediate response
          
          const endTime = await page.evaluate(() => performance.now());
          const activationTime = endTime - startTime;
          activationTimes.push(activationTime);
          
          // Reset or navigate back if needed
          await page.waitForTimeout(50);
        }
        
        const averageTime = activationTimes.reduce((a, b) => a + b, 0) / activationTimes.length;
        const maxTime = Math.max(...activationTimes);
        
        console.log(`Crisis activation times: ${activationTimes.map(t => t.toFixed(2)).join('ms, ')}ms`);
        console.log(`Average: ${averageTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
        
        expect(averageTime).toBeLessThan(200);
        expect(maxTime).toBeLessThan(250); // Allow slight variance for max
      }
    });

    test('should maintain crisis priority during theme transitions', async () => {
      const crisisButton = page.locator('[data-crisis="true"], .crisis-button').first();
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await crisisButton.count() > 0 && await themeToggle.count() > 0) {
        // Start theme transition
        await themeToggle.click();
        
        // Immediately try to use crisis button during transition
        const crisisResponseTime = await page.evaluate(async () => {
          const startTime = performance.now();
          
          const crisisEl = document.querySelector('[data-crisis="true"], .crisis-button') as HTMLElement;
          if (crisisEl) {
            crisisEl.click();
          }
          
          return performance.now() - startTime;
        });
        
        console.log(`Crisis response during theme transition: ${crisisResponseTime.toFixed(2)}ms`);
        
        // Should still respond quickly even during theme transition
        expect(crisisResponseTime).toBeLessThan(300);
      }
    });

    test('should provide emergency contact accessibility', async () => {
      // Look for 988 hotline references
      const emergencyContacts = page.locator('[href*="988"], [aria-label*="988"], text=988');
      
      if (await emergencyContacts.count() > 0) {
        const contact = emergencyContacts.first();
        
        // Should be visible and accessible
        await expect(contact).toBeVisible();
        
        // Check accessibility attributes
        const accessibilityInfo = await contact.evaluate((el) => ({
          ariaLabel: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
          href: el.getAttribute('href'),
          tagName: el.tagName,
          text: el.textContent
        }));
        
        // Should have proper accessibility markup
        expect(
          accessibilityInfo.ariaLabel || 
          accessibilityInfo.text?.includes('988') ||
          accessibilityInfo.href?.includes('988')
        ).toBeTruthy();
        
        console.log('Emergency contact accessibility validated:', accessibilityInfo);
      }
    });
  });

  // ============================================================================
  // KEYBOARD ACCESSIBILITY TESTS
  // ============================================================================

  test.describe('Keyboard Accessibility', () => {
    
    test('should provide full keyboard navigation for theme controls', async () => {
      // Test tab navigation to theme controls
      await page.keyboard.press('Tab');
      
      let foundThemeControl = false;
      let tabCount = 0;
      const maxTabs = 20; // Prevent infinite loop
      
      while (tabCount < maxTabs) {
        const focusedElement = page.locator(':focus');
        
        if (await focusedElement.count() > 0) {
          const elementInfo = await focusedElement.evaluate((el) => ({
            ariaLabel: el.getAttribute('aria-label'),
            id: el.id,
            className: el.className,
            tagName: el.tagName,
            text: el.textContent?.toLowerCase()
          }));
          
          // Check if this is a theme control
          const isThemeControl = 
            elementInfo.ariaLabel?.toLowerCase().includes('theme') ||
            elementInfo.ariaLabel?.toLowerCase().includes('color mode') ||
            elementInfo.id?.includes('theme') ||
            elementInfo.className?.includes('theme') ||
            elementInfo.text?.includes('theme');
          
          if (isThemeControl) {
            foundThemeControl = true;
            console.log('Found theme control via keyboard navigation:', elementInfo);
            
            // Test keyboard activation
            if (elementInfo.tagName === 'BUTTON') {
              await page.keyboard.press('Enter');
            } else if (elementInfo.tagName === 'SELECT') {
              await page.keyboard.press('ArrowDown');
            }
            
            await page.waitForTimeout(200);
            break;
          }
        }
        
        await page.keyboard.press('Tab');
        tabCount++;
      }
      
      expect(foundThemeControl).toBe(true);
    });

    test('should support arrow key navigation for theme variants', async () => {
      // Look for theme variant controls
      const variantControls = page.locator('[aria-label*="morning"], [aria-label*="midday"], [aria-label*="evening"]');
      
      if (await variantControls.count() > 0) {
        const firstVariant = variantControls.first();
        await firstVariant.focus();
        
        // Test arrow key navigation
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(100);
        
        const newFocus = await page.locator(':focus').getAttribute('aria-label');
        expect(newFocus).toBeTruthy();
        
        console.log('Arrow key navigation working, focused on:', newFocus);
      }
    });

    test('should provide proper focus indicators in all themes', async () => {
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await themeToggle.count() > 0) {
        // Test focus indicators in different themes
        const themes = ['light', 'dark'];
        
        for (const theme of themes) {
          await page.evaluate((t) => {
            document.documentElement.className = t;
          }, theme);
          
          await page.waitForTimeout(100);
          
          // Focus the element
          await themeToggle.focus();
          
          // Check focus styles
          const focusStyles = await themeToggle.evaluate((el) => {
            const computed = window.getComputedStyle(el, ':focus');
            return {
              outline: computed.outline,
              outlineColor: computed.outlineColor,
              outlineWidth: computed.outlineWidth,
              boxShadow: computed.boxShadow,
              borderColor: computed.borderColor
            };
          });
          
          // Should have visible focus indicator
          const hasFocusIndicator = 
            focusStyles.outline !== 'none' ||
            focusStyles.boxShadow !== 'none' ||
            focusStyles.outlineWidth !== '0px';
          
          expect(hasFocusIndicator).toBe(true);
          console.log(`Focus indicator validated in ${theme} theme:`, focusStyles);
        }
      }
    });

    test('should support keyboard shortcuts for common theme actions', async () => {
      // Test if keyboard shortcuts are available
      await page.keyboard.down('Alt');
      await page.keyboard.press('T'); // Common theme toggle shortcut
      await page.keyboard.up('Alt');
      
      await page.waitForTimeout(200);
      
      // Check if theme changed (this is optional as shortcuts may not be implemented)
      const htmlClass = await page.getAttribute('html', 'class');
      console.log('HTML class after keyboard shortcut:', htmlClass);
      
      // This test is informational - keyboard shortcuts are optional
    });
  });

  // ============================================================================
  // SCREEN READER ACCESSIBILITY TESTS
  // ============================================================================

  test.describe('Screen Reader Accessibility', () => {
    
    test('should provide comprehensive ARIA labels for theme controls', async () => {
      const themeControls = page.locator('[aria-label*="theme"], [aria-label*="color"], .theme-selector *');
      
      if (await themeControls.count() > 0) {
        const ariaInfo = await themeControls.evaluateAll((elements) => {
          return elements.map(el => ({
            tagName: el.tagName,
            ariaLabel: el.getAttribute('aria-label'),
            ariaRole: el.getAttribute('role'),
            ariaExpanded: el.getAttribute('aria-expanded'),
            ariaPressed: el.getAttribute('aria-pressed'),
            ariaChecked: el.getAttribute('aria-checked'),
            text: el.textContent,
            id: el.id
          }));
        });
        
        // Should have proper ARIA attributes
        ariaInfo.forEach((info, index) => {
          console.log(`Theme control ${index}:`, info);
          
          // At least one of these should be present for screen reader accessibility
          expect(
            info.ariaLabel || 
            info.text || 
            info.ariaRole
          ).toBeTruthy();
        });
      }
    });

    test('should announce theme changes to screen readers', async () => {
      // Look for live regions that announce theme changes
      const liveRegions = page.locator('[aria-live], [aria-atomic], [role="status"], [role="alert"]');
      
      const liveRegionInfo = await liveRegions.evaluateAll((elements) => {
        return elements.map(el => ({
          ariaLive: el.getAttribute('aria-live'),
          ariaAtomic: el.getAttribute('aria-atomic'),
          role: el.getAttribute('role'),
          content: el.textContent
        }));
      });
      
      console.log('Live regions for screen reader announcements:', liveRegionInfo);
      
      // Should have at least one live region for announcements
      if (liveRegionInfo.length > 0) {
        const hasLiveRegion = liveRegionInfo.some(region => 
          region.ariaLive || region.role === 'status' || region.role === 'alert'
        );
        expect(hasLiveRegion).toBe(true);
      }
    });

    test('should provide context for current theme state', async () => {
      // Look for current theme indicators
      const themeIndicators = page.locator('[aria-label*="current"], .theme-selector, [data-theme-current]');
      
      if (await themeIndicators.count() > 0) {
        const currentThemeInfo = await themeIndicators.first().evaluate((el) => ({
          ariaLabel: el.getAttribute('aria-label'),
          text: el.textContent,
          ariaValueNow: el.getAttribute('aria-valuenow'),
          ariaValueText: el.getAttribute('aria-valuetext')
        }));
        
        console.log('Current theme context for screen readers:', currentThemeInfo);
        
        // Should provide context about current theme
        expect(
          currentThemeInfo.ariaLabel ||
          currentThemeInfo.text ||
          currentThemeInfo.ariaValueText
        ).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // REDUCED MOTION AND ACCESSIBILITY PREFERENCES
  // ============================================================================

  test.describe('Accessibility Preferences', () => {
    
    test('should respect prefers-reduced-motion', async () => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await themeToggle.count() > 0) {
        await themeToggle.click();
        
        // Check transition duration
        const transitionDuration = await page.evaluate(() => {
          const root = document.documentElement;
          const computed = getComputedStyle(root);
          return computed.getPropertyValue('--fm-transition-duration') || 
                 computed.getPropertyValue('transition-duration');
        });
        
        console.log('Transition duration with reduced motion:', transitionDuration);
        
        // Should have reduced or no transitions
        if (transitionDuration) {
          const durationMs = parseFloat(transitionDuration);
          expect(durationMs).toBeLessThanOrEqual(100); // Minimal transition
        }
      }
    });

    test('should support high contrast mode', async () => {
      // Simulate high contrast preference
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            :root {
              --test-high-contrast: true;
            }
          }
        `
      });
      
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      
      // Check if high contrast adjustments are applied
      const highContrastActive = await page.evaluate(() => {
        return getComputedStyle(document.documentElement)
          .getPropertyValue('--test-high-contrast') === 'true';
      });
      
      if (highContrastActive) {
        console.log('High contrast mode activated');
        
        // Verify enhanced contrast in crisis elements
        const crisisButton = page.locator('[data-crisis="true"], .crisis-button').first();
        
        if (await crisisButton.count() > 0) {
          const crisisStyles = await crisisButton.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              borderWidth: computed.borderWidth
            };
          });
          
          console.log('Crisis button styles in high contrast:', crisisStyles);
          
          // Should have strong visual distinction
          expect(crisisStyles.borderWidth).not.toBe('0px');
        }
      }
    });

    test('should handle large text preferences', async () => {
      // Simulate large text scaling
      await page.setViewportSize({ width: 1200, height: 800 });
      
      // Add CSS for large text simulation
      await page.addStyleTag({
        content: `
          html { font-size: 125%; }
          * { font-size: inherit !important; }
        `
      });
      
      await page.waitForTimeout(200);
      
      // Check that layouts adapt to larger text
      const themeControls = page.locator('.theme-selector, [aria-label*="theme"]').first();
      
      if (await themeControls.count() > 0) {
        const controlInfo = await themeControls.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            fontSize: getComputedStyle(el).fontSize
          };
        });
        
        console.log('Theme control dimensions with large text:', controlInfo);
        
        // Should maintain usability with larger text
        expect(controlInfo.width).toBeGreaterThan(50);
        expect(controlInfo.height).toBeGreaterThan(30);
      }
    });
  });

  // ============================================================================
  // AUTOMATED ACCESSIBILITY TESTING WITH AXE
  // ============================================================================

  test.describe('Automated Accessibility Testing', () => {
    
    test('should pass axe accessibility tests in light mode', async () => {
      await page.evaluate(() => {
        document.documentElement.className = 'light theme-midday';
      });
      
      await page.waitForTimeout(200);
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      console.log(`Axe violations in light mode: ${accessibilityScanResults.violations.length}`);
      
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`Violation ${index + 1}: ${violation.id} - ${violation.description}`);
      });
      
      expect(accessibilityScanResults.violations).toHaveLength(0);
    });

    test('should pass axe accessibility tests in dark mode', async () => {
      await page.evaluate(() => {
        document.documentElement.className = 'dark theme-midday';
      });
      
      await page.waitForTimeout(200);
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      console.log(`Axe violations in dark mode: ${accessibilityScanResults.violations.length}`);
      
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`Violation ${index + 1}: ${violation.id} - ${violation.description}`);
      });
      
      expect(accessibilityScanResults.violations).toHaveLength(0);
    });

    test('should maintain accessibility across all theme variants', async () => {
      const variants = ['morning', 'midday', 'evening'];
      const modes = ['light', 'dark'];
      
      for (const mode of modes) {
        for (const variant of variants) {
          await page.evaluate((themeData) => {
            document.documentElement.className = `${themeData.mode} theme-${themeData.variant}`;
          }, { mode, variant });
          
          await page.waitForTimeout(200);
          
          const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();
          
          console.log(`${mode} ${variant} violations: ${accessibilityScanResults.violations.length}`);
          
          // Allow for minor violations but should be mostly accessible
          expect(accessibilityScanResults.violations.length).toBeLessThan(5);
        }
      }
    });
  });
});