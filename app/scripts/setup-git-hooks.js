#!/usr/bin/env node

/**
 * Git Hooks Setup for Local Development
 * Optional pre-commit and pre-push validation without forcing workflow
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class GitHooksSetup {
  constructor() {
    this.rootDir = process.cwd();
    this.gitDir = path.join(this.rootDir, '.git');
    this.hooksDir = path.join(this.gitDir, 'hooks');
    
    if (!fs.existsSync(this.gitDir)) {
      throw new Error('Not a git repository');
    }
  }

  // Setup all optional hooks
  async setupHooks(options = {}) {
    console.log('🔧 Setting up optional Git hooks for local testing...\n');
    
    const {
      preCommit = true,
      prePush = true,
      interactive = true
    } = options;

    if (interactive) {
      console.log('These hooks are OPTIONAL and can be skipped by using:');
      console.log('  git commit --no-verify');
      console.log('  git push --no-verify\n');
    }

    const results = {};

    if (preCommit) {
      results.preCommit = await this.setupPreCommitHook();
    }

    if (prePush) {
      results.prePush = await this.setupPrePushHook();
    }

    this.printSetupSummary(results);
    return results;
  }

  // Setup pre-commit hook for quick validation
  async setupPreCommitHook() {
    console.log('📝 Setting up pre-commit hook...');
    
    const hookPath = path.join(this.hooksDir, 'pre-commit');
    const hookContent = this.generatePreCommitHook();
    
    try {
      fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
      console.log('✅ Pre-commit hook installed');
      
      return {
        success: true,
        path: hookPath,
        description: 'Quick validation before commits'
      };
    } catch (error) {
      console.log('❌ Failed to install pre-commit hook:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Setup pre-push hook for comprehensive validation
  async setupPrePushHook() {
    console.log('🚀 Setting up pre-push hook...');
    
    const hookPath = path.join(this.hooksDir, 'pre-push');
    const hookContent = this.generatePrePushHook();
    
    try {
      fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
      console.log('✅ Pre-push hook installed');
      
      return {
        success: true,
        path: hookPath,
        description: 'Comprehensive validation before pushes'
      };
    } catch (error) {
      console.log('❌ Failed to install pre-push hook:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate pre-commit hook script
  generatePreCommitHook() {
    return `#!/bin/bash

# Being MBCT Pre-commit Hook
# Optional validation - can be skipped with --no-verify

set -e

echo "🔍 Pre-commit validation starting..."
echo "   (Skip with: git commit --no-verify)"
echo

# Color codes for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Configuration
SKIP_TESTS=\${SKIP_TESTS:-false}
QUICK_MODE=\${QUICK_MODE:-true}
CRISIS_ONLY=\${CRISIS_ONLY:-false}

# Function to print colored output
print_status() {
    local status=\$1
    local message=\$2
    case \$status in
        "success") echo -e "\${GREEN}✅ \$message\${NC}" ;;
        "error") echo -e "\${RED}❌ \$message\${NC}" ;;
        "warning") echo -e "\${YELLOW}⚠️  \$message\${NC}" ;;
        "info") echo -e "\${BLUE}ℹ️  \$message\${NC}" ;;
    esac
}

# Function to run with timeout and error handling
run_with_timeout() {
    local cmd=\$1
    local timeout=\$2
    local description=\$3
    
    print_status "info" "Running: \$description"
    
    if timeout \$timeout bash -c "\$cmd"; then
        print_status "success" "\$description completed"
        return 0
    else
        local exit_code=\$?
        if [ \$exit_code -eq 124 ]; then
            print_status "error" "\$description timed out after \${timeout}s"
        else
            print_status "error" "\$description failed (exit code: \$exit_code)"
        fi
        return \$exit_code
    fi
}

# Check if we're in crisis-only mode
if [ "\$CRISIS_ONLY" = "true" ]; then
    print_status "warning" "Crisis-only mode: Running minimal safety checks"
    
    if ! run_with_timeout "npm run test:crisis-quick" 30 "Crisis safety tests"; then
        print_status "error" "Critical safety tests failed!"
        echo
        echo "🚨 CRISIS SAFETY VALIDATION FAILED"
        echo "   This indicates potential safety issues in crisis detection/intervention"
        echo "   Please fix before committing"
        echo
        exit 1
    fi
    
    print_status "success" "Crisis safety validation passed"
    echo
    exit 0
fi

# TypeScript compilation check
print_status "info" "Checking TypeScript compilation..."
if ! run_with_timeout "npm run typecheck" 60 "TypeScript compilation"; then
    print_status "error" "TypeScript compilation failed"
    echo
    echo "💡 Fix TypeScript errors before committing"
    echo "   Use: npm run typecheck to see details"
    echo
    exit 1
fi

# Linting check (clinical-focused)
print_status "info" "Running clinical linting..."
if ! run_with_timeout "npm run lint:clinical" 30 "Clinical linting"; then
    print_status "warning" "Linting issues found"
    echo
    echo "💡 Consider fixing linting issues:"
    echo "   Use: npm run lint:fix"
    echo "   Continuing anyway..."
    echo
fi

# Skip tests if requested
if [ "\$SKIP_TESTS" = "true" ]; then
    print_status "warning" "Skipping tests (SKIP_TESTS=true)"
    echo
    exit 0
fi

# Quick vs comprehensive testing
if [ "\$QUICK_MODE" = "true" ]; then
    print_status "info" "Quick mode: Running essential tests only"
    
    # Critical safety tests
    if ! run_with_timeout "npm run test:crisis-quick" 45 "Crisis safety tests"; then
        print_status "error" "Crisis safety tests failed!"
        echo
        echo "🚨 SAFETY-CRITICAL TEST FAILURE"
        echo "   Crisis detection/intervention tests must pass"
        echo "   This is non-negotiable for safety reasons"
        echo
        exit 1
    fi
    
    # Clinical accuracy tests
    if ! run_with_timeout "npm run test:clinical-quick" 45 "Clinical accuracy tests"; then
        print_status "error" "Clinical accuracy tests failed!"
        echo
        echo "🏥 CLINICAL ACCURACY FAILURE"
        echo "   PHQ-9/GAD-7 scoring or therapeutic content issues detected"
        echo "   Please verify clinical accuracy before committing"
        echo
        exit 1
    fi
    
else
    print_status "info" "Comprehensive mode: Running full validation"
    
    # Use automation script for comprehensive testing
    if ! run_with_timeout "npm run automation:pre-commit" 300 "Pre-commit validation suite"; then
        print_status "error" "Comprehensive validation failed"
        echo
        echo "🔍 COMPREHENSIVE VALIDATION FAILED"
        echo "   Multiple test categories failed"
        echo "   Use: npm run automation:pre-commit for details"
        echo
        exit 1
    fi
fi

# Success message
echo
print_status "success" "Pre-commit validation completed successfully!"
echo
echo "🎉 All checks passed - proceeding with commit"
echo

# Optional: Generate quick test report
if command -v node >/dev/null 2>&1; then
    node scripts/test-report-generator.js dashboard >/dev/null 2>&1 || true
fi

exit 0
`;
  }

  // Generate pre-push hook script
  generatePrePushHook() {
    return `#!/bin/bash

# Being MBCT Pre-push Hook
# Comprehensive validation before pushing to remote
# Can be skipped with --no-verify

set -e

echo "🚀 Pre-push validation starting..."
echo "   (Skip with: git push --no-verify)"
echo

# Color codes
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m'

# Configuration
SKIP_COMPREHENSIVE=\${SKIP_COMPREHENSIVE:-false}
PERFORMANCE_CHECK=\${PERFORMANCE_CHECK:-true}
COVERAGE_CHECK=\${COVERAGE_CHECK:-false}

# Function to print colored output
print_status() {
    local status=\$1
    local message=\$2
    case \$status in
        "success") echo -e "\${GREEN}✅ \$message\${NC}" ;;
        "error") echo -e "\${RED}❌ \$message\${NC}" ;;
        "warning") echo -e "\${YELLOW}⚠️  \$message\${NC}" ;;
        "info") echo -e "\${BLUE}ℹ️  \$message\${NC}" ;;
    esac
}

# Function to run with timeout
run_with_timeout() {
    local cmd=\$1
    local timeout=\$2
    local description=\$3
    
    print_status "info" "Running: \$description"
    
    if timeout \$timeout bash -c "\$cmd"; then
        print_status "success" "\$description completed"
        return 0
    else
        local exit_code=\$?
        if [ \$exit_code -eq 124 ]; then
            print_status "error" "\$description timed out after \${timeout}s"
        else
            print_status "error" "\$description failed (exit code: \$exit_code)"
        fi
        return \$exit_code
    fi
}

# Read the local and remote refs
while read local_ref local_sha remote_ref remote_sha; do
    if [ "\$local_sha" = "0000000000000000000000000000000000000000" ]; then
        # Handle delete
        continue
    fi
    
    print_status "info" "Validating push to \$remote_ref"
    
    # Critical safety validation (always runs)
    print_status "info" "Running critical safety validation..."
    
    if ! run_with_timeout "npm run local:crisis-check" 120 "Crisis safety validation"; then
        print_status "error" "Critical safety validation failed!"
        echo
        echo "🚨 SAFETY VALIDATION FAILURE"
        echo "   Crisis detection and intervention systems have issues"
        echo "   This push is blocked for safety reasons"
        echo
        exit 1
    fi
    
    if ! run_with_timeout "npm run local:clinical-check" 120 "Clinical accuracy validation"; then
        print_status "error" "Clinical accuracy validation failed!"
        echo
        echo "🏥 CLINICAL VALIDATION FAILURE"
        echo "   PHQ-9/GAD-7 scoring or therapeutic content issues"
        echo "   This push is blocked for clinical safety"
        echo
        exit 1
    fi
    
    # Skip comprehensive tests if requested
    if [ "\$SKIP_COMPREHENSIVE" = "true" ]; then
        print_status "warning" "Skipping comprehensive tests (SKIP_COMPREHENSIVE=true)"
        continue
    fi
    
    # Comprehensive validation
    print_status "info" "Running comprehensive validation..."
    
    if ! run_with_timeout "npm run automation:full" 600 "Full test suite"; then
        print_status "error" "Comprehensive test suite failed"
        echo
        echo "🔍 COMPREHENSIVE VALIDATION FAILED"
        echo "   Multiple test categories failed"
        echo "   Use: npm run automation:full for details"
        echo
        echo "💡 To push anyway (not recommended):"
        echo "   git push --no-verify"
        echo "   OR set: SKIP_COMPREHENSIVE=true"
        echo
        exit 1
    fi
    
    # Performance validation
    if [ "\$PERFORMANCE_CHECK" = "true" ]; then
        print_status "info" "Running performance validation..."
        
        if ! run_with_timeout "npm run local:performance-check" 300 "Performance regression tests"; then
            print_status "warning" "Performance tests failed or detected regressions"
            echo
            echo "⚡ PERFORMANCE ISSUES DETECTED"
            echo "   Consider optimizing before pushing"
            echo "   Continuing anyway..."
            echo
        fi
    fi
    
    # Coverage check (optional)
    if [ "\$COVERAGE_CHECK" = "true" ]; then
        print_status "info" "Checking test coverage..."
        
        if ! run_with_timeout "npm run test:local-coverage" 180 "Coverage analysis"; then
            print_status "warning" "Coverage check failed"
            echo
            echo "📊 COVERAGE ANALYSIS FAILED"
            echo "   Consider adding more tests"
            echo "   Continuing anyway..."
            echo
        fi
    fi
    
done

# Success message
echo
print_status "success" "Pre-push validation completed successfully!"
echo
echo "🎉 All critical validations passed"
echo "🚀 Push proceeding to remote repository"
echo

# Generate comprehensive report
if command -v node >/dev/null 2>&1; then
    node scripts/test-report-generator.js all >/dev/null 2>&1 || true
fi

exit 0
`;
  }

  // Remove hooks
  async removeHooks() {
    console.log('🧹 Removing Git hooks...\n');
    
    const hooks = ['pre-commit', 'pre-push'];
    const results = {};
    
    hooks.forEach(hookName => {
      const hookPath = path.join(this.hooksDir, hookName);
      
      try {
        if (fs.existsSync(hookPath)) {
          fs.unlinkSync(hookPath);
          console.log(`✅ Removed ${hookName} hook`);
          results[hookName] = { success: true, action: 'removed' };
        } else {
          console.log(`ℹ️  ${hookName} hook was not installed`);
          results[hookName] = { success: true, action: 'not_found' };
        }
      } catch (error) {
        console.log(`❌ Failed to remove ${hookName} hook:`, error.message);
        results[hookName] = { success: false, error: error.message };
      }
    });
    
    return results;
  }

  // Check hook status
  checkHookStatus() {
    console.log('🔍 Checking Git hooks status...\n');
    
    const hooks = ['pre-commit', 'pre-push'];
    const status = {};
    
    hooks.forEach(hookName => {
      const hookPath = path.join(this.hooksDir, hookName);
      
      if (fs.existsSync(hookPath)) {
        const stats = fs.statSync(hookPath);
        status[hookName] = {
          installed: true,
          executable: Boolean(stats.mode & parseInt('111', 8)),
          path: hookPath,
          size: stats.size,
          modified: stats.mtime
        };
        console.log(`✅ ${hookName}: Installed and ${status[hookName].executable ? 'executable' : 'not executable'}`);
      } else {
        status[hookName] = { installed: false };
        console.log(`❌ ${hookName}: Not installed`);
      }
    });
    
    return status;
  }

  // Print setup summary
  printSetupSummary(results) {
    console.log('\n📋 Git Hooks Setup Summary');
    console.log(''.padEnd(40, '='));
    
    Object.entries(results).forEach(([hookType, result]) => {
      if (result.success) {
        console.log(`✅ ${hookType}: ${result.description}`);
      } else {
        console.log(`❌ ${hookType}: Failed - ${result.error}`);
      }
    });
    
    console.log('\n💡 Usage Tips:');
    console.log('  • Skip hooks: git commit --no-verify');
    console.log('  • Crisis-only mode: CRISIS_ONLY=true git commit');
    console.log('  • Quick mode: QUICK_MODE=true git commit');
    console.log('  • Skip tests: SKIP_TESTS=true git commit');
    console.log('  • Skip comprehensive: SKIP_COMPREHENSIVE=true git push');
    
    console.log('\n🔧 Hook Management:');
    console.log('  • Check status: npm run hooks:status');
    console.log('  • Remove hooks: npm run hooks:remove');
    console.log('  • Reinstall: npm run hooks:setup');
    
    console.log(''.padEnd(40, '='));
  }
}

// CLI interface
async function main() {
  const setup = new GitHooksSetup();
  const command = process.argv[2] || 'setup';
  
  try {
    switch (command) {
      case 'setup':
      case 'install':
        await setup.setupHooks();
        break;
      case 'remove':
      case 'uninstall':
        await setup.removeHooks();
        break;
      case 'status':
        setup.checkHookStatus();
        break;
      case 'setup-minimal':
        await setup.setupHooks({ preCommit: true, prePush: false });
        break;
      case 'setup-full':
        await setup.setupHooks({ preCommit: true, prePush: true });
        break;
      default:
        console.log('Usage: node setup-git-hooks.js [command]');
        console.log('Commands:');
        console.log('  setup         - Install all hooks (default)');
        console.log('  setup-minimal - Install only pre-commit hook');
        console.log('  setup-full    - Install all hooks');
        console.log('  remove        - Remove all hooks');
        console.log('  status        - Check hook installation status');
        process.exit(1);
    }
  } catch (error) {
    console.error('🚨 Git hooks setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = GitHooksSetup;