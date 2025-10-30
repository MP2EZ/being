# Being. Development Quickstart Commands

## App Development

### Start the App
```bash
cd app
npm start
# or
npx expo start
```

### Metro Bundler Controls

While Metro is running, use these keyboard shortcuts:
- Press `c` - Clear Metro bundler console (fastest)
- Press `r` - Reload app
- Press `Shift + r` - Reload and clear cache
- Press `d` - Open developer menu

Clear terminal before starting:
```bash
clear && npx expo start
```

### Run on Device/Simulator
```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Physical device (scan QR code)
npx expo start --tunnel
```

### Testing

#### Run All Tests
```bash
cd app
npm test
```

#### Clinical Testing (Critical)
```bash
# Assessment accuracy tests
npm run test:clinical

# Crisis detection validation
npm run test:crisis-detection
# or for quick crisis tests
npm run test:crisis-quick

# Accessibility compliance
npm run test:accessibility
```

#### Performance Testing
```bash
# Crisis button performance
npm run perf:crisis

# Breathing circle performance
npm run perf:breathing

# Launch performance
npm run perf:launch

# All performance tests
npm run perf:all

# Offline performance
npm run perf:offline
```

#### Offline Testing
```bash
# Test offline functionality
npm run test:offline

# Test offline crisis access
npm run test:offline-crisis
```

#### Security Testing
```bash
# Static application security testing
npm run security:sast

# Dependency security scan
npm run security:deps

# Full security suite
npm run security:full

# Encryption tests
npm run test:encryption

# Secure storage tests
npm run test:secure-storage
```

### Quick Validation Commands

Fast validation for rapid iteration:
```bash
# Quick validation (syntax + critical tests)
npm run quick:validate

# Quick crisis validation
npm run quick:crisis

# Quick clinical validation
npm run quick:clinical

# Quick syntax check
npm run quick:syntax

# Quick performance check
npm run quick:perf

# Quick fix (lint + format)
npm run quick:fix

# Watch mode for quick checks
npm run quick:watch

# Interactive quick validation
npm run quick:interactive
```

### Automation Commands

Automated validation workflows:
```bash
# Quick automation (fast checks)
npm run automation:quick

# Full automation suite
npm run automation:full

# Performance automation
npm run automation:performance

# Pre-commit automation
npm run automation:pre-commit

# Development automation
npm run automation:dev

# Watch mode automation
npm run automation:watch
```

### Dev Testing Commands

Development-focused test runners:
```bash
# Smart test runner (only changed files)
npm run dev:test-smart

# Focused test runner (specific tests)
npm run dev:test-focused

# Debug test runner
npm run dev:test-debug

# Fast test runner (minimal output)
npm run dev:test-fast

# Coverage test runner
npm run dev:test-coverage
```

### Platform Testing

Cross-platform validation:
```bash
# List available platforms
npm run platform:list

# Test iOS platform
npm run platform:ios

# Test Android platform
npm run platform:android

# Test both platforms
npm run platform:both

# Setup platform testing
npm run platform:setup

# Run platforms in parallel
npm run platform:parallel
```

### Code Quality
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Clinical language validation
npm run lint:clinical

# Lint and fix
npm run lint:fix
```

### Local Validation

Pre-commit validation:
```bash
# Validate before commit
npm run local:validate

# Quick crisis check
npm run local:crisis-check

# Quick clinical check
npm run local:clinical-check
```

### Git Hooks Setup

Configure pre-commit and pre-push hooks:
```bash
# Setup standard hooks
npm run hooks:setup

# Setup minimal hooks (fast)
npm run hooks:setup-minimal

# Setup full hooks (comprehensive)
npm run hooks:setup-full

# Remove all hooks
npm run hooks:remove

# Check hook status
npm run hooks:status
```

### Reports Generation

Generate validation and performance reports:
```bash
# Generate dashboard report
npm run reports:dashboard

# Generate performance report
npm run reports:performance

# Generate coverage report
npm run reports:coverage

# Generate all reports
npm run reports:all
```

### Build & Deploy
```bash
# Development build
npx expo build

# Production build
npx expo build --release-channel production

# App store builds
eas build --platform ios
eas build --platform android
```

## Website Development

### Start Website Prototype
```bash
cd website
# Open in browser:
open fullmind-website-wireframe.html
```

## Documentation

### Key Documentation Files
```bash
# Product requirements
open "docs/product/Being. PRD.md"

# Technical requirements
open "docs/product/Being. TRD.md"

# Design requirements
open "docs/product/Being. DRD.md"

# Product roadmap
open "docs/product/Being. Product Roadmap - Prioritized.md"

# Crisis implementation guide
open "docs/Crisis-Button-Implementation-Guide.md"

# TypeScript safety guide
open "docs/TypeScript-Safety-Guide.md"

