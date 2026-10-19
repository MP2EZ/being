# Local Testing Guide - Being

Comprehensive local testing automation and validation tools for rapid development without CI/CD complexity.

## 🚀 Quick Start

```bash
# Quick clinical check (fastest)
npm run test:clinical-quick

# Smart development workflow
npm run automation:dev

# Generate test dashboard
npm run reports:dashboard
```

## 📋 Available Testing Tools

### 1. Test Automation Workflows

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

### 2. Enhanced Jest Configurations

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

### 3. Git Hooks (Optional)

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

### 4. Test Reports & Visualization

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

### Feature Development Workflow
```bash
# 1. Start with smart validation
npm run automation:dev

# 2. Generate reports
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
npm run test:crisis-quick

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
npm run test:clinical-quick

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

**Tests timeout**: Increase the timeout in the Jest configuration, or run a single file with `npx jest <path> --testTimeout=30000`

**Performance issues**: Use performance monitoring
```bash
# Memory monitoring
npm run test:memory

# Performance analysis
npm run automation:performance
```

### Debug Commands

```bash
# Memory usage analysis
npm run test:memory

# Performance regression check
npm run automation:performance
```

## 🎛️ Advanced Usage

### Custom Test Patterns

```bash
# Test specific pattern
npm run test:quick -- --testNamePattern="crisis|Crisis"

# Test specific file
npx jest src/components/CrisisButton.test.tsx
```

## 📝 File Structure

```
app/
├── jest.local.config.js          # Local development Jest config
├── jest.quick.config.js           # Ultra-fast Jest config
├── scripts/
│   ├── local-test-automation.js   # Main automation workflows
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
1. **Start with the quick clinical check** (`npm run test:clinical-quick`)
2. **Use watch mode** for continuous feedback (`npm run automation:watch`)
3. **Run focused tests** for specific components (`npx jest <path>`)
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
| `npm run test:clinical-quick` | Quick clinical check | < 1 min |
| `npm run automation:quick` | Essential tests | < 2 min |
| `npm run automation:dev` | Development workflow | 2-5 min |
| `npm run automation:full` | Comprehensive | 5-10 min |
| `npm run reports:dashboard` | Generate reports | < 30s |

**Crisis Safety**: Always < 3s, never skipped, immediate feedback
**Clinical Accuracy**: PHQ-9/GAD-7 100% accuracy, therapeutic validation
**Performance**: Real-time monitoring, regression detection, optimization tips

For questions or issues, check the generated HTML reports.