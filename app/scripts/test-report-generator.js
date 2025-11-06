#!/usr/bin/env node

/**
 * Test Report Generator
 * Creates comprehensive HTML reports and dashboards for local testing
 */

const fs = require('fs');
const path = require('path');

class TestReportGenerator {
  constructor() {
    this.rootDir = process.cwd();
    this.resultsDir = path.join(this.rootDir, 'test-results');
    this.reportsDir = path.join(this.resultsDir, 'reports');
    
    // Ensure directories exist
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // Generate comprehensive HTML dashboard
  async generateDashboard() {
    console.log('📊 Generating test dashboard...');
    
    const testFiles = this.getTestResultFiles();
    if (testFiles.length === 0) {
      console.log('⚠️ No test results found. Run tests first.');
      return;
    }

    const dashboardData = this.aggregateTestData(testFiles);
    const htmlContent = this.generateDashboardHTML(dashboardData);
    
    const dashboardPath = path.join(this.reportsDir, 'test-dashboard.html');
    fs.writeFileSync(dashboardPath, htmlContent);
    
    console.log(`✅ Dashboard generated: ${dashboardPath}`);
    console.log(`🌐 Open in browser: file://${dashboardPath}`);
    
    return dashboardPath;
  }

  // Generate performance trends report
  async generatePerformanceReport() {
    console.log('📈 Generating performance trends report...');
    
    const perfFiles = fs.readdirSync(this.resultsDir)
      .filter(f => f.includes('performance') && f.endsWith('.json'))
      .sort()
      .slice(-10); // Last 10 runs

    if (perfFiles.length === 0) {
      console.log('⚠️ No performance data found.');
      return;
    }

    const performanceData = perfFiles.map(file => {
      try {
        return JSON.parse(fs.readFileSync(path.join(this.resultsDir, file), 'utf8'));
      } catch (error) {
        return null;
      }
    }).filter(Boolean);

    const htmlContent = this.generatePerformanceHTML(performanceData);
    const reportPath = path.join(this.reportsDir, 'performance-trends.html');
    fs.writeFileSync(reportPath, htmlContent);
    
    console.log(`✅ Performance report generated: ${reportPath}`);
    return reportPath;
  }

  // Generate coverage visualization
  async generateCoverageReport() {
    console.log('📋 Generating coverage report...');
    
    const coverageFiles = fs.readdirSync(this.resultsDir)
      .filter(f => f.includes('coverage') && f.endsWith('.json'))
      .sort()
      .slice(-1); // Latest coverage

    if (coverageFiles.length === 0) {
      console.log('⚠️ No coverage data found. Run tests with --coverage flag.');
      return;
    }

    const coverageData = JSON.parse(
      fs.readFileSync(path.join(this.resultsDir, coverageFiles[0]), 'utf8')
    );

    const htmlContent = this.generateCoverageHTML(coverageData);
    const reportPath = path.join(this.reportsDir, 'coverage-report.html');
    fs.writeFileSync(reportPath, htmlContent);
    
    console.log(`✅ Coverage report generated: ${reportPath}`);
    return reportPath;
  }

  // Get all test result files
  getTestResultFiles() {
    if (!fs.existsSync(this.resultsDir)) return [];
    
    return fs.readdirSync(this.resultsDir)
      .filter(f => f.endsWith('-report.json'))
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(this.resultsDir, f), 'utf8'));
          return { filename: f, data };
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.data.timestamp) - new Date(a.data.timestamp));
  }

  // Aggregate test data for dashboard
  aggregateTestData(testFiles) {
    const latest = testFiles[0]?.data;
    const historical = testFiles.slice(1, 6); // Last 5 previous runs
    
    // Aggregate statistics
    const stats = {
      latest: latest ? {
        timestamp: latest.timestamp,
        suiteName: latest.suiteName,
        totalTests: latest.totalTests,
        passed: latest.passed,
        failed: latest.failed,
        duration: latest.duration,
        success: latest.success,
        criticalFailures: latest.criticalFailures || 0
      } : null,
      
      trends: {
        totalRuns: testFiles.length,
        successRate: this.calculateSuccessRate(testFiles),
        averageDuration: this.calculateAverageDuration(testFiles),
        criticalFailureTrend: this.calculateCriticalFailureTrend(testFiles)
      },
      
      categories: this.categorizeTests(testFiles),
      recentFailures: this.getRecentFailures(testFiles),
      performanceIssues: this.getPerformanceIssues(testFiles)
    };

    return stats;
  }

  // Calculate success rate over time
  calculateSuccessRate(testFiles) {
    const successfulRuns = testFiles.filter(f => f.data.success).length;
    return testFiles.length > 0 ? (successfulRuns / testFiles.length) * 100 : 0;
  }

  // Calculate average test duration
  calculateAverageDuration(testFiles) {
    const durations = testFiles.map(f => f.data.duration).filter(d => d > 0);
    return durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
  }

  // Calculate critical failure trend
  calculateCriticalFailureTrend(testFiles) {
    return testFiles.slice(0, 5).map(f => ({
      timestamp: f.data.timestamp,
      criticalFailures: f.data.criticalFailures || 0,
      suiteName: f.data.suiteName
    }));
  }

  // Categorize tests by type
  categorizeTests(testFiles) {
    const categories = {
      crisis: { total: 0, passed: 0, failed: 0 },
      clinical: { total: 0, passed: 0, failed: 0 },
      performance: { total: 0, passed: 0, failed: 0 },
      security: { total: 0, passed: 0, failed: 0 },
      other: { total: 0, passed: 0, failed: 0 }
    };

    testFiles.forEach(file => {
      if (!file.data.results) return;
      
      file.data.results.forEach(result => {
        const category = this.categorizeTest(result.name);
        categories[category].total++;
        if (result.status === 'passed') {
          categories[category].passed++;
        } else {
          categories[category].failed++;
        }
      });
    });

    return categories;
  }

  // Categorize individual test
  categorizeTest(testName) {
    if (/crisis|emergency|988/i.test(testName)) return 'crisis';
    if (/clinical|phq|gad|assessment/i.test(testName)) return 'clinical';
    if (/performance|perf|speed/i.test(testName)) return 'performance';
    if (/security|auth|encrypt/i.test(testName)) return 'security';
    return 'other';
  }

  // Get recent test failures
  getRecentFailures(testFiles) {
    const failures = [];
    
    testFiles.slice(0, 3).forEach(file => {
      if (!file.data.results) return;
      
      file.data.results.forEach(result => {
        if (result.status === 'failed') {
          failures.push({
            testName: result.name,
            suiteName: file.data.suiteName,
            timestamp: file.data.timestamp,
            critical: result.critical,
            error: result.error || 'Test failed'
          });
        }
      });
    });

    return failures.slice(0, 10); // Top 10 recent failures
  }

  // Get performance issues
  getPerformanceIssues(testFiles) {
    const issues = [];
    
    testFiles.slice(0, 2).forEach(file => {
      if (!file.data.results) return;
      
      file.data.results.forEach(result => {
        // Consider tests over 5s as performance issues
        if (result.duration > 5000) {
          issues.push({
            testName: result.name,
            duration: result.duration,
            suiteName: file.data.suiteName,
            timestamp: file.data.timestamp,
            severity: result.duration > 10000 ? 'high' : 'medium'
          });
        }
      });
    });

    return issues.slice(0, 10); // Top 10 performance issues
  }

  // Generate main dashboard HTML
  generateDashboardHTML(data) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Local Test Dashboard - Being.</title>
    <style>
        ${this.getDashboardCSS()}
    </style>
