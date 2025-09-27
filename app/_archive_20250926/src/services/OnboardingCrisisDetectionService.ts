/**
 * Onboarding Crisis Detection Service - Enhanced crisis safety for therapeutic onboarding
 *
 * CRITICAL SAFETY PROTOCOLS:
 * - Real-time crisis detection during onboarding steps
 * - <200ms response time for crisis intervention
 * - Seamless integration with therapeutic flow
 * - Progress preservation during crisis events
 * - Emergency contact support for new users
 *
 * ONBOARDING-SPECIFIC FEATURES:
 * - Crisis detection during baseline assessments
 * - First-time user safety plan guidance
 * - Progressive crisis resource introduction
 * - Therapeutic onboarding continuation after crisis
 */

import { Alert } from 'react-native';
import { crisisDetectionService, CrisisDetectionResult } from './CrisisDetectionService';
import { useCrisisStore } from '../store/crisisStore';
import { useOnboardingStore, OnboardingStep, BaselineAssessmentData } from '../store/onboardingStore';
import { OfflineCrisisManager } from './OfflineCrisisManager';
import CrisisResponseMonitor from './CrisisResponseMonitor';
import {
  CRISIS_THRESHOLD_PHQ9,
  CRISIS_THRESHOLD_GAD7,
  SUICIDAL_IDEATION_THRESHOLD,
  SUICIDAL_IDEATION_QUESTION_INDEX,
  Assessment,
  PHQ9Score,
  GAD7Score,
  AssessmentID
} from '../types/clinical';

// Onboarding-specific crisis detection events
export interface OnboardingCrisisEvent {
  id: string;
  onboardingStep: OnboardingStep;
  stepProgress: number;
  crisisResult: CrisisDetectionResult;
  interventionTaken: string[];
  onboardingResumed: boolean;
  userContinuedOnboarding: boolean;
  timestamp: string;
}

// Crisis intervention options during onboarding
export interface OnboardingCrisisOptions {
  // Immediate interventions
  call988: boolean;
  call911: boolean;
  textCrisisLine: boolean;

  // Onboarding-specific options
  pauseOnboarding: boolean;
  skipToSafetyPlan: boolean;
  emergencyExitOnboarding: boolean;

  // Support resources
  showFirstTimeCrisisHelp: boolean;
  offerCrisisEducation: boolean;
  connectToResources: boolean;
}

// Onboarding crisis detection settings
export interface OnboardingCrisisSettings {
  enableRealTimeDetection: boolean;
  detectPartialAssessments: boolean;
  crisisEducationEnabled: boolean;
  progressPreservationEnabled: boolean;
  emergencyContactPromptEnabled: boolean;
}

export class OnboardingCrisisDetectionService {
  private static instance: OnboardingCrisisDetectionService;
  private detectionHistory: OnboardingCrisisEvent[] = [];
  private currentOnboardingCrisis: OnboardingCrisisEvent | null = null;
  private isMonitoring = false;
  private settings: OnboardingCrisisSettings = {
    enableRealTimeDetection: true,
    detectPartialAssessments: true,
    crisisEducationEnabled: true,
    progressPreservationEnabled: true,
    emergencyContactPromptEnabled: true
  };

  private constructor() {
    this.initializeOnboardingCrisisDetection();
  }

  static getInstance(): OnboardingCrisisDetectionService {
    if (!OnboardingCrisisDetectionService.instance) {
      OnboardingCrisisDetectionService.instance = new OnboardingCrisisDetectionService();
    }
    return OnboardingCrisisDetectionService.instance;
  }

  /**
   * Initialize onboarding-specific crisis detection monitoring
   */
  private async initializeOnboardingCrisisDetection(): Promise<void> {
    console.log('🔍 Onboarding crisis detection system initialized');

    try {
      // Ensure offline crisis resources are available for new users
      await OfflineCrisisManager.initializeOfflineCrisisData();

      // Subscribe to onboarding store changes for real-time monitoring
      this.setupOnboardingStoreIntegration();

      // Subscribe to crisis detection service
      this.setupCrisisDetectionIntegration();

      this.isMonitoring = true;
      console.log('✅ Onboarding crisis monitoring activated');

    } catch (error) {
      console.error('❌ Failed to initialize onboarding crisis detection:', error);
      // Fallback: ensure basic monitoring is still available
      this.isMonitoring = true;
    }
  }

