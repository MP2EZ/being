# FullMind MBCT Mobile App

A clinical-grade React Native application for Mindfulness-Based Cognitive Therapy (MBCT), designed to provide evidence-based mental health support with crisis safety protocols and therapeutic effectiveness.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ with npm
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (macOS) or Android Studio

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platforms
npm run ios          # iOS Simulator
npm run android      # Android Emulator
npm run web          # Web browser
```

## 📁 Project Structure

```
app/
├── src/                    # Application source code
│   ├── components/         # Reusable React Native components
│   ├── screens/           # Screen components and navigation
│   ├── services/          # Business logic and API services
│   ├── stores/            # Zustand state management
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions and helpers
│   └── constants/         # App-wide constants and configuration
├── assets/                # Images, fonts, and static assets
├── __tests__/             # Test suites (unit, integration, clinical)
├── scripts/               # Development and build scripts
├── plugins/               # Expo plugins and native modules
└── ios/                   # iOS-specific native code
```

## 🧪 Testing & Quality

### Core Testing Commands
```bash
# Run all tests
npm test

# Test categories
npm run test:clinical           # Clinical accuracy (PHQ-9/GAD-7)
npm run test:integration        # Integration tests
npm run test:accessibility      # Accessibility compliance
npm run test:performance        # Performance benchmarks

# Clinical validation
npm run validate:clinical       # Complete clinical accuracy validation
npm run validate:encryption     # Encryption security validation
npm run validate:sessions       # Session management validation
```

### Performance Testing
```bash
# Core performance tests
npm run perf:breathing         # Breathing animation (60fps requirement)
npm run perf:crisis            # Crisis response (<200ms requirement)
npm run perf:launch            # App launch time (<3s requirement)

# Complete performance validation
npm run perf:complete          # All performance tests
```

### Clinical Testing
```bash
# Assessment accuracy
npm run test:clinical          # PHQ-9/GAD-7 scoring accuracy (99.9% requirement)

# Crisis safety
npm run perf:crisis            # Crisis button response time validation

# Session management
npm run test:sessions          # Session persistence and recovery
```

## ✨ Key Features

### 🏥 Clinical Standards
- **MBCT Framework**: Evidence-based mindfulness-based cognitive therapy
- **Clinical Accuracy**: 99.9% accuracy for PHQ-9/GAD-7 assessments
- **Crisis Safety**: <200ms crisis response with 988 hotline integration
- **Data Security**: AES-256 encryption with hardware-backed security

### 📱 Mobile Experience
- **React Native**: Cross-platform iOS/Android native performance
- **Offline-First**: Full functionality without internet connection
- **Widget Support**: iOS/Android home screen widgets
- **Performance**: 60fps animations, <3s launch time

### ♿ Accessibility Excellence
- **WCAG AA Compliance**: Full accessibility for mental health users
- **Crisis Accessibility**: Emergency features optimized for stress
- **Screen Reader Support**: Complete VoiceOver/TalkBack integration
- **Haptic Feedback**: Therapeutic haptic patterns for mindfulness

## 🛠️ Development

### Technology Stack
- **Framework**: React Native with Expo
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand with clinical data patterns
- **Storage**: Expo SecureStore with AES-256 encryption
- **Testing**: Jest with clinical accuracy requirements
- **Performance**: React Native Reanimated for therapeutic animations

### Development Commands
```bash
# Development
npm start                      # Expo development server
npm run test:watch            # Watch mode testing
npm run validate:types        # TypeScript clinical validation

# Performance monitoring
npm run perf:monitor          # Performance monitoring tools
npm run perf:session          # Session performance analysis