</head>
<body>
    <div class="dashboard">
        <header class="header">
            <h1>🧪 Local Test Dashboard</h1>
            <p class="subtitle">Being. App - Development Testing</p>
            <div class="timestamp">Last updated: ${new Date().toLocaleString()}</div>
        </header>

        <div class="stats-grid">
            ${this.generateStatsCards(data)}
        </div>

        <div class="charts-grid">
            <div class="chart-card">
                <h3>🎯 Test Categories</h3>
                ${this.generateCategoryChart(data.categories)}
            </div>
            
            <div class="chart-card">
                <h3>📈 Success Rate Trend</h3>
                <div class="success-rate">${data.trends.successRate.toFixed(1)}%</div>
                <div class="trend-indicator ${data.trends.successRate > 90 ? 'good' : data.trends.successRate > 70 ? 'warning' : 'bad'}">
                    ${data.trends.successRate > 90 ? '✅ Excellent' : data.trends.successRate > 70 ? '⚠️ Needs attention' : '🚨 Critical'}
                </div>
            </div>
        </div>

        <div class="content-grid">
            <div class="failures-card">
                <h3>❌ Recent Failures</h3>
                ${this.generateFailuresList(data.recentFailures)}
            </div>
            
            <div class="performance-card">
                <h3>⚡ Performance Issues</h3>
                ${this.generatePerformanceIssuesList(data.performanceIssues)}
            </div>
        </div>

        <div class="actions">
            <button onclick="location.reload()" class="btn primary">🔄 Refresh</button>
            <button onclick="window.open('performance-trends.html')" class="btn">📈 Performance Trends</button>
            <button onclick="window.open('coverage-report.html')" class="btn">📋 Coverage Report</button>
        </div>
    </div>

    <script>
        ${this.getDashboardJS()}
    </script>
