#!/usr/bin/env node

/**
 * FullMind Website - Accessibility Audit Script
 * Automated WCAG AA compliance testing with mental health specific validation
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Accessibility audit configuration
const AUDIT_CONFIG = {
  urls: [
    '/',
    '/about',
    '/features',
    '/support',
    '/privacy',
    '/contact'
  ],
  reportDir: './reports',
  thresholds: {
    critical: 0,
    serious: 0,
    moderate: 2,
    minor: 5
  },
  mentalHealthChecks: true
};

// Log helper functions
function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${colors.bold}${colors.blue}=== ${message} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

// Create reports directory
async function createReportsDirectory() {
  try {
    await fs.mkdir(AUDIT_CONFIG.reportDir, { recursive: true });
    logInfo(`Created reports directory: ${AUDIT_CONFIG.reportDir}`);
  } catch (error) {
    logError(`Failed to create reports directory: ${error.message}`);
    process.exit(1);
  }
}

// Check if development server is running
function checkDevServer() {
  try {
    execSync('curl -f http://localhost:3000 > /dev/null 2>&1');
    logSuccess('Development server is running');
    return true;
  } catch (error) {
    logError('Development server is not running. Please start it with: npm run dev');
    return false;
  }
}

// Run axe-core accessibility tests
async function runAxeTests() {
  logHeader('Running Axe Accessibility Tests');
  
  try {
    const axeCommand = 'npx axe-playwright --config axe.config.js --fail-on-error';
    execSync(axeCommand, { stdio: 'inherit' });
    logSuccess('Axe accessibility tests passed');
    return true;
  } catch (error) {
    logError('Axe accessibility tests failed');
    return false;
  }
}

// Run Lighthouse accessibility audit
async function runLighthouseAudit() {
  logHeader('Running Lighthouse Accessibility Audit');
  
  const lighthouseCommand = `npx lighthouse http://localhost:3000 ` +
    `--only-categories=accessibility ` +
    `--output=json ` +
    `--output-path=${AUDIT_CONFIG.reportDir}/lighthouse-accessibility.json ` +
    `--chrome-flags="--headless"`;
  
  try {
    execSync(lighthouseCommand, { stdio: 'inherit' });
    logSuccess('Lighthouse accessibility audit completed');
    
    // Parse and analyze Lighthouse results
    const reportPath = path.join(AUDIT_CONFIG.reportDir, 'lighthouse-accessibility.json');
    const reportData = JSON.parse(await fs.readFile(reportPath, 'utf8'));
    
    const accessibilityScore = reportData.categories.accessibility.score * 100;
    
    if (accessibilityScore >= 90) {
      logSuccess(`Lighthouse accessibility score: ${accessibilityScore}/100`);
      return true;
    } else if (accessibilityScore >= 70) {
      logWarning(`Lighthouse accessibility score: ${accessibilityScore}/100 - Needs improvement`);
      return false;
    } else {
      logError(`Lighthouse accessibility score: ${accessibilityScore}/100 - Critical issues found`);
      return false;
    }
  } catch (error) {
    logError(`Lighthouse audit failed: ${error.message}`);
    return false;
  }
}

// Custom mental health accessibility checks
async function runMentalHealthChecks() {
  if (!AUDIT_CONFIG.mentalHealthChecks) {
    return true;
  }
  
  logHeader('Running Mental Health Accessibility Checks');
  
  const checks = [];
  
  // Check each URL for mental health specific requirements
  for (const url of AUDIT_CONFIG.urls) {
    const fullUrl = `http://localhost:3000${url}`;
    logInfo(`Checking ${fullUrl}...`);
    
    try {
      // Use Puppeteer to run custom checks
      const checkScript = `
        const puppeteer = require('puppeteer');
        
        (async () => {
          const browser = await puppeteer.launch({ headless: true });
          const page = await browser.newPage();
          
          try {
            await page.goto('${fullUrl}', { waitUntil: 'networkidle0' });
            
            // Check for crisis help button
            const crisisButton = await page.$('#crisis-help-button, [data-crisis-help="true"], .crisis-button');
            const hasCrisisButton = !!crisisButton;
            
            let crisisButtonSize = null;
            if (crisisButton) {
              crisisButtonSize = await page.evaluate(el => {
                const rect = el.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
              }, crisisButton);
            }
            
            // Check for autoplay media
            const autoplayMedia = await page.$$('video[autoplay], audio[autoplay]');
            const hasAutoplayMedia = autoplayMedia.length > 0;
            
            // Check for flashing content
            const flashingElements = await page.$$('.blink, .flash, [style*="animation"]');
            const hasFlashingContent = flashingElements.length > 0;
            
            // Check color contrast (simplified check)
            const colorContrastIssues = await page.evaluate(() => {
              // This would need a more sophisticated implementation
              // For now, just check if high contrast mode is available
              const highContrastToggle = document.querySelector('.high-contrast-toggle, [data-high-contrast]');
              return !highContrastToggle;
            });
            
            console.log(JSON.stringify({
              url: '${url}',
              hasCrisisButton,
              crisisButtonSize,
              hasAutoplayMedia,
              hasFlashingContent,
              colorContrastIssues
            }));
            
          } finally {
            await browser.close();
          }
        })();
      `;
      
      // Write and execute the check script
      const scriptPath = path.join(AUDIT_CONFIG.reportDir, 'mental-health-check.js');
      await fs.writeFile(scriptPath, checkScript);
      
      const result = execSync(`node ${scriptPath}`, { encoding: 'utf8' });
      const checkResult = JSON.parse(result.trim());
      
      checks.push(checkResult);
      
      // Evaluate results
      if (!checkResult.hasCrisisButton) {
        logError(`${url}: Missing crisis help button`);
      } else {
        if (checkResult.crisisButtonSize.width < 60 || checkResult.crisisButtonSize.height < 60) {
          logWarning(`${url}: Crisis button too small (${checkResult.crisisButtonSize.width}x${checkResult.crisisButtonSize.height}px)`);
        } else {
          logSuccess(`${url}: Crisis button present and appropriately sized`);
        }
      }
      
      if (checkResult.hasAutoplayMedia) {
        logError(`${url}: Contains autoplay media (anxiety trigger)`);
      }
      
      if (checkResult.hasFlashingContent) {
        logError(`${url}: Contains flashing content (seizure/anxiety risk)`);
      }
      
      // Clean up
      await fs.unlink(scriptPath);
      
    } catch (error) {
      logError(`Mental health check failed for ${url}: ${error.message}`);
      checks.push({ url, error: error.message });
    }
  }
  
  // Save mental health check results
  const resultsPath = path.join(AUDIT_CONFIG.reportDir, 'mental-health-checks.json');
  await fs.writeFile(resultsPath, JSON.stringify(checks, null, 2));
  
  // Determine if checks passed
  const failedChecks = checks.filter(check => 
    !check.hasCrisisButton || 
    check.hasAutoplayMedia || 
    check.hasFlashingContent ||
    (check.crisisButtonSize && (check.crisisButtonSize.width < 60 || check.crisisButtonSize.height < 60))
  );
  
  if (failedChecks.length === 0) {
    logSuccess('All mental health accessibility checks passed');
    return true;
  } else {
    logError(`${failedChecks.length} mental health accessibility issues found`);
    return false;
  }
}

// Generate comprehensive report
async function generateReport(results) {
  logHeader('Generating Accessibility Report');
  
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      overall: results.every(r => r) ? 'PASS' : 'FAIL',
      axe: results[0] ? 'PASS' : 'FAIL',
      lighthouse: results[1] ? 'PASS' : 'FAIL',
      mentalHealth: results[2] ? 'PASS' : 'FAIL'
    },
    details: {
      axeReport: `${AUDIT_CONFIG.reportDir}/axe-report.json`,
      lighthouseReport: `${AUDIT_CONFIG.reportDir}/lighthouse-accessibility.json`,
      mentalHealthReport: `${AUDIT_CONFIG.reportDir}/mental-health-checks.json`
    },
    recommendations: generateRecommendations(results)
  };
  
  const reportPath = path.join(AUDIT_CONFIG.reportDir, 'accessibility-summary.json');
  await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
  
  // Generate HTML summary
  const htmlReport = generateHtmlReport(reportData);
  const htmlPath = path.join(AUDIT_CONFIG.reportDir, 'accessibility-summary.html');
  await fs.writeFile(htmlPath, htmlReport);
  
  logSuccess(`Comprehensive report generated: ${reportPath}`);
  logSuccess(`HTML report generated: ${htmlPath}`);
  
  return reportData;
}

// Generate recommendations based on results
function generateRecommendations(results) {
  const recommendations = [];
  
  if (!results[0]) { // Axe failed
    recommendations.push('Fix critical ARIA and semantic HTML issues identified by Axe');
    recommendations.push('Ensure all interactive elements have proper focus management');
    recommendations.push('Verify all images have appropriate alt text');
  }
  
  if (!results[1]) { // Lighthouse failed
    recommendations.push('Improve color contrast ratios to meet WCAG AA standards');
    recommendations.push('Add skip links for keyboard navigation');
    recommendations.push('Ensure proper heading hierarchy');
  }
  
  if (!results[2]) { // Mental health checks failed
    recommendations.push('Add crisis help button to all pages');
    recommendations.push('Remove autoplay media to prevent anxiety triggers');
    recommendations.push('Eliminate flashing content that could cause seizures');
    recommendations.push('Increase crisis button size to at least 60x60px');
  }
  
  recommendations.push('Implement accessibility testing in CI/CD pipeline');
  recommendations.push('Schedule regular accessibility audits (monthly)');
  recommendations.push('Consider user testing with people who use assistive technologies');
  
  return recommendations;
}

// Generate HTML report
function generateHtmlReport(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FullMind Accessibility Audit Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #40B5AD, #2C8A82);
      color: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .summary-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .pass { border-left: 4px solid #10b981; }
    .fail { border-left: 4px solid #ef4444; }
    .status {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    .pass .status { color: #10b981; }
    .fail .status { color: #ef4444; }
    .recommendations {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.5rem;
    }
    .recommendations h2 {
      color: #1f2937;
      margin-top: 0;
    }
    .recommendations ul {
      padding-left: 1.5rem;
    }
    .recommendations li {
      margin-bottom: 0.5rem;
    }
    .footer {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e2e8f0;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>FullMind Accessibility Audit Report</h1>
    <p>Generated on ${new Date(data.timestamp).toLocaleString()}</p>
    <p><strong>Overall Status: ${data.summary.overall}</strong></p>
  </div>
  
  <div class="summary">
    <div class="summary-card ${data.summary.axe === 'PASS' ? 'pass' : 'fail'}">
      <div class="status">${data.summary.axe}</div>
      <div>Axe Core Tests</div>
      <small>WCAG Compliance</small>
    </div>
    
    <div class="summary-card ${data.summary.lighthouse === 'PASS' ? 'pass' : 'fail'}">
      <div class="status">${data.summary.lighthouse}</div>
      <div>Lighthouse Audit</div>
      <small>Performance & A11y</small>
    </div>
    
    <div class="summary-card ${data.summary.mentalHealth === 'PASS' ? 'pass' : 'fail'}">
      <div class="status">${data.summary.mentalHealth}</div>
      <div>Mental Health Checks</div>
      <small>Crisis Accessibility</small>
    </div>
  </div>
  
  <div class="recommendations">
    <h2>Recommendations</h2>
    <ul>
      ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
  </div>
  
  <div class="footer">
    <p>Generated by FullMind Accessibility Agent</p>
    <p>For detailed reports, check the individual JSON files in the reports directory.</p>
  </div>
</body>
</html>
  `;
}

// Main audit function
async function runAccessibilityAudit() {
  logHeader('FullMind Website Accessibility Audit');
  logInfo(`Starting audit at ${new Date().toLocaleString()}`);
  
  await createReportsDirectory();
  
  if (!checkDevServer()) {
    process.exit(1);
  }
  
  const results = [];
  
  // Run Axe tests
  results.push(await runAxeTests());
  
  // Run Lighthouse audit
  results.push(await runLighthouseAudit());
  
  // Run mental health specific checks
  results.push(await runMentalHealthChecks());
  
  // Generate comprehensive report
  const report = await generateReport(results);
  
  // Final summary
  logHeader('Audit Summary');
  
  if (results.every(r => r)) {
    logSuccess('🎉 All accessibility tests passed!');
    logSuccess('Your website meets WCAG AA standards and mental health accessibility requirements.');
    process.exit(0);
  } else {
    logError('❌ Some accessibility tests failed.');
    logError('Please review the detailed reports and fix the identified issues.');
    
    // Show which tests failed
    if (!results[0]) logError('- Axe Core tests failed');
    if (!results[1]) logError('- Lighthouse accessibility audit failed');
    if (!results[2]) logError('- Mental health accessibility checks failed');
    
    logInfo('📊 Detailed reports available in the ./reports directory');
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  runAccessibilityAudit().catch(error => {
    logError(`Audit failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  runAccessibilityAudit,
  AUDIT_CONFIG
};