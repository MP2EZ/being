/**
 * ResumableSession Types
 * Handles partial session state for interrupted check-ins and assessments
 */

import { CheckIn, Assessment } from './index';

export interface ResumableSession {
  id: string;
  type: 'checkin' | 'assessment';
  subType: 'morning' | 'midday' | 'evening' | 'phq9' | 'gad7';
  startedAt: string;
  lastUpdatedAt: string;
  expiresAt: string;
  appVersion: string;
  progress: SessionProgress;
  data: Partial<CheckIn['data']> | Partial<Assessment>;
  metadata: SessionMetadata;
}

export interface SessionProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  percentComplete: number;
  estimatedTimeRemaining: number; // in seconds
}

export interface SessionMetadata {
  deviceId?: string;
  interruptionReason?: 'app_background' | 'app_close' | 'navigation' | 'crash' | 'manual';
  resumeCount: number;
  totalDuration: number; // cumulative time in seconds
  lastScreen: string;
  navigationStack?: string[];
}

export interface ResumableSessionService {
  // Core operations
  saveSession(session: Partial<ResumableSession>): Promise<void>;
  getSession(type: string, subType: string): Promise<ResumableSession | null>;
  deleteSession(sessionId: string): Promise<void>;
  clearExpiredSessions(): Promise<void>;
  
  // Queries
  hasActiveSession(type: string, subType: string): Promise<boolean>;
  getAllActiveSessions(): Promise<ResumableSession[]>;
  
  // Session management
  updateProgress(sessionId: string, progress: Partial<SessionProgress>): Promise<void>;
  extendSession(sessionId: string, additionalHours?: number): Promise<void>;
  
  // Validation
  isSessionValid(session: ResumableSession): boolean;
  canResumeSession(session: ResumableSession): boolean;
}

export interface SessionStorageKeys {
  RESUMABLE_SESSION_PREFIX: 'being_resumable_session_';
  SESSION_INDEX: 'being_session_index';
  SESSION_VERSION: 'being_session_version';
}

export const SESSION_CONSTANTS = {
  DEFAULT_TTL_HOURS: 24,
  MAX_RESUME_COUNT: 5,
  MIN_PROGRESS_FOR_RESUME: 10, // minimum 10% progress to save
  SESSION_VERSION: '1.0.0',
  CLEANUP_INTERVAL_HOURS: 6,
} as const;

export type SessionValidationError = 
  | 'SESSION_EXPIRED'
  | 'VERSION_MISMATCH'
  | 'INVALID_DATA'
  | 'MAX_RESUMES_EXCEEDED'
  | 'INSUFFICIENT_PROGRESS';

export interface SessionValidationResult {
  isValid: boolean;
  error?: SessionValidationError;
  message?: string;
}