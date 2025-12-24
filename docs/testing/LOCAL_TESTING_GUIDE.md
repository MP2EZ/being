# Local Testing Guide - Being

Comprehensive local testing automation and validation tools for rapid development without CI/CD complexity.

## 🚀 Quick Start

```bash
# Quick validation (fastest)
npm run quick:validate

# Smart development workflow
npm run automation:dev

# Generate test dashboard
npm run reports:dashboard
```

## 📋 Available Testing Tools

### 1. Quick Validation Tools
Ultra-fast validation for rapid iteration:

```bash
# Smart validation based on file changes
npm run quick:validate

# Crisis safety check (< 30s)
npm run quick:crisis

# Clinical accuracy check (< 45s)
npm run quick:clinical

# Syntax/type check (< 15s)
npm run quick:syntax

# Performance check
npm run quick:perf

# Auto-fix lint issues
npm run quick:fix

# Watch mode with smart validation
npm run quick:watch

# Interactive validation mode
npm run quick:interactive
```

### 2. Test Automation Workflows

```bash
# Quick validation suite (< 2 min)
npm run automation:quick

# Comprehensive testing (5-10 min)
npm run automation:full

# Performance regression testing
npm run automation:performance

# Pre-commit validation
npm run automation:pre-commit

# Development workflow (quick → comprehensive if passes)
npm run automation:dev

# Watch mode with continuous testing
npm run automation:watch
```

### 3. Enhanced Jest Configurations

```bash
# Local development optimized
npm run test:local

# Ultra-fast quick tests
npm run test:quick

# Watch mode for development
npm run test:dev

# Memory usage monitoring
npm run test:memory

# Local performance testing
npm run test:local-performance

# Coverage analysis
npm run test:local-coverage
```

### 4. Smart Test Execution

```bash
# Smart prioritized testing
npm run dev:test-smart

# Focused testing for specific component
npm run dev:test-focused ComponentName

# Debug mode with verbose output
npm run dev:test-debug

# Fast execution with fail-fast
npm run dev:test-fast

# Coverage analysis
npm run dev:test-coverage
```

### 5. Cross-Platform Testing

```bash
# List available devices
npm run platform:list

# iOS testing
npm run platform:ios

# Android testing
npm run platform:android

# Both platforms
npm run platform:both

# Parallel platform testing
npm run platform:parallel

# Setup platform test utilities
npm run platform:setup
```

### 6. Git Hooks (Optional)

```bash
# Setup optional pre-commit/pre-push hooks
npm run hooks:setup

# Setup minimal (pre-commit only)
npm run hooks:setup-minimal

# Setup full validation
npm run hooks:setup-full

# Check hook status
npm run hooks:status

# Remove hooks
npm run hooks:remove
```

### 7. Test Reports & Visualization

```bash
# Generate HTML test dashboard
npm run reports:dashboard

# Performance trends report
npm run reports:performance

# Coverage visualization
npm run reports:coverage

# Generate all reports
npm run reports:all
```

## 🎯 Development Workflows

### Rapid Iteration Workflow
```bash
# 1. Quick validation during development
npm run quick:validate

# 2. Auto-fix any issues
npm run quick:fix

# 3. Watch mode for continuous feedback
npm run quick:watch
```

### Feature Development Workflow
```bash
# 1. Start with smart validation
npm run automation:dev

# 2. Focus on your component
npm run dev:test-focused MyComponent

# 3. Generate reports
npm run reports:dashboard
```

### Pre-commit Workflow
```bash
# 1. Setup optional hooks (one-time)
npm run hooks:setup

# 2. Or manual pre-commit validation
npm run automation:pre-commit

# 3. Crisis-only mode for quick commits
CRISIS_ONLY=true git commit -m "message"
```

### Cross-platform Workflow
```bash
# 1. Setup platform utilities (one-time)
npm run platform:setup

# 2. Test on both platforms
npm run platform:both

# 3. Or parallel for speed
npm run platform:parallel
```

## ⚡ Performance-Optimized Testing

### Local Jest Configurations

**jest.local.config.js**: Optimized for development
- 50% CPU usage for responsive system
- Enhanced error reporting
- Performance monitoring built-in
- Coverage thresholds for critical components

**jest.quick.config.js**: Ultra-fast iteration
- Single worker for speed
- 5s timeout for rapid feedback
- Skips slow tests (integration, e2e)
- Minimal setup for maximum speed

### Smart Test Prioritization

Tests run in order of criticality:
1. **Crisis Safety** (< 3s requirement)
2. **Clinical Accuracy** (PHQ-9/GAD-7)
3. **Unit Tests**
4. **Integration Tests**
5. **Performance Tests**

## 🚨 Crisis Safety Testing

Crisis tests have special handling:
- **Always run first** in prioritized execution
- **< 3s performance requirement**
- **Never skipped** in any workflow
- **Immediate failure feedback**

```bash
# Quick crisis check
npm run quick:crisis

# Crisis performance validation
npm run perf:crisis

# Crisis + clinical safety
npm run local:crisis-check
```

## 🏥 Clinical Accuracy Testing

Clinical tests ensure therapeutic safety:
- **PHQ-9 scoring accuracy** (all 27 combinations)
- **GAD-7 scoring accuracy** (all 21 combinations)
- **Therapeutic content validation**
- **Stoic practice accuracy**

```bash
# Quick clinical check
npm run quick:clinical

# Comprehensive clinical validation
npm run local:clinical-check

# Clinical accuracy with type safety
npm run validate:clinical-complete
```

## 📊 Performance Monitoring

