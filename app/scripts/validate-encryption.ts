#!/usr/bin/env ts-node

/**
 * Encryption Validation Script
 * Validates the HIPAA-compliant encryption implementation
 * Run before deployment to ensure all security requirements are met
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  category: string;
  test: string;
  passed: boolean;
  message: string;
  critical: boolean;
}

interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  critical_failures: number;
  results: ValidationResult[];
}

class EncryptionValidator {
  private results: ValidationResult[] = [];

  async validate(): Promise<ValidationSummary> {
    console.log('🔐 FullMind Encryption Validation Starting...\n');

    // Run all validation categories
    await this.validateDependencies();
    await this.validateFileStructure();
    await this.validateImports();
    await this.validateSecurityImplementation();
    await this.validateTests();
    await this.validateCompliance();
    
    return this.generateSummary();
  }

  private async validateDependencies(): Promise<void> {
    console.log('📦 Validating Encryption Dependencies...');
    
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
      );
      
      const requiredDeps = {
        'react-native-keychain': '^10.0.0',
        'expo-crypto': '^14.1.5',
        'expo-secure-store': '^14.2.3'
      };

      for (const [dep, version] of Object.entries(requiredDeps)) {
        if (packageJson.dependencies[dep]) {
          this.addResult('Dependencies', `${dep} installed`, true, 
            `Found ${dep} version ${packageJson.dependencies[dep]}`, true);
        } else {
          this.addResult('Dependencies', `${dep} missing`, false, 
            `Required dependency ${dep} ${version} not found`, true);
        }
      }
      
    } catch (error) {
      this.addResult('Dependencies', 'Package validation', false, 
        `Failed to validate package.json: ${error}`, true);
    }
  }

  private async validateFileStructure(): Promise<void> {
    console.log('📁 Validating File Structure...');
    
    const requiredFiles = [
      'src/services/security/EncryptionService.ts',
      'src/services/storage/EncryptedDataStore.ts',
      'src/services/storage/DataStoreMigrator.ts',
      'src/services/storage/SecureDataStore.ts',
      'src/services/storage/SECURITY.md'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, '..', file);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        this.addResult('File Structure', `${file} exists`, true, 
          `File size: ${stats.size} bytes`, false);
      } else {
        this.addResult('File Structure', `${file} missing`, false, 
          `Required security file not found`, true);
      }
    }
  }

  private async validateImports(): Promise<void> {
    console.log('🔗 Validating Import Updates...');
    
    const filesToCheck = [
      'src/store/userStore.ts',
      'src/store/checkInStore.ts', 
      'src/store/assessmentStore.ts',
      'src/services/ExportService.ts',
      'src/services/OfflineQueueService.ts'
    ];

    for (const file of filesToCheck) {
      const filePath = path.join(__dirname, '..', file);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        if (content.includes('from \'./storage/SecureDataStore\'') || 
            content.includes('from \'../services/storage/SecureDataStore\'')) {
          this.addResult('Imports', `${file} updated`, true, 
            'Using SecureDataStore import', false);
        } else if (content.includes('from \'./storage/DataStore\'')) {
          this.addResult('Imports', `${file} not updated`, false, 
            'Still using legacy DataStore import', true);
        } else {
          this.addResult('Imports', `${file} no datastore import`, true, 
            'File does not import datastore', false);
        }
      }
    }
  }

  private async validateSecurityImplementation(): Promise<void> {
    console.log('🔒 Validating Security Implementation...');
    
    try {
      // Check EncryptionService implementation
      const encryptionService = path.join(__dirname, '../src/services/security/EncryptionService.ts');
      if (fs.existsSync(encryptionService)) {
        const content = fs.readFileSync(encryptionService, 'utf-8');
        
        // Check for key security features
        const securityFeatures = [
          { name: 'DataSensitivity enum', pattern: /enum DataSensitivity/, critical: true },
          { name: 'Master key generation', pattern: /generateMasterKey/, critical: true },
          { name: 'Key rotation', pattern: /rotateKeys/, critical: true },
          { name: 'Secure deletion', pattern: /secureDeleteKeys/, critical: true },
          { name: 'Data integrity validation', pattern: /validateDataIntegrity/, critical: false },
          { name: 'Audit logging', pattern: /logEncryptionEvent/, critical: true }
        ];

        for (const feature of securityFeatures) {
          if (feature.pattern.test(content)) {
            this.addResult('Security Implementation', feature.name, true, 
              'Feature implemented', feature.critical);
          } else {
            this.addResult('Security Implementation', feature.name, false, 
              'Security feature missing', feature.critical);
          }
        }
      }

      // Check SecureDataStore implementation
      const secureDataStore = path.join(__dirname, '../src/services/storage/SecureDataStore.ts');
      if (fs.existsSync(secureDataStore)) {
        const content = fs.readFileSync(secureDataStore, 'utf-8');
        
        // Check for API compatibility
        const apiMethods = [
          'saveUser', 'getUser', 'saveCheckIn', 'getCheckIns', 
          'saveAssessment', 'getAssessments', 'saveCrisisPlan', 'getCrisisPlan'
        ];

        for (const method of apiMethods) {
          if (content.includes(`${method}:`)) {
            this.addResult('Security Implementation', `${method} method`, true, 
              'API method available', true);
          } else {
            this.addResult('Security Implementation', `${method} method`, false, 
              'Required API method missing', true);
          }
        }
      }
      
    } catch (error) {
      this.addResult('Security Implementation', 'Code analysis', false, 
        `Failed to analyze security implementation: ${error}`, true);
    }
  }

  private async validateTests(): Promise<void> {
    console.log('🧪 Validating Tests...');
    
    const testFiles = [
      'src/services/storage/__tests__/EncryptionService.test.ts',
      'src/services/storage/__tests__/SecureDataStore.test.ts'
    ];

    for (const testFile of testFiles) {
      const filePath = path.join(__dirname, '..', testFile);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Count test cases
        const testMatches = content.match(/test\(|it\(/g);
        const testCount = testMatches ? testMatches.length : 0;
        
        if (testCount > 0) {
          this.addResult('Tests', `${testFile}`, true, 
            `Contains ${testCount} test cases`, false);
        } else {
          this.addResult('Tests', `${testFile}`, false, 
            'No test cases found', false);
        }
      } else {
        this.addResult('Tests', `${testFile}`, false, 
          'Test file missing', false);
      }
    }

    // Try to run tests
    try {
      console.log('  Running encryption tests...');
      execSync('npm test -- --testPathPattern=EncryptionService --verbose', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      this.addResult('Tests', 'Encryption tests', true, 
        'All encryption tests passed', true);
    } catch (error) {
      this.addResult('Tests', 'Encryption tests', false, 
        'Some encryption tests failed - check implementation', true);
    }
  }

  private async validateCompliance(): Promise<void> {
    console.log('⚖️  Validating HIPAA Compliance...');
    
    // Check for compliance features
    const complianceChecks = [
      {
        name: 'Clinical data encryption',
        file: 'src/services/storage/EncryptedDataStore.ts',
        pattern: /DataSensitivity\.CLINICAL/,
        critical: true
      },
      {
        name: 'Audit logging',
        file: 'src/services/storage/EncryptedDataStore.ts', 
        pattern: /CLINICAL AUDIT:/,
        critical: true
      },
      {
        name: 'Key rotation',
        file: 'src/services/security/EncryptionService.ts',
        pattern: /KEY_ROTATION_DAYS.*=.*90/,
        critical: true
      },
      {
        name: 'Data retention policy',
        file: 'src/services/storage/EncryptedDataStore.ts',
        pattern: /90.*day/i,
        critical: false
      },
      {
        name: 'Security documentation',
        file: 'src/services/storage/SECURITY.md',
        pattern: /HIPAA/,
        critical: false
      }
    ];

    for (const check of complianceChecks) {
      const filePath = path.join(__dirname, '..', check.file);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        if (check.pattern.test(content)) {
          this.addResult('Compliance', check.name, true, 
            'Compliance feature implemented', check.critical);
        } else {
          this.addResult('Compliance', check.name, false, 
            'Compliance feature missing or incorrect', check.critical);
        }
      } else {
        this.addResult('Compliance', check.name, false, 
          'Required compliance file missing', check.critical);
      }
    }
  }

  private addResult(category: string, test: string, passed: boolean, 
                   message: string, critical: boolean): void {
    this.results.push({ category, test, passed, message, critical });
    
    const status = passed ? '✅' : '❌';
    const priority = critical ? '🚨' : '⚠️';
    const prefix = passed ? status : `${status} ${priority}`;
    
    console.log(`  ${prefix} ${test}: ${message}`);
  }

  private generateSummary(): ValidationSummary {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const critical_failures = this.results.filter(r => !r.passed && r.critical).length;

    console.log('\n📊 Validation Summary');
    console.log('='.repeat(50));
    console.log(`Total tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Critical failures: ${critical_failures} 🚨`);

    if (critical_failures === 0) {
      console.log('\n🎉 Encryption validation PASSED! Ready for deployment.');
    } else {
      console.log('\n🚨 Encryption validation FAILED! Critical issues must be resolved.');
    }

    // Group results by category
    const categories = [...new Set(this.results.map(r => r.category))];
    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.passed).length;
      
      console.log(`\n${category}: ${categoryPassed}/${categoryResults.length}`);
      
      const failures = categoryResults.filter(r => !r.passed);
      for (const failure of failures) {
        const priority = failure.critical ? '🚨 CRITICAL' : '⚠️  WARNING';
        console.log(`  ${priority}: ${failure.test} - ${failure.message}`);
      }
    }

    return {
      total,
      passed, 
      failed,
      critical_failures,
      results: this.results
    };
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EncryptionValidator();
  validator.validate()
    .then(summary => {
      process.exit(summary.critical_failures > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

export { EncryptionValidator };