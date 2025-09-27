/**
 * Enhanced Coverage Reporter
 * Local development-focused coverage analysis and reporting
 */

const fs = require('fs');
const path = require('path');

class CoverageReporter {
  constructor(globalConfig, options = {}) {
    this.globalConfig = globalConfig;
    this.options = {
      outputFile: 'test-results/coverage-summary.json',
      thresholds: {
        crisis: { lines: 95, functions: 95, branches: 90, statements: 95 },
        clinical: { lines: 90, functions: 90, branches: 85, statements: 90 },
        security: { lines: 85, functions: 85, branches: 80, statements: 85 },
        global: { lines: 80, functions: 75, branches: 70, statements: 80 }
      },
      ...options
    };
    
    this.coverageData = null;
  }

  onRunComplete(contexts, results) {
    if (!results.coverageMap) {
      console.log('ℹ️  No coverage data collected (use --coverage flag)');
      return;
    }

    this.coverageData = this.analyzeCoverage(results.coverageMap);
    this.generateCoverageReport();
    this.saveCoverageResults();
    this.printCoverageSummary();
  }

  analyzeCoverage(coverageMap) {
    const summary = coverageMap.getCoverageSummary();
    const fileReports = [];
    const categoryReports = {
      crisis: { files: [], summary: { lines: 0, functions: 0, branches: 0, statements: 0 } },
      clinical: { files: [], summary: { lines: 0, functions: 0, branches: 0, statements: 0 } },
      security: { files: [], summary: { lines: 0, functions: 0, branches: 0, statements: 0 } },
      other: { files: [], summary: { lines: 0, functions: 0, branches: 0, statements: 0 } }
    };

    coverageMap.files().forEach(filePath => {
      const fileCoverage = coverageMap.fileCoverageFor(filePath);
      const fileSummary = fileCoverage.toSummary();
      const relativePath = filePath.replace(this.globalConfig.rootDir, '');
      
      const fileReport = {
        file: relativePath,
        lines: {
          total: fileSummary.lines.total,
          covered: fileSummary.lines.covered,
          pct: fileSummary.lines.pct
        },
        functions: {
          total: fileSummary.functions.total,
          covered: fileSummary.functions.covered,
          pct: fileSummary.functions.pct
        },
        branches: {
          total: fileSummary.branches.total,
          covered: fileSummary.branches.covered,
          pct: fileSummary.branches.pct
        },
        statements: {
          total: fileSummary.statements.total,
          covered: fileSummary.statements.covered,
          pct: fileSummary.statements.pct
        }
      };

      fileReports.push(fileReport);

      // Categorize file
      const category = this.categorizeFile(relativePath);
      categoryReports[category].files.push(fileReport);
    });

    // Calculate category summaries
    Object.keys(categoryReports).forEach(category => {
      if (categoryReports[category].files.length > 0) {
        const files = categoryReports[category].files;
        const totals = files.reduce((acc, file) => {
          acc.lines.total += file.lines.total;
          acc.lines.covered += file.lines.covered;
          acc.functions.total += file.functions.total;
          acc.functions.covered += file.functions.covered;
          acc.branches.total += file.branches.total;
          acc.branches.covered += file.branches.covered;
          acc.statements.total += file.statements.total;
          acc.statements.covered += file.statements.covered;
          return acc;
        }, {
          lines: { total: 0, covered: 0 },
          functions: { total: 0, covered: 0 },
          branches: { total: 0, covered: 0 },
          statements: { total: 0, covered: 0 }
        });

        categoryReports[category].summary = {
          lines: totals.lines.total > 0 ? (totals.lines.covered / totals.lines.total) * 100 : 0,
          functions: totals.functions.total > 0 ? (totals.functions.covered / totals.functions.total) * 100 : 0,
          branches: totals.branches.total > 0 ? (totals.branches.covered / totals.branches.total) * 100 : 0,
          statements: totals.statements.total > 0 ? (totals.statements.covered / totals.statements.total) * 100 : 0
        };
      }
    });

    return {
      timestamp: new Date().toISOString(),
      global: {
        lines: summary.lines.pct,
        functions: summary.functions.pct,
        branches: summary.branches.pct,
        statements: summary.statements.pct
      },
      categories: categoryReports,
      files: fileReports,
      thresholdViolations: this.findThresholdViolations(categoryReports)
    };
  }

  categorizeFile(filePath) {
    if (/crisis|emergency/i.test(filePath)) return 'crisis';
    if (/clinical|assessment|phq|gad/i.test(filePath)) return 'clinical';
    if (/security|encryption|auth/i.test(filePath)) return 'security';
    return 'other';
  }

