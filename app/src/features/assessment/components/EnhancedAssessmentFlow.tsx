/**
 * Enhanced Assessment Flow - Comprehensive Integration Orchestrator
 * 
 * COMPREHENSIVE INTEGRATIONS:
 * - Crisis detection with real-time monitoring (<200ms)
 * - Privacy compliance with dynamic consent validation
 * - AES-256-GCM encryption for all clinical data
 * - Performance monitoring with therapeutic optimization
 * - Error boundaries with crisis-safe fallbacks
 * - Secure state management with Zustand
 * - Accessibility with WCAG AA compliance
 * 
 * PERFORMANCE TARGETS:
 * - Crisis detection: <200ms
 * - Assessment response: <300ms
 * - Encryption: <50ms
 * - Component render: <100ms
 * - Smooth 60fps throughout flow
 */


import { logSecurity, logPerformance, logError, LogCategory } from '@/core/services/logging';
import { useAnalytics } from '@/core/analytics';
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  AppState,
  AppStateStatus,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colorSystem, spacing, borderRadius } from '@/core/theme';

// Enhanced imports
import EnhancedAssessmentQuestion from './EnhancedAssessmentQuestion';
import AssessmentIntroduction from '@/features/assessment/components/AssessmentIntroduction';
import AssessmentResults from '@/features/assessment/components/AssessmentResults';
import CrisisErrorBoundary from '@/features/crisis/components/CrisisErrorBoundary';
// DEBUG-341: eager import on the crisis path. Renders in the two render states that
// previously had no crisis affordance on this suppressed route.
import Static988Button from '@/features/crisis/components/Static988Button';
import { useAssessmentStore } from '../stores/assessmentStore';

// Types and interfaces
import type {
  AssessmentType,
  AssessmentResponse,
  AssessmentQuestion,
  PHQ9Result,
  GAD7Result,
  AssessmentSession
} from '@/features/assessment/types';
import type { CrisisDetection } from '@/features/crisis/types/safety';

interface EnhancedAssessmentFlowProps {
  assessmentType: AssessmentType;
  onComplete: (result: PHQ9Result | GAD7Result) => void;
  onCancel?: () => void;
  theme?: 'morning' | 'midday' | 'evening' | 'neutral';
  context?: 'standalone' | 'onboarding' | 'checkin';
  showIntroduction?: boolean;
  sessionId: string;
}

type FlowState = 'introduction' | 'questions' | 'results' | 'completing';

// Mock assessment questions (in real app, these would come from clinical database)
const PHQ9_QUESTIONS: AssessmentQuestion[] = [
  { id: 'phq9_1', text: 'Little interest or pleasure in doing things', type: 'phq9', order: 1 },
  { id: 'phq9_2', text: 'Feeling down, depressed, or hopeless', type: 'phq9', order: 2 },
  { id: 'phq9_3', text: 'Trouble falling or staying asleep, or sleeping too much', type: 'phq9', order: 3 },
  { id: 'phq9_4', text: 'Feeling tired or having little energy', type: 'phq9', order: 4 },
  { id: 'phq9_5', text: 'Poor appetite or overeating', type: 'phq9', order: 5 },
  { id: 'phq9_6', text: 'Feeling bad about yourself or that you are a failure or have let yourself or your family down', type: 'phq9', order: 6 },
  { id: 'phq9_7', text: 'Trouble concentrating on things, such as reading the newspaper or watching television', type: 'phq9', order: 7 },
  { id: 'phq9_8', text: 'Moving or speaking so slowly that other people could have noticed, or the opposite being so fidgety or restless that you have been moving around a lot more than usual', type: 'phq9', order: 8 },
  { id: 'phq9_9', text: 'Thoughts that you would be better off dead, or of hurting yourself', type: 'phq9', order: 9 },
];

const GAD7_QUESTIONS: AssessmentQuestion[] = [
  { id: 'gad7_1', text: 'Feeling nervous, anxious, or on edge', type: 'gad7', order: 1 },
  { id: 'gad7_2', text: 'Not being able to stop or control worrying', type: 'gad7', order: 2 },
  { id: 'gad7_3', text: 'Worrying too much about different things', type: 'gad7', order: 3 },
  { id: 'gad7_4', text: 'Trouble relaxing', type: 'gad7', order: 4 },
  { id: 'gad7_5', text: 'Being so restless that it is hard to sit still', type: 'gad7', order: 5 },
  { id: 'gad7_6', text: 'Becoming easily annoyed or irritable', type: 'gad7', order: 6 },
  { id: 'gad7_7', text: 'Feeling afraid, as if something awful might happen', type: 'gad7', order: 7 },
];

