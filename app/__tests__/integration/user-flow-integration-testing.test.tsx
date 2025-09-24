/**
 * User Flow Integration Testing
 * Complete user journey validation across all migrated components
 * 
 * FOCUS: End-to-end user experiences with therapeutic effectiveness validation
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { jest } from '@jest/globals';

// User Flow Test Utilities
import { UserJourneyTestUtils } from '../utils/UserJourneyTestUtils';
import { TherapeuticTestUtils } from '../utils/TherapeuticTestUtils';
import { CrisisTestUtils } from '../utils/CrisisTestUtils';

// Complete App Flow Components
import { TypeSafePHQ9Screen } from '../../src/screens/assessment/TypeSafePHQ9Screen';
import { TypeSafeGAD7Screen } from '../../src/screens/assessment/TypeSafeGAD7Screen';
import { CrisisInterventionScreen } from '../../src/screens/assessment/CrisisInterventionScreen';
import { BreathingCircle } from '../../src/components/checkin/BreathingCircle';
import { EmotionGrid } from '../../src/components/checkin/EmotionGrid';
import { BodyAreaGrid } from '../../src/components/checkin/BodyAreaGrid';
import { ProfileScreen } from '../../src/screens/simple/ProfileScreen';
import { SettingsScreen } from '../../src/screens/simple/SettingsScreen';
import { ExercisesScreen } from '../../src/screens/simple/ExercisesScreen';
import { PaymentSettingsScreen } from '../../src/screens/payment/PaymentSettingsScreen';

// Mock setup
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
}));

describe('User Flow Integration Testing', () => {
  let userJourneyUtils: UserJourneyTestUtils;
  let therapeuticUtils: TherapeuticTestUtils;
  let crisisUtils: CrisisTestUtils;

  beforeEach(() => {
    userJourneyUtils = new UserJourneyTestUtils();
    therapeuticUtils = new TherapeuticTestUtils();
    crisisUtils = new CrisisTestUtils();
    jest.clearAllMocks();
  });

  describe('Complete User Onboarding Journey', () => {
    test('should complete first-time user onboarding flow', async () => {
      const journeyStartTime = performance.now();
      let currentStep = 1;
      
      console.log(`🧪 Starting complete onboarding journey - Step ${currentStep}`);
      
      // Step 1: Profile Setup (30-60 seconds)
      const profileScreen = render(<ProfileScreen />);
      const profileResult = await userJourneyUtils.simulateFirstTimeProfileSetup(profileScreen);
      
      expect(profileResult.completed).toBe(true);
      expect(profileResult.timeToComplete).toBeLessThan(60000); // <60s
      expect(profileResult.dataValidated).toBe(true);
      
      console.log(`✅ Step ${currentStep++}: Profile setup completed in ${profileResult.timeToComplete}ms`);
      
      // Step 2: Initial PHQ-9 Assessment (2-4 minutes)
      const phq9Screen = render(<TypeSafePHQ9Screen />);
      const phq9Result = await userJourneyUtils.simulateFirstAssessment(phq9Screen, 'phq9');
      
      expect(phq9Result.score).toBeGreaterThanOrEqual(0);
      expect(phq9Result.score).toBeLessThanOrEqual(27);
      expect(phq9Result.timeToComplete).toBeLessThan(240000); // <4min
      expect(phq9Result.calculationAccuracy).toBe(1.0);
      
      console.log(`✅ Step ${currentStep++}: PHQ-9 assessment completed - Score: ${phq9Result.score}, Time: ${phq9Result.timeToComplete}ms`);
      
      // Step 3: GAD-7 Assessment (1.5-3 minutes)
      const gad7Screen = render(<TypeSafeGAD7Screen />);
      const gad7Result = await userJourneyUtils.simulateFirstAssessment(gad7Screen, 'gad7');
      
      expect(gad7Result.score).toBeGreaterThanOrEqual(0);
      expect(gad7Result.score).toBeLessThanOrEqual(21);
      expect(gad7Result.timeToComplete).toBeLessThan(180000); // <3min
      expect(gad7Result.calculationAccuracy).toBe(1.0);
      
      console.log(`✅ Step ${currentStep++}: GAD-7 assessment completed - Score: ${gad7Result.score}, Time: ${gad7Result.timeToComplete}ms`);
      
      // Step 4: Crisis Check (if high scores)
      if (phq9Result.score >= 20 || gad7Result.score >= 15) {
        const crisisScreen = render(<CrisisInterventionScreen />);
        const crisisResult = await crisisUtils.simulateCrisisIntervention(crisisScreen);
        
        expect(crisisResult.protocolActivated).toBe(true);
        expect(crisisResult.responseTime).toBeLessThan(200);
        expect(crisisResult.emergencyResourcesPresented).toBe(true);
        
        console.log(`🚨 Step ${currentStep++}: Crisis intervention activated - Response time: ${crisisResult.responseTime}ms`);
      }
      
      // Step 5: First Breathing Session Introduction (3-5 minutes)
      const breathingComponent = render(<BreathingCircle />);
      const breathingResult = await therapeuticUtils.simulateFirstBreathingSession(breathingComponent);
      
      expect(breathingResult.completed).toBe(true);
      expect(breathingResult.duration).toBeCloseTo(180000, 2000); // 3min ±2s
      expect(breathingResult.timingAccuracy).toBeGreaterThan(0.95);
      expect(breathingResult.userEngagement).toBeGreaterThan(0.8);
      
      console.log(`✅ Step ${currentStep++}: First breathing session completed - Duration: ${breathingResult.duration}ms, Accuracy: ${breathingResult.timingAccuracy}`);
      
      // Step 6: First Emotion Check-in (1-2 minutes)
      const emotionComponent = render(<EmotionGrid />);
      const emotionResult = await therapeuticUtils.simulateFirstEmotionCheckin(emotionComponent);
      
      expect(emotionResult.emotionsSelected).toBeGreaterThan(0);
      expect(emotionResult.timeToComplete).toBeLessThan(120000); // <2min
      expect(emotionResult.dataRecorded).toBe(true);
      
      console.log(`✅ Step ${currentStep++}: First emotion check-in completed - Emotions: ${emotionResult.emotionsSelected}, Time: ${emotionResult.timeToComplete}ms`);
      
      // Step 7: Settings Configuration (1-2 minutes)
      const settingsScreen = render(<SettingsScreen />);
      const settingsResult = await userJourneyUtils.simulateSettingsConfiguration(settingsScreen);
      
      expect(settingsResult.preferencesSet).toBe(true);
      expect(settingsResult.notificationsConfigured).toBe(true);
      expect(settingsResult.timeToComplete).toBeLessThan(120000); // <2min
      
      console.log(`✅ Step ${currentStep++}: Settings configured - Time: ${settingsResult.timeToComplete}ms`);
      
      const totalJourneyTime = performance.now() - journeyStartTime;
      
      // Verify complete onboarding experience
      expect(totalJourneyTime).toBeLessThan(900000); // Complete onboarding <15min
      expect(totalJourneyTime).toBeGreaterThan(300000); // Realistic time >5min
      
      console.log(`🎯 Complete onboarding journey finished in ${totalJourneyTime}ms (${Math.round(totalJourneyTime/1000)}s)`);
      console.log(`📊 Journey breakdown: Profile → Assessments → Crisis Check → Breathing → Emotions → Settings`);
    });

    test('should handle onboarding interruption and resumption', async () => {
      // Start onboarding
      const profileScreen = render(<ProfileScreen />);
      await userJourneyUtils.startProfileSetup(profileScreen);
      
      // Partially complete profile (interruption simulation)
      await userJourneyUtils.partiallyCompleteProfile(profileScreen, 0.6); // 60% complete
      
      // Simulate app background/foreground cycle
      await act(async () => {
        fireEvent(profileScreen.getByTestId('profile-screen'), 'appStateChange', 'background');
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s background
        fireEvent(profileScreen.getByTestId('profile-screen'), 'appStateChange', 'active');
      });
      
      // Resume and complete profile
      const resumptionResult = await userJourneyUtils.resumeAndCompleteProfile(profileScreen);
      
      expect(resumptionResult.dataPreserved).toBe(true);
      expect(resumptionResult.resumedSuccessfully).toBe(true);
      expect(resumptionResult.finalCompletion).toBe(true);
      
      // Continue with assessment resumption test
      const phq9Screen = render(<TypeSafePHQ9Screen />);
      await userJourneyUtils.startAssessment(phq9Screen, 'phq9');
      
      // Answer half the questions before interruption
      const partialAnswers = [2, 1, 3, 2, 1]; // First 5 questions
      await userJourneyUtils.answerQuestions(phq9Screen, partialAnswers);
      
      // Simulate interruption
      await act(async () => {
        fireEvent(phq9Screen.getByTestId('phq9-screen'), 'appStateChange', 'background');
        await new Promise(resolve => setTimeout(resolve, 3000));
        fireEvent(phq9Screen.getByTestId('phq9-screen'), 'appStateChange', 'active');
      });
      
      // Complete assessment
      const remainingAnswers = [3, 2, 1, 2]; // Remaining 4 questions
      const assessmentResult = await userJourneyUtils.completeAssessmentAfterResumption(
        phq9Screen, 
        remainingAnswers
      );
      
      expect(assessmentResult.allAnswersPreserved).toBe(true);
      expect(assessmentResult.calculationAccurate).toBe(true);
      expect(assessmentResult.totalScore).toBe([...partialAnswers, ...remainingAnswers].reduce((a, b) => a + b, 0));
    });
  });

  describe('Daily Therapeutic Session Flow', () => {
    test('should complete typical daily therapeutic session', async () => {
      const sessionStartTime = performance.now();
      
      console.log('🧘 Starting daily therapeutic session flow');
      
      // Step 1: Quick mood check-in (30-60 seconds)
      const emotionComponent = render(<EmotionGrid />);
      const quickMoodResult = await therapeuticUtils.simulateQuickMoodCheckin(emotionComponent);
      
      expect(quickMoodResult.timeToComplete).toBeLessThan(60000); // <60s
      expect(quickMoodResult.moodRecorded).toBe(true);
      
      console.log(`✅ Quick mood check-in: ${quickMoodResult.primaryMood}, Time: ${quickMoodResult.timeToComplete}ms`);
      
      // Step 2: Body awareness scan (30-45 seconds)
      const bodyComponent = render(<BodyAreaGrid />);
      const bodyAwarenessResult = await therapeuticUtils.simulateBodyAwarenessScan(bodyComponent);
      
      expect(bodyAwarenessResult.timeToComplete).toBeLessThan(45000); // <45s
      expect(bodyAwarenessResult.areasIdentified).toBeGreaterThan(0);
      
      console.log(`✅ Body awareness: ${bodyAwarenessResult.areasIdentified} areas identified, Time: ${bodyAwarenessResult.timeToComplete}ms`);
      
      // Step 3: Breathing exercise (180 seconds exact)
      const breathingComponent = render(<BreathingCircle />);
      const breathingResult = await therapeuticUtils.simulateDailyBreathingSession(breathingComponent);
      
      expect(breathingResult.duration).toBeCloseTo(180000, 1000); // 3min ±1s
      expect(breathingResult.timingAccuracy).toBeGreaterThan(0.98); // >98% accuracy
      expect(breathingResult.engagementLevel).toBeGreaterThan(0.85); // >85% engagement
      
      console.log(`✅ Breathing session: ${breathingResult.duration}ms, Accuracy: ${breathingResult.timingAccuracy}`);
      
      // Step 4: Post-session reflection (60-90 seconds)
      const postSessionMoodResult = await therapeuticUtils.simulatePostSessionMoodCheck(emotionComponent);
      
      expect(postSessionMoodResult.timeToComplete).toBeLessThan(90000); // <90s
      expect(postSessionMoodResult.changeDetected).toBeDefined();
      
      console.log(`✅ Post-session mood: ${postSessionMoodResult.postSessionMood}, Change: ${postSessionMoodResult.changeDetected ? 'Yes' : 'No'}`);
      
      const totalSessionTime = performance.now() - sessionStartTime;
      
      // Verify session timing and effectiveness
      expect(totalSessionTime).toBeGreaterThan(240000); // At least 4min (realistic)
      expect(totalSessionTime).toBeLessThan(420000); // Max 7min (efficient)
      
      // Verify therapeutic data integration
      const sessionData = await therapeuticUtils.getSessionSummary();
      expect(sessionData.allComponentsCompleted).toBe(true);
      expect(sessionData.dataConsistency).toBe(true);
      expect(sessionData.therapeuticValueScore).toBeGreaterThan(0.8); // >80% therapeutic value
      
      console.log(`🎯 Daily session completed in ${Math.round(totalSessionTime/1000)}s`);
      console.log(`📈 Therapeutic value: ${sessionData.therapeuticValueScore}`);
    });

    test('should handle session interruptions gracefully', async () => {
      // Start breathing session
      const breathingComponent = render(<BreathingCircle />);
      await therapeuticUtils.startBreathingSession(breathingComponent);
      
      // Simulate interruption scenarios
      const interruptionScenarios = [
        { type: 'phone-call', duration: 30000 }, // 30s call
        { type: 'notification', duration: 5000 }, // 5s notification
        { type: 'app-switch', duration: 15000 }, // 15s app switch
      ];
      
      for (const scenario of interruptionScenarios) {
        console.log(`🔄 Testing ${scenario.type} interruption`);
        
        // Let session run for 60s
        await therapeuticUtils.runSessionFor(breathingComponent, 60000);
        
        // Trigger interruption
        await act(async () => {
          fireEvent(breathingComponent.getByTestId('breathing-circle'), 'appStateChange', 'background');
          await new Promise(resolve => setTimeout(resolve, scenario.duration));
          fireEvent(breathingComponent.getByTestId('breathing-circle'), 'appStateChange', 'active');
        });
        
        // Verify session state preserved
        const sessionState = await therapeuticUtils.getSessionState(breathingComponent);
        expect(sessionState.isActive).toBe(true);
        expect(sessionState.timeElapsed).toBeGreaterThan(60000);
        expect(sessionState.timingAccuracy).toBeGreaterThan(0.90); // Still >90% accurate
        
        // Complete session
        const completionResult = await therapeuticUtils.completeSession(breathingComponent);
        expect(completionResult.successfulCompletion).toBe(true);
        expect(completionResult.totalDuration).toBeCloseTo(180000 + scenario.duration, 2000);
        
        console.log(`✅ ${scenario.type} handled gracefully - Final accuracy: ${sessionState.timingAccuracy}`);
      }
    });
  });

  describe('Crisis Response Flow Integration', () => {
    test('should execute complete crisis response across all screens', async () => {
      const crisisScreens = [
        { screen: <ProfileScreen />, context: 'profile-management' },
        { screen: <SettingsScreen />, context: 'settings-configuration' },
        { screen: <ExercisesScreen />, context: 'exercise-selection' },
        { screen: <TypeSafePHQ9Screen />, context: 'assessment-in-progress' },
        { screen: <PaymentSettingsScreen />, context: 'payment-setup' },
      ];
      
      for (const testCase of crisisScreens) {
        console.log(`🚨 Testing crisis response from ${testCase.context}`);
        
        const { getByTestId } = render(testCase.screen);
        
        // Verify crisis button accessibility
        const crisisButton = getByTestId('crisis-button');
        expect(crisisButton).toBeTruthy();
        expect(crisisButton.props.accessible).toBe(true);
        
        // Measure crisis response time
        const responseStartTime = performance.now();
        fireEvent.press(crisisButton);
        const responseTime = performance.now() - responseStartTime;
        
        // Verify crisis response requirements
        expect(responseTime).toBeLessThan(200); // <200ms response
        
        // Verify crisis intervention screen appears
        await waitFor(() => {
          expect(getByTestId('crisis-intervention-screen')).toBeTruthy();
        });
        
        // Verify emergency resources available
        const emergencyResources = getByTestId('emergency-resources');
        expect(emergencyResources).toBeTruthy();
        
        // Verify 988 hotline access
        const hotlineButton = getByTestId('suicide-prevention-hotline');
        expect(hotlineButton).toBeTruthy();
        
        const hotlineResponseStart = performance.now();
        fireEvent.press(hotlineButton);
        const hotlineResponseTime = performance.now() - hotlineResponseStart;
        
        expect(hotlineResponseTime).toBeLessThan(3000); // <3s to 988
        
        console.log(`✅ Crisis response from ${testCase.context}: ${responseTime}ms`);
      }
    });

    test('should handle high-score assessment crisis triggers', async () => {
      // Test PHQ-9 high score crisis trigger
      const phq9Screen = render(<TypeSafePHQ9Screen />);
      
      // Simulate responses indicating severe depression (score 22)
      const highPhq9Responses = [3, 3, 3, 2, 3, 3, 2, 3, 2]; // Score: 24
      
      const crisisDetectionStart = performance.now();
      const phq9Result = await userJourneyUtils.simulatePHQ9WithCrisisDetection(
        phq9Screen, 
        highPhq9Responses
      );
      const crisisDetectionTime = performance.now() - crisisDetectionStart;
      
      expect(phq9Result.score).toBe(24);
      expect(phq9Result.crisisDetected).toBe(true);
      expect(phq9Result.crisisResponseTime).toBeLessThan(200);
      expect(crisisDetectionTime).toBeLessThan(5000); // Complete detection <5s
      
      // Test GAD-7 high score crisis trigger
      const gad7Screen = render(<TypeSafeGAD7Screen />);
      
      // Simulate responses indicating severe anxiety (score 18)
      const highGad7Responses = [3, 3, 3, 2, 3, 2, 2]; // Score: 18
      
      const gad7Result = await userJourneyUtils.simulateGAD7WithCrisisDetection(
        gad7Screen,
        highGad7Responses
      );
      
      expect(gad7Result.score).toBe(18);
      expect(gad7Result.crisisDetected).toBe(true);
      expect(gad7Result.crisisResponseTime).toBeLessThan(200);
      
      console.log(`🚨 Crisis detection: PHQ-9 (${phq9Result.score}) + GAD-7 (${gad7Result.score})`);
      console.log(`⚡ Response times: PHQ-9 ${phq9Result.crisisResponseTime}ms, GAD-7 ${gad7Result.crisisResponseTime}ms`);
    });
  });

  describe('Payment Integration Flow', () => {
    test('should complete payment setup with anxiety detection', async () => {
      const paymentStartTime = performance.now();
      
      console.log('💳 Starting payment integration flow with anxiety detection');
      
      const paymentScreen = render(<PaymentSettingsScreen />);
      
      // Step 1: Payment method selection with anxiety monitoring
      const paymentSelectionResult = await userJourneyUtils.simulatePaymentMethodSelection(
        paymentScreen,
        { enableAnxietyDetection: true }
      );
      
      expect(paymentSelectionResult.methodSelected).toBe(true);
      expect(paymentSelectionResult.anxietyDetectionActive).toBe(true);
      expect(paymentSelectionResult.timeToSelect).toBeLessThan(120000); // <2min
      
      // Step 2: Anxiety level monitoring during payment setup
      if (paymentSelectionResult.anxietyDetected) {
        const anxietyInterventionResult = await userJourneyUtils.handlePaymentAnxiety(paymentScreen);
        
        expect(anxietyInterventionResult.interventionOffered).toBe(true);
        expect(anxietyInterventionResult.crisisOptionAvailable).toBe(true);
        expect(anxietyInterventionResult.responseTime).toBeLessThan(500); // <500ms intervention
        
        console.log(`😰 Payment anxiety detected and handled in ${anxietyInterventionResult.responseTime}ms`);
      }
      
      // Step 3: Payment configuration completion
      const paymentConfigResult = await userJourneyUtils.completePaymentConfiguration(paymentScreen);
      
      expect(paymentConfigResult.configurationComplete).toBe(true);
      expect(paymentConfigResult.securityValidated).toBe(true);
      expect(paymentConfigResult.complianceVerified).toBe(true);
      
      const totalPaymentTime = performance.now() - paymentStartTime;
      expect(totalPaymentTime).toBeLessThan(300000); // Complete payment setup <5min
      
      console.log(`✅ Payment setup completed in ${Math.round(totalPaymentTime/1000)}s`);
    });

    test('should handle payment anxiety with crisis escalation', async () => {
      const paymentScreen = render(<PaymentSettingsScreen />);
      
      // Simulate high anxiety during payment
      const highAnxietyScenario = {
        anxietyLevel: 'severe',
        triggerCrisis: true,
        responsePattern: 'rapid-escalation'
      };
      
      const anxietyResult = await userJourneyUtils.simulatePaymentAnxietyEscalation(
        paymentScreen,
        highAnxietyScenario
      );
      
      expect(anxietyResult.crisisDetected).toBe(true);
      expect(anxietyResult.crisisResponseTime).toBeLessThan(200);
      expect(anxietyResult.paymentProcessPaused).toBe(true);
      expect(anxietyResult.emergencyResourcesOffered).toBe(true);
      
      // Verify crisis protocol activated during payment
      expect(anxietyResult.crisisProtocol.activated).toBe(true);
      expect(anxietyResult.crisisProtocol.hotlineAccess).toBe(true);
      expect(anxietyResult.crisisProtocol.paymentBypass).toBe(true); // Payment not required in crisis
      
      console.log(`🚨 Payment anxiety crisis escalation handled in ${anxietyResult.crisisResponseTime}ms`);
    });
  });

  describe('Multi-User Session Management', () => {
    test('should handle multiple user sessions without interference', async () => {
      // Simulate multiple users on shared device (family usage)
      const userSessions = [
        { userId: 'user1', sessionType: 'breathing' },
        { userId: 'user2', sessionType: 'assessment' },
        { userId: 'user3', sessionType: 'mood-checkin' },
      ];
      
      const sessionResults = [];
      
      for (const session of userSessions) {
        console.log(`👤 Starting ${session.sessionType} session for ${session.userId}`);
        
        let sessionResult;
        
        switch (session.sessionType) {
          case 'breathing':
            const breathingComponent = render(<BreathingCircle />);
            sessionResult = await therapeuticUtils.simulateUserBreathingSession(
              breathingComponent,
              session.userId
            );
            break;
          
          case 'assessment':
            const assessmentScreen = render(<TypeSafePHQ9Screen />);
            sessionResult = await userJourneyUtils.simulateUserAssessment(
              assessmentScreen,
              session.userId
            );
            break;
          
          case 'mood-checkin':
            const moodComponent = render(<EmotionGrid />);
            sessionResult = await therapeuticUtils.simulateUserMoodCheckin(
              moodComponent,
              session.userId
            );
            break;
        }
        
        // Verify session isolation
        expect(sessionResult.userId).toBe(session.userId);
        expect(sessionResult.dataIsolated).toBe(true);
        expect(sessionResult.sessionComplete).toBe(true);
        
        sessionResults.push(sessionResult);
        
        console.log(`✅ ${session.sessionType} session for ${session.userId} completed`);
      }
      
      // Verify no data cross-contamination
      const userIds = sessionResults.map(result => result.userId);
      const uniqueUserIds = [...new Set(userIds)];
      expect(uniqueUserIds.length).toBe(userSessions.length);
      
      // Verify session data integrity
      for (const result of sessionResults) {
        expect(result.dataIntegrity).toBe(true);
        expect(result.privacyPreserved).toBe(true);
      }
    });
  });
});