/**
 * Basic Assessment Store Session Creation Test
 * CRITICAL CLINICAL SAFETY VALIDATION
 *
 * This test validates that the reported "currentSession = null" issue
 * is actually resolved and startAssessment() works correctly.
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../../../../services/logging';
import { useAssessmentStore } from '../assessmentStore';

describe('Assessment Store - Basic Session Creation', () => {
  beforeEach(() => {
    useAssessmentStore.getState().resetAssessment();
  });

  it('CRITICAL: startAssessment creates currentSession correctly', async () => {
    const store = useAssessmentStore.getState();

    // Verify initial state
    expect(store.currentSession).toBeNull();

    // Start PHQ-9 assessment and wait for completion
    await store.startAssessment('phq9', 'clinical_validation');

    // ASYNC TIMING PATTERN: 10ms wait for state synchronization
    // PURPOSE: Zustand store updates are async and may not complete immediately
    // REASON: startAssessment() triggers async operations that update store state
    // TIMING: 10ms provides sufficient time for state updates without slowing tests
    await new Promise(resolve => setTimeout(resolve, 10));

    // CRITICAL SAFETY CHECK: currentSession must NOT be null
    const updatedStore = useAssessmentStore.getState();
    expect(updatedStore.currentSession).toBeTruthy();
    expect(updatedStore.currentSession?.type).toBe('phq9');
    expect(updatedStore.currentSession?.context).toBe('clinical_validation');
    expect(updatedStore.currentSession?.id).toBeDefined();

    console.log('✅ CLINICAL SAFETY VERIFIED: currentSession created successfully');
    console.log('Session ID:', updatedStore.currentSession?.id);
    console.log('Session Type:', updatedStore.currentSession?.type);
  });

  it('CRITICAL: startAssessment works for GAD-7', async () => {
    const store = useAssessmentStore.getState();

    await store.startAssessment('gad7', 'clinical_validation');

    // ASYNC TIMING: State synchronization wait (same pattern as above)
    await new Promise(resolve => setTimeout(resolve, 10));

    const updatedStore = useAssessmentStore.getState();
    expect(updatedStore.currentSession).toBeTruthy();
    expect(updatedStore.currentSession?.type).toBe('gad7');

    console.log('✅ GAD-7 SESSION CREATED: Crisis detection pathway enabled');
  });

  it('CRITICAL: Can answer questions after session creation', async () => {
    const store = useAssessmentStore.getState();

    await store.startAssessment('phq9');
    // ASYNC TIMING: Session creation wait
    await new Promise(resolve => setTimeout(resolve, 10));

    await store.answerQuestion('phq9_1', 2);
    // ASYNC TIMING: Answer processing wait
    await new Promise(resolve => setTimeout(resolve, 10));

    const updatedStore = useAssessmentStore.getState();
    expect(updatedStore.answers).toHaveLength(1);
    expect(updatedStore.answers[0].questionId).toBe('phq9_1');
    expect(updatedStore.answers[0].response).toBe(2);

    console.log('✅ THERAPEUTIC FLOW VERIFIED: Assessment answers recorded');
  });

  it('CRITICAL: Suicidal ideation detection triggers immediately', async () => {
    // Mock Alert and Linking before using them
    const mockAlert = jest.fn();
    const mockLinking = jest.fn(() => Promise.resolve());

    // Mock react-native Alert and Linking
    const mockRN = require('react-native');
    mockRN.Alert.alert = mockAlert;
    mockRN.Linking.openURL = mockLinking;

    const store = useAssessmentStore.getState();

    await store.startAssessment('phq9');
    // ASYNC TIMING: Session creation wait
    await new Promise(resolve => setTimeout(resolve, 10));

    await store.answerQuestion('phq9_9', 1); // Suicidal ideation
    // ASYNC TIMING: Crisis detection processing wait
    // REASON: Crisis detection triggers multiple async operations (alerts, interventions)
    // TIMING: 100ms allows sufficient time for crisis workflow completion
    await new Promise(resolve => setTimeout(resolve, 100));

    const updatedStore = useAssessmentStore.getState();
    expect(updatedStore.crisisDetection).toBeTruthy();
    expect(updatedStore.crisisDetection?.triggerType).toBe('phq9_suicidal');
    expect(updatedStore.crisisIntervention).toBeTruthy();

    console.log('🚨 CRISIS DETECTION VERIFIED: Suicidal ideation pathway active');
    console.log('🚨 CRISIS INTERVENTION STATE:', updatedStore.crisisIntervention);

    console.log('Alert.alert called:', mockAlert.mock.calls.length, 'times');
    if (mockAlert.mock.calls.length > 0) {
      console.log('Alert call details:', mockAlert.mock.calls[0]);
    }
  });
});