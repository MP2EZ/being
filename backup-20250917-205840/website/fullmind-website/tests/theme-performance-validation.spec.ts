/**
 * FullMind Website - Theme Performance Validation Suite
 * Clinical-grade performance testing for theme switching and crisis response times
 * 
 * Performance Requirements:
 * - Theme switching: <200ms response time
 * - Crisis button: <200ms response time  
 * - Memory usage: No significant leaks during extended use
 * - Animation: 60fps during transitions
 * - Bundle impact: Minimal size increase
 */

import { test, expect, Page } from '@playwright/test';

test.describe('FullMind Dark Mode - Performance Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:3000');
    
    // Wait for theme system to fully initialize
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================================================
  // THEME SWITCHING PERFORMANCE TESTS
  // ============================================================================

  test.describe('Theme Switching Performance', () => {
    
    test('should switch themes within 200ms requirement', async () => {
      const measurements: number[] = [];
      
      // Find theme controls
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"], .theme-selector button').first();
      
      if (await themeToggle.count() === 0) {
        console.log('No theme controls found - skipping performance test');
        return;
      }

      // Perform multiple measurements for accuracy
      for (let i = 0; i < 10; i++) {
        const startTime = await page.evaluate(() => performance.now());
        
        await themeToggle.click();
        
        // Wait for CSS variables to update (theme change complete)
        await page.waitForFunction(() => {
          const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--fm-bg-primary');
          return bgPrimary && bgPrimary.trim() !== '';
        }, { timeout: 1000 });
        
        const endTime = await page.evaluate(() => performance.now());
        const switchTime = endTime - startTime;
        measurements.push(switchTime);
        
        // Wait between measurements
        await page.waitForTimeout(100);
      }

      // Analyze results
      const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxTime = Math.max(...measurements);
      const minTime = Math.min(...measurements);

      console.log('Theme Switch Performance Results:');
      console.log(`Average: ${averageTime.toFixed(2)}ms`);
      console.log(`Maximum: ${maxTime.toFixed(2)}ms`);
      console.log(`Minimum: ${minTime.toFixed(2)}ms`);
      console.log(`Requirement: <200ms`);

      // Assertions
      expect(averageTime).toBeLessThan(200);
      expect(maxTime).toBeLessThan(300); // Allow some variance for max
      
      // Performance consistency check
      const variance = measurements.map(t => Math.abs(t - averageTime));
      const maxVariance = Math.max(...variance);
      expect(maxVariance).toBeLessThan(100); // Should be reasonably consistent
    });

    test('should measure CSS variable update performance', async () => {
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await themeToggle.count() === 0) return;

      // Measure CSS variable update time specifically
      const cssUpdateTime = await page.evaluate(async () => {
        const startTime = performance.now();
        
        // Trigger theme change
        const event = new Event('click');
        const themeButton = document.querySelector('button[aria-label*="theme"], select[id*="color-mode"]') as HTMLElement;
        if (themeButton) {
          themeButton.click();
        }
        
        // Wait for CSS variables to be updated
        return new Promise<number>((resolve) => {
          const observer = new MutationObserver(() => {
            const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--fm-bg-primary');
            if (bgPrimary && bgPrimary.trim() !== '') {
              const endTime = performance.now();
              observer.disconnect();
              resolve(endTime - startTime);
            }
          });
          
          observer.observe(document.documentElement, { 
            attributes: true, 
            attributeFilter: ['style', 'class'] 
          });
          
          // Fallback timeout
          setTimeout(() => {
            observer.disconnect();
            resolve(performance.now() - startTime);
          }, 500);
        });
      });

      console.log(`CSS Variable Update Time: ${cssUpdateTime.toFixed(2)}ms`);
      expect(cssUpdateTime).toBeLessThan(50); // CSS variables should update very quickly
    });

    test('should maintain 60fps during theme transitions', async () => {
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await themeToggle.count() === 0) return;

      // Monitor frame rate during transition
      const frameRateData = await page.evaluate(async () => {
        let frameCount = 0;
        let lastTime = performance.now();
        const frameTimes: number[] = [];
        
        // Start monitoring
        const animate = (currentTime: number) => {
          const deltaTime = currentTime - lastTime;
          frameTimes.push(deltaTime);
          lastTime = currentTime;
          frameCount++;
          
          if (frameCount < 60) { // Monitor for ~1 second at 60fps
            requestAnimationFrame(animate);
          }
        };
        
        requestAnimationFrame(animate);
        
        // Trigger theme change during monitoring
        setTimeout(() => {
          const themeButton = document.querySelector('button[aria-label*="theme"], select[id*="color-mode"]') as HTMLElement;
          if (themeButton) {
            themeButton.click();
          }
        }, 100);
        
        // Wait for monitoring to complete
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Calculate average FPS
        const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const averageFPS = 1000 / averageFrameTime;
        
        return {
          averageFPS,
          frameCount,
          frameTimes: frameTimes.slice(0, 10) // Return first 10 for debugging
        };
      });

      console.log(`Average FPS during theme transition: ${frameRateData.averageFPS.toFixed(2)}`);
      console.log(`Frame count monitored: ${frameRateData.frameCount}`);

      // Should maintain close to 60fps (allow some tolerance for system variance)
      expect(frameRateData.averageFPS).toBeGreaterThan(50);
    });
  });

  // ============================================================================
  // CRISIS BUTTON PERFORMANCE TESTS
  // ============================================================================

  test.describe('Crisis Button Performance', () => {
    
    test('should respond to crisis button within 200ms requirement', async () => {
      const crisisButtons = page.locator('[data-crisis="true"], .crisis-button, [aria-label*="crisis"], [aria-label*="988"]');
      
      if (await crisisButtons.count() === 0) {
        console.log('No crisis buttons found - skipping crisis performance test');
        return;
      }

      const crisisButton = crisisButtons.first();
      const measurements: number[] = [];

      // Test multiple times for accuracy
      for (let i = 0; i < 5; i++) {
        const startTime = await page.evaluate(() => performance.now());
        
        await crisisButton.click();
        
        // Wait for crisis response (could be navigation, modal, etc.)
        await page.waitForTimeout(50); // Brief wait for any immediate visual change
        
        const endTime = await page.evaluate(() => performance.now());
        const responseTime = endTime - startTime;
        measurements.push(responseTime);
        
        // Navigate back or reset if needed
        await page.waitForTimeout(100);
      }

      const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxTime = Math.max(...measurements);

      console.log('Crisis Button Performance Results:');
      console.log(`Average Response Time: ${averageTime.toFixed(2)}ms`);
      console.log(`Maximum Response Time: ${maxTime.toFixed(2)}ms`);
      console.log(`Requirement: <200ms`);

      expect(averageTime).toBeLessThan(200);
      expect(maxTime).toBeLessThan(250); // Allow slight variance for maximum
    });

    test('should maintain crisis button accessibility during performance stress', async () => {
      // Create performance stress
      await page.evaluate(() => {
        // Create some DOM manipulation to stress the system
        for (let i = 0; i < 100; i++) {
          const div = document.createElement('div');
          div.textContent = `Stress test element ${i}`;
          document.body.appendChild(div);
        }
      });

      const crisisButton = page.locator('[data-crisis="true"], .crisis-button').first();
      
      if (await crisisButton.count() > 0) {
        // Test that crisis button is still accessible
        await expect(crisisButton).toBeVisible();
        await expect(crisisButton).toBeEnabled();
        
        // Test response time under stress
        const startTime = Date.now();
        await crisisButton.click();
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(300); // Slightly higher tolerance under stress
      }

      // Cleanup
      await page.evaluate(() => {
        const stressElements = document.querySelectorAll('[data-stress]');
        stressElements.forEach(el => el.remove());
      });
    });
  });

  // ============================================================================
  // MEMORY USAGE TESTS
  // ============================================================================

  test.describe('Memory Usage Validation', () => {
    
    test('should not cause memory leaks during extended theme switching', async () => {
      // Only run if memory API is available
      const hasMemoryAPI = await page.evaluate(() => {
        return !!(performance as any).memory;
      });

      if (!hasMemoryAPI) {
        console.log('Memory API not available - skipping memory test');
        return;
      }

      const initialMemory = await page.evaluate(() => (performance as any).memory.usedJSHeapSize);
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();

      if (await themeToggle.count() === 0) return;

      // Perform extensive theme switching
      console.log('Starting memory leak test - performing 50 theme switches...');
      
      for (let i = 0; i < 50; i++) {
        await themeToggle.click();
        await page.waitForTimeout(20); // Rapid switching
        
        if (i % 10 === 0) {
          console.log(`Completed ${i} theme switches...`);
        }
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      // Wait a bit for GC to complete
      await page.waitForTimeout(1000);

      const finalMemory = await page.evaluate(() => (performance as any).memory.usedJSHeapSize);
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

      console.log('Memory Usage Results:');
      console.log(`Initial Memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Final Memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Memory Increase Percentage: ${memoryIncreasePercent.toFixed(2)}%`);

      // Memory should not increase significantly (allow for normal variance)
      expect(memoryIncreasePercent).toBeLessThan(50); // Less than 50% increase
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });

    test('should efficiently manage DOM updates during theme changes', async () => {
      // Count DOM mutations during theme change
      const mutationCount = await page.evaluate(async () => {
        let mutationCounter = 0;
        
        const observer = new MutationObserver((mutations) => {
          mutationCounter += mutations.length;
        });

        observer.observe(document.documentElement, {
          attributes: true,
          childList: true,
          subtree: true,
          attributeFilter: ['class', 'style']
        });

        // Trigger theme change
        const themeButton = document.querySelector('button[aria-label*="theme"], select[id*="color-mode"]') as HTMLElement;
        if (themeButton) {
          themeButton.click();
        }

        // Wait for changes to complete
        await new Promise(resolve => setTimeout(resolve, 300));
        
        observer.disconnect();
        return mutationCounter;
      });

      console.log(`DOM mutations during theme change: ${mutationCount}`);
      
      // Should have minimal DOM mutations (efficient CSS variable approach)
      expect(mutationCount).toBeLessThan(20); // Allow for reasonable updates
    });
  });

  // ============================================================================
  // BUNDLE SIZE AND LOADING PERFORMANCE
  // ============================================================================

  test.describe('Bundle Size and Loading Performance', () => {
    
    test('should load theme system efficiently', async () => {
      // Measure page load time
      const navigationTiming = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
          loadComplete: nav.loadEventEnd - nav.loadEventStart,
          totalTime: nav.loadEventEnd - nav.navigationStart
        };
      });

      console.log('Page Loading Performance:');
      console.log(`DOM Content Loaded: ${navigationTiming.domContentLoaded.toFixed(2)}ms`);
      console.log(`Load Complete: ${navigationTiming.loadComplete.toFixed(2)}ms`);
      console.log(`Total Time: ${navigationTiming.totalTime.toFixed(2)}ms`);

      // Should load reasonably quickly
      expect(navigationTiming.totalTime).toBeLessThan(5000); // Less than 5 seconds
    });

    test('should initialize theme system quickly after page load', async () => {
      // Reload and measure theme initialization
      await page.reload();
      
      const themeInitTime = await page.evaluate(async () => {
        const startTime = performance.now();
        
        // Wait for theme system to be ready (CSS variables set)
        await new Promise<void>((resolve) => {
          const checkReady = () => {
            const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--fm-bg-primary');
            if (bgPrimary && bgPrimary.trim() !== '') {
              resolve();
            } else {
              requestAnimationFrame(checkReady);
            }
          };
          checkReady();
        });
        
        return performance.now() - startTime;
      });

      console.log(`Theme System Initialization Time: ${themeInitTime.toFixed(2)}ms`);
      expect(themeInitTime).toBeLessThan(1000); // Should initialize within 1 second
    });
  });

  // ============================================================================
  // STRESS TESTING
  // ============================================================================

  test.describe('Stress Testing', () => {
    
    test('should handle concurrent theme operations', async () => {
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await themeToggle.count() === 0) return;

      // Perform concurrent operations
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(themeToggle.click());
        promises.push(page.waitForTimeout(10));
      }

      // Wait for all operations to complete
      await Promise.allSettled(promises);

      // Verify system is still functional
      const htmlClass = await page.getAttribute('html', 'class');
      expect(htmlClass).toMatch(/light|dark/);
      
      // Theme controls should still be responsive
      await expect(themeToggle).toBeVisible();
    });

    test('should maintain performance under high CPU load simulation', async () => {
      // Simulate CPU load
      const cpuLoadPromise = page.evaluate(async () => {
        const startTime = Date.now();
        // Simulate CPU intensive task
        while (Date.now() - startTime < 2000) {
          Math.random() * Math.random();
        }
      });

      // Test theme switching during CPU load
      const themeToggle = page.locator('button[aria-label*="theme"], select[id*="color-mode"]').first();
      
      if (await themeToggle.count() > 0) {
        const startTime = Date.now();
        await themeToggle.click();
        const endTime = Date.now();
        
        const responseTime = endTime - startTime;
        console.log(`Theme switch time under CPU load: ${responseTime}ms`);
        
        // Should still respond reasonably (allow higher tolerance)
        expect(responseTime).toBeLessThan(500);
      }

      await cpuLoadPromise;
    });
  });
});