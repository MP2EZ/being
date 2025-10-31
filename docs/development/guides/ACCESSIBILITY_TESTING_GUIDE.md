# Accessibility Testing Guide for Assessment Components

## Overview

This guide provides comprehensive testing instructions for validating WCAG AA compliance in the assessment components. The implementation includes proper focus management, radio group semantics, and keyboard navigation specifically designed for clinical mental health assessments.

## Components Covered

- **RadioGroup**: WCAG-compliant radio group with arrow key navigation
- **FocusManager**: Focus management system with visible indicators
- **AssessmentQuestion**: PHQ-9/GAD-7 question component with proper accessibility
- **AssessmentIntroduction**: Accessible onboarding and introduction flow
- **AssessmentResults**: Results display with crisis-aware accessibility

## Testing Requirements

### 1. WCAG AA Compliance Checklist

#### ✅ Keyboard Navigation
- [ ] **Tab Navigation**: All interactive elements reachable via Tab key
- [ ] **Arrow Key Navigation**: Radio groups support Up/Down/Left/Right arrows
- [ ] **Space/Enter Selection**: Radio buttons respond to Space and Enter keys
- [ ] **Focus Trapping**: Modal-like components trap focus appropriately
- [ ] **Focus Restoration**: Focus returns to appropriate element when needed

#### ✅ Screen Reader Support
- [ ] **Role Semantics**: Proper ARIA roles (radiogroup, radio, button, etc.)
- [ ] **State Announcements**: Selected/unselected states announced
- [ ] **Label Association**: Labels properly associated with controls
- [ ] **Error Announcements**: Errors announced via aria-live regions
- [ ] **Progress Updates**: Assessment progress announced to screen readers

#### ✅ Visual Accessibility
- [ ] **Focus Indicators**: Visible focus ring with 4.5:1 contrast minimum
- [ ] **Touch Targets**: Minimum 44px touch target size
- [ ] **Color Contrast**: Text contrast ratio ≥ 4.5:1
- [ ] **High Contrast Mode**: Compatible with system high contrast settings
- [ ] **Scale Compatibility**: Works with large text/zoom settings

#### ✅ Clinical Context Requirements
- [ ] **Performance**: Radio selection response time <100ms
- [ ] **Crisis Detection**: Immediate accessibility for crisis interventions
- [ ] **Error Handling**: Graceful degradation for accessibility failures
- [ ] **Therapeutic Language**: Screen reader friendly clinical terminology

### 2. Manual Testing Procedures

#### A. Keyboard-Only Testing

1. **Full Navigation Test**
   ```bash
   # Test with keyboard only (disconnect mouse/trackpad)
   # Start from assessment introduction
   # Navigate using only Tab, Arrow keys, Space, Enter
   # Verify all interactive elements are reachable and usable
   ```

2. **Radio Group Navigation**
   ```bash
   # In PHQ-9/GAD-7 question screen:
   # 1. Tab to radio group
   # 2. Use arrow keys to navigate between options
   # 3. Use Space or Enter to select
   # 4. Verify selection is announced
   # 5. Tab to next focusable element
   ```

3. **Focus Management**
   ```bash
   # Test focus flow:
   # 1. Introduction → Question → Results
   # 2. Skip links work properly
   # 3. Crisis buttons always accessible
   # 4. Focus restoration after modals/alerts
   ```

#### B. Screen Reader Testing

**Recommended Screen Readers:**
- **iOS**: VoiceOver
- **Android**: TalkBack
- **Windows**: NVDA (for web testing)
- **macOS**: VoiceOver (for web testing)

1. **VoiceOver Testing (iOS)**
   ```bash
   # Enable VoiceOver: Settings > Accessibility > VoiceOver
   # Navigate assessment components using:
   # - Single finger swipe (next/previous element)
   # - Rotor control (navigate by headings, buttons, etc.)
   # - Double tap to activate elements
   # - Verify all content is announced clearly
   ```

2. **Content Verification**
   ```bash
   # Verify screen reader announces:
   # - Assessment type and purpose
   # - Question text and instructions
   # - Radio option labels and scores
   # - Current selection status
   # - Progress information
   # - Error messages and alerts
   # - Crisis intervention options
   ```

#### C. Visual Accessibility Testing

1. **Focus Indicator Testing**
   ```bash
   # Use keyboard navigation and verify:
   # - Focus ring is clearly visible
   # - Focus ring has sufficient contrast
   # - Focus ring doesn't get cut off
   # - Focus ring style is consistent
   ```

2. **High Contrast Testing**
   ```bash
   # Enable system high contrast mode
   # Verify all components remain usable:
   # - Text remains readable
   # - Interactive elements clearly identified
   # - Focus indicators still visible
   # - Icons and graphics maintain meaning
   ```

3. **Text Scaling Testing**
   ```bash
   # Test with large text settings:
   # iOS: Settings > Display & Brightness > Text Size
   # Android: Settings > Display > Font size
   # Verify layout doesn't break at 200% text size
   ```

### 3. Automated Testing

#### A. Jest Testing Suite

Run the accessibility test suite:

```bash
# Run all accessibility tests
npm test -- --testPathPattern=accessibility

# Run specific test groups
npm test -- --testNamePattern="ARIA Semantics"
npm test -- --testNamePattern="Keyboard Navigation"
npm test -- --testNamePattern="Clinical Context"
```

#### B. Custom Test Helpers

```typescript
// Use these helpers in your tests
import { 
  testKeyboardNavigation,
  testScreenReaderAnnouncements,
  testFocusManagement,
  testTouchTargets
} from './test-helpers/accessibility';

// Example usage
describe('Assessment Accessibility', () => {
  it('should support full keyboard navigation', async () => {
    const { container } = render(<AssessmentQuestion {...props} />);
    await testKeyboardNavigation(container);
  });
});
```

### 4. Performance Testing

#### Clinical Response Time Requirements

```typescript
// Test that critical interactions meet performance requirements
it('should meet clinical response time requirements', async () => {
  const startTime = performance.now();
  
  // Simulate radio button selection
  fireEvent.press(radioButton);
  
  const endTime = performance.now();
  expect(endTime - startTime).toBeLessThan(100); // <100ms requirement
});
```

### 5. Real Device Testing

#### Testing Matrix

| Device Type | Screen Reader | Test Focus |
|-------------|---------------|------------|
| iPhone | VoiceOver | Touch navigation, gesture support |
| Android | TalkBack | Navigation drawer, back button |
| iPad | VoiceOver | Larger screen layout, external keyboard |
| Android Tablet | TalkBack | Landscape orientation, split screen |

#### Device-Specific Tests

1. **iPhone/VoiceOver**
   ```bash
   # Test VoiceOver gestures:
   # - Swipe right/left (next/previous element)
   # - Two-finger swipe up (read all)
   # - Rotor navigation (by headings, buttons)
   # - Double tap to activate
   # - Split tap (hold one finger, tap with another)
   ```

2. **Android/TalkBack**
   ```bash
   # Test TalkBack navigation:
   # - Swipe right/left (linear navigation)
   # - Swipe up/down (reading controls)
   # - Double tap to activate
   # - Explore by touch
   # - Reading controls menu
   ```

### 6. Debugging Accessibility Issues

#### Common Issues and Solutions

1. **Focus Not Visible**
   ```typescript
   // Ensure focus styles are applied
   const styles = StyleSheet.create({
     focusIndicator: {
       borderWidth: 3,
       borderColor: colorSystem.accessibility.focus.primary,
       shadowColor: colorSystem.accessibility.focus.primary,
       shadowOpacity: 0.3,
       shadowRadius: 6,
     }
   });
   ```

2. **Screen Reader Not Announcing Changes**
   ```typescript
   // Use AccessibilityInfo for announcements
   import { AccessibilityInfo } from 'react-native';
   
   const announceSelection = (label: string) => {
     AccessibilityInfo.announceForAccessibility(`Selected: ${label}`);
   };
   ```

3. **Keyboard Navigation Breaking**
   ```typescript
   // Ensure proper focus management
   const { registerFocusable, focusNext } = useFocusManager();
   
   useEffect(() => {
     registerFocusable('my-element', elementRef.current, priority);
   }, []);
   ```

### 7. Continuous Integration

#### Automated Accessibility Checks

```yaml
# Add to CI pipeline
- name: Run Accessibility Tests
  run: |
    npm test -- --testPathPattern=accessibility --coverage
    npm run test:a11y
```

#### Pre-commit Hooks

```bash
# Install accessibility linting
npm install --save-dev eslint-plugin-react-native-a11y

# Add to .eslintrc.js
{
  "plugins": ["react-native-a11y"],
  "rules": {
    "react-native-a11y/has-accessibility-hint": "warn",
    "react-native-a11y/has-valid-accessibility-descriptors": "error"
  }
}
```

### 8. Testing Documentation

#### Creating Test Reports

```typescript
// Generate accessibility test reports
const generateA11yReport = () => ({
  keyboardNavigation: 'PASS',
  screenReaderSupport: 'PASS', 
  focusManagement: 'PASS',
  clinicalPerformance: 'PASS',
  wcagCompliance: 'AA',
  issues: [],
  recommendations: []
});
```

#### Bug Reporting Template

```markdown
## Accessibility Bug Report

**Component**: AssessmentQuestion
**Severity**: High/Medium/Low
**WCAG Criteria**: 2.1.1 Keyboard Navigation

**Description**: 
Radio group cannot be navigated with arrow keys

**Steps to Reproduce**:
1. Navigate to PHQ-9 question
2. Tab to radio group
3. Press arrow keys

**Expected**: Arrow keys should move between options
**Actual**: Arrow keys do nothing

**Screen Reader**: VoiceOver 15.0
**Device**: iPhone 13 Pro, iOS 17.0
```

### 9. Acceptance Criteria

Before releasing accessibility improvements:

- [ ] All automated tests pass
- [ ] Manual keyboard testing completed
- [ ] Screen reader testing on 2+ platforms
- [ ] Performance requirements met (<100ms clinical responses)
- [ ] High contrast mode compatible
- [ ] Touch target requirements met (44px minimum)
- [ ] Focus indicators meet contrast requirements (4.5:1)
- [ ] Crisis intervention accessibility verified
- [ ] Clinical stakeholder approval obtained

### 10. Resources and References

#### WCAG Guidelines
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_overview&levels=aa)
- [React Native Accessibility Guide](https://reactnative.dev/docs/accessibility)

#### Clinical Context
- [PHQ-9 Administration Guidelines](https://www.apa.org/depression-guideline/patient-health-questionnaire.pdf)
- [GAD-7 Clinical Guidelines](https://www.apa.org/depression-guideline/generalized-anxiety-disorder-questionnaire.pdf)

#### Testing Tools
- [axe-core for React Native](https://github.com/dequelabs/axe-core)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)

---

## Quick Checklist for Developers

When implementing or modifying assessment components:

1. **Before Development**
   - [ ] Review WCAG AA requirements
   - [ ] Understand clinical performance requirements
   - [ ] Plan keyboard navigation flow

2. **During Development**
   - [ ] Add proper ARIA attributes
   - [ ] Implement keyboard event handlers
   - [ ] Test with screen reader
   - [ ] Verify focus indicators

3. **Before Commit**
   - [ ] Run accessibility test suite
   - [ ] Test keyboard-only navigation
   - [ ] Verify touch target sizes
   - [ ] Check color contrast ratios

4. **Before Release**
   - [ ] Complete manual testing checklist
   - [ ] Test on real devices
   - [ ] Verify crisis intervention accessibility
   - [ ] Document any known limitations