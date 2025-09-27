# Assessment Store - DRD-FLOW-005 Implementation

Production-ready Zustand store for PHQ-9 and GAD-7 assessments with clinical accuracy and safety protocols.

## Features

### ✅ Clinical Accuracy
- **PHQ-9**: All 27 possible scores (0-27) with crisis threshold ≥20
- **GAD-7**: All 21 possible scores (0-21) with crisis threshold ≥15
- **Suicidal Ideation**: Immediate detection on PHQ-9 question 9 > 0
- **100% Scoring Accuracy**: Regulatory compliant clinical calculations

### ✅ Safety Protocols
- **Crisis Detection**: <200ms response time requirement
- **Emergency Response**: Immediate 988/911 access
- **Real-time Monitoring**: Crisis triggers during assessment
- **Audit Trail**: Complete clinical compliance logging

### ✅ Persistence & Recovery
- **Encrypted Storage**: SecureStore with CLINICAL sensitivity
- **Auto-save**: Real-time progress preservation
- **Session Recovery**: Resume interrupted assessments
- **Offline Support**: Works without network connectivity

### ✅ Performance
- **Debounced Auto-save**: 1-second delay to prevent excessive writes
- **Memory Optimization**: Efficient state updates and subscriptions
- **Fast Crisis Response**: Sub-200ms crisis detection
- **Background Persistence**: Non-blocking storage operations

## Usage

```typescript
import { useAssessmentStore } from '@/flows/assessment/stores';

function AssessmentScreen() {
  const {
    startAssessment,
    answerQuestion,
    completeAssessment,
    currentSession,
    getCurrentProgress,
    crisisDetection
  } = useAssessmentStore();

  // Start PHQ-9 assessment
  const handleStartPHQ9 = async () => {
    await startAssessment('phq9', 'standalone');
  };

  // Answer question with real-time crisis monitoring
  const handleAnswer = async (questionId: string, response: AssessmentResponse) => {
    await answerQuestion(questionId, response);
    // Crisis detection automatically triggers if needed
  };

  // Complete assessment with scoring
  const handleComplete = async () => {
    await completeAssessment();
    // Results available in currentResult
    // Crisis intervention triggered if score ≥ thresholds
  };

  return (
    <View>
      {crisisDetection && (
        <CrisisAlert detection={crisisDetection} />
      )}
      {currentSession && (
        <ProgressBar progress={getCurrentProgress()} />
      )}
    </View>
  );
}
```

## Crisis Safety Integration

```typescript
// Crisis is automatically detected for:
// - PHQ-9 score ≥ 20
// - GAD-7 score ≥ 15  
// - PHQ-9 question 9 > 0 (suicidal ideation)

// Emergency response includes:
// - 988 Crisis Lifeline
// - 741741 Crisis Text
// - 911 Emergency Services

// Response time guaranteed <200ms
```

## Session Recovery

```typescript
// Automatic session recovery on app restart
const { recoverSession, hasRecoverableSession } = useAssessmentStore();

useEffect(() => {
  if (hasRecoverableSession) {
    recoverSession().then(recovered => {
      if (recovered) {
        // Session restored successfully
        // User can continue where they left off
      }
    });
  }
}, []);
```

## Clinical Compliance

- **Encrypted Storage**: All PHQ-9/GAD-7 responses encrypted with SecureStore
- **Audit Trail**: Complete access logging for clinical compliance
- **Data Integrity**: Validation at every step to ensure 100% accuracy
- **Regulatory Compliance**: Meets HIPAA and clinical data requirements

## Testing

Comprehensive test suite validates:
- All 27 PHQ-9 scores (0-27)
- All 21 GAD-7 scores (0-21)
- Crisis thresholds and timing
- Encryption and persistence
- Session recovery
- Auto-save functionality

```bash
npm test src/flows/assessment/stores/__tests__/assessmentStore.test.ts
```

## Architecture

The store is designed for reusability across:
- **DRD-FLOW-005**: Standalone assessments
- **DRD-FLOW-001**: Onboarding flow integration
- **Check-in flows**: Daily/weekly assessments
- **Clinical workflows**: Provider-initiated assessments

## Performance Benchmarks

- Crisis detection: <200ms (regulatory requirement)
- Assessment loading: <300ms (performance requirement)
- Auto-save response: <100ms (user experience)
- Session recovery: <500ms (startup performance)