# Widget development
npm run test:widget           # Widget functionality testing
npm run test:widget-performance # Widget performance validation
```

### Clinical Development Standards
- **Crisis Safety**: All crisis features must respond in <200ms
- **Data Accuracy**: Zero tolerance for PHQ-9/GAD-7 scoring errors
- **Therapeutic UX**: 60fps breathing animations, precise timing
- **Security**: Hardware-backed encryption for all mental health data

## 📚 Documentation

All comprehensive documentation is organized in the central documentation system:

### Mobile App Documentation
Located in `/documentation/mobile-app/`:

**Implementation Guides** (`/documentation/mobile-app/implementation/`):
- `implementation-guide.md` - Advanced features implementation
- `encryption-implementation.md` - Security and encryption details
- `widget-bridge-implementation.md` - iOS/Android widget integration
- `crisis-integration-implementation-summary.md` - Crisis safety systems
- `production-readiness-validation-report.md` - Production deployment validation

**Performance Documentation** (`/documentation/mobile-app/performance/`):
- `performance-optimization-guide.md` - Performance optimization strategies
- `performance-optimization-findings.md` - Performance analysis results
- `performance-validation-report.md` - Performance benchmark validation

**Development Guides** (`/documentation/mobile-app/guides/`):
- `crisis-button-implementation-guide.md` - Crisis button development
- `typescript-safety-guide.md` - TypeScript clinical safety patterns
- `widget-accessibility-implementation-guide.md` - Widget accessibility

**Core Documentation** (`/documentation/mobile-app/`):
- `FullMind PRD v2.0.md` - Product Requirements Document
- `FullMind TRD v2.0.md` - Technical Requirements Document
- `clinical-testing-implementation.md` - Clinical testing framework
- `haptic-testing-implementation.md` - Haptic feedback testing
- `accessibility-audit-clinical-export.md` - Clinical export accessibility

### Additional Documentation
- **Architecture**: `/documentation/architecture/` (system design, ADRs)
- **Clinical Standards**: `/documentation/clinical/` (MBCT compliance, safety protocols)
- **Security**: `/documentation/security/` (security analysis, implementation)
- **Master Index**: `/documentation/MASTER_DOCUMENTATION_INDEX.md`

## 🛡️ Security & Compliance

### Data Protection
- **Encryption**: AES-256-GCM with hardware-backed key storage
- **Clinical Privacy**: HIPAA-aware data handling patterns
- **Secure Storage**: Expo SecureStore for sensitive mental health data
- **Local-First**: All clinical data processed and stored locally

### Crisis Safety
- **988 Integration**: Direct crisis hotline access
- **Emergency Contacts**: Secure storage and quick access
- **Risk Assessment**: Automated detection of crisis thresholds
- **Safety Override**: Crisis features always accessible regardless of user preferences

## 🚀 Deployment

### Build Commands
```bash
# Production builds
npx expo build:ios            # iOS production build
npx expo build:android        # Android production build

# Development builds
npx expo run:ios              # iOS development build
npx expo run:android          # Android development build
```

### Pre-Deployment Validation
```bash
# Complete validation suite
npm run validate:clinical-complete    # Clinical accuracy validation
npm run validate:accessibility        # Accessibility compliance
npm run perf:complete                 # Performance validation
npm run test:ci                       # CI/CD test suite
```

## 🤝 Contributing

### Development Standards
- **Clinical Accuracy**: 99.9% requirement for all therapeutic features
- **Crisis Safety**: <200ms response time for all emergency features
- **TypeScript**: Strict mode compliance with clinical type safety
- **Testing**: Comprehensive coverage including clinical validation
- **Accessibility**: WCAG AA compliance for mental health users

### Pull Request Requirements
1. All clinical tests must pass: `npm run validate:clinical`
2. Performance benchmarks must pass: `npm run perf:complete`
3. Accessibility compliance: `npm run validate:accessibility`
4. Security validation: `npm run validate:encryption`
5. Clinical content review for therapeutic accuracy

## 📞 Crisis Resources

### Emergency Support
- **Crisis Text Line**: Text HOME to 741741
- **National Suicide Prevention Lifeline**: 988
- **International**: [findahelpline.com](https://findahelpline.com)

### Development Support
- **Documentation**: Complete guides in `/documentation/mobile-app/`
- **Clinical Standards**: `/documentation/clinical/`
- **Architecture**: `/documentation/architecture/`

---

**FullMind Mobile App** - Clinical-grade React Native MBCT application with crisis safety and therapeutic effectiveness.