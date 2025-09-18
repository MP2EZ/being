# FullMind Website Accessibility Implementation

## Overview

This document outlines the comprehensive accessibility implementation for the FullMind website, designed to meet WCAG AA standards with enhanced mental health accessibility features.

## Accessibility Foundation

### WCAG AA Compliance Level

- **Standard**: WCAG 2.1 AA
- **Testing**: Automated (Axe) + Manual validation
- **Target Score**: 95%+ compliance
- **Mental Health Focus**: Enhanced accessibility for vulnerable users

### Key Features

✅ **Crisis Access**: Emergency help accessible within 3 seconds  
✅ **Keyboard Navigation**: Full keyboard accessibility with enhanced focus indicators  
✅ **Screen Reader Support**: Optimized for NVDA, JAWS, VoiceOver, and TalkBack  
✅ **Color Contrast**: WCAG AA compliant (4.5:1 ratio, 7:1 for crisis elements)  
✅ **Motion Safety**: Respects `prefers-reduced-motion` for anxiety management  
✅ **Touch Targets**: Minimum 44px, 60px for crisis buttons  
✅ **Skip Links**: Fast navigation for keyboard users  
✅ **High Contrast Mode**: Enhanced visibility options  

## Architecture

### Core Components

```
src/
├── types/accessibility.ts          # Comprehensive accessibility types
├── hooks/useAccessibility.ts       # Accessibility management hooks
├── contexts/AccessibilityContext.tsx # Global accessibility state
├── lib/accessibility.ts            # Testing & validation utilities
├── styles/accessibility.css        # WCAG-compliant CSS utilities
└── components/
    ├── ui/                         # Accessible base components
    └── accessibility/              # Specialized a11y components
```

### Mental Health Specific Features

#### Crisis Access (Sub-3-second requirement)
- **Fixed Crisis Button**: Always visible, 60x60px minimum
- **Keyboard Shortcut**: `Alt + C` for immediate access
- **Enhanced Contrast**: 7:1 ratio for crisis elements
- **Screen Reader Priority**: Announced with `aria-live="assertive"`

#### Anxiety-Friendly Design
- **No Autoplay Media**: Prevents unexpected audio/video triggers
- **Gentle Animations**: 300ms max duration, respects reduced motion
- **Calm Color Palette**: Reduced saturation options
- **Predictable Interactions**: Clear feedback, no surprise behaviors

#### Depression Accessibility
- **High Contrast Mode**: Enhanced visibility options
- **Large Text Support**: 1.25x scaling with proper line height
- **Simplified Interface**: Reduced cognitive load options
- **Clear Focus Indicators**: Enhanced visibility for concentration difficulties

## Implementation Details

### 1. Accessibility Context

```typescript
// Global accessibility state management
const { preferences, updatePreferences, announceToScreenReader } = useAccessibilityContext();

// Available preferences
interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardOnlyMode: boolean;
  focusIndicatorEnhanced: boolean;
  simplifiedInterface: boolean;
}
```

### 2. Component Accessibility Props

```typescript
// Base accessibility props for all components
interface AccessibleComponentProps extends AriaAttributes {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  focusable?: boolean;
  keyboardNavigation?: KeyboardNavigation;
  screenReaderOptimized?: boolean;
}
```

### 3. Crisis Access Implementation

```tsx
// Crisis button - always accessible
<button
  id="crisis-help-button"
  className="crisis-button"
  aria-describedby="crisis-help-description"
  onClick={handleCrisisAccess}
>
  <span className="sr-only">Emergency mental health crisis help - </span>
  Crisis Help
</button>
```

### 4. Keyboard Navigation

```typescript
// Enhanced keyboard support
const { elementRef, isFocused } = useKeyboardNavigation({
  focusable: true,
  keyHandlers: {
    Enter: handleActivate,
    Space: handleActivate,
    Escape: handleClose,
  }
});
```

## Testing Framework

### Automated Testing

```bash
# Run all accessibility tests
npm run test:accessibility

# Axe-core compliance testing
npm run accessibility:axe

# Lighthouse accessibility audit
npm run accessibility:lighthouse

# Custom mental health accessibility audit
npm run accessibility:audit
```

### Test Coverage

- **WCAG AA Compliance**: Axe-core with custom rules
- **Keyboard Navigation**: E2E testing with Playwright  
- **Screen Reader**: Semantic HTML and ARIA validation
- **Mental Health Features**: Crisis access timing, anxiety triggers
- **Color Contrast**: Automated contrast ratio validation
- **Touch Targets**: Minimum size verification
- **Focus Management**: Visible indicators and proper order

### Continuous Integration

```yaml
# GitHub Actions workflow
- name: Accessibility Tests
  run: |
    npm run accessibility:ci
    npm run test:e2e -- --grep="accessibility"
```

## Usage Guidelines

### For Developers