</body>
</html>`;
  }

  // Generate stats cards
  generateStatsCards(data) {
    if (!data.latest) {
      return '<div class="stat-card"><h3>No recent test data</h3><p>Run tests to see dashboard</p></div>';
    }

    const latest = data.latest;
    const successRate = latest.totalTests > 0 ? (latest.passed / latest.totalTests) * 100 : 0;
    
    return `
        <div class="stat-card ${latest.success ? 'success' : 'failure'}">
            <h3>Latest Test Run</h3>
            <div class="stat-value">${latest.passed}/${latest.totalTests}</div>
            <div class="stat-label">Tests Passed</div>
            <div class="stat-meta">${latest.suiteName} - ${latest.duration}ms</div>
        </div>
        
        <div class="stat-card ${successRate > 90 ? 'success' : successRate > 70 ? 'warning' : 'failure'}">
            <h3>Success Rate</h3>
            <div class="stat-value">${successRate.toFixed(1)}%</div>
            <div class="stat-label">Overall Success</div>
            <div class="stat-meta">${data.trends.totalRuns} total runs</div>
        </div>
        
        <div class="stat-card ${latest.criticalFailures === 0 ? 'success' : 'failure'}">
            <h3>Critical Issues</h3>
            <div class="stat-value">${latest.criticalFailures}</div>
            <div class="stat-label">Critical Failures</div>
            <div class="stat-meta">Safety-critical tests</div>
        </div>
        
        <div class="stat-card ${data.trends.averageDuration < 30000 ? 'success' : 'warning'}">
            <h3>Avg Duration</h3>
            <div class="stat-value">${Math.round(data.trends.averageDuration / 1000)}s</div>
            <div class="stat-label">Test Suite Time</div>
            <div class="stat-meta">Performance tracking</div>
        </div>
    `;
  }

  // Generate category chart
  generateCategoryChart(categories) {
    let html = '<div class="category-chart">';
    
    Object.entries(categories).forEach(([category, stats]) => {
      if (stats.total === 0) return;
      
      const successRate = (stats.passed / stats.total) * 100;
      const barClass = successRate > 90 ? 'success' : successRate > 70 ? 'warning' : 'failure';
      
      html += `
        <div class="category-row">
            <div class="category-label">${category}</div>
            <div class="category-bar">
                <div class="category-progress ${barClass}" style="width: ${successRate}%"></div>
            </div>
            <div class="category-stats">${stats.passed}/${stats.total}</div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }

  // Generate failures list
  generateFailuresList(failures) {
    if (failures.length === 0) {
      return '<div class="no-data">✅ No recent failures!</div>';
    }

    let html = '<div class="failures-list">';
    
    failures.forEach(failure => {
      const icon = failure.critical ? '🚨' : '❌';
      const timeAgo = this.timeAgo(new Date(failure.timestamp));
      
      html += `
        <div class="failure-item ${failure.critical ? 'critical' : ''}">
            <div class="failure-header">
                <span class="failure-icon">${icon}</span>
                <span class="failure-name">${failure.testName}</span>
                <span class="failure-time">${timeAgo}</span>
            </div>
            <div class="failure-details">
                Suite: ${failure.suiteName}<br>
                Error: ${failure.error.substring(0, 100)}${failure.error.length > 100 ? '...' : ''}
            </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }

  // Generate performance issues list
  generatePerformanceIssuesList(issues) {
    if (issues.length === 0) {
      return '<div class="no-data">⚡ No performance issues!</div>';
    }

    let html = '<div class="performance-list">';
    
    issues.forEach(issue => {
      const icon = issue.severity === 'high' ? '🔥' : '⚠️';
      const timeAgo = this.timeAgo(new Date(issue.timestamp));
      
      html += `
        <div class="performance-item ${issue.severity}">
            <div class="performance-header">
                <span class="performance-icon">${icon}</span>
                <span class="performance-name">${issue.testName}</span>
                <span class="performance-duration">${Math.round(issue.duration)}ms</span>
            </div>
            <div class="performance-details">
                Suite: ${issue.suiteName} - ${timeAgo}
            </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }

  // Utility function for time ago
  timeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }

  // Dashboard CSS
  getDashboardCSS() {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #2d3748;
            line-height: 1.6;
        }
        
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .subtitle {
            font-size: 1.2rem;
            color: #718096;
            margin-bottom: 15px;
        }
        
        .timestamp {
            font-size: 0.9rem;
            color: #a0aec0;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            border-left: 4px solid #e2e8f0;
        }
        
        .stat-card.success { border-left-color: #48bb78; }
        .stat-card.warning { border-left-color: #ed8936; }
        .stat-card.failure { border-left-color: #f56565; }
        
        .stat-card h3 {
            font-size: 1rem;
            color: #718096;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-card.success .stat-value { color: #48bb78; }
        .stat-card.warning .stat-value { color: #ed8936; }
        .stat-card.failure .stat-value { color: #f56565; }
        
        .stat-label {
            font-size: 1rem;
            color: #4a5568;
            margin-bottom: 5px;
        }
        
        .stat-meta {
            font-size: 0.9rem;
            color: #a0aec0;
        }
        
        .charts-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .chart-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .chart-card h3 {
            margin-bottom: 20px;
            color: #2d3748;
        }
        
        .category-chart {
            space-y: 15px;
        }
        
        .category-row {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .category-label {
            width: 80px;
            font-size: 0.9rem;
            text-transform: capitalize;
            color: #4a5568;
        }
        
        .category-bar {
            flex: 1;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            margin: 0 15px;
            overflow: hidden;
        }
        
        .category-progress {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        
        .category-progress.success { background: #48bb78; }
        .category-progress.warning { background: #ed8936; }
        .category-progress.failure { background: #f56565; }
        
        .category-stats {
            font-size: 0.9rem;
            color: #718096;
            min-width: 40px;
        }
        
        .success-rate {
            font-size: 3rem;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
        }
        
        .trend-indicator {
            text-align: center;
            padding: 10px;
            border-radius: 8px;
            font-weight: 500;
        }
        
        .trend-indicator.good { background: #c6f6d5; color: #22543d; }
        .trend-indicator.warning { background: #feebc8; color: #744210; }
        .trend-indicator.bad { background: #fed7d7; color: #742a2a; }
        
        .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .failures-card, .performance-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .failures-card h3, .performance-card h3 {
            margin-bottom: 20px;
            color: #2d3748;
        }
        
        .failure-item, .performance-item {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            background: #f7fafc;
            border-left: 3px solid #e2e8f0;
        }
        
        .failure-item.critical {
            background: #fed7d7;
            border-left-color: #f56565;
        }
        
        .performance-item.high {
            background: #fed7d7;
            border-left-color: #f56565;
        }
        
        .failure-header, .performance-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .failure-details, .performance-details {
            font-size: 0.9rem;
            color: #718096;
        }
        
        .no-data {
            text-align: center;
            padding: 40px;
            color: #a0aec0;
            font-style: italic;
        }
        
        .actions {
            text-align: center;
            margin-top: 30px;
        }
        
        .btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            margin: 0 10px;
            text-decoration: none;
            display: inline-block;
            transition: background 0.2s;
        }
        
        .btn:hover {
            background: #5a67d8;
        }
        
        .btn.primary {
            background: #48bb78;
        }
        
        .btn.primary:hover {
            background: #38a169;
        }
        
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .charts-grid {
                grid-template-columns: 1fr;
            }
            
            .content-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
  }

  // Dashboard JavaScript
  getDashboardJS() {
    return `
        // Auto-refresh every 30 seconds if tests are running
        let autoRefresh = false;
        
        function toggleAutoRefresh() {
            autoRefresh = !autoRefresh;
            if (autoRefresh) {
                setInterval(() => {
                    location.reload();
                }, 30000);
                console.log('Auto-refresh enabled');
            }
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                location.reload();
            }
        });
        
        console.log('Test Dashboard loaded. Press Ctrl/Cmd+R to refresh.');
    `;
  }

  // Generate performance trends HTML
  generatePerformanceHTML(performanceData) {
    // Implementation for performance trends visualization
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Trends - Being.</title>
    <style>${this.getDashboardCSS()}</style>
</head>
<body>
    <div class="dashboard">
        <header class="header">
            <h1>📈 Performance Trends</h1>
            <p class="subtitle">Test Performance Analysis Over Time</p>
        </header>
        
        <div class="performance-content">
            <h3>Performance data visualization would go here</h3>
            <p>Showing trends for ${performanceData.length} test runs</p>
        </div>
    </div>
</body>
</html>`;
  }

  // Generate coverage HTML
  generateCoverageHTML(coverageData) {
    // Implementation for coverage visualization
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Report - Being.</title>
    <style>${this.getDashboardCSS()}</style>
</head>
<body>
    <div class="dashboard">
        <header class="header">
            <h1>📋 Coverage Report</h1>
            <p class="subtitle">Test Coverage Analysis</p>
        </header>
        
        <div class="coverage-content">
            <h3>Coverage visualization would go here</h3>
            <p>Global coverage: ${coverageData.global?.lines || 0}%</p>
        </div>
    </div>
</body>
</html>`;
  }
}

// CLI interface
async function main() {
  const generator = new TestReportGenerator();
  const command = process.argv[2] || 'dashboard';

  try {
    switch (command) {
      case 'dashboard':
        await generator.generateDashboard();
        break;
      case 'performance':
        await generator.generatePerformanceReport();
        break;
      case 'coverage':
        await generator.generateCoverageReport();
        break;
      case 'all':
        await generator.generateDashboard();
        await generator.generatePerformanceReport();
        await generator.generateCoverageReport();
        console.log('✅ All reports generated');
        break;
      default:
        console.log('Usage: node test-report-generator.js [command]');
        console.log('Commands:');
        console.log('  dashboard   - Generate main test dashboard');
        console.log('  performance - Generate performance trends report');
        console.log('  coverage    - Generate coverage report');
        console.log('  all         - Generate all reports');
        process.exit(1);
    }
  } catch (error) {
    console.error('🚨 Report generation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestReportGenerator;