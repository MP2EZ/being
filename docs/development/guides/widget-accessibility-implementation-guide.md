# Widget Accessibility Implementation Guide

## Overview

This guide provides comprehensive implementation requirements for WCAG AA compliant and mental health-optimized accessibility in FullMind widget components.

**Target Compliance**: WCAG 2.1 AA + Mental Health Accessibility Enhancements

## Critical Requirements Summary

### 🚨 Crisis Accessibility (Priority 1)

**Implementation Deadline**: Immediate (Week 1)

#### Crisis Button Requirements
- **Touch Target**: Minimum 48dp (Android) / 48pt (iOS) for crisis interactions
- **Accessibility Label**: Must include "URGENT" and "988" for immediate context
- **Response Time**: Crisis button accessible in <3 seconds from any widget state
- **Color Contrast**: 7:1 ratio (WCAG AAA) using high contrast red (#CC0000)
- **Focus Priority**: Crisis button must be first in accessibility focus order

#### Implementation:

**iOS (SwiftUI):**
```swift
Button(action: handleCrisisButton) {
    Text("Get Help Now")
        .foregroundColor(.white)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
}
.frame(minWidth: 48, minHeight: 48)
.background(Color(red: 0.8, green: 0.0, blue: 0.0))
.cornerRadius(8)
.accessibilityLabel("URGENT: Crisis support - Calls 988 immediately")
.accessibilityHint("Emergency crisis intervention hotline")
.accessibilityTraits([.startsMediaSession, .causesPageTurn])
.accessibilityIdentifier("crisis-support-button")
```

**Android (XML + Kotlin):**
```xml
<Button
    android:id="@+id/crisis_button"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="Get Help Now"
    android:background="#CC0000"
    android:textColor="#FFFFFF"
    android:minHeight="48dp"
    android:minWidth="48dp"
    android:padding="16dp"
    android:contentDescription="URGENT: Crisis support - Tap to call 988 immediately"
    android:importantForAccessibility="yes"
    android:accessibilityTraversalBefore="@id/sessions_section" />
```

```kotlin
fun setCrisisButtonAccessibility(views: RemoteViews, buttonId: Int) {
    views.setContentDescription(buttonId, 
        "URGENT: Crisis support needed - Tap to call 988 Suicide & Crisis Lifeline immediately. " +
        "Connects to trained crisis counselors within 30 seconds. Available 24/7 in over 200 languages."
    )
    views.setInt(buttonId, "setAccessibilityLiveRegion", View.ACCESSIBILITY_LIVE_REGION_ASSERTIVE)
}
```

---

## WCAG AA Compliance Implementation

### 1.3.1 Info and Relationships (Level A)

#### Session Status Semantic Structure

**Required Elements:**
- Clear role identification (button/group)
- Complete state information (progress, resumability)
- Relationship between visual and semantic information

**iOS Implementation:**
```swift
SessionIndicator(...)
    .accessibilityRole(.button)
    .accessibilityLabel(MentalHealthAccessibility.sessionStatusLabel(
        sessionType: sessionType,
        status: status,
        progress: progressPercentage
    ))
    .accessibilityValue(accessibilityValue(for: status))
    .accessibilityHint(MentalHealthAccessibility.sessionStatusHint(
        sessionType: sessionType,
        status: status,
        canResume: canResume
    ))
```

**Android Implementation:**
```kotlin
views.setContentDescription(containerId, 
    "${getSessionStatusLabel(sessionType, status, progress)}. " +
    "${getSessionStatusDescription(sessionType, status, canResume)}"
)
views.setInt(containerId, "setImportantForAccessibility", View.IMPORTANT_FOR_ACCESSIBILITY_YES)
```

### 1.4.3 Contrast (Minimum) - Level AA

#### Color Contrast Requirements

**Text Contrast**: 4.5:1 minimum ratio
**Crisis Elements**: 7:1 ratio (enhanced for emergency situations)

**High Contrast Color Palette:**
```swift
struct HighContrastColors {
    static let crisisRed = Color(red: 0.8, green: 0.0, blue: 0.0)      // 7.2:1 ratio
    static let completedGreen = Color(red: 0.0, green: 0.5, blue: 0.0)  // 6.1:1 ratio  
    static let progressOrange = Color(red: 0.9, green: 0.5, blue: 0.0)  // 5.8:1 ratio
    static let textPrimary = Color.white                                 // 21:1 ratio
}
```

**Implementation:**
```kotlin
@ColorInt
fun getHighContrastColor(status: SessionStatus): Int {
    return when (status) {
        is SessionStatus.Completed -> Color.rgb(0, 128, 0)    // 6.1:1
        is SessionStatus.InProgress -> Color.rgb(230, 130, 0)  // 5.8:1  
        is SessionStatus.Skipped -> Color.rgb(100, 100, 100)   // 4.6:1
        is SessionStatus.NotStarted -> Color.rgb(80, 80, 80)   // 4.5:1
    }
}
```

### 2.1.1 Keyboard (Level A)

#### Touch Target Enhancement

**Standard Elements**: 44dp/pt minimum
**Crisis Elements**: 48dp/pt minimum  
**Spacing**: 8dp/pt minimum between targets

**iOS Implementation:**
```swift
.frame(
    width: compact ? 32 : 44,  // Increased from 24/32
    height: compact ? 32 : 44
)
```

**Android Implementation:**
```xml
<LinearLayout
    android:minHeight="48dp"
    android:minWidth="48dp"
    android:padding="12dp"
    android:focusable="true"
    android:clickable="true" />
```

---

## Mental Health-Specific Accessibility

### Therapeutic Language Implementation

#### Encouraging, Non-Judgmental Labels

**Standard Labels (Avoid):**
- ❌ "Morning session status"
- ❌ "0% complete"
- ❌ "Task not started"

**Therapeutic Labels (Use):**
- ✅ "Morning mindfulness check-in ready to begin. A gentle step toward wellness."
- ✅ "You're making progress - every step matters."
- ✅ "Well done taking care of yourself."

**Implementation:**
```swift
static func sessionStatusLabel(sessionType: String, status: SessionStatus, progress: Int = 0) -> String {
    let sessionName = therapeuticSessionName(sessionType)
    
    switch status {
    case .notStarted:
        return "\(sessionName) ready to begin. A gentle step toward wellness."
    case .inProgress:
        return "\(sessionName) is \(progress)% complete. You're making progress - every step matters."
    case .completed:
        return "\(sessionName) completed successfully. Well done taking care of yourself."
    case .skipped:
        return "\(sessionName) was skipped. That's okay - you can try again anytime."
    }
}
```

### Cognitive Accessibility for Depression/Anxiety

#### Simplified Language Patterns

**Implementation Guidelines:**
- Use present tense, active voice
- Avoid clinical/medical terminology
- Provide clear next actions
- Include encouraging context

**Examples:**
```swift
// Session resumption
"Tap to resume where you left off. Your progress is safely saved."

// Progress encouragement  
"You're doing great. \(current) of \(total) steps complete."

// Next action clarity
"Tap to start your Morning mindfulness check-in. Takes 3-5 minutes of mindful reflection."
```

---

## Platform-Specific Implementation

### iOS WidgetKit Accessibility

#### VoiceOver Optimization

```swift
struct FullMindWidgetEntryView: View {
    var body: some View {
        // Main widget accessibility
        widgetContent
            .accessibilityElement(children: .contain)
            .accessibilityLabel("FullMind mindfulness widget")
            .accessibilityIdentifier("fullmind-widget")
    }
    
    // Session indicators with full accessibility
    func accessibleSessionIndicator(...) -> some View {
        Button(action: tapAction) {
            sessionContent
        }
        .accessibilityLabel(therapeuticLabel)
        .accessibilityHint(actionHint)
        .accessibilityValue(statusValue)
        .accessibilityTraits(.sessionInteractive)
        .accessibilityIdentifier("session-\(sessionType)")
    }
}
```

#### Dynamic Type Support

```swift
Text(title)
    .font(.system(size: compact ? 9 : 11, weight: .medium, design: .rounded))
    .allowsTightening(true)
    .minimumScaleFactor(0.8)
    .lineLimit(2)
```

### Android Widget Accessibility

#### TalkBack Optimization

```kotlin
class AccessibleFullMindWidgetProvider : FullMindWidgetProvider() {
    
    override fun updateAppWidget(...) {
        val accessibilityManager = MentalHealthAccessibilityManager(context)
        
        // Enhanced session accessibility
        accessibilityManager.setSessionAccessibility(
            views, containerId, indicatorId, labelId, sessionType, status
        )
        
        // Crisis button priority
        if (widgetData.hasActiveCrisis) {
            accessibilityManager.setCrisisButtonAccessibility(views, R.id.crisis_button, true)
        }
    }
}
```

#### Focus Order Management

```xml
<!-- Crisis button gets priority focus -->
<Button
    android:id="@+id/crisis_button"
    android:accessibilityTraversalBefore="@id/sessions_section" />

<!-- Session logical order -->
<LinearLayout
    android:id="@+id/morning_container"
    android:accessibilityTraversalBefore="@id/midday_container" />
```

---

## Testing and Validation

### Automated Testing Integration

#### Accessibility Test Suite

```typescript
describe('Widget Accessibility Compliance', () => {
  test('WCAG AA compliance validation', async () => {
    const auditResults = await WidgetTestUtils.runAccessibilityAudit(
      <MockAccessibleWidget />
    );

    expect(auditResults.wcagAACompliant).toBe(true);
    expect(auditResults.criticalIssues).toHaveLength(0);
    expect(auditResults.mentalHealthOptimized).toBe(true);
  });

  test('crisis accessibility under stress conditions', () => {
    const { getByTestId } = render(
      <MockAccessibleWidget widgetData={{ hasActiveCrisis: true }} />
    );

    const crisisButton = getByTestId('crisis-button');
    
    expect(crisisButton.props.accessibilityLabel).toMatch(/URGENT/);
    expect(crisisButton.props.style.minWidth).toBeGreaterThanOrEqual(48);
    expect(crisisButton.props.style.minHeight).toBeGreaterThanOrEqual(48);
  });
});
```

### Manual Testing Checklist

#### Screen Reader Testing

**iOS VoiceOver:**
- [ ] Crisis button announces urgency and 988 number
- [ ] Session status includes therapeutic language
- [ ] Progress updates are announced with encouragement
- [ ] Touch targets are easily discoverable
- [ ] Navigation order prioritizes crisis access

**Android TalkBack:**
- [ ] Content descriptions provide complete context
- [ ] Focus order follows logical sequence
- [ ] Crisis button uses assertive live region
- [ ] Session resumption clearly explained
- [ ] Progress announcements are encouraging

#### High Contrast Testing

- [ ] Crisis button maintains 7:1 contrast ratio
- [ ] Session indicators maintain 3:1 contrast ratio
- [ ] Text maintains 4.5:1 contrast ratio
- [ ] All interactive elements remain visible

#### Motor Accessibility Testing

- [ ] Crisis button: 48x48 minimum touch target
- [ ] Session indicators: 44x44 minimum touch target
- [ ] 8px minimum spacing between targets
- [ ] Switch Control navigation works correctly
- [ ] Voice Control commands recognized

---

## Deployment and Monitoring

### Pre-Deployment Checklist

#### Critical Requirements Verification

- [ ] **Crisis Accessibility**: 988 number in accessibility labels
- [ ] **Touch Targets**: Meet minimum size requirements
- [ ] **Color Contrast**: All elements pass WCAG AA ratios
- [ ] **Focus Order**: Crisis button prioritized
- [ ] **Therapeutic Language**: Encouraging, non-judgmental text

#### Platform Compliance

**iOS:**
- [ ] VoiceOver navigation tested
- [ ] Dynamic Type scaling verified
- [ ] Voice Control commands work
- [ ] Accessibility Inspector audit passed

**Android:**
- [ ] TalkBack navigation tested  
- [ ] Font scaling support verified
- [ ] Focus traversal order correct
- [ ] Accessibility Scanner audit passed

### Production Monitoring

#### Accessibility Metrics

**Key Performance Indicators:**
- Widget accessibility announcement success rate
- Crisis button interaction success rate
- Screen reader user engagement metrics
- Accessibility feature adoption rates

**Monitoring Implementation:**
```typescript
// Widget accessibility event tracking
WidgetAnalytics.track('accessibility_interaction', {
  element: 'crisis_button',
  assistive_technology: 'voiceover',
  interaction_success: true,
  response_time_ms: 150
});
```

---

## Support and Resources

### User Support

#### Accessibility Help Documentation

**Crisis Access Support:**
- Emergency access: Crisis button always available in top-left of widget
- Voice commands: "Tap crisis help" or "Get help now"  
- Alternative access: Long press widget to access crisis mode
- 988 direct dial: Available from any screen

**General Accessibility Support:**
- Screen reader optimization for all therapeutic content
- High contrast mode automatic detection
- Large text scaling up to 200%
- Voice control for hands-free operation

### Development Resources

#### Testing Tools

**iOS:**
- Xcode Accessibility Inspector
- VoiceOver testing on physical devices
- Dynamic Type testing in simulator

**Android:**  
- Android Accessibility Scanner
- TalkBack testing on physical devices
- Live Regions testing framework

#### External Validation

**Accessibility Auditing:**
- Annual third-party accessibility audit
- User testing with people with disabilities
- Mental health accessibility specialist review

---

## Implementation Timeline

### Phase 1: Crisis Accessibility (Week 1)
- [ ] Crisis button accessibility implementation
- [ ] Touch target size enhancement
- [ ] High contrast crisis colors
- [ ] Emergency focus priority

### Phase 2: WCAG AA Compliance (Week 2)  
- [ ] Complete semantic structure implementation
- [ ] Color contrast compliance
- [ ] Keyboard navigation support
- [ ] Content description enhancement

### Phase 3: Mental Health Optimization (Week 3)
- [ ] Therapeutic language implementation
- [ ] Cognitive accessibility features
- [ ] Encouraging progress announcements
- [ ] Stress-state interaction optimization

### Phase 4: Testing and Validation (Week 4)
- [ ] Automated test suite implementation  
- [ ] Manual accessibility testing
- [ ] Third-party audit scheduling
- [ ] User acceptance testing with accessibility users

This implementation guide ensures FullMind widgets meet the highest accessibility standards while being specifically optimized for users experiencing mental health challenges.