#### 1. Component Development
```tsx
// Always use accessibility context
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';

// Apply proper ARIA attributes
<button
  aria-label="Close dialog"
  aria-expanded={isOpen}
  onClick={handleClick}
  className="touch-target focus-enhanced"
>
```

#### 2. Form Accessibility
```tsx
// Proper form labeling
<label htmlFor="email" className="required">
  Email Address
</label>
<input
  id="email"
  type="email"
  required
  aria-describedby="email-error"
  aria-invalid={hasError}
/>
<div id="email-error" role="alert">
  {errorMessage}
</div>
```

#### 3. Navigation Components
```tsx
// Semantic navigation structure
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li><a href="/" aria-current={isHome ? 'page' : undefined}>Home</a></li>
    {/* ... */}
  </ul>
</nav>
```

### For Designers

#### Color Contrast Requirements
- **Normal Text**: 4.5:1 minimum contrast ratio
- **Large Text** (18pt+): 3:1 minimum contrast ratio  
- **Crisis Elements**: 7:1 contrast ratio (AAA level)
- **Focus Indicators**: 3:1 contrast with background

#### Touch Target Sizes
- **Standard Elements**: 44×44px minimum
- **Preferred Size**: 48×48px for comfortable interaction
- **Crisis Button**: 60×60px minimum for emergency access
- **Spacing**: 8px minimum between interactive elements

#### Motion Guidelines
- **Animation Duration**: 300ms maximum for comfort
- **Respect Preferences**: Always honor `prefers-reduced-motion`
- **Essential Motion Only**: Avoid decorative animations
- **Pause Controls**: Provide controls for any continuous motion

## Manual Testing Checklist

### Keyboard Navigation
- [ ] All interactive elements focusable with Tab
- [ ] Skip links work correctly
- [ ] Focus indicators clearly visible
- [ ] No keyboard traps
- [ ] Logical tab order
- [ ] Crisis button accessible via Alt+C

### Screen Reader Testing
- [ ] Page structure makes sense when navigating by headings
- [ ] All images have appropriate alt text
- [ ] Form fields properly labeled
- [ ] Error messages announced correctly
- [ ] Crisis resources clearly identified

### Mental Health Specific
- [ ] Crisis button visible and accessible within 3 seconds
- [ ] No autoplay media or sudden sounds
- [ ] No flashing content above 3Hz
- [ ] High contrast mode functional
- [ ] Reduced motion respected
- [ ] Text scaling works up to 200%

## Accessibility Resources

### Internal Documentation
- [Component Accessibility Guide](./docs/component-accessibility.md)
- [Testing Procedures](./docs/accessibility-testing.md)
- [ARIA Patterns](./docs/aria-patterns.md)

### External Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/)
- [Mental Health Accessibility](https://www.w3.org/WAI/people-use-web/user-stories/#anxiety)
- [Crisis Intervention Standards](https://suicidepreventionlifeline.org/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)
- [Screen Reader Testing Guide](https://webaim.org/articles/screenreader_testing/)

## Support and Maintenance

### Accessibility Review Schedule
- **Daily**: Automated CI/CD testing
- **Weekly**: Manual spot checks on new features  
- **Monthly**: Comprehensive accessibility audit
- **Quarterly**: User testing with disability community
- **Annually**: Professional accessibility audit

### Issue Reporting
For accessibility issues:
1. **Critical (Crisis access, keyboard traps)**: Immediate fix required
2. **High (WCAG violations)**: Fix within 48 hours
3. **Medium (Usability issues)**: Fix within 1 week
4. **Low (Enhancement opportunities)**: Include in next sprint

### Accessibility Champion
**Role**: Lead developer responsible for accessibility standards  
**Responsibilities**: 
- Review all accessibility-related PRs
- Maintain testing procedures
- Coordinate with disability advocates
- Ensure crisis accessibility features remain functional

---

## Quick Reference

### Essential Keyboard Shortcuts
- `Tab` - Navigate forward
- `Shift + Tab` - Navigate backward  
- `Alt + C` - Crisis help
- `Alt + S` - Skip to main content
- `Alt + E` - Emergency resources
- `Alt + K` - Toggle keyboard navigation mode

### Crisis Access Verification
1. **Direct Click Test**: Crisis button responds in <3 seconds
2. **Keyboard Test**: Alt+C activates crisis help in <3 seconds
3. **Screen Reader Test**: Crisis button announced correctly
4. **Size Test**: Button is minimum 60×60px
5. **Contrast Test**: 7:1 contrast ratio verified

### Accessibility Status Check
```bash
# Quick accessibility validation
npm run accessibility:validate

# Full test suite
npm run test:accessibility

# Generate accessibility report
npm run accessibility:audit
```

This accessibility implementation ensures the FullMind website is not only WCAG AA compliant but specifically optimized for mental health users who may be experiencing crisis situations, anxiety, or other accessibility needs.