  findThresholdViolations(categoryReports) {
    const violations = [];

    Object.entries(categoryReports).forEach(([category, data]) => {
      if (data.files.length === 0) return;

      const thresholds = this.options.thresholds[category] || this.options.thresholds.global;
      const summary = data.summary;

      Object.entries(thresholds).forEach(([metric, threshold]) => {
        if (summary[metric] < threshold) {
          violations.push({
            category,
            metric,
            actual: Math.round(summary[metric] * 100) / 100,
            threshold,
            severity: category === 'crisis' ? 'CRITICAL' : category === 'clinical' ? 'HIGH' : 'MEDIUM'
          });
        }
      });
    });

    return violations;
  }

  generateCoverageReport() {
    this.coverageReport = {
      ...this.coverageData,
      recommendations: this.generateRecommendations(),
      summary: {
        totalFiles: this.coverageData.files.length,
        categoryCounts: Object.entries(this.coverageData.categories).reduce((acc, [cat, data]) => {
          acc[cat] = data.files.length;
          return acc;
        }, {}),
        violationCount: this.coverageData.thresholdViolations.length,
        criticalViolations: this.coverageData.thresholdViolations.filter(v => v.severity === 'CRITICAL').length
      }
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const violations = this.coverageData.thresholdViolations;

    // Critical crisis coverage violations
    const crisisViolations = violations.filter(v => v.category === 'crisis');
    if (crisisViolations.length > 0) {
      recommendations.push({
        type: 'CRITICAL',
        category: 'crisis',
        message: `Crisis components have ${crisisViolations.length} coverage violations`,
        action: 'Add comprehensive tests for all crisis detection and intervention paths',
        violations: crisisViolations
      });
    }

    // Clinical coverage recommendations
    const clinicalViolations = violations.filter(v => v.category === 'clinical');
    if (clinicalViolations.length > 0) {
      recommendations.push({
        type: 'HIGH',
        category: 'clinical',
        message: `Clinical components need ${clinicalViolations.length} coverage improvements`,
        action: 'Add tests for PHQ-9/GAD-7 scoring algorithms and therapeutic content validation'
      });
    }

    // Low coverage files
    const lowCoverageFiles = this.coverageData.files.filter(f => 
      f.lines.pct < 60 || f.functions.pct < 60
    );
    if (lowCoverageFiles.length > 0) {
      recommendations.push({
        type: 'MEDIUM',
        category: 'general',
        message: `${lowCoverageFiles.length} files have very low coverage (<60%)`,
        action: 'Focus testing efforts on these files first',
        files: lowCoverageFiles.slice(0, 5).map(f => f.file) // Top 5 lowest
      });
    }

    return recommendations;
  }

  saveCoverageResults() {
    const outputDir = path.dirname(this.options.outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      this.options.outputFile,
      JSON.stringify(this.coverageReport, null, 2)
    );
  }

  printCoverageSummary() {
    if (!this.coverageData) return;

    console.log('\n📊 Coverage Analysis Summary');
    console.log('============================');
    
    // Global coverage
    const global = this.coverageData.global;
    console.log(`Global Coverage:`);
    console.log(`   Lines: ${global.lines.toFixed(1)}%`);
    console.log(`   Functions: ${global.functions.toFixed(1)}%`);
    console.log(`   Branches: ${global.branches.toFixed(1)}%`);
    console.log(`   Statements: ${global.statements.toFixed(1)}%`);

    // Category breakdown
    console.log('\nCategory Coverage:');
    Object.entries(this.coverageData.categories).forEach(([category, data]) => {
      if (data.files.length > 0) {
        const summary = data.summary;
        console.log(`   ${category} (${data.files.length} files):`);
        console.log(`     Lines: ${summary.lines.toFixed(1)}%`);
        console.log(`     Functions: ${summary.functions.toFixed(1)}%`);
      }
    });

    // Threshold violations
    if (this.coverageData.thresholdViolations.length > 0) {
      console.log('\n⚠️  Coverage Violations:');
      this.coverageData.thresholdViolations.forEach(violation => {
        const icon = violation.severity === 'CRITICAL' ? '🚨' : 
                    violation.severity === 'HIGH' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} ${violation.category} ${violation.metric}: ${violation.actual}% < ${violation.threshold}%`);
      });
    } else {
      console.log('\n✅ All coverage thresholds met!');
    }

    // Recommendations
    if (this.coverageReport.recommendations?.length > 0) {
      console.log('\n💡 Coverage Recommendations:');
      this.coverageReport.recommendations.forEach(rec => {
        const icon = rec.type === 'CRITICAL' ? '🚨' : 
                    rec.type === 'HIGH' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} ${rec.message}`);
        console.log(`      ${rec.action}`);
      });
    }

    console.log(`\n📄 Detailed report: ${this.options.outputFile}`);
    console.log('============================\n');
  }
}

module.exports = CoverageReporter;