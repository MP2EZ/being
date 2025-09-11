# Critical Path Manual Testing Checklist

**CRITICAL**: This checklist must be completed before any release. Each item directly impacts user safety.

## 📋 Pre-Release Testing Checklist

### 🚨 Crisis Detection & Intervention (HIGHEST PRIORITY)

#### PHQ-9 Assessment Crisis Detection
- [ ] **Score ≥20 triggers crisis screen immediately**
  - Test with score 20: [3,3,2,2,2,2,2,2,2] = 20
  - Test with score 27: [3,3,3,3,3,3,3,3,3] = 27
- [ ] **Question 9 (suicidal ideation) triggers crisis regardless of total score**
  - Test: [0,0,0,0,0,0,0,0,1] = Score 1, but should trigger crisis
  - Test: [1,1,1,1,0,0,0,0,2] = Score 7, should trigger crisis
- [ ] **Crisis screen appears within 3 seconds of assessment completion**
- [ ] **988 hotline button works on first tap**
  - iOS: Verify tel:988 opens phone app
  - Android: Verify tel:988 opens dialer
- [ ] **Crisis screen is accessible from any app screen in <3 seconds**

#### GAD-7 Assessment Crisis Detection  
- [ ] **Score ≥15 triggers crisis screen**
  - Test with score 15: [3,2,2,2,2,2,2] = 15
  - Test with score 21: [3,3,3,3,3,3,3] = 21
- [ ] **Crisis resources are identical to PHQ-9 crisis screen**

#### Crisis Screen Functionality
- [ ] **All emergency contact numbers are callable**
  - 988 Crisis Lifeline
  - 911 Emergency Services
- [ ] **Crisis screen works offline**
- [ ] **Screen reader announces crisis state immediately**
- [ ] **Crisis button has minimum 44pt touch target**
- [ ] **Crisis detection works across app restarts**

### 🎯 Assessment Scoring Accuracy (100% ACCURACY REQUIRED)

#### PHQ-9 Scoring Validation
- [ ] **Test all severity boundaries:**
  - Minimal (0-4): Test scores 0, 4
  - Mild (5-9): Test scores 5, 9  
  - Moderate (10-14): Test scores 10, 14
  - Moderately Severe (15-19): Test scores 15, 19
  - Severe (20-27): Test scores 20, 27
- [ ] **Manual calculation verification for random selections:**
  - [2,2,1,1,2,1,1,2,1] should equal 13 (Moderate)
  - [1,1,1,1,1,1,1,1,1] should equal 9 (Mild)
  - [3,3,3,3,2,2,1,1,1] should equal 19 (Moderately Severe)

#### GAD-7 Scoring Validation  
- [ ] **Test all severity boundaries:**
  - Minimal (0-4): Test scores 0, 4
  - Mild (5-9): Test scores 5, 9
  - Moderate (10-14): Test scores 10, 14  
  - Severe (15-21): Test scores 15, 21
- [ ] **Manual calculation verification:**
  - [2,2,1,1,1,1,1] should equal 9 (Mild)
  - [3,3,2,2,2,2,1] should equal 15 (Severe, Crisis)

#### Data Persistence Validation
- [ ] **Assessment scores persist after app restart**
- [ ] **Completed assessments appear in history**
- [ ] **Partial assessments can be resumed**
- [ ] **No assessment data loss during low battery/interruptions**

### ⚡ Performance Requirements

#### Critical Response Times
- [ ] **Crisis button responds in <200ms from any screen**
  - Test from home screen
  - Test from assessment screen
  - Test from check-in flow
  - Test from profile screen
- [ ] **App launches to home screen in <3 seconds (cold start)**
- [ ] **Assessment questions load in <300ms**
- [ ] **Check-in flow transitions in <500ms between steps**

#### Breathing Exercise Performance  
- [ ] **Breathing circle maintains smooth animation for full 3 minutes**
- [ ] **No frame drops during breathing session**
- [ ] **Memory usage remains stable during 3-minute session**
- [ ] **Breathing timer accuracy: exactly 60 seconds per step (180s total)**

### ♿ Accessibility Compliance (WCAG AA)

#### Screen Reader Compatibility
- [ ] **Crisis button announces correctly with VoiceOver/TalkBack:**
  - "Emergency crisis support - Call 988 for immediate help"