# Stoic Mindfulness framework
open "docs/product/stoic-mindfulness/INDEX.md"
```

## Stoic Mindfulness Validation

### Philosopher Agent Validation

The philosopher agent validates Stoic philosophical accuracy (see `.claude/CLAUDE.md`):

**Auto-triggers on:**
- Stoic principles (Marcus Aurelius, Epictetus, Seneca)
- Concepts (dichotomy of control, virtue, prohairesis)
- Educational modules about Stoic philosophy
- Principle content changes

**Key Stoic documentation:**
```bash
# Framework overview
open "docs/product/stoic-mindfulness/INDEX.md"

# 5 Core Principles
open "docs/product/stoic-mindfulness/principles/"

# Technical architecture
open "docs/technical/Stoic-Mindfulness-Architecture-v1.0.md"

# Daily practice architecture
open "docs/product/stoic-mindfulness/practice/daily-architecture.md"
```

**Validation standards:**
- Philosophical accuracy (classical sources, proper attribution)
- Virtue ethics (wisdom, courage, justice, temperance)
- Dichotomy of control (proper framing, not oversimplified)
- 5 Principles framework coherence
- Practice architecture alignment

## Development Workflow

### Git Workflow
```bash
# Check status
git status

# Create feature branch
git checkout -b feature/new-feature-name

# Commit changes
git add .
git commit -m "feat: implement new feature"

# Push to GitHub
git push origin feature/new-feature-name
```

### Emergency Commands

#### Crisis Testing
```bash
# Crisis detection (quick)
npm run test:crisis-quick

# Full crisis detection validation
npm run test:crisis-detection

# Emergency crisis safety check
npm run emergency:crisis-safety-quick
```

#### Debug Mode
```bash
# Enable debug logging
EXPO_DEBUG=true npx expo start

# Network debugging
EXPO_DEBUG_NETWORK=true npx expo start
```

## Environment Setup

### Prerequisites
```bash
# Install dependencies
npm install -g expo-cli eas-cli

# Verify installation
expo --version
eas --version
```

### Required Environment Variables
```bash
# Add to app/.env (not committed)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Device Setup
```bash
# Install Expo Go app on device
# iOS: App Store
# Android: Google Play Store

# For development builds
npx expo install expo-dev-client
```

## Performance Monitoring

### Critical Performance Targets
- **Crisis Button Response**: <200ms
- **Assessment Loading**: <300ms
- **Breathing Circle Animation**: 60fps
- **Check-in Flow Transitions**: <500ms
- **App Launch Time**: <2 seconds

### Monitor Performance
```bash
# Bundle size analysis
ANALYZE=true npm run build

# Memory profiling
npx react-native-bundle-visualizer

# Performance profiling
npx expo start --dev-client
```

## Troubleshooting

### Common Issues

#### Clear Cache
```bash
# Clear Expo cache
expo r -c

# Clear npm cache
npm start -- --reset-cache
```

#### Metro Issues
```bash
# Clear Metro bundler console (while running)
# Press 'c'

# Reset Metro bundler
npx expo start -c

# Kill Metro processes
pkill -f "metro"
```

#### iOS Build Issues
```bash
# Clean iOS build
cd ios && xcodebuild clean && cd ..

# Reset iOS simulator
xcrun simctl erase all
```

### Development Tools
```bash
# React Native Debugger
open "rndebugger://set-debugger-loc?host=localhost&port=8081"

# Flipper (if using bare React Native)
npx react-native doctor
```

## Clinical & Philosophical Validation

### Pre-Release Checklist
```bash
# All tests passing
npm test

# Clinical accuracy validated
npm run test:clinical

# Crisis protocols tested
npm run test:crisis-detection

# Accessibility compliance
npm run test:accessibility

# Performance targets met
npm run perf:all

# Philosophical accuracy validated
# (philosopher agent validates during development)
```

### Validation Commands
```bash
# Clinical validation (complete)
npm run validate:clinical-complete

# Crisis authority validation
npm run validate:crisis-authority

# Compliance authority validation
npm run validate:compliance-authority

# Clinical authority validation
npm run validate:clinical-authority

# Accessibility validation
npm run validate:accessibility

# Performance validation
npm run validate:performance

# Offline crisis validation
npm run validate:offline-crisis
```

---

## Quick Reference

### Emergency Access
- **Crisis Hotline**: 988 (always accessible <3 seconds)
- **Emergency Commands**: `npm run test:crisis-quick`
- **Safety Documentation**: `docs/Crisis-Button-Implementation-Guide.md`

### Stoic Framework
- **Philosopher Agent**: Auto-validates Stoic content (see `.claude/CLAUDE.md`)
- **5 Principles**: Aware Presence, Radical Acceptance, Sphere Sovereignty, Virtuous Response, Interconnected Living
- **Framework Docs**: `docs/product/stoic-mindfulness/INDEX.md`

### Support
- **Technical Issues**: Check `app/CHANGELOG.md` for recent fixes
- **Clinical Questions**: Refer to `.claude/CLAUDE.md` domain authorities (crisis, compliance, philosopher)
- **Performance Issues**: Run `npm run perf:all`
- **Quick Validation**: Run `npm run quick:validate`