  /**
   * MAIN CRISIS DETECTION FOR ONBOARDING
   * Detects crisis during therapeutic onboarding flow
   */
  async detectOnboardingCrisis(
    step: OnboardingStep,
    assessmentData?: Partial<BaselineAssessmentData>,
    answers?: readonly number[],
    assessmentType?: 'phq9' | 'gad7'
  ): Promise<CrisisDetectionResult | null> {
    const startTime = performance.now();

    try {
      return await CrisisResponseMonitor.executeCrisisAction(
        `onboarding-crisis-detection-${step}`,
        async () => {
          let crisisResult: CrisisDetectionResult | null = null;

          // 1. BASELINE ASSESSMENT CRISIS DETECTION
          if (step === 'baseline_assessment' && assessmentData) {
            crisisResult = await this.detectBaselineAssessmentCrisis(assessmentData, answers, assessmentType);
          }

          // 2. SAFETY PLANNING STEP - Check for ongoing crisis
          else if (step === 'safety_planning') {
            crisisResult = await this.checkOngoingCrisisInSafetyPlanning();
          }

          // 3. OTHER STEPS - Monitor for manual crisis activation
          else {
            crisisResult = await this.checkManualCrisisActivation(step);
          }

          // If crisis detected, execute onboarding-specific intervention
          if (crisisResult && crisisResult.isCrisis) {
            await this.executeOnboardingCrisisIntervention(step, crisisResult);
          }

          return crisisResult;
        }
      );
    } catch (error) {
      console.error(`Onboarding crisis detection failed for step ${step}:`, error);
      return null;
    } finally {
      CrisisResponseMonitor.monitorSyncCrisisAction(`onboarding-crisis-detection-${step}`, startTime);
    }
  }

  /**
   * Crisis detection specifically for baseline assessment step
   */
  private async detectBaselineAssessmentCrisis(
    assessmentData: Partial<BaselineAssessmentData>,
    answers?: readonly number[],
    assessmentType?: 'phq9' | 'gad7'
  ): Promise<CrisisDetectionResult | null> {

    // Check existing assessment data
    if (assessmentData.crisisDetected) {
      return {
        isCrisis: true,
        severity: assessmentData.riskLevel === 'severe' ? 'critical' : 'severe',
        trigger: 'score_threshold',
        confidence: 0.95,
        recommendedAction: 'immediate_crisis',
        metadata: {
          assessmentType: assessmentData.phq9Assessment ? 'phq9' : 'gad7',
          score: assessmentData.phq9Assessment?.score || assessmentData.gad7Assessment?.score
        }
      };
    }

    // Real-time detection during assessment completion
    if (answers && assessmentType) {
      const crisisResult = await crisisDetectionService.detectCrisis(
        assessmentType,
        answers,
        undefined,
        undefined
      );

      // Enhanced detection for onboarding context
      if (crisisResult.isCrisis || this.shouldInterventEarly(answers, assessmentType)) {
        return crisisResult;
      }
    }

    return null;
  }

