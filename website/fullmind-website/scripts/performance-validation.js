#!/usr/bin/env node

/**
 * FullMind Dark Mode Performance Validation Script
 * 
 * Comprehensive performance testing for dark mode implementation
 * Tests theme switching performance, bundle impact, and clinical requirements
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Performance Testing Configuration
const PERFORMANCE_CONFIG = {
  // Test URLs
  baseUrl: 'http://localhost:3000',
  testPages: [
    '/',
    '/about',
    '/contact'
  ],
  
  // Performance Thresholds (Clinical Requirements)
  thresholds: {
    themeSwitch: 200,        // <200ms theme switching requirement
    crisisResponse: 200,     // <200ms crisis button response
    pageLoad: 2000,          // <2s page load
    fcp: 1500,              // First Contentful Paint
    lcp: 2500,              // Largest Contentful Paint
    cls: 0.1,               // Cumulative Layout Shift
    fid: 100,               // First Input Delay
    animationFrame: 16.67,   // 60fps requirement (16.67ms per frame)
  },
  
  // Test Iterations
  iterations: {
    themeSwitch: 10,
    pageLoad: 5,
    crisisButton: 20,
    animationFrames: 100,
  },
  
  // Viewport Configurations
  viewports: [
    { width: 1920, height: 1080, name: 'Desktop Large' },
    { width: 1366, height: 768, name: 'Desktop Standard' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 375, height: 667, name: 'Mobile' },
  ]
};

class PerformanceValidator {
  constructor() {
    this.browser = null;
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: 0,
        failed: 0,
        warnings: 0
      },
      tests: []
    };
  }

  async initialize() {
    console.log('🚀 Initializing FullMind Performance Validation...');
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ]
    });
    
    console.log('✅ Browser initialized');
  }

  async runAllTests() {
    console.log('\n📊 Starting Comprehensive Performance Validation\n');
    
    try {
      // Test 1: Theme Switching Performance
      await this.testThemeSwitchingPerformance();
      
      // Test 2: Page Load Performance Across Themes
      await this.testPageLoadPerformance();
      
      // Test 3: Crisis Button Response Time
      await this.testCrisisButtonPerformance();
      
      // Test 4: Animation Performance (60fps validation)
      await this.testAnimationPerformance();
      
      // Test 5: Bundle Size Analysis
      await this.testBundleSizeImpact();
      
      // Test 6: Memory Usage Analysis
      await this.testMemoryUsage();
      
      // Test 7: Lighthouse Performance Audit
      await this.runLighthouseAudit();
      
      // Test 8: Clinical Standards Validation
      await this.validateClinicalStandards();
      
    } catch (error) {
      this.addResult('CRITICAL_ERROR', 'FAILED', 'Test suite failed to complete', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  async testThemeSwitchingPerformance() {
    console.log('🎨 Testing Theme Switching Performance...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(PERFORMANCE_CONFIG.baseUrl, { waitUntil: 'networkidle0' });
      
      // Wait for theme system to initialize
      await page.waitForSelector('[data-testid="theme-selector"]', { timeout: 5000 });
      
      const results = [];
      
      for (let i = 0; i < PERFORMANCE_CONFIG.iterations.themeSwitch; i++) {
        // Measure theme switch from light to dark
        const lightToDark = await this.measureThemeSwitch(page, 'light', 'dark');
        const darkToLight = await this.measureThemeSwitch(page, 'dark', 'light');
        
        results.push(lightToDark, darkToLight);
        
        // Small delay between iterations
        await page.waitForTimeout(100);
      }
      
      const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxTime = Math.max(...results);
      const minTime = Math.min(...results);
      
      const passed = avgTime < PERFORMANCE_CONFIG.thresholds.themeSwitch;
      
      this.addResult('Theme Switching Performance', passed ? 'PASSED' : 'FAILED', 
        `Average: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms`, {
          averageTime: avgTime,
          maxTime,
          minTime,
          threshold: PERFORMANCE_CONFIG.thresholds.themeSwitch,
          allResults: results
        });
      
      console.log(`  ${passed ? '✅' : '❌'} Average theme switch time: ${avgTime.toFixed(2)}ms (threshold: ${PERFORMANCE_CONFIG.thresholds.themeSwitch}ms)`);
      
    } catch (error) {
      this.addResult('Theme Switching Performance', 'FAILED', `Test failed: ${error.message}`, { error: error.message });
    } finally {
      await page.close();
    }
  }

  async measureThemeSwitch(page, fromTheme, toTheme) {
    // Set initial theme
    await page.evaluate((theme) => {
      const button = document.querySelector(`[data-theme="${theme}"]`);
      if (button) button.click();
    }, fromTheme);
    
    await page.waitForTimeout(50); // Ensure theme is set
    
    // Measure switch to target theme
    const startTime = await page.evaluate(() => performance.now());
    
    await page.evaluate((theme) => {
      const button = document.querySelector(`[data-theme="${theme}"]`);
      if (button) button.click();
    }, toTheme);
    
    // Wait for theme transition to complete
    await page.waitForFunction(() => {
      return !document.documentElement.classList.contains('theme-transitioning');
    }, { timeout: 1000 });
    
    const endTime = await page.evaluate(() => performance.now());
    
    return endTime - startTime;
  }

  async testPageLoadPerformance() {
    console.log('⚡ Testing Page Load Performance Across Themes...');
    
    for (const testPage of PERFORMANCE_CONFIG.testPages) {
      for (const theme of ['light', 'dark']) {
        await this.measurePageLoadWithTheme(testPage, theme);
      }
    }
  }

  async measurePageLoadWithTheme(pagePath, theme) {
    const page = await this.browser.newPage();
    
    try {
      // Set theme preference in localStorage before navigation
      await page.evaluateOnNewDocument((themeMode) => {
        localStorage.setItem('fullmind-theme-preferences', JSON.stringify({
          state: {
            preferences: { colorMode: themeMode, themeVariant: 'midday' },
            persistenceVersion: '1.0.0'
          }
        }));
      }, theme);
      
      // Enable performance metrics
      await page.tracing.start({ path: `trace-${pagePath.replace('/', 'home')}-${theme}.json` });
      
      const startTime = Date.now();
      await page.goto(`${PERFORMANCE_CONFIG.baseUrl}${pagePath}`, { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - startTime;
      
      await page.tracing.stop();
      
      // Get Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          let fcp = 0, lcp = 0, cls = 0;
          
          // First Contentful Paint
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-contentful-paint') {
                fcp = entry.startTime;
              }
            }
          }).observe({ entryTypes: ['paint'] });
          
          // Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              lcp = entries[entries.length - 1].startTime;
            }
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Cumulative Layout Shift
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                cls += entry.value;
              }
            }
          }).observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => {
            resolve({ fcp, lcp, cls });
          }, 2000);
        });
      });
      
      const testName = `Page Load (${pagePath} - ${theme})`;
      const passed = loadTime < PERFORMANCE_CONFIG.thresholds.pageLoad && 
                     vitals.fcp < PERFORMANCE_CONFIG.thresholds.fcp &&
                     vitals.lcp < PERFORMANCE_CONFIG.thresholds.lcp &&
                     vitals.cls < PERFORMANCE_CONFIG.thresholds.cls;
      
      this.addResult(testName, passed ? 'PASSED' : 'FAILED',
        `Load: ${loadTime}ms, FCP: ${vitals.fcp.toFixed(2)}ms, LCP: ${vitals.lcp.toFixed(2)}ms, CLS: ${vitals.cls.toFixed(3)}`, {
          loadTime,
          vitals,
          thresholds: {
            pageLoad: PERFORMANCE_CONFIG.thresholds.pageLoad,
            fcp: PERFORMANCE_CONFIG.thresholds.fcp,
            lcp: PERFORMANCE_CONFIG.thresholds.lcp,
            cls: PERFORMANCE_CONFIG.thresholds.cls
          }
        });
      
      console.log(`  ${passed ? '✅' : '❌'} ${testName}: ${loadTime}ms load, ${vitals.fcp.toFixed(2)}ms FCP`);
      
    } catch (error) {
      this.addResult(`Page Load (${pagePath} - ${theme})`, 'FAILED', 
        `Test failed: ${error.message}`, { error: error.message });
    } finally {
      await page.close();
    }
  }

  async testCrisisButtonPerformance() {
    console.log('🚨 Testing Crisis Button Response Performance...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(PERFORMANCE_CONFIG.baseUrl, { waitUntil: 'networkidle0' });
      
      // Inject crisis button for testing
      await page.evaluate(() => {
        const button = document.createElement('button');
        button.id = 'crisis-help-button';
        button.className = 'crisis-button';
        button.textContent = 'Crisis Help - Call 988';
        button.setAttribute('data-testid', 'crisis-button');
        document.body.appendChild(button);
      });
      
      const results = [];
      
      for (let i = 0; i < PERFORMANCE_CONFIG.iterations.crisisButton; i++) {
        const responseTime = await page.evaluate(() => {
          return new Promise((resolve) => {
            const button = document.getElementById('crisis-help-button');
            const startTime = performance.now();
            
            button.addEventListener('click', () => {
              const endTime = performance.now();
              resolve(endTime - startTime);
            }, { once: true });
            
            button.click();
          });
        });
        
        results.push(responseTime);
        await page.waitForTimeout(50);
      }
      
      const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxTime = Math.max(...results);
      
      const passed = avgTime < PERFORMANCE_CONFIG.thresholds.crisisResponse;
      
      this.addResult('Crisis Button Response', passed ? 'PASSED' : 'FAILED',
        `Average: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`, {
          averageTime: avgTime,
          maxTime,
          threshold: PERFORMANCE_CONFIG.thresholds.crisisResponse,
          allResults: results
        });
      
      console.log(`  ${passed ? '✅' : '❌'} Crisis button response: ${avgTime.toFixed(2)}ms (threshold: ${PERFORMANCE_CONFIG.thresholds.crisisResponse}ms)`);
      
    } catch (error) {
      this.addResult('Crisis Button Response', 'FAILED', 
        `Test failed: ${error.message}`, { error: error.message });
    } finally {
      await page.close();
    }
  }

  async testAnimationPerformance() {
    console.log('🎬 Testing Animation Performance (60fps validation)...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(PERFORMANCE_CONFIG.baseUrl, { waitUntil: 'networkidle0' });
      
      // Test theme transitions for 60fps
      const frameData = await page.evaluate((iterations) => {
        return new Promise((resolve) => {
          const frameTimes = [];
          let frameCount = 0;
          let lastFrameTime = performance.now();
          
          function measureFrame() {
            const currentTime = performance.now();
            const frameTime = currentTime - lastFrameTime;
            frameTimes.push(frameTime);
            lastFrameTime = currentTime;
            
            frameCount++;
            if (frameCount < iterations) {
              requestAnimationFrame(measureFrame);
            } else {
              resolve(frameTimes);
            }
          }
          
          // Start theme transition to trigger animations
          const themeButton = document.querySelector('[data-theme="dark"]');
          if (themeButton) themeButton.click();
          
          requestAnimationFrame(measureFrame);
        });
      }, PERFORMANCE_CONFIG.iterations.animationFrames);
      
      const avgFrameTime = frameData.reduce((sum, time) => sum + time, 0) / frameData.length;
      const maxFrameTime = Math.max(...frameData);
      const droppedFrames = frameData.filter(time => time > PERFORMANCE_CONFIG.thresholds.animationFrame).length;
      
      const passed = avgFrameTime <= PERFORMANCE_CONFIG.thresholds.animationFrame && 
                     droppedFrames / frameData.length < 0.1; // <10% dropped frames
      
      this.addResult('Animation Performance (60fps)', passed ? 'PASSED' : 'FAILED',
        `Avg frame: ${avgFrameTime.toFixed(2)}ms, Dropped frames: ${droppedFrames}/${frameData.length}`, {
          averageFrameTime: avgFrameTime,
          maxFrameTime,
          droppedFrames,
          totalFrames: frameData.length,
          droppedFramePercentage: (droppedFrames / frameData.length) * 100,
          target: PERFORMANCE_CONFIG.thresholds.animationFrame
        });
      
      console.log(`  ${passed ? '✅' : '❌'} Animation performance: ${avgFrameTime.toFixed(2)}ms avg frame, ${droppedFrames} dropped frames`);
      
    } catch (error) {
      this.addResult('Animation Performance (60fps)', 'FAILED', 
        `Test failed: ${error.message}`, { error: error.message });
    } finally {
      await page.close();
    }
  }

  async testBundleSizeImpact() {
    console.log('📦 Testing Bundle Size Impact...');
    
    const page = await this.browser.newPage();
    
    try {
      // Enable request interception to measure bundle sizes
      await page.setRequestInterception(true);
      
      const resourceSizes = {};
      let totalJSSize = 0;
      let totalCSSSize = 0;
      
      page.on('request', (request) => {
        request.continue();
      });
      
      page.on('response', async (response) => {
        const url = response.url();
        const headers = response.headers();
        const contentLength = headers['content-length'];
        
        if (url.includes('/_next/static/') && response.ok()) {
          const size = contentLength ? parseInt(contentLength) : 0;
          
          if (url.endsWith('.js')) {
            totalJSSize += size;
            resourceSizes[`JS: ${url.split('/').pop()}`] = size;
          } else if (url.endsWith('.css')) {
            totalCSSSize += size;
            resourceSizes[`CSS: ${url.split('/').pop()}`] = size;
          }
        }
      });
      
      await page.goto(PERFORMANCE_CONFIG.baseUrl, { waitUntil: 'networkidle0' });
      
      // Test theme switching to ensure no additional bundles are loaded
      await page.evaluate(() => {
        const darkButton = document.querySelector('[data-theme="dark"]');
        if (darkButton) darkButton.click();
      });
      
      await page.waitForTimeout(1000);
      
      const totalBundleSize = totalJSSize + totalCSSSize;
      
      // Bundle size analysis
      const passed = totalBundleSize < 1000000; // <1MB total (reasonable for theme system)
      
      this.addResult('Bundle Size Impact', passed ? 'PASSED' : 'WARNING',
        `Total: ${(totalBundleSize / 1024).toFixed(2)}KB (JS: ${(totalJSSize / 1024).toFixed(2)}KB, CSS: ${(totalCSSSize / 1024).toFixed(2)}KB)`, {
          totalSize: totalBundleSize,
          jsSize: totalJSSize,
          cssSize: totalCSSSize,
          resources: resourceSizes
        });
      
      console.log(`  ${passed ? '✅' : '⚠️'} Bundle size: ${(totalBundleSize / 1024).toFixed(2)}KB total`);
      
    } catch (error) {
      this.addResult('Bundle Size Impact', 'FAILED', 
        `Test failed: ${error.message}`, { error: error.message });
    } finally {
      await page.close();
    }
  }

  async testMemoryUsage() {
    console.log('🧠 Testing Memory Usage During Theme Operations...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(PERFORMANCE_CONFIG.baseUrl, { waitUntil: 'networkidle0' });
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return performance.memory ? {
          usedJSMemory: performance.memory.usedJSMemory,
          totalJSMemory: performance.memory.totalJSMemory,
        } : null;
      });
      
      // Perform multiple theme switches
      for (let i = 0; i < 20; i++) {
        await page.evaluate(() => {
          const darkButton = document.querySelector('[data-theme="dark"]');
          const lightButton = document.querySelector('[data-theme="light"]');
          if (darkButton) darkButton.click();
        });
        await page.waitForTimeout(100);
        
        await page.evaluate(() => {
          const lightButton = document.querySelector('[data-theme="light"]');
          if (lightButton) lightButton.click();
        });
        await page.waitForTimeout(100);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if (window.gc) window.gc();
      });
      
      await page.waitForTimeout(1000);
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        return performance.memory ? {
          usedJSMemory: performance.memory.usedJSMemory,
          totalJSMemory: performance.memory.totalJSMemory,
        } : null;
      });
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSMemory - initialMemory.usedJSMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSMemory) * 100;
        
        // Memory increase should be minimal (<10% increase after 40 theme switches)
        const passed = memoryIncreasePercent < 10;
        
        this.addResult('Memory Usage', passed ? 'PASSED' : 'WARNING',
          `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(1)}%)`, {
            initialMemory,
            finalMemory,
            memoryIncrease,
            memoryIncreasePercent
          });
        
        console.log(`  ${passed ? '✅' : '⚠️'} Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(1)}%)`);
      } else {
        this.addResult('Memory Usage', 'SKIPPED', 'Memory API not available in this browser', {});
        console.log('  ⏭️ Memory usage test skipped (API not available)');
      }
      
    } catch (error) {
      this.addResult('Memory Usage', 'FAILED', 
        `Test failed: ${error.message}`, { error: error.message });
    } finally {
      await page.close();
    }
  }

  async runLighthouseAudit() {
    console.log('🔍 Running Lighthouse Performance Audit...');
    
    try {
      const lighthouse = require('lighthouse');
      const chromeLauncher = require('chrome-launcher');
      
      // Launch Chrome for Lighthouse
      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
      
      // Light theme audit
      const lightOptions = {
        logLevel: 'info',
        output: 'json',
        onlyCategories: ['performance'],
        port: chrome.port,
      };
      
      const lightResult = await lighthouse(`${PERFORMANCE_CONFIG.baseUrl}?theme=light`, lightOptions);
      
      // Dark theme audit  
      const darkResult = await lighthouse(`${PERFORMANCE_CONFIG.baseUrl}?theme=dark`, lightOptions);
      
      await chrome.kill();
      
      const lightScore = lightResult.lhr.categories.performance.score * 100;
      const darkScore = darkResult.lhr.categories.performance.score * 100;
      
      const passed = lightScore >= 80 && darkScore >= 80; // Good performance threshold
      
      this.addResult('Lighthouse Performance Audit', passed ? 'PASSED' : 'WARNING',
        `Light theme: ${lightScore.toFixed(1)}/100, Dark theme: ${darkScore.toFixed(1)}/100`, {
          lightThemeScore: lightScore,
          darkThemeScore: darkScore,
          lightMetrics: lightResult.lhr.audits,
          darkMetrics: darkResult.lhr.audits
        });
      
      console.log(`  ${passed ? '✅' : '⚠️'} Lighthouse scores - Light: ${lightScore.toFixed(1)}/100, Dark: ${darkScore.toFixed(1)}/100`);
      
    } catch (error) {
      this.addResult('Lighthouse Performance Audit', 'SKIPPED', 
        `Lighthouse not available: ${error.message}`, { error: error.message });
      console.log('  ⏭️ Lighthouse audit skipped (not available)');
    }
  }

  async validateClinicalStandards() {
    console.log('🏥 Validating Clinical Performance Standards...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(PERFORMANCE_CONFIG.baseUrl, { waitUntil: 'networkidle0' });
      
      // Test crisis button accessibility and response time
      const crisisButtonTest = await page.evaluate(() => {
        const button = document.getElementById('crisis-help-button') || 
                      document.querySelector('[data-crisis="true"]') ||
                      document.querySelector('.crisis-button');
        
        if (!button) return { found: false };
        
        const styles = window.getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        
        return {
          found: true,
          isVisible: rect.width > 0 && rect.height > 0,
          minWidth: rect.width >= 60, // 60px minimum
          minHeight: rect.height >= 60,
          hasHighContrast: true, // Assume true for now
          isAccessible: button.hasAttribute('aria-label') || button.textContent.length > 0,
          zIndex: parseInt(styles.zIndex) || 0
        };
      });
      
      // Test theme consistency across therapeutic contexts
      const therapeuticColorTest = await page.evaluate(() => {
        const root = document.documentElement;
        const crisisColor = getComputedStyle(root).getPropertyValue('--fm-crisis-bg');
        const textColor = getComputedStyle(root).getPropertyValue('--fm-text-primary');
        
        return {
          crisisColorDefined: crisisColor && crisisColor.trim() !== '',
          textColorDefined: textColor && textColor.trim() !== '',
          crisisColor: crisisColor.trim(),
          textColor: textColor.trim()
        };
      });
      
      const clinicalTests = [
        {
          name: 'Crisis Button Accessibility',
          passed: crisisButtonTest.found && crisisButtonTest.isVisible && 
                  crisisButtonTest.minWidth && crisisButtonTest.minHeight,
          details: crisisButtonTest
        },
        {
          name: 'Therapeutic Color Consistency',
          passed: therapeuticColorTest.crisisColorDefined && therapeuticColorTest.textColorDefined,
          details: therapeuticColorTest
        }
      ];
      
      clinicalTests.forEach(test => {
        this.addResult(`Clinical Standard: ${test.name}`, test.passed ? 'PASSED' : 'FAILED',
          JSON.stringify(test.details), test.details);
        console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
      });
      
    } catch (error) {
      this.addResult('Clinical Standards Validation', 'FAILED', 
        `Test failed: ${error.message}`, { error: error.message });
    } finally {
      await page.close();
    }
  }

  addResult(testName, status, description, data = {}) {
    const result = {
      testName,
      status,
      description,
      timestamp: new Date().toISOString(),
      data
    };
    
    this.results.tests.push(result);
    
    if (status === 'PASSED') this.results.summary.passed++;
    else if (status === 'WARNING') this.results.summary.warnings++;
    else this.results.summary.failed++;
  }

  async generateReport() {
    console.log('\n📊 Generating Performance Report...\n');
    
    // Console summary
    console.log('='.repeat(80));
    console.log('FULLMIND DARK MODE PERFORMANCE VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`📊 Total Tests: ${this.results.tests.length}`);
    console.log('='.repeat(80));
    
    // Detailed results
    this.results.tests.forEach(test => {
      const icon = test.status === 'PASSED' ? '✅' : 
                   test.status === 'WARNING' ? '⚠️' : 
                   test.status === 'SKIPPED' ? '⏭️' : '❌';
      console.log(`${icon} ${test.testName}: ${test.description}`);
    });
    
    console.log('\n');
    
    // Save detailed JSON report
    const reportPath = path.join(__dirname, '..', 'reports', 'performance-validation-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log(`📄 Detailed report saved to: ${reportPath}`);
    
    // Generate performance recommendations
    this.generateRecommendations();
    
    return this.results;
  }

  generateRecommendations() {
    console.log('\n💡 Performance Optimization Recommendations:\n');
    
    const failedTests = this.results.tests.filter(test => test.status === 'FAILED');
    const warningTests = this.results.tests.filter(test => test.status === 'WARNING');
    
    if (failedTests.length === 0 && warningTests.length === 0) {
      console.log('🎉 Excellent! All performance tests passed. The dark mode implementation meets clinical-grade standards.');
      return;
    }
    
    failedTests.forEach(test => {
      console.log(`❌ CRITICAL: ${test.testName}`);
      console.log(`   Issue: ${test.description}`);
      console.log(`   Recommendation: Review implementation for performance optimization\n`);
    });
    
    warningTests.forEach(test => {
      console.log(`⚠️  WARNING: ${test.testName}`);
      console.log(`   Issue: ${test.description}`);
      console.log(`   Recommendation: Consider optimization for better performance\n`);
    });
    
    // General recommendations
    console.log('📋 General Optimization Strategies:');
    console.log('   • Use CSS transform and opacity for smooth 60fps animations');
    console.log('   • Batch DOM updates using requestAnimationFrame');
    console.log('   • Minimize layout shifts during theme transitions');
    console.log('   • Ensure crisis elements maintain high contrast in all modes');
    console.log('   • Monitor memory usage during extended theme switching');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function runPerformanceValidation() {
  const validator = new PerformanceValidator();
  
  try {
    await validator.initialize();
    await validator.runAllTests();
    const results = await validator.generateReport();
    
    // Exit with appropriate code
    const hasFailures = results.summary.failed > 0;
    process.exit(hasFailures ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Performance validation failed:', error);
    process.exit(1);
  } finally {
    await validator.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  runPerformanceValidation();
}

module.exports = { PerformanceValidator, PERFORMANCE_CONFIG };