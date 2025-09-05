/**
 * FullMind Data Models - Exact implementation from TRD v2.0
 * These interfaces must match the prototype data structure precisely
 */

export interface UserProfile {
  id: string;
  createdAt: string; // ISO date
  onboardingCompleted: boolean;
  values: string[]; // 3-5 selected
  notifications: {
    enabled: boolean;
    morning: string; // "08:00"
    midday: string;  // "13:00"
    evening: string; // "20:00"
  };
  preferences: {
    haptics: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  lastSyncDate?: string; // Future
  clinicalProfile?: {
    phq9Baseline?: number;
    gad7Baseline?: number;
    riskLevel?: 'minimal' | 'mild' | 'moderate' | 'severe';
  };
}

export interface CheckIn {
  id: string;
  type: 'morning' | 'midday' | 'evening';
  startedAt: string;
  completedAt?: string;
  skipped: boolean;
  // Exactly matching prototype structure
  data: {
    // Morning specific
    bodyAreas?: string[];
    emotions?: string[];
    thoughts?: string[];
    sleepQuality?: number;
    energyLevel?: number;
    anxietyLevel?: number;
    todayValue?: string;
    intention?: string;
    dreams?: string;
    
    // Midday specific
    currentEmotions?: string[];
    breathingCompleted?: boolean;
    pleasantEvent?: string;
    unpleasantEvent?: string;
    currentNeed?: string;
    
    // Evening specific
    dayHighlight?: string;
    dayChallenge?: string;
    dayEmotions?: string[];
    gratitude1?: string;
    gratitude2?: string;
    gratitude3?: string;
    dayLearning?: string;
    tensionAreas?: string[];
    releaseNote?: string;
    sleepIntentions?: string[];
    tomorrowFocus?: string;
    lettingGo?: string;
    // Original evening fields (keep for backward compatibility)
    overallMood?: number;
    energyManagement?: number;
    valuesAlignment?: number;
    pleasantEvents?: string[];
    unpleasantEvents?: string[];
    learnings?: string;
    thoughtPatterns?: string[];
    tomorrowReminder?: string;
    tomorrowIntention?: string;
  };
}

export interface Assessment {
  id: string;
  type: 'phq9' | 'gad7';
  completedAt: string;
  answers: number[]; // [0,1,2,3,...]
  score: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately severe' | 'severe';
  context: 'onboarding' | 'standalone' | 'clinical';
}

export interface CrisisPlan {
  id: string;
  updatedAt: string;
  warningSigns: string[];
  copingStrategies: string[];
  contacts: {
    therapist?: { name: string; phone: string; };
    crisisLine: string; // Default "988"
    trustedFriends: Array<{ name: string; phone: string; }>;
  };
  safetyMeasures: string[];
  isActive: boolean;
}

// Core app data structure
export interface AppData {
  user: UserProfile;
  checkIns: CheckIn[];
  assessments: Assessment[];
  crisisPlan: CrisisPlan | null;
  // Current session (not persisted)
  currentCheckIn?: Partial<CheckIn>;
}

// Export data structure for sharing
export interface ExportData {
  exportDate: string;
  version: string;
  user: UserProfile;
  checkIns: CheckIn[];
  assessments: Assessment[];
  crisisPlan: CrisisPlan | null;
  disclaimer: string;
}

// Assessment response options
export interface AssessmentOption {
  value: number;
  label: string;
}

// Assessment question structure
export interface AssessmentQuestion {
  id: number;
  text: string;
  options: AssessmentOption[];
}

// Assessment configuration
export interface AssessmentConfig {
  type: 'phq9' | 'gad7';
  title: string;
  subtitle: string;
  questions: AssessmentQuestion[];
  scoringThresholds: {
    minimal: number;
    mild: number;
    moderate: number;
    moderatelySevere?: number; // PHQ-9 only
    severe: number;
  };
}

// Notification configuration
export interface NotificationConfig {
  id: string;
  title: string;
  body: string;
  data: {
    type: 'morning' | 'midday' | 'evening';
    action?: string;
  };
  trigger: {
    hour: number;
    minute: number;
    repeats: boolean;
  };
}