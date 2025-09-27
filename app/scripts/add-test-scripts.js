#!/usr/bin/env node

/**
 * ADD COMPREHENSIVE TEST SCRIPTS TO PACKAGE.JSON
 * Week 2 Orchestration Plan - Test Configuration Setup
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
  // Read current package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Add comprehensive test scripts
  const newScripts = {
    "test:comprehensive": "jest --config=jest.comprehensive.config.js",
    "test:clinical": "jest --config=jest.comprehensive.config.js --testPathPattern=clinical",
    "test:performance": "jest --config=jest.comprehensive.config.js --testPathPattern=performance",
    "test:integration": "jest --config=jest.comprehensive.config.js --testPathPattern=integration",
    "test:safety": "jest --config=jest.comprehensive.config.js --testPathPattern=safety",
    "test:compliance": "jest --config=jest.comprehensive.config.js --testPathPattern=compliance",
    "test:all-48-combinations": "jest --config=jest.comprehensive.config.js --testPathPattern=clinical --verbose",
    "test:crisis-detection": "jest --config=jest.comprehensive.config.js --testPathPattern='(safety|clinical)' --testNamePattern='crisis'",
    "test:performance-benchmarks": "jest --config=jest.comprehensive.config.js --testPathPattern=performance --verbose",
    "test:hipaa-compliance": "jest --config=jest.comprehensive.config.js --testPathPattern=compliance --testNamePattern='HIPAA'",
    "test:week2-orchestration": "./scripts/run-comprehensive-tests.sh",
    "test:coverage-comprehensive": "jest --config=jest.comprehensive.config.js --coverage",
    "test:watch-comprehensive": "jest --config=jest.comprehensive.config.js --watch",
    "test:ci-comprehensive": "jest --config=jest.comprehensive.config.js --ci --coverage --watchAll=false",
    "validate:clinical-accuracy": "jest --config=jest.comprehensive.config.js --testPathPattern=clinical --passWithNoTests=false",
    "validate:safety-protocols": "jest --config=jest.comprehensive.config.js --testPathPattern=safety --passWithNoTests=false"
  };

  // Merge with existing scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    ...newScripts
  };

  // Add test-specific dependencies if needed
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }

  const testDependencies = {
    "jest-junit": "^16.0.0",
    "jest-html-reporters": "^3.1.5"
  };

  Object.keys(testDependencies).forEach(dep => {
    if (!packageJson.devDependencies[dep] && !packageJson.dependencies?.[dep]) {
      console.log(`Added test dependency: ${dep}`);
      packageJson.devDependencies[dep] = testDependencies[dep];
    }
  });

  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log('✅ Comprehensive test scripts added to package.json');
  console.log('\nAvailable test commands:');
  Object.keys(newScripts).forEach(script => {
    console.log(`  npm run ${script}`);
  });

} catch (error) {
  console.error('❌ Error updating package.json:', error.message);
  process.exit(1);
}