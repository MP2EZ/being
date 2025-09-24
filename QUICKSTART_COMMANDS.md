# FullMind Development Quickstart Commands

## App Development

### 🚀 Start the App
```bash
cd app
npm start
# or
npx expo start
```

### 📱 Run on Device/Simulator
```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Physical device (scan QR code)
npx expo start --tunnel
```

### 🧪 Testing

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
npm run test:crisis

# Accessibility compliance
npm run test:accessibility
```

#### Performance Testing
```bash
# Haptic feedback performance
npm run performance:haptic

# Clinical UX timing validation
npm run performance:clinical
```

### 🔍 Code Quality
```bash
# Type checking
npm run typecheck
# or
npm run tsc

# Linting
npm run lint

# Clinical language validation
npm run lint:clinical
```

### 📦 Build & Deploy
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

### 🌐 Start Website Prototype
```bash
cd website
# Open in browser:
open fullmind-website-wireframe.html
```

### 📄 View Design Prototype
```bash
cd documentation
# Open in browser:
open "FullMind Design Prototype v1.7.html"
```

## Documentation

### 📚 Key Documentation Files
```bash
# Product requirements
open "docs/product/FullMind PRD v1.2.md"

# Technical requirements  
open "docs/product/FullMind TRD v2.0.md"

# Design requirements
open "docs/product/FullMind DRD v1.3.md"

# Implementation status
open "docs/product/FullMind Implementation Status v3.0.md"

# Product roadmap
open "docs/product/FullMind Product Roadmap - Prioritized - Based on v1.7.md"
```

## Development Workflow

### 🔄 Git Workflow
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

### 🆘 Emergency Commands

#### Crisis Testing
```bash
# Test crisis button response time (<200ms)
npm run test:crisis-timing

# Validate PHQ-9/GAD-7 scoring accuracy
npm run test:assessment-accuracy

# Test emergency contact integration
npm run test:emergency-contacts
```

#### Debug Mode
```bash
# Enable debug logging
EXPO_DEBUG=true npx expo start

# Network debugging
EXPO_DEBUG_NETWORK=true npx expo start
```

## Environment Setup

### 📋 Prerequisites
```bash
# Install dependencies
npm install -g expo-cli eas-cli

# Verify installation
expo --version
eas --version
```

### 🔑 Required Environment Variables
```bash
# Add to app/.env (not committed)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### 📱 Device Setup
```bash
# Install Expo Go app on device
# iOS: App Store
# Android: Google Play Store

# For development builds
npx expo install expo-dev-client
```

## Performance Monitoring

### ⚡ Critical Performance Targets
- **Crisis Button Response**: <200ms
- **Assessment Loading**: <300ms  
- **Breathing Circle Animation**: 60fps
- **Check-in Flow Transitions**: <500ms
- **App Launch Time**: <2 seconds

### 📊 Monitor Performance
```bash
# Bundle size analysis
ANALYZE=true npm run build

# Memory profiling
npx react-native-bundle-visualizer

# Performance profiling
npx expo start --dev-client
```

## Troubleshooting

### 🐛 Common Issues

#### Clear Cache
```bash
# Clear Expo cache
expo r -c

# Clear npm cache
npm start -- --reset-cache
```

#### Metro Issues
```bash
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

### 🔧 Development Tools
```bash
# React Native Debugger
open "rndebugger://set-debugger-loc?host=localhost&port=8081"

# Flipper (if using bare React Native)
npx react-native doctor
```

## Clinical Validation

### ✅ Pre-Release Checklist
```bash
# All tests passing
npm run test:all

# Clinical accuracy validated
npm run test:clinical

# Crisis protocols tested
npm run test:crisis

# Accessibility compliance
npm run test:accessibility

# Performance targets met
npm run performance:all
```

### 🏥 Clinical Testing Commands
```bash
# Validate PHQ-9 scoring (all 27 combinations)
npm run test:phq9-scoring

# Validate GAD-7 scoring (all 21 combinations)  
npm run test:gad7-scoring

# Test crisis threshold detection
npm run test:crisis-thresholds

# Validate MBCT compliance
npm run test:mbct-compliance
```

---

## Quick Reference

### 🚨 Emergency Access
- **Crisis Hotline**: 988 (always accessible <3 seconds)
- **Emergency Commands**: `npm run test:crisis`
- **Safety Documentation**: `docs/clinical/TESTING_STRATEGY.md`

### 📞 Support
- **Technical Issues**: Check `app/CHANGELOG.md` for recent fixes
- **Clinical Questions**: Refer to `.claude/CLAUDE.md` domain authorities
- **Performance Issues**: Run `npm run performance:all`