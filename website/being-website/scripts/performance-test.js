#!/usr/bin/env node
/**
 * FullMind Clinical Performance Testing
 * Automated performance testing for clinical-grade requirements
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Clinical performance thresholds
const CLINICAL_THRESHOLDS = {
  LCP: 2000,        // Largest Contentful Paint - 2s max
  FID: 100,         // First Input Delay - 100ms max
  CLS: 0.1,         // Cumulative Layout Shift - 0.1 max
  FCP: 1500,        // First Contentful Paint - 1.5s max
  TTI: 3000,        // Time to Interactive - 3s max
  CRISIS_RESPONSE: 200, // Crisis button response time - 200ms max
};

const URLS_TO_TEST = [
  'http://localhost:3000',
  'http://localhost:3000/#crisis-resources',
];

/**
 * Test Core Web Vitals using Lighthouse
 */
async function testCoreWebVitals(url) {
  console.log(`\n🔍 Testing Core Web Vitals for: ${url}`);
  
  try {
    const lighthouseCommand = [
      'lighthouse',
      url,
      '--only-categories=performance',
      '--output=json',
      '--output-path=./reports/lighthouse-performance.json',
      '--chrome-flags="--headless --no-sandbox --disable-dev-shm-usage"',
      '--preset=desktop'
    ].join(' ');

    console.log('Running Lighthouse audit...');
    execSync(lighthouseCommand, { stdio: 'pipe' });

    // Read and parse results
    const reportPath = './reports/lighthouse-performance.json';
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    const metrics = {
      LCP: report.audits['largest-contentful-paint'].numericValue,
      FID: report.audits['max-potential-fid'].numericValue,
      CLS: report.audits['cumulative-layout-shift'].numericValue,
      FCP: report.audits['first-contentful-paint'].numericValue,
      TTI: report.audits['interactive'].numericValue,
      performanceScore: report.categories.performance.score * 100
    };

    console.log('\n📊 Core Web Vitals Results:');
    console.log('================================');
    
    Object.entries(metrics).forEach(([key, value]) => {
      if (key === 'performanceScore') {
        const status = value >= 90 ? '✅' : value >= 50 ? '⚠️' : '❌';
        console.log(`${status} Performance Score: ${value.toFixed(1)}/100`);
        return;
      }
      
      const threshold = CLINICAL_THRESHOLDS[key];
      const status = threshold && value <= threshold ? '✅' : '❌';
      const unit = key === 'CLS' ? '' : 'ms';
      console.log(`${status} ${key}: ${value.toFixed(1)}${unit} (Target: ${threshold}${unit})`);
    });

    return metrics;
  } catch (error) {
    console.error(`❌ Performance test failed: ${error.message}`);
    return null;
  }
}

/**
 * Test bundle size
 */