### Real-time Performance Tracking
- **Automatic performance monitoring** in all test runs
- **Crisis test performance alerts** (> 3s = critical)
- **Memory usage tracking**
- **Performance regression detection**

### Performance Reports
- **Trend analysis** across test runs
- **Platform comparison** (iOS vs Android)
- **Component-specific metrics**
- **Optimization recommendations**

## 🔧 Configuration Options

### Environment Variables

```bash
# Skip comprehensive tests
SKIP_COMPREHENSIVE=true npm run automation:full

# Crisis-only mode
CRISIS_ONLY=true npm run automation:quick

# Quick mode for hooks
QUICK_MODE=true git commit

# Skip tests entirely
SKIP_TESTS=true git commit

# Performance monitoring
PERFORMANCE_CHECK=true npm run automation:full
```

### Git Hook Configuration

Hooks are **optional** and can be bypassed:
- `git commit --no-verify` - Skip pre-commit hook
- `git push --no-verify` - Skip pre-push hook
- `CRISIS_ONLY=true git commit` - Crisis safety only
- `QUICK_MODE=true git commit` - Fast validation mode

## 📈 Test Reports & Dashboards

### HTML Dashboard
- **Real-time test results** with visual indicators
- **Performance trends** and regression detection
- **Failure analysis** with actionable insights
- **Coverage visualization** by component category

### Access Reports
```bash
# Generate and open dashboard
npm run reports:dashboard
# Opens: file://./test-results/reports/test-dashboard.html

# Performance trends
npm run reports:performance
# Opens: file://./test-results/reports/performance-trends.html

# Coverage analysis
npm run reports:coverage
# Opens: file://./test-results/reports/coverage-report.html
```

## 🔍 Debugging & Troubleshooting

### Common Issues

**Tests timeout**: Increase timeout in configuration
```bash
# Debug mode with longer timeouts
npm run dev:test-debug
```

**Platform issues**: Check device availability
```bash
# List available devices
npm run platform:list
```

**Performance issues**: Use performance monitoring
```bash
# Memory monitoring
npm run test:memory

# Performance analysis
npm run automation:performance
```

### Debug Commands

```bash
# Verbose test output
npm run dev:test-debug

# Memory usage analysis
npm run test:memory

# Performance regression check
npm run automation:performance

# Interactive validation mode
npm run quick:interactive
```

## 🎛️ Advanced Usage

### Custom Test Patterns

```bash
# Test specific component
npm run dev:test-focused CrisisButton

# Test specific pattern
npm run test:quick -- --testNamePattern="crisis|Crisis"

# Test specific file
node scripts/quick-validation.js test src/components/CrisisButton.test.tsx
```

### Watch Mode with Patterns

```bash
# Watch specific pattern
npm run quick:watch crisis

# Watch with smart validation
npm run automation:watch
```

### Interactive Mode

```bash
# Interactive validation commands
npm run quick:interactive
# Commands: c (crisis), cl (clinical), s (syntax), p (perf), a (all), f (fix), t (test file), q (quit)
```

## 📝 File Structure

```
app/
├── jest.local.config.js          # Local development Jest config
├── jest.quick.config.js           # Ultra-fast Jest config
├── scripts/
│   ├── local-test-automation.js   # Main automation workflows
│   ├── quick-validation.js        # Quick validation tools
│   ├── dev-test-runner.js         # Smart test execution
│   ├── cross-platform-testing.js  # iOS/Android testing
│   ├── test-report-generator.js   # HTML reports & dashboards
│   └── setup-git-hooks.js         # Optional Git hooks
├── __tests__/
│   ├── setup/
│   │   ├── jest.setup.js          # Enhanced test setup
│   │   ├── quick-setup.js         # Minimal setup for speed
│   │   └── performance-monitoring.js # Performance tracking
│   └── reporters/
│       ├── local-performance-reporter.js # Performance analysis
│       ├── quick-reporter.js      # Fast feedback reporter
│       └── coverage-reporter.js   # Coverage analysis
└── test-results/
    ├── reports/                   # HTML dashboards
    ├── *.json                     # Test result data
    └── performance-trends.json    # Performance history
```

## 🚀 Best Practices

### Development Workflow
1. **Start with quick validation** (`npm run quick:validate`)
2. **Use watch mode** for continuous feedback
3. **Run focused tests** for specific components
4. **Generate reports** for analysis

### Safety-First Testing
1. **Crisis tests always pass** before any commit
2. **Clinical accuracy verified** for therapeutic content
3. **Performance requirements met** (< 3s for crisis)
4. **Cross-platform consistency** maintained

### Performance Optimization
1. **Use quick config** for rapid iteration
2. **Monitor performance trends** regularly
3. **Focus on critical components** first
4. **Parallel execution** when appropriate

---

## 🎉 Quick Reference

| Command | Purpose | Speed |
|---------|---------|-------|
| `npm run quick:validate` | Smart validation | < 1 min |
| `npm run automation:quick` | Essential tests | < 2 min |
| `npm run automation:dev` | Development workflow | 2-5 min |
| `npm run automation:full` | Comprehensive | 5-10 min |
| `npm run reports:dashboard` | Generate reports | < 30s |
| `npm run platform:both` | Cross-platform | 3-8 min |

**Crisis Safety**: Always < 3s, never skipped, immediate feedback
**Clinical Accuracy**: PHQ-9/GAD-7 100% accuracy, therapeutic validation
**Performance**: Real-time monitoring, regression detection, optimization tips

For questions or issues, check the generated HTML reports or run interactive mode: `npm run quick:interactive`