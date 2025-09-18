# Resumable Session Manual Testing Checklist

## Critical Testing Requirements for Mental Health App

**IMPORTANT**: This checklist validates therapeutic accuracy and user safety. Complete ALL sections before deploying to production.

### Pre-Testing Setup

- [ ] Clean device storage and reset app state
- [ ] Verify test environment matches production settings
- [ ] Ensure network connectivity for both online/offline testing
- [ ] Prepare test scenarios with known clinical values
- [ ] Document all test results with timestamps

---

## Section 1: PHQ-9 Assessment Session Testing

### 1.1 Basic Resume Functionality
- [ ] **Start PHQ-9 assessment** - Record start time
- [ ] **Answer questions 1-5** with specific values: [2, 1, 3, 2, 1]
- [ ] **Force app interruption** (home button, app switcher, etc.)
- [ ] **Reopen app** - Should show resume option
- [ ] **Resume assessment** - Verify answers [2, 1, 3, 2, 1] are preserved
- [ ] **Complete remaining questions** - Verify scoring accuracy
- [ ] **Expected Results**: 
  - Resume time: <500ms
  - All previous answers intact
  - Correct final score calculation
  - No data loss

### 1.2 Critical Suicidal Ideation Testing
- [ ] **Start PHQ-9** with test account
- [ ] **Answer questions 1-8** with low values [1, 1, 1, 1, 1, 1, 1, 1]
- [ ] **Interrupt before question 9**
- [ ] **Resume session**
- [ ] **Answer question 9** with value > 0 (suicidal ideation)
- [ ] **CRITICAL VERIFICATION**: Crisis intervention triggers immediately
- [ ] **Expected Results**:
  - ANY response > 0 on Q9 = Crisis intervention
  - 988 hotline accessible within 3 seconds
  - Session data preserved for follow-up

### 1.3 Crisis Threshold Testing
- [ ] **Start PHQ-9** with known high-scoring pattern
- [ ] **Answer questions 1-7** with [3, 3, 3, 3, 2, 2, 2] = Score 18
- [ ] **Interrupt after question 7**
- [ ] **Resume session** - Verify partial score preserved
- [ ] **Complete with Q8=2, Q9=0** - Final score: 20 (crisis threshold)
- [ ] **CRITICAL VERIFICATION**: Crisis protocols activate at score ≥20
- [ ] **Expected Results**:
  - Crisis detection at exact threshold (20)
  - Session data preserved through crisis flow
  - Emergency resources immediately accessible

### 1.4 Multiple Resume Cycles
- [ ] **Start PHQ-9** - Answer Q1-Q3
- [ ] **Interrupt and resume** (Cycle 1)
- [ ] **Answer Q4-Q6** - Interrupt and resume (Cycle 2)
- [ ] **Answer Q7-Q9** - Complete assessment
- [ ] **Verify**: Each resume preserves exact previous answers
- [ ] **Maximum Resume Test**: Interrupt/resume 5 times (maximum allowed)
- [ ] **Attempt 6th resume**: Should start fresh assessment
- [ ] **Expected Results**:
  - 5 resumes maximum enforced
  - Data integrity maintained across all cycles
  - Performance remains <500ms per resume

---

## Section 2: GAD-7 Assessment Session Testing

### 2.1 Anxiety Severity Boundaries
- [ ] **Test Mild Boundary**: Score exactly 5 - [1, 1, 1, 1, 1, 0, 0]
- [ ] **Interrupt after Q5** - Resume and verify score=5, severity="mild"
- [ ] **Test Moderate Boundary**: Score exactly 10 - [2, 2, 2, 2, 2, 0, 0]
- [ ] **Interrupt after Q5** - Resume and verify score=10, severity="moderate"
- [ ] **Test Severe Boundary**: Score exactly 15 - [3, 3, 3, 3, 3, 0, 0]
- [ ] **Interrupt after Q5** - Resume and verify crisis detection logic

### 2.2 GAD-7 Crisis Level Testing
- [ ] **Start GAD-7** with high anxiety pattern
- [ ] **Answer Q1-Q5** with [3, 3, 3, 3, 3] = Partial score 15
- [ ] **Interrupt session**
- [ ] **Resume and complete** with Q6=3, Q7=3 = Final score 21
- [ ] **CRITICAL VERIFICATION**: Crisis intervention at score ≥15
- [ ] **Expected Results**:
  - Crisis protocols activate appropriately
  - Final score calculation: 21/21 (maximum anxiety)