const EnhancedAssessmentFlow: React.FC<EnhancedAssessmentFlowProps> = ({
  assessmentType,
  onComplete,
  onCancel,
  theme = 'neutral',
  context = 'standalone',
  showIntroduction = true,
  sessionId,
}) => {
  // State management
  const [flowState, setFlowStateValue] = useState<FlowState>('introduction');
  // DEBUG-771: mirrored synchronously, so an exit held behind an in-flight save reads where
  // the save took the flow before React has re-rendered. Every caller passes a value.
  const flowStateRef = useRef<FlowState>('introduction');
  const setFlowState = useCallback((next: FlowState) => {
    flowStateRef.current = next;
    setFlowStateValue(next);
  }, []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, AssessmentResponse>>(new Map());
  const [result, setResult] = useState<PHQ9Result | GAD7Result | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});

  // DEBUG-771 exit race (crisis ruling, AC3). `inFlightRef` counts answer saves —
  // answerQuestion and, on the last question, completeAssessment. `inFlightIdleRef`
  // resolves when the count returns to zero, which is what an exit request waits on.
  // `answerInFlight` is the render mirror: the exit control shows disabled + busy, and is
  // never hidden. `terminalRef` makes onComplete / onCancel exactly-once per instance.
  const inFlightRef = useRef(0);
  const inFlightIdleRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  const [answerInFlight, setAnswerInFlight] = useState(false);
  const terminalRef = useRef(false);
  const exitHeldRef = useRef(false);

  // Performance monitoring
  const flowStartTime = useRef<number>(Date.now());
  const questionStartTime = useRef<number>(Date.now());
  // DEBUG-536: individual trackers, not the hook object — see useAnalytics' comment.
  const { trackAssessmentStarted, trackAssessmentCompleted } = useAnalytics();

  // Assessment store integration. `crisisDetection` is the single canonical
  // source of crisis state — the store's `answerQuestion` (inline Q9) and
  // `completeAssessment` (score-based) actions write to it, and dedup is
  // handled inside `handleCrisisDetection`. We subscribe here so the flow
  // can render crisis-aware result UI and log timing metrics.
  const {
    startAssessment,
    answerQuestion,
    completeAssessment,
    currentSession,
    error,
    resetAssessment,
  } = useAssessmentStore();
  const crisisDetected = useAssessmentStore((state) => state.crisisDetection);

  // Get questions based on assessment type
  const questions = useMemo(() => {
    return assessmentType === 'phq9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
  }, [assessmentType]);

  const currentQuestion = useMemo(() => {
    return questions[currentQuestionIndex];
  }, [questions, currentQuestionIndex]);

  // Theme-based styling
  const themeColors = useMemo(() => {
    if (theme === 'neutral') {
      return {
        primary: colorSystem.base.midnightBlue,
        background: colorSystem.base.white,
      };
    }
    return colorSystem.themes[theme];
  }, [theme]);

  // Initialize assessment
  useEffect(() => {
    const initializeAssessment = async () => {
      try {
        await startAssessment(assessmentType, context);
        if (!showIntroduction) {
          setFlowState('questions');
          questionStartTime.current = Date.now();
        }
      } catch (error) {
        logError(LogCategory.SYSTEM, 'Assessment initialization failed:', error instanceof Error ? error : new Error(String(error)));
      }
    };

    initializeAssessment();
  }, [assessmentType, context, showIntroduction, startAssessment, setFlowState]);

  // DEBUG-771: the one terminal cancel. Silent: no copy, no analytics, no store write.
  const confirmExit = useCallback(() => {
    if (terminalRef.current) return;
    terminalRef.current = true;
    onCancel?.();
  }, [onCancel]);

  // DEBUG-771: the one exit confirm, shared by the exit control, the accessibility escape,
  // Android hardware back and the results-phase back. Copy is unchanged from before.
  const promptExit = useCallback(() => {
    if (terminalRef.current) return;
    Alert.alert(
      'Exit Assessment?',
      'If you exit now, this check-in will end. You can start a new one any time.',
      [
        { text: 'Continue Assessment', style: 'cancel' },
        { text: 'Exit', onPress: confirmExit, style: 'destructive' },
      ]
    );
  }, [confirmExit]);

  // DEBUG-771 / AC3: an exit asked for while an answer is saving waits for the save. If the
  // save took the flow out of the questions (a result was produced), completion wins: no
  // confirm, no onCancel. Never resets or restarts the assessment — partial answers are
  // left unscored and the crisis state is not touched.
  const requestExit = useCallback(async () => {
    if (terminalRef.current || exitHeldRef.current) return;
    exitHeldRef.current = true;
    try {
      while (inFlightIdleRef.current) {
        await inFlightIdleRef.current.promise;
      }
    } finally {
      exitHeldRef.current = false;
    }
    if (terminalRef.current || flowStateRef.current !== 'questions') return;
    promptExit();
  }, [promptExit]);

  const handleExitRequest = useCallback(() => {
    void requestExit();
  }, [requestExit]);

  // Handle back button for Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // DEBUG-771: while an answer is saving, back is consumed and does nothing — it
        // can neither step back under the save nor exit ahead of a completion.
        if (flowState === 'questions' && inFlightRef.current > 0) {
          return true;
        }

        if (flowState === 'questions' && currentQuestionIndex > 0) {
          setCurrentQuestionIndex(prev => prev - 1);
          return true;
        }
        
        if (flowState === 'questions' || flowState === 'results') {
          promptExit();
          return true;
        }
        
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [flowState, currentQuestionIndex, promptExit])
  );

  // App state monitoring for persistence
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' && flowState === 'questions') {
        // Auto-save progress when app goes to background
        console.log('📱 Saving assessment progress (app backgrounded)');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [flowState]);

  // Crisis-detection telemetry. The store is the writer; this effect runs
  // exactly once per detected crisis (on the rising edge) to capture
  // response-time metrics and log. The store's `handleCrisisDetection` has
  // already fired `CrisisDetectionService.triggerEmergencyResponse` (the
  // user-facing Alert) by the time this runs.
  useEffect(() => {
    if (!crisisDetected) return;

    const crisisResponseTime = Date.now() - questionStartTime.current;
    logPerformance('EnhancedAssessmentFlow.crisisResponse', crisisResponseTime, {
      threshold: 200,
    });

    setPerformanceMetrics((prev: any) => ({
      ...prev,
      crisisResponseTime,
      crisisDetected: true,
      crisisType: crisisDetected.primaryTrigger,
      crisisSeverity: crisisDetected.severityLevel,
    }));
  }, [crisisDetected]);

  // Enhanced answer handler
  const handleAnswer = useCallback(async (response: AssessmentResponse) => {
    inFlightRef.current += 1;
    if (!inFlightIdleRef.current) {
      let resolve!: () => void;
      const promise = new Promise<void>((r) => {
        resolve = r;
      });
      inFlightIdleRef.current = { promise, resolve };
    }
    setAnswerInFlight(true);

    try {
      if (!currentQuestion) return;

      const questionId = currentQuestion.id;

      setIsProcessing(true);

      // Store answer (encryption + crisis detection happen in the store below)
      setAnswers(prev => new Map(prev).set(questionId, response));

      // Track performance
      const questionResponseTime = Date.now() - questionStartTime.current;
      setPerformanceMetrics((prev: any) => ({
        ...prev,
        [`question_${currentQuestionIndex + 1}_time`]: questionResponseTime,
      }));

      // Validate performance targets
      if (questionResponseTime > 300) {
        logSecurity('Question response time exceeded', 'medium', {
          questionResponseTime,
          threshold: 300
        });
      }

      // Store in assessment store
      await answerQuestion(questionId, response);

      // Move to next question or complete
      if (currentQuestionIndex + 1 < questions.length) {
        setCurrentQuestionIndex(prev => prev + 1);
        questionStartTime.current = Date.now();
      } else {
        // Complete assessment
        await handleCompleteAssessment();
      }

    } catch (error) {
      logError(LogCategory.SYSTEM, 'Enhanced answer handling failed:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert(
        'Response Error',
        'There was an issue saving your response. Crisis support is still available.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
      inFlightRef.current -= 1;
      if (inFlightRef.current === 0) {
        const idle = inFlightIdleRef.current;
        inFlightIdleRef.current = null;
        setAnswerInFlight(false);
        idle?.resolve();
      }
    }
  }, [currentQuestion, currentQuestionIndex, questions.length, answerQuestion]);

  // DEBUG-771: exactly one of onComplete / onCancel per flow instance.
  const completeOnce = useCallback((completed: PHQ9Result | GAD7Result) => {
    if (terminalRef.current) return;
    terminalRef.current = true;
    onComplete(completed);
  }, [onComplete]);

  // Complete assessment with performance monitoring
  const handleCompleteAssessment = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      const completionStart = Date.now();
      await completeAssessment();
      const completionTime = Date.now() - completionStart;

      // Calculate total flow time
      const totalFlowTime = Date.now() - flowStartTime.current;

      // Update final performance metrics
      setPerformanceMetrics((prev: any) => ({
        ...prev,
        completionTime,
        totalFlowTime,
        questionsCompleted: questions.length,
        answersEncrypted: answers.size,
      }));

      logPerformance('📊 Assessment completion metrics:', completionTime, {
        totalFlowTime,
        questionsCompleted: questions.length,
        crisisDetected: !!crisisDetected,
      });

      // Get result from store
      const storeState = useAssessmentStore.getState();
      if (storeState.currentResult) {
        if (context === 'onboarding') {
          // Skip results screen for onboarding - show completing state
          // This prevents blank screen while parent handles navigation
          setFlowState('completing');
          setResult(storeState.currentResult);
          // Call onComplete to trigger parent navigation
          completeOnce(storeState.currentResult);
        } else {
          // Standalone: show results screen
          setResult(storeState.currentResult);
          setFlowState('results');
        }
      } else {
        // DEBUG-550 — the branch that was missing.
        //
        // `completeAssessment` swallows a scoring failure into store `error` and
        // RESOLVES, so this function never entered its own catch. With no `else`
        // here, nothing rendered: no navigation, no alert, `flowState` stuck at
        // 'questions'. The reader was left on the last question of a wellness
        // check-in with no feedback at all. That strand is live today,
        // independent of the completeness guard.
        const blocked = storeState.completionBlocked;
        if (blocked && blocked.missingQuestionIds.length > 0) {
          // Route back to the first unanswered question rather than dead-ending.
          const firstMissing = questions.findIndex(
            (q) => q.id === blocked.missingQuestionIds[0]
          );
          if (firstMissing >= 0) {
            setCurrentQuestionIndex(firstMissing);
          }
          setFlowState('questions');
          // Copy is deliberately instrument-agnostic and does NOT name the
          // question: on the PHQ-9 path the missing item is most often Q9, and
          // naming it would spotlight self-harm to someone who never answered it.
          Alert.alert(
            'Not quite finished',
            "One answer didn't come through, so this check-in isn't complete. You're back at that question; your other answers are still here.",
            [{ text: 'OK' }]
          );
        } else {
          // Any other reason scoring produced no result. Previously also silent.
          logError(
            LogCategory.SYSTEM,
            'Assessment completion produced no result:',
            new Error(storeState.error || 'unknown')
          );
          Alert.alert(
            'Completion Error',
            'There was an issue completing your check-in. Crisis support is still available.',
            [{ text: 'OK' }]
          );
        }
      }

      // DEBUG-536: LAST statement of the try, and in its OWN swallowing catch.
      //
      // Placement is a zero-false-negative constraint, not a style choice. Anything
      // before `await completeAssessment()` that throws is caught by the outer catch
      // below, which means completeAssessment() — and therefore detectCrisis() and
      // handleCrisisDetection() — NEVER RUNS, and a PHQ-9 >=20 / GAD-7 >=15 crisis is
      // silently never detected. Emitting here also keeps it off the path that sets
      // flowState/result, so an analytics fault cannot block the crisis-aware results UI.
      //
      // The private catch is required for the same reason: leaning on the outer catch
      // would convert an analytics fault into a user-visible "Completion Error" alert
      // falsely claiming the assessment failed — in the exact frame where a crisis
      // intervention may already be on screen.
      //
      // Reuses the existing flowStartTime ref; no second timer. NO instrument identity,
      // no score, no severity, no crisis flag — see the tracker's own comment. A
      // crisis flag here would move crisis telemetry out of the Supabase vital-interest
      // sink into consent-gated PostHog, reversing INFRA-214's legal-basis partition.
      // Merge guard (DEBUG-550 x DEBUG-536, added at integration). DEBUG-550 introduced the
      // `else` above for the blocked / no-result path, which did not exist when this emit was
      // written. Unguarded, it would report `assessment_completed` for a check-in that was
      // REFUSED for an incomplete answer set — inflating the completion half of DEBUG-536's own
      // started -> completed funnel with runs that never produced a result. Placement and the
      // private catch are unchanged: still the last statement of the try, still swallowing.
      if (storeState.currentResult) {
        try {
          trackAssessmentCompleted(totalFlowTime);
        } catch {
          /* Telemetry must never affect the crisis intervention flow. */
        }
      }

    } catch (error) {
      logError(LogCategory.SYSTEM, 'Assessment completion failed:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert(
        'Completion Error',
        'There was an issue completing your check-in. Crisis support is still available.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  }, [completeAssessment, crisisDetected, questions, answers.size, context, completeOnce, trackAssessmentCompleted, setFlowState]);

  // Begin assessment flow
  const handleBeginAssessment = useCallback(() => {
    setFlowState('questions');
    questionStartTime.current = Date.now();
    // DEBUG-536: outside any crisis-bearing frame. Never from a render body and never
    // from startAssessment, either of which would double-fire on re-render.
    try {
      trackAssessmentStarted();
    } catch {
      /* Telemetry must never affect the assessment flow. */
    }
  }, [trackAssessmentStarted, setFlowState]);

  // Handle flow completion
  const handleFlowComplete = useCallback(() => {
    if (result) {
      completeOnce(result);
    }
  }, [result, completeOnce]);

  // Error handler
  const handleError = useCallback((error: Error) => {
    logError(LogCategory.SYSTEM, 'Assessment flow error:', error instanceof Error ? error : new Error(String(error)));
    
    // Always maintain crisis access during errors
    Alert.alert(
      'Technical Issue',
      'There was a technical issue, but crisis support remains available.',
      [
        { text: 'Continue', style: 'cancel' },
        { text: 'Exit Safely', onPress: confirmExit },
      ]
    );
  }, [confirmExit]);

  return (
    <CrisisErrorBoundary
      onError={handleError}
      sessionId={sessionId}
      showDetailedError={__DEV__}
    >
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Introduction Phase */}
        {flowState === 'introduction' && showIntroduction && (
          <AssessmentIntroduction
            assessmentType={assessmentType}
            onBegin={handleBeginAssessment}
            onSkip={onCancel}
            theme={theme}
            context={context}
            showSkipOption={context === 'onboarding'}
          />
        )}

        {/* Questions Phase */}
        {/* DEBUG-771: the escape (two-finger Z) is on the questions-phase root so it works
            from any focused element; it only ever opens the confirm. */}
        {flowState === 'questions' && currentQuestion && (
          <View
            style={styles.questionsRoot}
            onAccessibilityEscape={handleExitRequest}
            testID="assessment-questions-root"
          >
            <EnhancedAssessmentQuestion
              question={currentQuestion}
              currentAnswer={answers.get(currentQuestion.id)}
              onAnswer={handleAnswer}
              showProgress={true}
              currentStep={currentQuestionIndex + 1}
              totalSteps={questions.length}
              theme={theme}
              onError={handleError}
              onExit={handleExitRequest}
              exitInFlight={answerInFlight}
            />
          </View>
        )}

        {/* Results Phase */}
        {flowState === 'results' && result && (
          <AssessmentResults
            result={result}
            onComplete={handleFlowComplete}
            onRetake={() => {
              // resetAssessment() clears the store's crisisDetection, which
              // flows back into our subscription on the next render.
              resetAssessment();
              setFlowState('introduction');
              setCurrentQuestionIndex(0);
              setAnswers(new Map());
              setResult(null);
              flowStartTime.current = Date.now();
            }}
            showCrisisIntervention={!!crisisDetected}
            theme={theme}
            context={context}
          />
        )}

        {/* Completing Phase (onboarding only) */}
        {flowState === 'completing' && (
          <View style={styles.completingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            {/*
              DEBUG-341 — this was an ActivityIndicator and NOTHING ELSE.
              `AssessmentFlow` is in RootCrisisButton.SUPPRESSED_ROUTES, and the
              suppression is justified by the per-screen prominent buttons on
              introduction / questions / results. This branch had none, so it was a
              zero-988 window on a suppressed route — and it is reached IMMEDIATELY
              AFTER a PHQ-9 that may have just crossed a crisis threshold, which is the
              highest-risk moment in the product.
            */}
            <Static988Button message="Finishing up. If you need support right now, it is here." />
          </View>
        )}

        {/*
          DEBUG-341 — the second zero-988 window on this suppressed route.
          In the ONBOARDING context CleanRootNavigator passes context='standalone' with
          showIntroduction false, so between mount and the async startAssessment flipping
          flowState to 'questions', every branch above renders nothing and the screen is
          an empty View. Same reasoning as 'completing': if this route suppresses the root
          overlay, EVERY reachable render state must carry its own crisis affordance.
        */}
        {flowState === 'introduction' && !showIntroduction && (
          <View style={styles.completingContainer}>
            <Static988Button message="Getting your check-in ready. Support is available now if you need it." />
          </View>
        )}
      </View>
    </CrisisErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  questionsRoot: {
    flex: 1,
  },
  completingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EnhancedAssessmentFlow;