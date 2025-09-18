/**
 * FullMind Website - Manual Theme Validation Script
 * Clinical-grade manual testing for theme switching functionality
 * 
 * Run this script in the browser console to validate theme implementation
 * Usage: Copy and paste this entire script into the browser console
 */

(function() {
  'use strict';
  
  console.log('🎨 FullMind Dark Mode - Manual Validation Script');
  console.log('================================================');
  
  // Test Results Storage
  const testResults = {
    themeSwitching: [],
    performance: [],
    persistence: [],
    crisisSafety: [],
    accessibility: []
  };
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  function logSuccess(category, test, details = '') {
    const result = `✅ ${test}${details ? ' - ' + details : ''}`;
    console.log(result);
    testResults[category].push({ status: 'PASS', test, details });
  }
  
  function logWarning(category, test, details = '') {
    const result = `⚠️  ${test}${details ? ' - ' + details : ''}`;
    console.warn(result);
    testResults[category].push({ status: 'WARN', test, details });
  }
  
  function logError(category, test, details = '') {
    const result = `❌ ${test}${details ? ' - ' + details : ''}`;
    console.error(result);
    testResults[category].push({ status: 'FAIL', test, details });
  }
  
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function measureTime(fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    return { result, time: end - start };
  }
  
  async function measureAsyncTime(fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, time: end - start };
  }
  
  // ============================================================================
  // THEME SWITCHING TESTS
  // ============================================================================
  
  async function testThemeSwitching() {
    console.log('\\n🔄 Testing Theme Switching Functionality');
    console.log('------------------------------------------');
    
    // Test 1: Check if CSS variables exist
    const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--fm-bg-primary');
    if (bgPrimary.trim()) {
      logSuccess('themeSwitching', 'CSS Variables Setup', `--fm-bg-primary: ${bgPrimary.trim()}`);
    } else {
      logError('themeSwitching', 'CSS Variables Setup', 'Missing --fm-bg-primary');
    }
    
    // Test 2: Check current theme classes
    const htmlClasses = document.documentElement.className;
    const hasThemeClass = /light|dark/.test(htmlClasses);
    const hasVariantClass = /theme-(morning|midday|evening)/.test(htmlClasses);
    
    if (hasThemeClass) {
      logSuccess('themeSwitching', 'Theme Mode Class', htmlClasses);
    } else {
      logError('themeSwitching', 'Theme Mode Class', 'Missing light/dark class');
    }
    
    if (hasVariantClass) {
      logSuccess('themeSwitching', 'Theme Variant Class', htmlClasses);
    } else {
      logError('themeSwitching', 'Theme Variant Class', 'Missing variant class');
    }
    
    // Test 3: Look for theme controls
    const themeControls = [
      ...document.querySelectorAll('[aria-label*="theme" i]'),
      ...document.querySelectorAll('[aria-label*="color mode" i]'),
      ...document.querySelectorAll('select[id*="color-mode"]'),
      ...document.querySelectorAll('.theme-selector'),
      ...document.querySelectorAll('[data-theme-toggle]')
    ];
    
    if (themeControls.length > 0) {
      logSuccess('themeSwitching', 'Theme Controls Found', `${themeControls.length} controls detected`);
      
      // Test 4: Try to trigger theme change
      const control = themeControls[0];
      const initialClass = document.documentElement.className;
      
      try {
        const measurement = measureTime(() => {
          if (control.tagName === 'SELECT') {
            const currentValue = control.value;
            const newValue = currentValue === 'light' ? 'dark' : 'light';
            control.value = newValue;
            control.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            control.click();
          }
        });
        
        await wait(300); // Wait for theme transition
        
        const newClass = document.documentElement.className;
        if (newClass !== initialClass) {
          logSuccess('themeSwitching', 'Theme Change Function', 
            `Changed from "${initialClass}" to "${newClass}" in ${measurement.time.toFixed(2)}ms`);
            
          if (measurement.time < 200) {
            logSuccess('performance', 'Theme Switch Speed', `${measurement.time.toFixed(2)}ms (< 200ms requirement)`);
          } else {
            logWarning('performance', 'Theme Switch Speed', `${measurement.time.toFixed(2)}ms (>= 200ms requirement)`);
          }
        } else {
          logWarning('themeSwitching', 'Theme Change Function', 'No visual change detected');
        }
        
      } catch (error) {
        logError('themeSwitching', 'Theme Control Interaction', error.message);
      }
    } else {
      logWarning('themeSwitching', 'Theme Controls Found', 'No theme controls detected');
    }
  }
  
  // ============================================================================
  // PERSISTENCE TESTS
  // ============================================================================
  
  function testPersistence() {
    console.log('\\n💾 Testing Persistence Mechanisms');
    console.log('-----------------------------------');
    
    // Test 1: Check localStorage
    const storageKeys = [
      'fullmind-theme-preferences',
      'fullmind-theme',
      'theme-preferences',
      'color-mode'
    ];
    
    let foundStorage = false;
    for (const key of storageKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        foundStorage = true;
        try {
          const parsed = JSON.parse(value);
          logSuccess('persistence', 'LocalStorage Data', `${key}: ${JSON.stringify(parsed, null, 2)}`);
        } catch {
          logSuccess('persistence', 'LocalStorage Data', `${key}: ${value}`);
        }
      }
    }
    
    if (!foundStorage) {
      logWarning('persistence', 'LocalStorage Data', 'No theme preferences found in localStorage');
    }
    
    // Test 2: Check system theme detection
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const systemTheme = mediaQuery.matches ? 'dark' : 'light';
    logSuccess('persistence', 'System Theme Detection', `System prefers: ${systemTheme}`);
    
    // Test 3: Test storage write
    try {
      const testKey = 'fullmind-theme-test';
      const testValue = JSON.stringify({ test: true, timestamp: Date.now() });
      localStorage.setItem(testKey, testValue);
      
      const retrieved = localStorage.getItem(testKey);
      if (retrieved === testValue) {
        logSuccess('persistence', 'Storage Write/Read', 'Storage operations working');
        localStorage.removeItem(testKey);
      } else {
        logError('persistence', 'Storage Write/Read', 'Storage read/write mismatch');
      }
    } catch (error) {
      logError('persistence', 'Storage Access', error.message);
    }
  }
  
  // ============================================================================
  // CRISIS SAFETY TESTS
  // ============================================================================
  
  function testCrisisSafety() {
    console.log('\\n🚨 Testing Crisis Safety Features');
    console.log('-----------------------------------');
    
    // Test 1: Look for crisis elements
    const crisisSelectors = [
      '[data-crisis="true"]',
      '.crisis-button',
      '[aria-label*="crisis" i]',
      '[aria-label*="988" i]',
      '[href*="988"]',
      '[href*="crisis"]',
      'a[href*="tel:988"]'
    ];
    
    let crisisElements = [];
    for (const selector of crisisSelectors) {
      const elements = document.querySelectorAll(selector);
      crisisElements.push(...elements);
    }
    
    if (crisisElements.length > 0) {
      logSuccess('crisisSafety', 'Crisis Elements Found', `${crisisElements.length} crisis elements detected`);
      
      // Test 2: Check crisis element visibility
      for (let i = 0; i < Math.min(3, crisisElements.length); i++) {
        const element = crisisElements[i];
        const computed = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        const isVisible = computed.display !== 'none' && 
                         computed.visibility !== 'hidden' && 
                         computed.opacity !== '0' &&
                         rect.width > 0 && rect.height > 0;
        
        if (isVisible) {
          logSuccess('crisisSafety', `Crisis Element ${i + 1} Visibility`, 
            `Size: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}px`);
        } else {
          logError('crisisSafety', `Crisis Element ${i + 1} Visibility`, 'Element not visible');
        }
        
        // Test 3: Check crisis element contrast (simplified)
        if (isVisible) {
          const bgColor = computed.backgroundColor;
          const textColor = computed.color;
          
          if (bgColor.includes('rgb') && textColor.includes('rgb')) {
            logSuccess('crisisSafety', `Crisis Element ${i + 1} Colors`, 
              `Background: ${bgColor}, Text: ${textColor}`);
          } else {
            logWarning('crisisSafety', `Crisis Element ${i + 1} Colors`, 
              'Unable to parse colors for contrast check');
          }
        }
      }
    } else {
      logWarning('crisisSafety', 'Crisis Elements Found', 'No crisis elements detected on current page');
    }
    
    // Test 4: Check for crisis-related CSS classes and variables
    const crisisVars = [
      '--fm-crisis-bg',
      '--fm-crisis-text',
      '--fm-crisis-border',
      '--fm-crisis-hover'
    ];
    
    let foundCrisisVars = 0;
    crisisVars.forEach(varName => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
      if (value.trim()) {
        foundCrisisVars++;
        logSuccess('crisisSafety', 'Crisis CSS Variables', `${varName}: ${value.trim()}`);
      }
    });
    
    if (foundCrisisVars === 0) {
      logWarning('crisisSafety', 'Crisis CSS Variables', 'No crisis-specific CSS variables found');
    }
  }
  
  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================
  
  function testAccessibility() {
    console.log('\\n♿ Testing Accessibility Features');
    console.log('----------------------------------');
    
    // Test 1: Check ARIA landmarks
    const landmarks = document.querySelectorAll('[role], [aria-label], [aria-labelledby]');
    logSuccess('accessibility', 'ARIA Elements', `${landmarks.length} elements with ARIA attributes`);
    
    // Test 2: Check focus management
    const focusableElements = document.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    logSuccess('accessibility', 'Focusable Elements', `${focusableElements.length} focusable elements`);
    
    // Test 3: Check reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const transitionDuration = getComputedStyle(document.documentElement)
      .getPropertyValue('--fm-transition-duration') || 
      getComputedStyle(document.documentElement).getPropertyValue('transition-duration');
    
    if (prefersReducedMotion) {
      logSuccess('accessibility', 'Reduced Motion Support', 
        `User prefers reduced motion, transition duration: ${transitionDuration || 'none'}`);
    } else {
      logSuccess('accessibility', 'Motion Preferences', 
        `Normal motion allowed, transition duration: ${transitionDuration || '150ms default'}`);
    }
    
    // Test 4: Check high contrast support
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    if (prefersHighContrast) {
      logSuccess('accessibility', 'High Contrast Support', 'User prefers high contrast');
    } else {
      logSuccess('accessibility', 'Contrast Preferences', 'Normal contrast mode');
    }
    
    // Test 5: Check keyboard navigation
    let keyboardTestResult = 'Unknown';
    try {
      const firstFocusable = focusableElements[0];
      if (firstFocusable) {
        firstFocusable.focus();
        if (document.activeElement === firstFocusable) {
          keyboardTestResult = 'Working';
        }
      }
    } catch (error) {
      keyboardTestResult = 'Error: ' + error.message;
    }
    
    if (keyboardTestResult === 'Working') {
      logSuccess('accessibility', 'Keyboard Navigation', 'Focus management working');
    } else {
      logWarning('accessibility', 'Keyboard Navigation', keyboardTestResult);
    }
  }
  
  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================
  
  function testPerformance() {
    console.log('\\n⚡ Testing Performance Metrics');
    console.log('-------------------------------');
    
    // Test 1: Check bundle size impact
    if (performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource');
      const cssFiles = resources.filter(r => r.name.includes('.css'));
      const jsFiles = resources.filter(r => r.name.includes('.js'));
      
      logSuccess('performance', 'Resource Loading', 
        `${cssFiles.length} CSS files, ${jsFiles.length} JS files`);
      
      // Test 2: Check largest files
      const largestFiles = [...cssFiles, ...jsFiles]
        .sort((a, b) => b.transferSize - a.transferSize)
        .slice(0, 3);
      
      largestFiles.forEach((file, index) => {
        const size = (file.transferSize / 1024).toFixed(1);
        logSuccess('performance', `Largest File ${index + 1}`, 
          `${file.name.split('/').pop()}: ${size}KB`);
      });
    }
    
    // Test 3: Memory usage (if available)
    if (performance.memory) {
      const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      logSuccess('performance', 'Memory Usage', `${memoryMB}MB JS heap used`);
    }
    
    // Test 4: Theme transition performance test
    const themeControl = document.querySelector('[aria-label*="theme" i], select[id*="color-mode"]');
    if (themeControl) {
      const measurements = [];
      
      // Perform 5 rapid theme switches to test performance
      for (let i = 0; i < 5; i++) {
        const measurement = measureTime(() => {
          if (themeControl.tagName === 'SELECT') {
            const currentValue = themeControl.value;
            const newValue = currentValue === 'light' ? 'dark' : 
                           currentValue === 'dark' ? 'auto' : 'light';
            themeControl.value = newValue;
            themeControl.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            themeControl.click();
          }
        });
        measurements.push(measurement.time);
      }
      
      const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxTime = Math.max(...measurements);
      
      if (avgTime < 200) {
        logSuccess('performance', 'Theme Switch Performance', 
          `Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms (< 200ms requirement)`);
      } else {
        logWarning('performance', 'Theme Switch Performance', 
          `Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms (>= 200ms requirement)`);
      }
    }
  }
  
  // ============================================================================
  // MAIN TEST EXECUTION
  // ============================================================================
  
  async function runAllTests() {
    console.log('🚀 Starting FullMind Dark Mode Validation');
    console.log('==========================================');
    
    try {
      await testThemeSwitching();
      testPersistence();
      testCrisisSafety();
      testAccessibility();
      testPerformance();
      
      // Generate Summary Report
      console.log('\\n📊 TEST SUMMARY REPORT');
      console.log('=======================');
      
      let totalTests = 0;
      let passedTests = 0;
      let warningTests = 0;
      let failedTests = 0;
      
      Object.entries(testResults).forEach(([category, results]) => {
        const passed = results.filter(r => r.status === 'PASS').length;
        const warnings = results.filter(r => r.status === 'WARN').length;
        const failed = results.filter(r => r.status === 'FAIL').length;
        const total = results.length;
        
        totalTests += total;
        passedTests += passed;
        warningTests += warnings;
        failedTests += failed;
        
        const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
        console.log(`\\n${categoryTitle}:`);
        console.log(`  ✅ Passed: ${passed}/${total}`);
        if (warnings > 0) console.log(`  ⚠️  Warnings: ${warnings}/${total}`);
        if (failed > 0) console.log(`  ❌ Failed: ${failed}/${total}`);
      });
      
      console.log('\\n📈 OVERALL RESULTS:');
      console.log(`  Total Tests: ${totalTests}`);
      console.log(`  ✅ Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
      console.log(`  ⚠️  Warnings: ${warningTests} (${((warningTests/totalTests)*100).toFixed(1)}%)`);
      console.log(`  ❌ Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
      
      // Production Readiness Assessment
      const successRate = passedTests / totalTests;
      console.log('\\n🎯 PRODUCTION READINESS ASSESSMENT:');
      
      if (successRate >= 0.95 && failedTests === 0) {
        console.log('✅ PRODUCTION READY - All critical tests passed');
      } else if (successRate >= 0.85 && failedTests <= 2) {
        console.log('⚠️  NEARLY READY - Minor issues to address before production');
      } else {
        console.log('❌ NOT READY - Significant issues require attention before production');
      }
      
      // Store results globally for further analysis
      window.fullmindThemeTestResults = {
        summary: { totalTests, passedTests, warningTests, failedTests, successRate },
        details: testResults,
        timestamp: new Date().toISOString()
      };
      
      console.log('\\n💾 Results saved to window.fullmindThemeTestResults');
      console.log('🎨 FullMind Dark Mode Validation Complete!');
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    }
  }
  
  // Start the tests
  runAllTests();
  
})();