---

## Section 3: MBCT Check-in Session Testing

### 3.1 Morning Check-in Flow (8 Steps)
- [ ] **Start morning check-in** - Note start time
- [ ] **Complete steps 1-4**:
  - Body areas: ["shoulders", "neck"]
  - Emotions: ["tired", "anxious"]
  - Thoughts: ["worried about work"]
  - Sleep quality: 3
- [ ] **Interrupt session** (simulate phone call)
- [ ] **Resume after 30 minutes**
- [ ] **Verify data preservation**:
  - All previous selections intact
  - Progress shows 50% (4/8 steps)
  - Estimated time remaining: ~240 seconds
- [ ] **Complete remaining steps**:
  - Energy level: 2
  - Anxiety level: 4
  - Today's value: "mindfulness"
  - Intention: "Stay present during meetings"
- [ ] **Final verification**: 100% complete, all data saved

### 3.2 Evening Check-in Flow (12 Steps)
- [ ] **Start evening check-in** 
- [ ] **Complete gratitude section** (steps 4-6):
  - Gratitude 1: "Family support"
  - Gratitude 2: "Beautiful weather"
  - Gratitude 3: "Good health"
- [ ] **Interrupt after step 6** (50% complete)
- [ ] **Resume next day** (test 24-hour persistence)
- [ ] **Verify gratitude responses** preserved exactly
- [ ] **Complete remaining steps** and verify final save

### 3.3 Midday Check-in Breathing Integration
- [ ] **Start midday check-in**
- [ ] **Complete emotional check**: ["focused", "calm"]
- [ ] **Start 3-minute breathing exercise**
- [ ] **Interrupt during breathing** (app backgrounded)
- [ ] **Resume immediately** - Should return to breathing screen
- [ ] **Complete breathing and check-in**
- [ ] **Expected Results**: 
  - Breathing timer accuracy maintained
  - Completion status recorded correctly

---

## Section 4: Performance and Timing Validation

### 4.1 Response Time Requirements
- [ ] **Session Resume Speed**:
  - [ ] Simple session (3 steps): <300ms
  - [ ] Complex session (12 steps): <500ms
  - [ ] Large data session: <500ms
  - Record actual times: _____, _____, _____

- [ ] **Progress Update Speed**:
  - [ ] Single field update: <100ms
  - [ ] Multiple field update: <200ms
  - [ ] Array data update: <200ms
  - Record actual times: _____, _____, _____

- [ ] **Crisis Button Response**:
  - [ ] From any screen: <200ms
  - [ ] During session: <200ms
  - [ ] After resume: <200ms
  - Record actual times: _____, _____, _____

### 4.2 App Launch Performance
- [ ] **Cold Start with Session**:
  - [ ] App launch + session detect: <2000ms
  - [ ] Session resume ready: <2500ms total
  - Record actual time: _____

- [ ] **Memory Usage Testing**:
  - [ ] Monitor memory during 10 resume cycles
  - [ ] Verify no memory leaks
  - [ ] Record max memory usage: _____MB

---

## Section 5: Data Integrity and Security

### 5.1 Clinical Data Accuracy
- [ ] **PHQ-9 Scoring Verification**:
  - [ ] Test pattern [2, 1, 3, 2, 1, 2, 1, 0, 1] = Score 13
  - [ ] Interrupt after Q7 (partial score 12)
  - [ ] Resume and complete (final score 13)
  - [ ] Verify: Moderate severity classification

- [ ] **GAD-7 Scoring Verification**:
  - [ ] Test pattern [3, 2, 1, 2, 3, 1, 2] = Score 14
  - [ ] Multiple interrupt/resume cycles
  - [ ] Final score calculation: 14 (moderate anxiety)

### 5.2 Session Expiration Testing
- [ ] **24-Hour TTL Enforcement**:
  - [ ] Create session, manually advance device time +25 hours
  - [ ] Attempt to resume - Should fail gracefully
  - [ ] Verify: No expired session data accessible

- [ ] **Auto-cleanup Verification**:
  - [ ] Create multiple test sessions
  - [ ] Trigger cleanup process
  - [ ] Verify: Only active sessions remain

