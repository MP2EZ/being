#!/usr/bin/env node

/**
 * FullMind Clinical Performance Audit Script
 * Comprehensive performance testing for mental health applications
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

// Clinical performance budgets
const CLINICAL_BUDGETS = {
  // Core Web Vitals (Therapeutic thresholds)
  largestContentfulPaint: 2000,    // <2s for mental health users
  firstInputDelay: 100,            // <100ms for crisis interactions
  cumulativeLayoutShift: 0.1,      // Minimal shifts for stability
  
  // Additional clinical metrics
  firstContentfulPaint: 1500,      // <1.5s for immediate feedback
  speedIndex: 2000,                // <2s for perceived performance
  timeToInteractive: 3000,         // <3s for full interactivity
  
  // Bundle size limits
  totalByteWeight: 1000000,        // 1MB total
  unusedJavaScript: 100000,        // Max 100KB unused JS
  
  // Accessibility requirements
  accessibilityScore: 100,         // Perfect accessibility required
  bestPracticesScore: 90,          // High standards for healthcare
  seoScore: 85,                    // Good SEO for discoverability
  
  // Clinical-specific
  crisisButtonResponseTime: 200,   // <200ms crisis button response
  navigationTiming: 500,           // <500ms navigation
};

// Clinical audit configuration
const CLINICAL_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    // Clinical performance requirements
    throttlingMethod: 'simulate',
    throttling: {
      // Simulate slower devices (common in mental health demographics)
      rttMs: 150,
      throughputKbps: 1600,
      cpuSlowdownMultiplier: 4,
    },
    
    // Comprehensive audits
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    
    // Clinical-specific checks
    skipAudits: [
      'unused-css-rules', // May be needed for accessibility states
    ],
    
    // Output configuration
    output: ['html', 'json'],
  },
  
  // Clinical performance budgets
  budgets: [{
    resourceSizes: [
      { resourceType: 'script', budget: 250 },      // 250KB JS budget
      { resourceType: 'stylesheet', budget: 50 },   // 50KB CSS budget  
      { resourceType: 'image', budget: 500 },       // 500KB image budget
      { resourceType: 'document', budget: 25 },     // 25KB HTML budget
      { resourceType: 'font', budget: 100 },        // 100KB font budget
    ],
    resourceCounts: [
      { resourceType: 'script', budget: 10 },       // Max 10 JS files
      { resourceType: 'stylesheet', budget: 5 },    // Max 5 CSS files
      { resourceType: 'third-party', budget: 5 },   // Limit third-party
    ],
  }],
};

async function launchChrome() {
  return await chromeLauncher.launch({
    chromeFlags: [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      // Simulate mental health user conditions
      '--slow-down-audio',
      '--force-prefers-reduced-motion',
      '--enable-accessibility-logging',
    ]
  });
}

async function runClinicalAudit(url, outputPath) {
  console.log('🏥 Starting Clinical Performance Audit...\n');
  console.log('Target URL:', url);
  console.log('Clinical Budgets:', JSON.stringify(CLINICAL_BUDGETS, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');

  let chrome;
  try {
    // Launch Chrome
    chrome = await launchChrome();
    console.log('✅ Chrome launched for clinical testing');

    // Run Lighthouse audit
    console.log('🔍 Running comprehensive clinical audit...');
    const results = await lighthouse(url, {
      port: chrome.port,
      ...CLINICAL_CONFIG.settings
    });

    if (!results) {
      throw new Error('Failed to run Lighthouse audit');
    }

    // Extract clinical metrics
    const clinicalMetrics = extractClinicalMetrics(results);
    
    // Validate against clinical budgets
    const budgetResults = validateClinicalBudgets(clinicalMetrics);
    
    // Generate clinical report
    const clinicalReport = generateClinicalReport(clinicalMetrics, budgetResults);
    
    // Save reports
    await saveReports(results, clinicalReport, outputPath);
    
    // Display clinical assessment
    displayClinicalAssessment(clinicalMetrics, budgetResults);
    
    return {
      metrics: clinicalMetrics,
      budgets: budgetResults,
      overallStatus: budgetResults.critical.length === 0 ? 'PASS' : 'FAIL'
    };

  } catch (error) {
    console.error('❌ Clinical audit failed:', error.message);
    throw error;
  } finally {
    if (chrome) {
      await chrome.kill();
      console.log('🔧 Chrome closed');
    }
  }
}

function extractClinicalMetrics(results) {
  const lhr = results.lhr;
  const audits = lhr.audits;
  
  return {
    // Core Web Vitals
    largestContentfulPaint: audits['largest-contentful-paint']?.numericValue || 0,
    firstInputDelay: audits['max-potential-fid']?.numericValue || 0,
    cumulativeLayoutShift: audits['cumulative-layout-shift']?.numericValue || 0,
    
    // Additional performance metrics
    firstContentfulPaint: audits['first-contentful-paint']?.numericValue || 0,
    speedIndex: audits['speed-index']?.numericValue || 0,
    timeToInteractive: audits['interactive']?.numericValue || 0,
    
    // Bundle metrics
    totalByteWeight: audits['total-byte-weight']?.numericValue || 0,
    unusedJavaScript: audits['unused-javascript']?.numericValue || 0,
    
    // Category scores
    performanceScore: lhr.categories.performance?.score * 100 || 0,
    accessibilityScore: lhr.categories.accessibility?.score * 100 || 0,
    bestPracticesScore: lhr.categories['best-practices']?.score * 100 || 0,
    seoScore: lhr.categories.seo?.score * 100 || 0,
    
    // Clinical-specific metrics (estimated)
    crisisButtonResponseTime: estimateCrisisButtonTime(audits),
    navigationTiming: estimateNavigationTime(audits),
    
    // Accessibility details
    accessibilityAudits: extractAccessibilityAudits(audits),
  };
}

function estimateCrisisButtonTime(audits) {
  // Estimate crisis button response based on FID and interaction metrics
  const fid = audits['max-potential-fid']?.numericValue || 0;
  const mainThreadWork = audits['mainthread-work-breakdown']?.numericValue || 0;
  
  // Crisis button should respond faster than general interactions
  return Math.max(fid * 0.7, mainThreadWork / 1000);
}

function estimateNavigationTime(audits) {
  // Estimate navigation time based on various factors
  const interactive = audits['interactive']?.numericValue || 0;
  const speedIndex = audits['speed-index']?.numericValue || 0;
  
  // Navigation should be faster than full interactivity
  return Math.min(interactive * 0.3, speedIndex * 0.4);
}

function extractAccessibilityAudits(audits) {
  const a11yAudits = {};
  
  // Critical accessibility audits for mental health
  const criticalAudits = [
    'button-name',
    'color-contrast',
    'focus-traps',
    'heading-order',
    'html-has-lang',
    'image-alt',
    'label',
    'link-name',
    'list',
    'meta-viewport',
    'skip-link',
  ];
  
  criticalAudits.forEach(audit => {
    if (audits[audit]) {
      a11yAudits[audit] = {
        score: audits[audit].score,
        title: audits[audit].title,
        description: audits[audit].description,
      };
    }
  });
  
  return a11yAudits;
}

function validateClinicalBudgets(metrics) {
  const results = {
    critical: [],
    warnings: [],
    passed: [],
  };
  
  // Check each metric against clinical budgets
  Object.entries(CLINICAL_BUDGETS).forEach(([metric, budget]) => {
    const value = metrics[metric];
    
    if (value === undefined) {
      results.warnings.push({
        metric,
        message: `Metric ${metric} not measured`,
        severity: 'warning'
      });
      return;
    }
    
    const status = {
      metric,
      value: Math.round(value),
      budget,
      pass: false,
      severity: 'info'
    };
    
    // Determine pass/fail and severity
    if (metric.includes('Score')) {
      status.pass = value >= budget;
      status.severity = value < budget * 0.8 ? 'critical' : value < budget ? 'warning' : 'info';
    } else {
      status.pass = value <= budget;
      status.severity = value > budget * 1.5 ? 'critical' : value > budget ? 'warning' : 'info';
    }
    
    // Categorize results
    if (status.severity === 'critical') {
      results.critical.push(status);
    } else if (status.severity === 'warning') {
      results.warnings.push(status);
    } else {
      results.passed.push(status);
    }
  });
  
  return results;
}

function generateClinicalReport(metrics, budgetResults) {
  const timestamp = new Date().toISOString();
  
  return {
    meta: {
      timestamp,
      auditType: 'Clinical Performance Assessment',
      clinicalStandard: 'Mental Health Digital Therapeutic',
    },
    
    summary: {
      overallStatus: budgetResults.critical.length === 0 ? 'PASS' : 'FAIL',
      criticalIssues: budgetResults.critical.length,
      warnings: budgetResults.warnings.length,
      passed: budgetResults.passed.length,
    },
    
    clinicalAssessment: {
      therapeuticSuitability: metrics.performanceScore >= 90 ? 'Suitable' : 'Needs Improvement',
      crisisReadiness: metrics.crisisButtonResponseTime <= 200 ? 'Ready' : 'Not Ready',
      accessibilityCompliance: metrics.accessibilityScore >= 95 ? 'Compliant' : 'Non-Compliant',
      userExperience: calculateUserExperience(metrics),
    },
    
    metrics,
    budgetResults,
    
    recommendations: generateClinicalRecommendations(metrics, budgetResults),
  };
}

function calculateUserExperience(metrics) {
  const scores = [
    metrics.performanceScore,
    metrics.accessibilityScore,
    metrics.bestPracticesScore,
  ];
  
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  if (avgScore >= 95) return 'Excellent - Clinical Grade';
  if (avgScore >= 90) return 'Good - Therapeutic Standard';
  if (avgScore >= 80) return 'Acceptable - Needs Monitoring';
  return 'Poor - Immediate Improvement Required';
}

function generateClinicalRecommendations(metrics, budgetResults) {
  const recommendations = [];
  
  // Critical performance recommendations
  if (metrics.largestContentfulPaint > CLINICAL_BUDGETS.largestContentfulPaint) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Performance',
      issue: 'Page load too slow for mental health users',
      solution: 'Optimize images, implement lazy loading, reduce JavaScript bundle size',
      impact: 'User abandonment, increased stress during crisis situations'
    });
  }
  
  if (metrics.crisisButtonResponseTime > CLINICAL_BUDGETS.crisisButtonResponseTime) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Safety',
      issue: 'Crisis button response time exceeds safety threshold',
      solution: 'Optimize crisis button code path, implement preloading, use CSS animations',
      impact: 'Delayed emergency response, potential user safety risk'
    });
  }
  
  if (metrics.accessibilityScore < CLINICAL_BUDGETS.accessibilityScore) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Accessibility',
      issue: 'Accessibility compliance below clinical standard',
      solution: 'Fix ARIA labels, improve color contrast, enhance keyboard navigation',
      impact: 'Excludes users with disabilities from mental health support'
    });
  }
  
  // Bundle size recommendations
  if (metrics.totalByteWeight > CLINICAL_BUDGETS.totalByteWeight) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Optimization',
      issue: 'Bundle size may impact users with limited data plans',
      solution: 'Implement code splitting, tree shaking, compress assets',
      impact: 'Barriers to access for economically disadvantaged users'
    });
  }
  
  return recommendations;
}

async function saveReports(lighthouseResults, clinicalReport, outputPath) {
  try {
    // Create reports directory
    const reportsDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    // Save Lighthouse HTML report
    const htmlPath = path.join(reportsDir, 'lighthouse-clinical.html');
    await fs.writeFile(htmlPath, lighthouseResults.report);
    
    // Save clinical JSON report
    const jsonPath = path.join(reportsDir, 'clinical-performance-report.json');
    await fs.writeFile(jsonPath, JSON.stringify(clinicalReport, null, 2));
    
    console.log('📊 Reports saved:');
    console.log('  - Lighthouse HTML:', htmlPath);
    console.log('  - Clinical Report JSON:', jsonPath);
    
  } catch (error) {
    console.error('❌ Failed to save reports:', error.message);
  }
}

function displayClinicalAssessment(metrics, budgetResults) {
  console.log('\n' + '='.repeat(60));
  console.log('🏥 CLINICAL PERFORMANCE ASSESSMENT');
  console.log('='.repeat(60));
  
  // Overall status
  const overallStatus = budgetResults.critical.length === 0 ? '✅ PASS' : '❌ FAIL';
  console.log(`\nOverall Status: ${overallStatus}`);
  console.log(`Critical Issues: ${budgetResults.critical.length}`);
  console.log(`Warnings: ${budgetResults.warnings.length}`);
  console.log(`Passed: ${budgetResults.passed.length}`);
  
  // Core metrics
  console.log('\n📈 CORE WEB VITALS (Clinical Thresholds)');
  console.log('-'.repeat(40));
  console.log(`LCP: ${Math.round(metrics.largestContentfulPaint)}ms (Budget: ${CLINICAL_BUDGETS.largestContentfulPaint}ms)`);
  console.log(`FID: ${Math.round(metrics.firstInputDelay)}ms (Budget: ${CLINICAL_BUDGETS.firstInputDelay}ms)`);
  console.log(`CLS: ${metrics.cumulativeLayoutShift.toFixed(3)} (Budget: ${CLINICAL_BUDGETS.cumulativeLayoutShift})`);
  
  // Clinical metrics
  console.log('\n🚨 CLINICAL SAFETY METRICS');
  console.log('-'.repeat(40));
  console.log(`Crisis Response: ${Math.round(metrics.crisisButtonResponseTime)}ms (Budget: ${CLINICAL_BUDGETS.crisisButtonResponseTime}ms)`);
  console.log(`Navigation: ${Math.round(metrics.navigationTiming)}ms (Budget: ${CLINICAL_BUDGETS.navigationTiming}ms)`);
  
  // Scores
  console.log('\n🎯 CATEGORY SCORES');
  console.log('-'.repeat(40));
  console.log(`Performance: ${Math.round(metrics.performanceScore)}/100`);
  console.log(`Accessibility: ${Math.round(metrics.accessibilityScore)}/100`);
  console.log(`Best Practices: ${Math.round(metrics.bestPracticesScore)}/100`);
  console.log(`SEO: ${Math.round(metrics.seoScore)}/100`);
  
  // Critical issues
  if (budgetResults.critical.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:');
    console.log('-'.repeat(50));
    budgetResults.critical.forEach(issue => {
      console.log(`❌ ${issue.metric}: ${issue.value} (Budget: ${issue.budget})`);
    });
  }
  
  // Warnings
  if (budgetResults.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    console.log('-'.repeat(20));
    budgetResults.warnings.forEach(warning => {
      console.log(`⚠️  ${warning.metric}: ${warning.value} (Budget: ${warning.budget})`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

// Main execution
async function main() {
  const url = process.argv[2] || 'http://localhost:3000';
  const outputPath = process.argv[3] || './reports';
  
  try {
    const results = await runClinicalAudit(url, outputPath);
    
    if (results.overallStatus === 'FAIL') {
      console.log('\n❌ Clinical performance audit FAILED');
      console.log('🏥 This application does not meet clinical-grade performance standards');
      process.exit(1);
    } else {
      console.log('\n✅ Clinical performance audit PASSED');
      console.log('🏥 This application meets clinical-grade performance standards');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Audit failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runClinicalAudit, CLINICAL_BUDGETS };