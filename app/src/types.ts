/**
 * TypeScript type definitions for Being. MBCT app
 * Comprehensive interfaces for all data models
 */

// User Profile and Preferences
export interface UserProfile {
  id: string;
  createdAt: string;
  preferences: {
    haptics: boolean;
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  notifications: {
    enabled: boolean;
    morning: string;
    midday: string;
    evening: string;
  };
  onboardingCompleted: boolean;
  privacyPolicyAccepted: boolean;
  termsAccepted: boolean;
}

// Check-in Data Types
export interface CheckIn {
  id: string;
  timestamp: string;
  type: 'morning' | 'midday' | 'evening';
  data: CheckInData;
  completed: boolean;
  duration?: number; // in seconds
}

export interface CheckInData {
  // Morning specific
  bodyAreas?: string[];
  emotions?: string[];
  thoughts?: string;
  energyLevel?: string;
  dailyValue?: string;
  dreamJournal?: string;
  
  // Midday specific
  currentActivity?: string;
  stressLevel?: number;
  mindfulMoments?: string[];
  copingStrategies?: string[];
  
  // Evening specific
  dayRating?: number;
  gratitudes?: string[];
  challenges?: string[];
  tomorrowIntention?: string;
  sleepReadiness?: number;
}

// Assessment Data Types
export interface Assessment {
  id: string;
  timestamp: string;
  type: 'phq9' | 'gad7';
  answers: number[];
  score: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';
  context: 'onboarding' | 'standalone' | 'clinical';
  requiresCrisisIntervention: boolean;
}

export interface AssessmentConfig {
  type: 'phq9' | 'gad7';
  title: string;
  description: string;
  subtitle?: string;
  questions: AssessmentQuestion[];
  scoringThresholds: ScoringThresholds;
}

export interface AssessmentQuestion {
  id: number;
  text: string;
  options: AssessmentOption[];
}

export interface AssessmentOption {
  value: number;
  text: string;
  description?: string;
}

export interface ScoringRange {
  min: number;
  max: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';
  description: string;
  recommendations?: string[];
}

export interface ScoringThresholds {
  minimal: number;
  mild: number;
  moderate: number;
  moderatelySevere?: number; // Only for PHQ-9
  severe: number;
}

// Crisis Plan
export interface CrisisPlan {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  emergencyContacts: EmergencyContact[];
  copingStrategies: string[];
  warningSigns: string[];
  safeEnvironment: string[];
  professionalSupport: ProfessionalSupport[];
  isActive: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

export interface ProfessionalSupport {
  id: string;
  name: string;
  role: 'therapist' | 'psychiatrist' | 'doctor' | 'counselor' | 'other';
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

// Export Data
export interface ExportData {
  user: UserProfile;
  checkIns: CheckIn[];
  assessments: Assessment[];
  crisisPlan?: CrisisPlan;
  exportedAt: string;
  version: string;
}

// Navigation Types
export interface NavigationProps {
  onNext: () => void;
  onBack: () => void;
  onComplete?: () => void;
}

// Form Validation
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Partial Session Management
export interface PartialSession {
  id: string;
  type: 'morning' | 'midday' | 'evening';
  data: Partial<CheckInData>;
  timestamp: string;
  expiresAt: string;
  screenIndex?: number;
}

// Theme and Styling
export interface Theme {
  primary: string;
  background: string;
  success: string;
  warning: string;
  error: string;
}

// Haptic Feedback
export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

// Network Status
export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

// Offline Queue
export interface QueuedAction {
  id: string;
  timestamp: string;
  action: 'save_checkin' | 'save_assessment' | 'update_user';
  data: any;
  retryCount: number;
  maxRetries: number;
}

// Export Types
export interface ExportOptions {
  format: 'pdf' | 'csv';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeAssessments?: boolean;
  includeCheckIns?: boolean;
}

export type ExportFormat = 'pdf' | 'csv';
export type CheckInType = 'morning' | 'midday' | 'evening';
export type AssessmentType = 'phq9' | 'gad7';
export type SeverityLevel = 'minimal' | 'mild' | 'moderate' | 'severe';

// Onboarding Types
export interface OnboardingData {
  hasCompletedWelcome: boolean;
  hasAcceptedConsent: boolean;
  emergencyContacts: OnboardingEmergencyContact[];
  baselineAssessments: {
    phq9?: Assessment;
    gad7?: Assessment;
    completed: boolean;
  };
  therapeuticPreferences: TherapeuticPreferences;
  mbctIntroduction: MBCTIntroductionData;
  completedAt?: string;
}

export interface OnboardingEmergencyContact {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export interface TherapeuticPreferences {
  timeOfDay: string[]; // ['morning', 'midday', 'evening']
  exerciseDifficulty: 'gentle' | 'moderate' | 'challenging';
  crisisSensitivity: 'high' | 'medium' | 'low';
  accessibilityNeeds: string[];
  notifications: {
    enabled: boolean;
    frequency: 'daily' | 'custom' | 'minimal';
  };
}

export interface MBCTIntroductionData {
  hasCompletedBreathing: boolean;
  hasCompletedBodyScan: boolean;
  therapeuticGoals: string[];
  practicePreferences: {
    guidedVoice: boolean;
    backgroundSounds: boolean;
    hapticFeedback: boolean;
  };
}

export interface OnboardingStep {
  id: string;
  title: string;
  subtitle?: string;
  isRequired: boolean;
  estimatedTime: number; // in minutes
  therapeuticFocus: string;
  clinicalSafety?: boolean;
  completed: boolean;
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: string;
  lastActiveAt: string;
}

// Crisis Safety Types for Onboarding
export interface OnboardingCrisisContext {
  isOnboarding: true;
  stepId: string;
  assessmentType?: 'phq9' | 'gad7';
  hasEmergencyContacts: boolean;
  userConsentLevel: 'basic' | 'full';
}

// Breathing Practice Types
export interface BreathingPracticePhase {
  name: string;
  duration: number; // in seconds
  instruction: string;
  description: string;
  breathingPattern?: {
    inhale: number;
    hold?: number;
    exhale: number;
    pause?: number;
  };
}

export interface BreathingPracticeState {
  phase: 'intro' | 'practicing' | 'paused' | 'complete';
  currentPhaseIndex: number;
  timeRemaining: number;
  totalElapsed: number;
  completedAt?: string;
  userReflections?: string[];
}