### 5.3 Data Encryption Verification
- [ ] **Storage Security**:
  - [ ] Create session with test data
  - [ ] Examine device storage (if accessible)
  - [ ] Verify: No plain text clinical data visible

- [ ] **Network Security**:
  - [ ] Monitor network traffic during session operations
  - [ ] Verify: No sensitive data transmitted unencrypted

---

## Section 6: Edge Cases and Error Handling

### 6.1 Storage Failure Scenarios
- [ ] **Disk Full Simulation**:
  - [ ] Fill device storage to near capacity
  - [ ] Attempt session save - Should handle gracefully
  - [ ] Verify: User notified appropriately

- [ ] **Corruption Recovery**:
  - [ ] Manually corrupt session storage
  - [ ] Attempt resume - Should start fresh
  - [ ] Verify: No app crashes, clean recovery

### 6.2 Network Condition Testing
- [ ] **Offline Session Operations**:
  - [ ] Start session in airplane mode
  - [ ] Complete and save session offline
  - [ ] Verify: Local storage works correctly

- [ ] **Network Recovery**:
  - [ ] Resume session when network returns
  - [ ] Verify: No data loss or conflicts

### 6.3 Device Condition Testing
- [ ] **Low Battery Testing**:
  - [ ] Test session operations at <10% battery
  - [ ] Verify: Critical functions still work

- [ ] **Memory Pressure**:
  - [ ] Run memory-intensive apps alongside
  - [ ] Test session resume under pressure
  - [ ] Verify: Graceful degradation

---

## Section 7: Accessibility and User Experience

### 7.1 Accessibility Compliance
- [ ] **Screen Reader Testing**:
  - [ ] Enable VoiceOver/TalkBack
  - [ ] Navigate through session resume flow
  - [ ] Verify: All elements properly announced

- [ ] **Voice Control Testing**:
  - [ ] Use voice commands to resume session
  - [ ] Complete assessment via voice
  - [ ] Verify: Full functionality available

### 7.2 User Experience Validation
- [ ] **Resume Prompt UX**:
  - [ ] Clear indication of resumable session
  - [ ] Progress percentage display
  - [ ] Estimated time remaining accuracy

- [ ] **Error Message Quality**:
  - [ ] Test various failure scenarios
  - [ ] Verify: Clear, helpful error messages
  - [ ] No technical jargon exposed to users

---

## Section 8: Cross-Platform Consistency

### 8.1 iOS vs Android Behavior
- [ ] **Feature Parity**:
  - [ ] Test identical scenarios on both platforms
  - [ ] Verify: Same behavior and performance
  - [ ] Document any platform differences

### 8.2 Device Variation Testing
- [ ] **Screen Size Adaptation**:
  - [ ] Test on small screens (iPhone SE)
  - [ ] Test on large screens (iPad, Android tablets)
  - [ ] Verify: Layout and functionality consistent

---

## Testing Sign-off

### Clinical Accuracy Verification
- [ ] **All PHQ-9 scores calculated correctly**: ✓ / ✗
- [ ] **All GAD-7 scores calculated correctly**: ✓ / ✗
- [ ] **Crisis detection functions properly**: ✓ / ✗
- [ ] **Session data integrity maintained**: ✓ / ✗

### Performance Requirements Met
- [ ] **Resume times <500ms**: ✓ / ✗
- [ ] **Update times <200ms**: ✓ / ✗
- [ ] **Crisis access <200ms**: ✓ / ✗
- [ ] **App launch <2000ms**: ✓ / ✗

### Security and Privacy
- [ ] **Data encryption verified**: ✓ / ✗
- [ ] **No sensitive data in logs**: ✓ / ✗
- [ ] **Session cleanup works**: ✓ / ✗

### User Experience
- [ ] **Accessibility compliant**: ✓ / ✗
- [ ] **Error handling graceful**: ✓ / ✗
- [ ] **Cross-platform consistent**: ✓ / ✗

## Final Approval

**Clinical Oversight**: _________________ Date: _______
**Technical Lead**: ____________________ Date: _______
**QA Lead**: _________________________ Date: _______

**Notes**:
_________________________________________________
_________________________________________________
_________________________________________________

**Ready for Production Deployment**: ✓ / ✗