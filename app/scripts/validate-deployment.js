#!/usr/bin/env node

/**
 * P0-CLOUD Phase 1 Deployment Validation Script
 *
 * Quick validation script to check deployment readiness
 * Run this before deploying to any environment
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  purple: '\x1b[35m'
};

const log = (message, color = colors.cyan) => {
  console.log(`${color}[${new Date().toTimeString().split(' ')[0]}]${colors.reset} ${message}`);
};

const success = (message) => console.log(`${colors.green}✅ ${message}${colors.reset}`);
const warning = (message) => console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
const error = (message) => console.log(`${colors.red}❌ ${message}${colors.reset}`);
const info = (message) => console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);

const PROJECT_ROOT = path.join(__dirname, '..');
let validationErrors = 0;
let validationWarnings = 0;

function validateEnvironmentFiles() {
  log('Validating environment files...');

  const environments = ['development', 'staging', 'production'];
  const requiredVars = [
    'EXPO_PUBLIC_ENV',
    'EXPO_PUBLIC_CRISIS_HOTLINE',
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_SUPABASE_REGION',
    'EXPO_PUBLIC_CLOUD_FEATURES_ENABLED',
    'EXPO_PUBLIC_ENCRYPTION_ENABLED',
    'EXPO_PUBLIC_HIPAA_COMPLIANCE_MODE'
  ];

  for (const env of environments) {
    const envFile = path.join(PROJECT_ROOT, `.env.${env}`);

    if (!fs.existsSync(envFile)) {
      error(`Environment file missing: .env.${env}`);
      validationErrors++;
      continue;
    }

    const envContent = fs.readFileSync(envFile, 'utf8');
    const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    const envVars = {};

    envLines.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });

    // Check required variables
    const missingVars = requiredVars.filter(varName => !envVars[varName]);
    if (missingVars.length > 0) {
      error(`${env}: Missing required variables: ${missingVars.join(', ')}`);
      validationErrors++;
    } else {
      success(`${env}: All required environment variables present`);
    }

    // Validate specific values
    if (envVars.EXPO_PUBLIC_CRISIS_HOTLINE !== '988') {
      error(`${env}: Crisis hotline must be 988, found: ${envVars.EXPO_PUBLIC_CRISIS_HOTLINE}`);
      validationErrors++;
    }

    if (envVars.EXPO_PUBLIC_SUPABASE_REGION && !envVars.EXPO_PUBLIC_SUPABASE_REGION.startsWith('us-')) {
      error(`${env}: Supabase region must be US-based for HIPAA compliance, found: ${envVars.EXPO_PUBLIC_SUPABASE_REGION}`);
      validationErrors++;
    }

    if (envVars.EXPO_PUBLIC_ENCRYPTION_ENABLED !== 'true') {
      error(`${env}: Data encryption must be enabled`);
      validationErrors++;
    }

    if (envVars.EXPO_PUBLIC_CLOUD_FEATURES_ENABLED === 'true') {
      warning(`${env}: Cloud features are enabled - ensure this is intentional`);
      validationWarnings++;
    }

    // Check crisis response time
    const crisisMaxMs = parseInt(envVars.EXPO_PUBLIC_PERFORMANCE_CRISIS_BUTTON_MAX_MS || '200', 10);
    if (crisisMaxMs > 200) {
      error(`${env}: Crisis response time must be ≤200ms, found: ${crisisMaxMs}ms`);
      validationErrors++;
    }
  }
}

function validateProjectStructure() {
  log('Validating project structure...');

  const requiredFiles = [
    'package.json',
    'app.json',
    'eas.json',
    'src/services/cloud/SupabaseClient.ts',
    'src/services/cloud/SupabaseSchema.ts',
    'src/services/cloud/CloudMonitoring.ts',
    'src/services/cloud/CostMonitoring.ts',
    'src/services/cloud/DeploymentValidator.ts',
    '.github/workflows/deploy-supabase-cloud.yml',
    'scripts/deploy-p0-cloud.sh',
    'P0_CLOUD_DEPLOYMENT_GUIDE.md'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(filePath)) {
      error(`Required file missing: ${file}`);
      validationErrors++;
    } else {
      success(`Found: ${file}`);
    }
  }

  // Check if deployment script is executable
  const deployScript = path.join(PROJECT_ROOT, 'scripts/deploy-p0-cloud.sh');
  if (fs.existsSync(deployScript)) {
    try {
      fs.accessSync(deployScript, fs.constants.X_OK);
      success('Deployment script is executable');
    } catch (error) {
      warning('Deployment script is not executable - run: chmod +x scripts/deploy-p0-cloud.sh');
      validationWarnings++;
    }
  }
}

function validatePackageJson() {
  log('Validating package.json...');

  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    error('package.json not found');
    validationErrors++;
    return;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check required dependencies
    const requiredDeps = [
      '@supabase/supabase-js',
      '@expo/react-native-action-sheet',
      'expo-secure-store',
      'expo-local-authentication'
    ];

    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    for (const dep of requiredDeps) {
      if (!dependencies[dep]) {
        warning(`Missing recommended dependency: ${dep}`);
        validationWarnings++;
      } else {
        success(`Found dependency: ${dep}`);
      }
    }

    // Check scripts
    const recommendedScripts = [
      'test',
      'lint',
      'type-check'
    ];

    for (const script of recommendedScripts) {
      if (!packageJson.scripts || !packageJson.scripts[script]) {
        warning(`Missing recommended script: ${script}`);
        validationWarnings++;
      }
    }

  } catch (error) {
    error(`Failed to parse package.json: ${error.message}`);
    validationErrors++;
  }
}

function validateEasJson() {
  log('Validating eas.json...');

  const easJsonPath = path.join(PROJECT_ROOT, 'eas.json');
  if (!fs.existsSync(easJsonPath)) {
    error('eas.json not found');
    validationErrors++;
    return;
  }

  try {
    const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));

    // Check build profiles
    const requiredProfiles = ['development', 'preview', 'production'];

    if (!easJson.build) {
      error('No build configuration found in eas.json');
      validationErrors++;
      return;
    }

    for (const profile of requiredProfiles) {
      if (!easJson.build[profile]) {
        warning(`Missing build profile: ${profile}`);
        validationWarnings++;
      } else {
        success(`Found build profile: ${profile}`);

        // Check for Supabase environment variables
        const profileConfig = easJson.build[profile];
        if (profileConfig.env) {
          const hasSupabaseUrl = profileConfig.env.EXPO_PUBLIC_SUPABASE_URL ||
                                 Object.keys(profileConfig.env).some(key => key.includes('SUPABASE_URL'));
          const hasSupabaseKey = profileConfig.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
                                 Object.keys(profileConfig.env).some(key => key.includes('SUPABASE_ANON_KEY'));

          if (hasSupabaseUrl && hasSupabaseKey) {
            success(`${profile}: Supabase environment configured`);
          } else {
            warning(`${profile}: Supabase environment variables not configured`);
            validationWarnings++;
          }
        }
      }
    }

    // Check submit configuration
    if (!easJson.submit) {
      warning('No submit configuration found - app store submission not configured');
      validationWarnings++;
    }

  } catch (error) {
    error(`Failed to parse eas.json: ${error.message}`);
    validationErrors++;
  }
}

function validateGitHubWorkflow() {
  log('Validating GitHub Actions workflow...');

  const workflowPath = path.join(PROJECT_ROOT, '.github/workflows/deploy-supabase-cloud.yml');
  if (!fs.existsSync(workflowPath)) {
    error('GitHub Actions workflow not found');
    validationErrors++;
    return;
  }

  try {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');

    // Check for required workflow elements
    const requiredElements = [
      'validate-environment',
      'validate-supabase-config',
      'security-validation',
      'deploy-configuration',
      'test-deployment',
      'monitor-deployment'
    ];

    for (const element of requiredElements) {
      if (workflowContent.includes(element)) {
        success(`Workflow includes: ${element}`);
      } else {
        warning(`Workflow missing: ${element}`);
        validationWarnings++;
      }
    }

    // Check for environment variables
    const requiredSecrets = [
      'SUPABASE_URL_',
      'SUPABASE_ANON_KEY_',
      'EXPO_TOKEN'
    ];

    for (const secret of requiredSecrets) {
      if (workflowContent.includes(secret)) {
        success(`Workflow references: ${secret}*`);
      } else {
        warning(`Workflow missing secret reference: ${secret}*`);
        validationWarnings++;
      }
    }

  } catch (error) {
    error(`Failed to read workflow file: ${error.message}`);
    validationErrors++;
  }
}

function validateTypeScriptFiles() {
  log('Validating TypeScript cloud services...');

  const tsFiles = [
    'src/services/cloud/SupabaseClient.ts',
    'src/services/cloud/SupabaseSchema.ts',
    'src/services/cloud/CloudMonitoring.ts',
    'src/services/cloud/CostMonitoring.ts',
    'src/services/cloud/DeploymentValidator.ts'
  ];

  for (const file of tsFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Basic TypeScript syntax checks
      const hasExports = content.includes('export');
      const hasImports = content.includes('import');
      const hasTypeAnnotations = content.includes(':') && (content.includes('interface') || content.includes('type'));

      if (hasExports && hasImports && hasTypeAnnotations) {
        success(`${file}: TypeScript structure looks good`);
      } else {
        warning(`${file}: TypeScript structure may have issues`);
        validationWarnings++;
      }

      // Check for HIPAA-related comments
      if (content.includes('HIPAA') || content.includes('hipaa')) {
        success(`${file}: HIPAA compliance considerations found`);
      } else {
        info(`${file}: No HIPAA compliance comments found`);
      }

      // Check for error handling
      if (content.includes('try') && content.includes('catch')) {
        success(`${file}: Error handling implemented`);
      } else {
        warning(`${file}: Consider adding error handling`);
        validationWarnings++;
      }
    }
  }
}

function generateValidationReport() {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.purple}📋 P0-CLOUD Phase 1 Deployment Validation Report${colors.reset}`);
  console.log('='.repeat(80));

  const totalIssues = validationErrors + validationWarnings;

  if (validationErrors === 0 && validationWarnings === 0) {
    console.log(`${colors.green}🎉 All validation checks passed! Deployment ready.${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Errors: ${validationErrors}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Warnings: ${validationWarnings}${colors.reset}`);
    console.log(`${colors.cyan}Total Issues: ${totalIssues}${colors.reset}`);
  }

  console.log('\n📊 Validation Summary:');
  console.log('• Environment files: Checked for all environments');
  console.log('• Project structure: Verified required files exist');
  console.log('• Package configuration: Validated dependencies and scripts');
  console.log('• EAS configuration: Checked build and submit profiles');
  console.log('• GitHub Actions: Verified CI/CD workflow');
  console.log('• TypeScript files: Basic syntax and structure checks');

  console.log('\n🔧 Next Steps:');
  if (validationErrors > 0) {
    console.log('1. ❗ Fix all validation errors before deployment');
    console.log('2. 🔍 Review warnings and address if needed');
    console.log('3. 🧪 Run tests to ensure functionality');
  } else if (validationWarnings > 0) {
    console.log('1. 🔍 Review warnings and address if needed');
    console.log('2. 🧪 Run tests to ensure functionality');
    console.log('3. 🚀 Ready for deployment!');
  } else {
    console.log('1. 🧪 Run integration tests');
    console.log('2. 🚀 Deploy with: ./scripts/deploy-p0-cloud.sh [environment]');
    console.log('3. 📊 Monitor deployment health and costs');
  }

  console.log('\n💡 Useful Commands:');
  console.log('• Validate only: ./scripts/deploy-p0-cloud.sh development --validate-only');
  console.log('• Dry run: ./scripts/deploy-p0-cloud.sh development --dry-run');
  console.log('• Enable cloud: ./scripts/deploy-p0-cloud.sh staging --enable-cloud');

  console.log('='.repeat(80));

  return validationErrors === 0;
}

// Main execution
function main() {
  console.log(`${colors.purple}🚀 P0-CLOUD Phase 1 Deployment Validation${colors.reset}`);
  console.log(`${colors.cyan}Validating deployment readiness...${colors.reset}\n`);

  validateEnvironmentFiles();
  validateProjectStructure();
  validatePackageJson();
  validateEasJson();
  validateGitHubWorkflow();
  validateTypeScriptFiles();

  const isValid = generateValidationReport();

  process.exit(isValid ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironmentFiles,
  validateProjectStructure,
  validatePackageJson,
  validateEasJson,
  validateGitHubWorkflow,
  validateTypeScriptFiles
};