- [ ] **Assessment questions read in logical order**
- [ ] **Crisis detection announces immediately:**
  - "Important: Your responses indicate you may need support"
- [ ] **Breathing exercise provides audio guidance**

#### Touch Targets & Navigation
- [ ] **All interactive elements ≥44pt touch targets**
- [ ] **Focus moves logically through crisis screen**
- [ ] **Emergency numbers are clearly labeled for screen readers**
- [ ] **Assessment progress is announced: "Question 3 of 9"**

#### Visual Accessibility
- [ ] **Crisis button has sufficient color contrast (4.5:1 minimum)**
- [ ] **Text scales properly with system font size**
- [ ] **Crisis elements visible in high contrast mode**

### 💾 Data Safety & Recovery

#### Data Persistence
- [ ] **Mental health data survives app crashes**
- [ ] **Check-in data persists across app restarts**
- [ ] **Partial sessions can be resumed after interruption**
- [ ] **90-day data retention works correctly**
- [ ] **No sensitive data in crash logs**

#### Offline Functionality
- [ ] **All core features work offline**
- [ ] **Data syncs when connectivity returns**
- [ ] **Crisis resources accessible offline**
- [ ] **Partial sessions saved during network issues**

#### Data Validation
- [ ] **Invalid input is rejected gracefully**
- [ ] **Corrupted data doesn't crash app**
- [ ] **Data export includes all mental health data**
- [ ] **Clear data function works completely**

### 🔄 Cross-Platform Parity

#### iOS vs Android Testing
- [ ] **Identical crisis intervention experience**
- [ ] **Same assessment scoring results**
- [ ] **Equivalent performance characteristics**
- [ ] **Same accessibility features**
- [ ] **Phone calling works identically**

#### Device Compatibility
- [ ] **Works on various screen sizes (iPhone SE to iPad)**
- [ ] **Performance maintained on older devices**
- [ ] **Crisis button accessible on all orientations**

### 🚀 Edge Cases & Error Handling

#### Assessment Edge Cases
- [ ] **Handles all possible PHQ-9 score combinations (0-27)**
- [ ] **Handles all possible GAD-7 score combinations (0-21)**
- [ ] **Graceful error handling for assessment save failures**
- [ ] **Prevents submission of incomplete assessments**

#### Network & Storage Issues
- [ ] **Graceful degradation when storage is full**
- [ ] **Network timeout handling**
- [ ] **Recovery from AsyncStorage corruption**
- [ ] **Handles concurrent data operations**

#### Crisis Intervention Edge Cases
- [ ] **Crisis detection works during partial assessment recovery**
- [ ] **Crisis screen accessible during low memory conditions**
- [ ] **Multiple crisis assessments handled correctly**

## ✅ Sign-off Requirements

### Clinical Accuracy Sign-off
- [ ] **All PHQ-9 scoring tests pass** (Signed: ________________)
- [ ] **All GAD-7 scoring tests pass** (Signed: ________________)
- [ ] **Crisis intervention triggers verified** (Signed: ________________)

### Performance Sign-off  
- [ ] **All response time requirements met** (Signed: ________________)
- [ ] **Memory and stability requirements met** (Signed: ________________)

### Accessibility Sign-off
- [ ] **WCAG AA compliance verified** (Signed: ________________)
- [ ] **Screen reader compatibility confirmed** (Signed: ________________)

### Data Safety Sign-off
- [ ] **Data persistence verified** (Signed: ________________)
- [ ] **Privacy and security requirements met** (Signed: ________________)

---

## 🔧 Testing Environment Setup

### Required Test Devices
- [ ] iPhone (iOS 15+)
- [ ] Android phone (Android 10+)  
- [ ] iPad (accessibility testing)
- [ ] Android tablet

### Required Accessibility Tools
- [ ] VoiceOver enabled (iOS)
- [ ] TalkBack enabled (Android)
- [ ] High contrast mode
- [ ] Large text settings

### Performance Monitoring
- [ ] Flipper connected
- [ ] React Native performance monitor
- [ ] Device memory monitoring

---

**CRITICAL REMINDER**: Any failure in crisis detection, assessment scoring, or emergency contact functionality must halt release until fixed and re-tested.