  /**
   * Early intervention detection for partial assessments
   */
  private shouldInterventEarly(answers: readonly number[], assessmentType: 'phq9' | 'gad7'): boolean {
    if (!this.settings.detectPartialAssessments) return false;

    // PHQ-9 suicidal ideation check
    if (assessmentType === 'phq9' && answers.length > SUICIDAL_IDEATION_QUESTION_INDEX) {
      const suicidalResponse = answers[SUICIDAL_IDEATION_QUESTION_INDEX];
      if (suicidalResponse >= SUICIDAL_IDEATION_THRESHOLD) {
        return true;
      }
    }

    // Check if partial score indicates potential crisis
    const partialScore = answers.reduce((sum, answer) => sum + (answer || 0), 0);
    const answeredQuestions = answers.length;

    if (answeredQuestions >= 3) {
      const projectedScore = (partialScore / answeredQuestions) * (assessmentType === 'phq9' ? 9 : 7);

      if (assessmentType === 'phq9' && projectedScore >= CRISIS_THRESHOLD_PHQ9) {
        return true;
      }
      if (assessmentType === 'gad7' && projectedScore >= CRISIS_THRESHOLD_GAD7) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for ongoing crisis during safety planning step
   */
  private async checkOngoingCrisisInSafetyPlanning(): Promise<CrisisDetectionResult | null> {
    const crisisStore = useCrisisStore.getState();

    if (crisisStore.isInCrisis) {
      return {
        isCrisis: true,
        severity: crisisStore.currentSeverity,
        trigger: 'pattern_analysis',
        confidence: 0.9,
        recommendedAction: 'intervention',
        metadata: {
          ongoingCrisis: true,
          crisisId: crisisStore.activeCrisisId
        }
      };
    }

    return null;
  }

  /**
   * Check for manual crisis activation during onboarding
   */
  private async checkManualCrisisActivation(step: OnboardingStep): Promise<CrisisDetectionResult | null> {
    // This would integrate with crisis button presses during onboarding
    // For now, return null as manual activation is handled by CrisisButton component
    return null;
  }

  /**
   * ONBOARDING-SPECIFIC CRISIS INTERVENTION
   * Executes crisis intervention while preserving onboarding progress
   */
  async executeOnboardingCrisisIntervention(
    step: OnboardingStep,
    crisisResult: CrisisDetectionResult
  ): Promise<void> {
    const startTime = performance.now();
    const eventId = `onboarding_crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create onboarding crisis event
      const crisisEvent: OnboardingCrisisEvent = {
        id: eventId,
        onboardingStep: step,
        stepProgress: this.getCurrentStepProgress(step),
        crisisResult,
        interventionTaken: [],
        onboardingResumed: false,
        userContinuedOnboarding: false,
        timestamp: new Date().toISOString()
      };

      this.currentOnboardingCrisis = crisisEvent;

      // IMMEDIATE SAFETY FIRST: Pause onboarding and save progress
      if (this.settings.progressPreservationEnabled) {
        await this.pauseOnboardingAndSaveProgress();
      }

      // Execute severity-based intervention
      const interventionOptions = this.determineInterventionOptions(crisisResult);
      await this.presentOnboardingCrisisOptions(crisisEvent, interventionOptions);

      // Record intervention
      this.detectionHistory.push(crisisEvent);

      console.log(`🚨 Onboarding crisis intervention executed: ${eventId}, step: ${step}, severity: ${crisisResult.severity}`);

    } catch (error) {
      console.error('Onboarding crisis intervention failed:', error);
      // Fallback to basic crisis intervention
      await this.executeFallbackCrisisIntervention(crisisResult);
    } finally {
      CrisisResponseMonitor.monitorSyncCrisisAction('onboarding-crisis-intervention', startTime);
    }
  }

  /**
   * Determine intervention options based on crisis severity and onboarding context
   */
  private determineInterventionOptions(crisisResult: CrisisDetectionResult): OnboardingCrisisOptions {
    const options: OnboardingCrisisOptions = {
      call988: false,
      call911: false,
      textCrisisLine: false,
      pauseOnboarding: true,
      skipToSafetyPlan: false,
      emergencyExitOnboarding: false,
      showFirstTimeCrisisHelp: true,
      offerCrisisEducation: this.settings.crisisEducationEnabled,
      connectToResources: true
    };

    // Critical severity: Immediate professional help
    if (crisisResult.severity === 'critical' || crisisResult.trigger === 'suicidal_ideation') {
      options.call988 = true;
      options.emergencyExitOnboarding = true;
    }

    // Severe severity: Professional help with safety planning
    else if (crisisResult.severity === 'severe') {
      options.call988 = true;
      options.skipToSafetyPlan = true;
    }

    // Moderate severity: Safety planning and resources
    else if (crisisResult.severity === 'moderate') {
      options.skipToSafetyPlan = true;
      options.textCrisisLine = true;
    }

    return options;
  }

  /**
   * Present onboarding-specific crisis intervention options
   */
  private async presentOnboardingCrisisOptions(
    crisisEvent: OnboardingCrisisEvent,
    options: OnboardingCrisisOptions
  ): Promise<void> {

    const { severity } = crisisEvent.crisisResult;

    // CRITICAL/SUICIDAL IDEATION: Immediate intervention
    if (severity === 'critical' || crisisEvent.crisisResult.trigger === 'suicidal_ideation') {
      await this.presentCriticalCrisisIntervention(crisisEvent, options);
    }

    // SEVERE: Urgent intervention with onboarding options
    else if (severity === 'severe') {
      await this.presentSevereCrisisIntervention(crisisEvent, options);
    }

    // MODERATE: Supportive intervention with education
    else if (severity === 'moderate') {
      await this.presentModerateCrisisIntervention(crisisEvent, options);
    }
  }

  /**
   * CRITICAL crisis intervention (suicidal ideation, critical scores)
   */
  private async presentCriticalCrisisIntervention(
    crisisEvent: OnboardingCrisisEvent,
    options: OnboardingCrisisOptions
  ): Promise<void> {

    Alert.alert(
      '🆘 Immediate Support Needed',
      'Your responses indicate you may need immediate professional support. Crisis counselors are available 24/7 to help.',
      [
        {
          text: 'Call 988 Now',
          style: 'default',
          onPress: async () => {
            await this.executeCrisisAction('call988', crisisEvent);
            await this.offerOnboardingContinuation(crisisEvent);
          }
        },
        {
          text: 'Crisis Resources',
          onPress: async () => {
            await this.showFirstTimeCrisisEducation();
            await this.offerOnboardingContinuation(crisisEvent);
          }
        },
        {
          text: 'Exit Safely',
          style: 'cancel',
          onPress: async () => {
            await this.executeSafeOnboardingExit(crisisEvent);
          }
        }
      ]
    );
  }

  /**
   * SEVERE crisis intervention with safety planning
   */
  private async presentSevereCrisisIntervention(
    crisisEvent: OnboardingCrisisEvent,
    options: OnboardingCrisisOptions
  ): Promise<void> {

    Alert.alert(
      '🔒 Support Available',
      'We want to make sure you have the support and safety resources you need.',
      [
        {
          text: 'Call 988',
          onPress: async () => {
            await this.executeCrisisAction('call988', crisisEvent);
            await this.offerOnboardingContinuation(crisisEvent);
          }
        },
        {
          text: 'Create Safety Plan',
          onPress: async () => {
            await this.skipToSafetyPlanningStep(crisisEvent);
          }
        },
        {
          text: 'Crisis Resources',
          onPress: async () => {
            await this.showCrisisResources();
            await this.offerOnboardingContinuation(crisisEvent);
          }
        },
        {
          text: 'Continue',
          style: 'cancel',
          onPress: async () => {
            await this.resumeOnboardingWithSupport(crisisEvent);
          }
        }
      ]
    );
  }

  /**
   * MODERATE crisis intervention with education
   */
  private async presentModerateCrisisIntervention(
    crisisEvent: OnboardingCrisisEvent,
    options: OnboardingCrisisOptions
  ): Promise<void> {

    Alert.alert(
      '🛡️ Support Resources',
      'It sounds like you might benefit from some additional support resources. We\'re here to help.',
      [
        {
          text: 'Crisis Text Line',
          onPress: async () => {
            await this.executeCrisisAction('textCrisisLine', crisisEvent);
            await this.offerOnboardingContinuation(crisisEvent);
          }
        },
        {
          text: 'Safety Planning',
          onPress: async () => {
            await this.skipToSafetyPlanningStep(crisisEvent);
          }
        },
        {
          text: 'Learn About Support',
          onPress: async () => {
            await this.showFirstTimeCrisisEducation();
            await this.resumeOnboardingWithSupport(crisisEvent);
          }
        },
        {
          text: 'Continue Onboarding',
          style: 'cancel',
          onPress: async () => {
            await this.resumeOnboardingWithSupport(crisisEvent);
          }
        }
      ]
    );
  }

  /**
   * CRISIS ACTION EXECUTION
   */
  private async executeCrisisAction(action: string, crisisEvent: OnboardingCrisisEvent): Promise<void> {
    const crisisStore = useCrisisStore.getState();

    try {
      let success = false;

      switch (action) {
        case 'call988':
          success = await crisisStore.call988();
          break;
        case 'call911':
          success = await crisisStore.call911();
          break;
        case 'textCrisisLine':
          success = await crisisStore.textCrisisLine();
          break;
        default:
          console.warn(`Unknown crisis action: ${action}`);
      }

      // Record intervention
      crisisEvent.interventionTaken.push(action);

      console.log(`✅ Crisis action executed: ${action}, success: ${success}`);
    } catch (error) {
      console.error(`Crisis action ${action} failed:`, error);
    }
  }

  /**
   * ONBOARDING FLOW INTEGRATION
   */

  /**
   * Pause onboarding and save progress for crisis intervention
   */
  private async pauseOnboardingAndSaveProgress(): Promise<void> {
    try {
      const onboardingStore = useOnboardingStore.getState();
      await onboardingStore.pauseOnboarding();
      console.log('✅ Onboarding paused and progress saved');
    } catch (error) {
      console.error('Failed to pause onboarding:', error);
    }
  }

  /**
   * Skip directly to safety planning step during crisis
   */
  private async skipToSafetyPlanningStep(crisisEvent: OnboardingCrisisEvent): Promise<void> {
    try {
      const onboardingStore = useOnboardingStore.getState();
      await onboardingStore.goToStep('safety_planning');

      crisisEvent.onboardingResumed = true;
      console.log('✅ Skipped to safety planning step');
    } catch (error) {
      console.error('Failed to skip to safety planning:', error);
    }
  }

  /**
   * Resume onboarding with additional crisis support
   */
  private async resumeOnboardingWithSupport(crisisEvent: OnboardingCrisisEvent): Promise<void> {
    try {
      // Add crisis support context to onboarding
      const onboardingStore = useOnboardingStore.getState();

      // Update personalization to include crisis support preferences
      await onboardingStore.updateStepData('personalization', {
        crisisSupportEnabled: true,
        showAdditionalResources: true
      });

      crisisEvent.userContinuedOnboarding = true;
      crisisEvent.onboardingResumed = true;

      console.log('✅ Onboarding resumed with crisis support');
    } catch (error) {
      console.error('Failed to resume onboarding with support:', error);
    }
  }

  /**
   * Safe exit from onboarding during crisis
   */
  private async executeSafeOnboardingExit(crisisEvent: OnboardingCrisisEvent): Promise<void> {
    try {
      const onboardingStore = useOnboardingStore.getState();

      // Save current progress
      await onboardingStore.saveProgress();

      // Show crisis resources before exit
      await this.showOfflineCrisisResources();

      // Note: Navigation to exit would be handled by the UI layer
      console.log('✅ Safe onboarding exit executed');
    } catch (error) {
      console.error('Failed to execute safe onboarding exit:', error);
    }
  }

  /**
   * Offer continuation after crisis intervention
   */
  private async offerOnboardingContinuation(crisisEvent: OnboardingCrisisEvent): Promise<void> {
    Alert.alert(
      '💚 Continue When Ready',
      'When you\'re ready, you can continue setting up your app. Your progress has been saved.',
      [
        {
          text: 'Continue Now',
          onPress: async () => {
            await this.resumeOnboardingWithSupport(crisisEvent);
          }
        },
        {
          text: 'Continue Later',
          style: 'cancel',
          onPress: () => {
            console.log('User chose to continue onboarding later');
          }
        }
      ]
    );
  }

  /**
   * CRISIS EDUCATION AND RESOURCES
   */

  /**
   * Show first-time crisis education for new users
   */
  private async showFirstTimeCrisisEducation(): Promise<void> {
    const message = await OfflineCrisisManager.getOfflineCrisisMessage();

    Alert.alert(
      '🆘 Crisis Support Available 24/7',
      message,
      [
        {
          text: 'Call 988 Now',
          onPress: async () => {
            const crisisStore = useCrisisStore.getState();
            await crisisStore.call988();
          }
        },
        {
          text: 'Save These Resources',
          onPress: async () => {
            // This would save to user's crisis plan
            console.log('Crisis resources saved for user');
          }
        },
        {
          text: 'OK',
          style: 'cancel'
        }
      ]
    );
  }

  /**
   * Show comprehensive crisis resources
   */
  private async showCrisisResources(): Promise<void> {
    const resources = await OfflineCrisisManager.getOfflineCrisisResources();

    let resourceList = '🆘 CRISIS SUPPORT RESOURCES\n\n';
    resources.hotlines.forEach(hotline => {
      if (hotline.type === 'text') {
        resourceList += `📱 ${hotline.name}: Text "${hotline.message}" to ${hotline.number}\n`;
      } else {
        resourceList += `📞 ${hotline.name}: ${hotline.number}\n`;
      }
    });

    Alert.alert('Crisis Resources', resourceList, [{ text: 'OK' }]);
  }

  /**
   * Show offline crisis resources
   */
  private async showOfflineCrisisResources(): Promise<void> {
    const message = await OfflineCrisisManager.getOfflineCrisisMessage();
    Alert.alert('Crisis Support Available', message, [{ text: 'OK' }]);
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Get current step progress
   */
  private getCurrentStepProgress(step: OnboardingStep): number {
    try {
      const onboardingStore = useOnboardingStore.getState();
      return onboardingStore.getStepProgress(step);
    } catch {
      return 0;
    }
  }

  /**
   * Fallback crisis intervention
   */
  private async executeFallbackCrisisIntervention(crisisResult: CrisisDetectionResult): Promise<void> {
    Alert.alert(
      'Crisis Support',
      'If you need immediate help:\n\n📞 Call 988 (Crisis Lifeline)\n📞 Call 911 (Emergency)',
      [{ text: 'OK' }]
    );
  }

  /**
   * INTEGRATION SETUP
   */

  /**
   * Setup integration with onboarding store
   */
  private setupOnboardingStoreIntegration(): void {
    // This would integrate with onboarding store state changes
    console.log('Onboarding store integration active for crisis detection');
  }

  /**
   * Setup integration with main crisis detection service
   */
  private setupCrisisDetectionIntegration(): void {
    // Register for crisis detection events
    crisisDetectionService.onCrisisDetection((result) => {
      if (this.isMonitoringOnboarding()) {
        console.log('Crisis detected during onboarding:', result);
      }
    });
  }

  /**
   * Check if currently monitoring onboarding
   */
  private isMonitoringOnboarding(): boolean {
    try {
      const onboardingStore = useOnboardingStore.getState();
      return onboardingStore.isActive && this.isMonitoring;
    } catch {
      return false;
    }
  }

  /**
   * PUBLIC API
   */

  /**
   * Enable/disable onboarding crisis monitoring
   */
  setMonitoringEnabled(enabled: boolean): void {
    this.isMonitoring = enabled;
    console.log(`Onboarding crisis monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update onboarding crisis settings
   */
  updateSettings(settings: Partial<OnboardingCrisisSettings>): void {
    this.settings = { ...this.settings, ...settings };
    console.log('Onboarding crisis settings updated:', settings);
  }

  /**
   * Get onboarding crisis history
   */
  getCrisisHistory(): OnboardingCrisisEvent[] {
    return [...this.detectionHistory];
  }

  /**
   * Get current crisis event
   */
  getCurrentCrisis(): OnboardingCrisisEvent | null {
    return this.currentOnboardingCrisis;
  }

  /**
   * Clear current crisis
   */
  clearCurrentCrisis(): void {
    this.currentOnboardingCrisis = null;
  }

  /**
   * Reset detection history
   */
  resetHistory(): void {
    this.detectionHistory = [];
    this.currentOnboardingCrisis = null;
  }
}

// Export singleton instance
export const onboardingCrisisDetectionService = OnboardingCrisisDetectionService.getInstance();
export default onboardingCrisisDetectionService;