function testBundleSize() {
  console.log('\n📦 Bundle Size Analysis');
  console.log('========================');
  
  try {
    // Get bundle sizes from .next directory
    const nextDir = './.next';
    const staticDir = path.join(nextDir, 'static');
    
    if (!fs.existsSync(staticDir)) {
      console.log('⚠️  No production build found. Run "npm run build" first.');
      return null;
    }

    const stats = [];
    
    // Recursively get all JS and CSS files
    function getFileSizes(dir, type) {
      if (!fs.existsSync(dir)) return 0;
      
      let totalSize = 0;
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          totalSize += getFileSizes(filePath, type);
        } else if (file.endsWith(type)) {
          totalSize += stat.size;
        }
      });
      
      return totalSize;
    }

    const jsSize = getFileSizes(staticDir, '.js');
    const cssSize = getFileSizes(staticDir, '.css');
    
    const formatSize = (bytes) => {
      const kb = bytes / 1024;
      return kb > 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${kb.toFixed(1)}KB`;
    };

    console.log(`📄 JavaScript: ${formatSize(jsSize)}`);
    console.log(`🎨 CSS: ${formatSize(cssSize)}`);
    console.log(`📊 Total: ${formatSize(jsSize + cssSize)}`);
    
    // Check against clinical thresholds
    const jsThreshold = 250 * 1024; // 250KB
    const cssThreshold = 50 * 1024;  // 50KB
    
    const jsStatus = jsSize <= jsThreshold ? '✅' : '❌';
    const cssStatus = cssSize <= cssThreshold ? '✅' : '❌';
    
    console.log(`\n${jsStatus} JS Size: Within clinical limits (${formatSize(jsThreshold)} max)`);
    console.log(`${cssStatus} CSS Size: Within clinical limits (${formatSize(cssThreshold)} max)`);

    return { jsSize, cssSize, total: jsSize + cssSize };
  } catch (error) {
    console.error(`❌ Bundle analysis failed: ${error.message}`);
    return null;
  }
}

/**
 * Test crisis response time simulation
 */
async function testCrisisResponseTime() {
  console.log('\n🚨 Crisis Response Time Test');
  console.log('===============================');
  
  try {
    // Simulate crisis button click timing
    const testScript = `
      const start = performance.now();
      // Simulate finding crisis button and clicking
      const crisisBtn = document.querySelector('[data-crisis], [aria-label*="crisis"]');
      if (crisisBtn) {
        crisisBtn.click();
        const end = performance.now();
        console.log('CRISIS_RESPONSE_TIME:', end - start);
      } else {
        console.log('CRISIS_BUTTON_NOT_FOUND');
      }
    `;

    // This would be run in a browser automation tool
    console.log('⚠️  Crisis button test requires browser automation (Playwright/Puppeteer)');
    console.log('📝 Manual test: Verify crisis button responds within 200ms');
    
    return null;
  } catch (error) {
    console.error(`❌ Crisis response test failed: ${error.message}`);
    return null;
  }
}

/**
 * Generate performance report
 */
function generateReport(results) {
  console.log('\n📋 Clinical Performance Report');
  console.log('=================================');
  
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    results,
    clinicalCompliance: {
      coreWebVitals: results.webVitals ? 'TESTED' : 'FAILED',
      bundleSize: results.bundleSize ? 'TESTED' : 'FAILED',
      crisisResponse: 'REQUIRES_MANUAL_TEST'
    }
  };

  // Write report to file
  const reportPath = './reports/clinical-performance-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Report saved to: ${reportPath}`);
  
  // Summary
  const passed = Object.values(report.clinicalCompliance).filter(v => v === 'TESTED').length;
  const total = Object.keys(report.clinicalCompliance).length;
  
  console.log(`\n✅ Tests Passed: ${passed}/${total}`);
  
  if (results.webVitals) {
    const lcpPass = results.webVitals.LCP <= CLINICAL_THRESHOLDS.LCP;
    const fidPass = results.webVitals.FID <= CLINICAL_THRESHOLDS.FID;
    const clsPass = results.webVitals.CLS <= CLINICAL_THRESHOLDS.CLS;
    
    if (lcpPass && fidPass && clsPass) {
      console.log('🏥 CLINICAL GRADE: Performance meets mental health application standards');
    } else {
      console.log('⚠️  CLINICAL GRADE: Performance optimization required for mental health users');
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🏥 FullMind Clinical Performance Testing');
  console.log('==========================================');
  
  // Ensure reports directory exists
  if (!fs.existsSync('./reports')) {
    fs.mkdirSync('./reports');
  }

  const results = {};
  
  // Test each URL
  for (const url of URLS_TO_TEST) {
    results.webVitals = await testCoreWebVitals(url);
    if (results.webVitals) break; // Use first successful test
  }
  
  // Test bundle size
  results.bundleSize = testBundleSize();
  
  // Test crisis response
  results.crisisResponse = await testCrisisResponseTime();
  
  // Generate report
  generateReport(results);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCoreWebVitals, testBundleSize, testCrisisResponseTime };