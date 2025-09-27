/**
 * DRD Check-in Flow Types
 * Type definitions for morning, midday, and evening check-in flows
 */

// Flow Navigation Types
export type MorningFlowParamList = {
  BodyScan: undefined;
  EmotionRecognition: undefined;
  ThoughtObservation: undefined;
  PhysicalMetrics: undefined;
  ValuesIntention: undefined;
  DreamJournal: undefined;
};

export type MiddayFlowParamList = {
  Awareness: undefined;
  Gathering: undefined;
  Expanding: undefined;
};

export type EveningFlowParamList = {
  DayReview: undefined;
  PleasantUnpleasant: undefined;
  ThoughtPatterns: undefined;
  TomorrowPrep: undefined;
};

// Common Flow Data Types
export interface FlowProgress {
  currentStep: number;
  totalSteps: number;
  flowType: 'morning' | 'midday' | 'evening';
  startTime: Date;
  isComplete: boolean;
}

export interface BodyAreaData {
  area: string;
  sensation: string;
  intensity: number; // 1-10 scale
  description?: string;
}

export interface EmotionData {
  emotion: string;
  intensity: number; // 1-10 scale
  trigger?: string;
  description?: string;
}

export interface ThoughtData {
  thought: string;
  category: 'helpful' | 'unhelpful' | 'neutral';
  intensity: number; // 1-10 scale
  response?: string;
}

export interface PhysicalMetricsData {
  energy: number; // 1-10 scale
  sleep: number; // 1-10 scale
  physicalComfort: number; // 1-10 scale (replaces anxiety per clinical safety)
}

export interface ValuesData {
  value: string;
  intention: string;
  priority: number; // 1-10 scale
}

export interface DreamData {
  hasDream: boolean;
  content?: string;
  emotions?: string[];
  significance?: number; // 1-10 scale
}

// Midday Flow Types
export interface AwarenessData {
  presentMoment: string;
  bodyAwareness: string;
  emotionalState: string;
}

export interface GatheringData {
  focus: number; // 1-10 scale
  clarity: number; // 1-10 scale
  intention: string;
}

export interface ExpandingData {
  perspective: string;
  gratitude: string[];
  connection: string;
}

// Evening Flow Types
export interface DayReviewData {
  highlights: string[];
  challenges: string[];
  learnings: string[];
  overallRating: number; // 1-10 scale
}

export interface PleasantUnpleasantData {
  pleasant: {
    event: string;
    emotions: string[];
    bodyResponse: string;
  }[];
  unpleasant: {
    event: string;
    emotions: string[];
    bodyResponse: string;
    coping: string;
  }[];
}

export interface ThoughtPatternsData {
  patterns: {
    thought: string;
    frequency: 'rare' | 'occasional' | 'frequent' | 'constant';
    helpfulness: 'helpful' | 'unhelpful' | 'neutral';
    alternative?: string;
  }[];
}

export interface TomorrowPrepData {
  intentions: string[];
  priorities: string[];
  selfCare: string[];
  gratitude: string;
}

// Complete Flow Session Data
export interface FlowSessionData {
  id: string;
  type: 'morning' | 'midday' | 'evening';
  date: Date;
  startTime: Date;
  endTime?: Date;
  progress: FlowProgress;
  data: MorningFlowData | MiddayFlowData | EveningFlowData;
  isComplete: boolean;
}

export interface MorningFlowData {
  bodyScan?: BodyAreaData[];
  emotions?: EmotionData[];
  thoughts?: ThoughtData[];
  physicalMetrics?: PhysicalMetricsData;
  values?: ValuesData[];
  dream?: DreamData;
}

export interface MiddayFlowData {
  awareness?: AwarenessData;
  gathering?: GatheringData;
  expanding?: ExpandingData;
}

export interface EveningFlowData {
  dayReview?: DayReviewData;
  pleasantUnpleasant?: PleasantUnpleasantData;
  thoughtPatterns?: ThoughtPatternsData;
  tomorrowPrep?: TomorrowPrepData;
}