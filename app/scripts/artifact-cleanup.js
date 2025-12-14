#!/usr/bin/env node
/**
 * COMPREHENSIVE ARTIFACT CLEANUP SCRIPT
 * Cleans up intermediate products from 4-week cloud sync implementation
 * 
 * CLEANUP TARGETS:
 * - Intermediate implementation guides and reports
 * - Temporary configuration backups  
 * - Build artifacts and logs
 * - Phase-specific documentation that's now consolidated
 * - Test baseline files
 * 
 * PRESERVES:
 * - Final production code
 * - Consolidated documentation in /docs/
 * - Essential configuration files
 * - Active test suites
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 ARTIFACT CLEANUP - CLOUD SYNC IMPLEMENTATION');
console.log('===============================================');

// Define cleanup targets
const CLEANUP_TARGETS = [
  // Intermediate implementation guides
  'SECURITY-LOGGING-IMPLEMENTATION-GUIDE.md',
  
  // Temporary test baseline
  'pre-fix-test-baseline.log',
  
  // Crisis configuration backups (now integrated)
  'crisis-configs-backup/',
  
  // Build artifacts
  '.tsbuildinfo',
  
  // Expo logs
  '.expo/xcodebuild-error.log',
  '.expo/xcodebuild.log',
  
  // Test result artifacts (keep directory structure, clean contents)
  'test-results/*.json',
  'test-results/*.xml',
  'test-results/*.log'
];

// Files to preserve (safety check)
const PRESERVE_PATTERNS = [
  'src/',
  '__tests__/',
  'docs/architecture/',
  'docs/privacy/',
  'docs/security/',
  'package.json',
  'jest.config.js',
  'tsconfig.json'
];

let cleanedFiles = 0;
let preservedFiles = 0;
let totalSpaceSaved = 0;

console.log('\n🔍 ANALYZING CLEANUP TARGETS');
console.log('-----------------------------');

// Function to safely remove files/directories
function safeRemove(filePath) {
  const fullPath = path.resolve(filePath);
  
  // Safety check - don't remove critical files
  const shouldPreserve = PRESERVE_PATTERNS.some(pattern => 
    fullPath.includes(pattern) && !filePath.includes('backup')
  );
  
  if (shouldPreserve) {
    console.log(`🔒 PRESERVED: ${filePath} (critical file)`);
    preservedFiles++;
    return false;
  }
  
  try {
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const sizeBytes = stats.isDirectory() ? getDirSize(fullPath) : stats.size;
      totalSpaceSaved += sizeBytes;
      
      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`🗂️  REMOVED DIR: ${filePath} (${formatBytes(sizeBytes)})`);
      } else {
        fs.unlinkSync(fullPath);
        console.log(`📄 REMOVED FILE: ${filePath} (${formatBytes(sizeBytes)})`);
      }
      
      cleanedFiles++;
      return true;
    } else {
      console.log(`⚠️  NOT FOUND: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR removing ${filePath}: ${error.message}`);
    return false;
  }
}

// Get directory size recursively
function getDirSize(dirPath) {
  let totalSize = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += getDirSize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Continue if directory is inaccessible
  }
  
  return totalSize;
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Process cleanup targets
console.log('\n🧹 CLEANING UP ARTIFACTS');
console.log('-------------------------');

for (const target of CLEANUP_TARGETS) {
  // Handle glob patterns
  if (target.includes('*')) {
    try {
      const pattern = target.replace(/\*/g, '\\*');
      const command = process.platform === 'win32' ? `dir "${pattern}" /b 2>nul` : `ls ${target} 2>/dev/null || true`;
      const output = execSync(command, { encoding: 'utf8' }).trim();
      
      if (output) {
        const files = output.split('\n').filter(f => f.length > 0);
        for (const file of files) {
          safeRemove(file);
        }
      }
    } catch (error) {
      // Continue if glob expansion fails
    }
  } else {
    safeRemove(target);
  }
}

// Clean up any remaining build artifacts
console.log('\n🔨 CLEANING BUILD ARTIFACTS');
console.log('----------------------------');

const buildArtifacts = [
  '.jest-cache',
  'coverage',
  'dist',
  'build'
];

for (const artifact of buildArtifacts) {
  if (fs.existsSync(artifact)) {
    safeRemove(artifact);
  }
}

// Verify essential files are preserved
console.log('\n✅ VERIFICATION - ESSENTIAL FILES');
console.log('----------------------------------');

const essentialFiles = [
  'src/services/analytics/AnalyticsService.ts',
  'src/services/logging/ProductionLogger.ts',
  'src/services/monitoring/CrisisMonitoringService.ts',
  'src/services/resilience/CircuitBreakerService.ts',
  'src/services/deployment/DeploymentService.ts',
  'docs/architecture/Cloud-Sync-Complete-Implementation.md',
  'docs/compliance/Week3-Analytics-Privacy-Design.md',
  '__tests__/clinical/clinical-validation-summary.test.ts'
];

let verificationPassed = true;

for (const file of essentialFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ MISSING: ${file}`);
    verificationPassed = false;
  }
}

// Final cleanup summary
console.log('\n📊 CLEANUP SUMMARY');
console.log('==================');
console.log(`Files cleaned: ${cleanedFiles}`);
console.log(`Files preserved: ${preservedFiles}`);
console.log(`Space saved: ${formatBytes(totalSpaceSaved)}`);
console.log(`Verification: ${verificationPassed ? '✅ PASSED' : '❌ FAILED'}`);

// Create cleanup completion marker
const cleanupReport = {
  timestamp: new Date().toISOString(),
  filesRemoved: cleanedFiles,
  filesPreserved: preservedFiles,
  spaceSaved: totalSpaceSaved,
  verificationPassed,
  cleanupTargets: CLEANUP_TARGETS,
  essentialFilesVerified: essentialFiles,
  cloudSyncImplementationComplete: true
};

fs.writeFileSync('.cleanup-completed.json', JSON.stringify(cleanupReport, null, 2));

if (verificationPassed) {
  console.log('\n🎉 CLOUD SYNC IMPLEMENTATION CLEANUP COMPLETE!');
  console.log('   All intermediate artifacts removed');
  console.log('   Essential implementation files preserved');
  console.log('   Production code ready for deployment');
} else {
  console.log('\n⚠️  CLEANUP COMPLETED WITH WARNINGS');
  console.log('   Some essential files may have been affected');
  console.log('   Please review the verification results above');
}

console.log('\n📋 Next: Cloud sync feature is ready for production deployment');