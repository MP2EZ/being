/**
 * SQLite Migration & Analytics Types for FullMind MBCT App
 * 
 * Provides type-safe SQLite integration with clinical-grade data protection
 * and advanced analytics capabilities while maintaining existing AsyncStorage compatibility.
 */

import { Assessment, CheckIn, CrisisPlan, UserProfile } from '../types';
import { MigrationProgress, MigrationResult } from '../services/storage/DataStoreMigrator';

// SQLite Security Configuration (Hardware-backed encryption)
export interface SQLiteSecurityConfig {
  readonly encryption: {
    readonly algorithm: 'AES-256-GCM';
    readonly pragmaKey: string; // Hardware keychain derived
    readonly integrityMode: 'WAL' | 'DELETE' | 'TRUNCATE';
    readonly journalMode: 'WAL'; // Write-Ahead Logging for ACID compliance
    readonly autoVacuum: 'FULL' | 'INCREMENTAL' | 'NONE';
  };
  readonly migration: {
    readonly batchSize: number; // Clinical data migration batches (default: 50)
    readonly progressCallback: (progress: SQLiteMigrationProgress) => void;
    readonly rollbackCapability: boolean;
    readonly dataIntegrityValidation: boolean;
    readonly backupRetentionDays: number; // Default: 30
  };
  readonly performance: {
    readonly queryOptimization: boolean;
    readonly indexStrategy: 'clinical_first' | 'chronological' | 'hybrid';
    readonly cacheSize: number; // Memory management for large datasets (KB)
    readonly pragmaTimeout: number; // SQLite busy timeout (ms)
  };
}

// Enhanced Migration State extending existing DataStoreMigrator
export interface SQLiteMigrationState {
  readonly isMigrationRequired: boolean;
  readonly sqliteInitialized: boolean;
  readonly schemaVersion: string;
  readonly encryptionStatus: 'pending' | 'initializing' | 'active' | 'verified' | 'failed';
  readonly clinicalDataMigrated: boolean; // PHQ-9/GAD-7 priority
  readonly personalDataMigrated: boolean;
  readonly backupValidated: boolean;
  readonly estimatedDurationMs: number;
  readonly lastMigrationAttempt: string | null;
  readonly migrationErrors: readonly string[];
}

// Extended Migration Progress with SQLite-specific stages
export interface SQLiteMigrationProgress extends MigrationProgress {
  readonly stage: 
    | 'initializing'
    | 'encrypting_database'
    | 'creating_indices' 
    | 'migrating_clinical_data'
    | 'migrating_personal_data'
    | 'optimizing_performance'
    | 'validating_integrity'
    | 'completing'
    | 'error';
  readonly sqliteSpecific?: {
    readonly tablesCreated: number;
    readonly indicesCreated: number;
    readonly recordsMigrated: number;
    readonly queriesOptimized: number;
  };
}

// Clinical Query Builder for Enhanced Analytics
export interface SQLiteQueryBuilder {
  // Clinical assessment queries with temporal analysis
  readonly getAssessmentHistory: (
    timeRange: DateRange, 
    assessmentType?: 'phq9' | 'gad7'
  ) => Promise<readonly SQLiteAssessmentRecord[]>;
  
  readonly getPatternAnalysis: (
    userId: string, 
    days: number,
    analysisType: 'trend' | 'correlation' | 'seasonal'
  ) => Promise<readonly MoodPattern[]>;
  
  readonly getCrisisRiskAnalysis: (
    emergencyAccess: boolean,
    lookbackDays: number
  ) => Promise<CrisisRiskAnalysis>;
  
  // Performance-optimized queries
  readonly buildClinicalIndex: () => Promise<void>;
  readonly optimizeForAnalytics: () => Promise<OptimizationResult>;
  readonly validateDataIntegrity: () => Promise<IntegrityReport>;
  
  // Advanced analytical queries
  readonly getTherapeuticProgress: (
    userId: string,
    startDate: string,
    endDate: string
  ) => Promise<TherapeuticProgressMetrics>;
  
  readonly getHabitFormationAnalysis: (
    userId: string,
    days: number
  ) => Promise<HabitFormationMetrics>;
}

// Enhanced Assessment Record for SQLite Analytics
export interface SQLiteAssessmentRecord extends Assessment {
  // SQLite-specific metadata
  readonly sqlite_id: number; // Primary key for relations
  readonly migration_timestamp: string;
  readonly integrity_hash: string;
  readonly clinical_priority: 'crisis' | 'standard' | 'routine';
  
  // Enhanced querying support
  readonly temporal_index: number; // For time-series analysis
  readonly pattern_flags: readonly Array<'trend_up' | 'trend_down' | 'stable' | 'crisis_threshold'>;
  
  // Analytics metadata (computed on insertion)
  readonly analytics_metadata: {
    readonly score_category: 'minimal' | 'mild' | 'moderate' | 'severe' | 'critical';
    readonly change_from_previous: number | null; // Score delta
    readonly days_since_last: number | null;
    readonly streak_count: number; // Consecutive assessments
  };
}

// Calendar Integration Schedule Record
export interface SQLiteScheduleRecord {
  readonly id: number;
  readonly user_id: string;
  readonly check_in_type: 'morning' | 'midday' | 'evening';
  readonly scheduled_time: string; // ISO timestamp
  readonly completed_at: string | null;
  readonly skipped_reason: 'crisis' | 'user_choice' | 'technical' | null;
  
  // MBCT compliance tracking
  readonly therapeutic_consistency: number; // 0-100 score
  readonly habit_formation_score: number; // 0-100 based on pattern analysis
  
  // Calendar integration metadata
  readonly calendar_event_id: string | null; // External calendar event reference
  readonly reminder_sent: boolean;
  readonly privacy_level: 'standard' | 'enhanced' | 'maximum';
}

// Analytics and Pattern Recognition Types
export interface MoodPattern {
  readonly pattern_type: 'daily' | 'weekly' | 'monthly' | 'seasonal';
  readonly confidence_score: number; // 0-1
  readonly pattern_description: string;
  readonly data_points: readonly {
    readonly date: string;
    readonly value: number;
    readonly assessment_type: 'phq9' | 'gad7';
  }[];
  readonly therapeutic_implications: readonly string[];
}

export interface CrisisRiskAnalysis {
  readonly overall_risk: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  readonly risk_factors: readonly {
    readonly factor_type: 'score_trend' | 'frequency_change' | 'pattern_disruption';
    readonly severity: number; // 0-10
    readonly description: string;
    readonly data_support: readonly string[];
  }[];
  readonly recommended_interventions: readonly string[];
  readonly requires_immediate_attention: boolean;
  readonly analysis_timestamp: string;
}

export interface TherapeuticProgressMetrics {
  readonly overall_progress_score: number; // 0-100
  readonly areas_of_improvement: readonly string[];
  readonly areas_needing_attention: readonly string[];
  readonly consistency_metrics: {
    readonly check_in_consistency: number; // 0-100
    readonly assessment_frequency: number; // assessments per month
    readonly engagement_trend: 'improving' | 'stable' | 'declining';
  };
  readonly clinical_milestones: readonly {
    readonly milestone: string;
    readonly achieved_date: string | null;
    readonly progress_percentage: number; // 0-100
  }[];
}

export interface HabitFormationMetrics {
  readonly habit_strength_score: number; // 0-100 based on behavioral psychology
  readonly current_streak: number;
  readonly longest_streak: number;
  readonly consistency_pattern: 'forming' | 'established' | 'fragile' | 'broken';
  readonly optimal_reminder_times: readonly string[]; // ISO time strings
  readonly behavioral_insights: readonly {
    readonly insight_type: 'timing' | 'frequency' | 'context';
    readonly description: string;
    readonly confidence: number; // 0-1
  }[];
}

// Performance and Optimization Types
export interface OptimizationResult {
  readonly tables_optimized: number;
  readonly indices_rebuilt: number;
  readonly query_performance_improvement: number; // Percentage
  readonly storage_space_recovered: number; // Bytes
  readonly optimization_timestamp: string;
  readonly recommendations: readonly string[];
}

export interface IntegrityReport {
  readonly overall_status: 'healthy' | 'warning' | 'critical';
  readonly data_consistency_checks: readonly {
    readonly check_name: string;
    readonly status: 'pass' | 'fail' | 'warning';
    readonly details: string;
    readonly affected_records?: number;
  }[];
  readonly encryption_status: {
    readonly all_data_encrypted: boolean;
    readonly key_rotation_due: boolean;
    readonly encryption_algorithm_current: boolean;
  };
  readonly performance_metrics: {
    readonly average_query_time_ms: number;
    readonly database_size_mb: number;
    readonly fragmentation_percentage: number;
  };
}

// Date Range utility type
export interface DateRange {
  readonly startDate: string; // ISO string
  readonly endDate: string; // ISO string
  readonly includePartialDays: boolean;
}

// SQLite Migration Error Types (Clinical-Grade)
export enum SQLiteMigrationError {
  ENCRYPTION_FAILURE = 'ENCRYPTION_FAILURE',
  DATA_INTEGRITY_VIOLATION = 'DATA_INTEGRITY_VIOLATION', 
  CLINICAL_DATA_CORRUPTION = 'CLINICAL_DATA_CORRUPTION',
  ROLLBACK_REQUIRED = 'ROLLBACK_REQUIRED',
  INSUFFICIENT_STORAGE = 'INSUFFICIENT_STORAGE',
  SCHEMA_MIGRATION_FAILED = 'SCHEMA_MIGRATION_FAILED',
  INDEX_CREATION_FAILED = 'INDEX_CREATION_FAILED',
  BACKUP_CREATION_FAILED = 'BACKUP_CREATION_FAILED'
}

// Enhanced Clinical Safety Error extending base Error
export interface SQLiteClinicalSafetyError extends Error {
  readonly errorType: SQLiteMigrationError;
  readonly clinicalImpact: 'none' | 'minimal' | 'moderate' | 'high' | 'critical';
  readonly therapeuticContinuity: boolean; // Can user continue therapy?
  readonly emergencyAccessMaintained: boolean; // Crisis data still accessible?
  readonly mitigationStrategy: readonly string[];
  readonly userNotificationRequired: boolean;
  readonly rollbackRecommended: boolean;
  readonly dataRecoveryPossible: boolean;
}

// SQLite Service Configuration
export interface SQLiteServiceConfig {
  readonly databaseName: string;
  readonly version: number;
  readonly securityConfig: SQLiteSecurityConfig;
  readonly analyticsEnabled: boolean;
  readonly performanceMonitoring: boolean;
  readonly automaticOptimization: boolean;
  readonly migrationStrategy: 'aggressive' | 'conservative' | 'user_controlled';
}

// Type Guards for Runtime Validation
export const isSQLiteAssessmentRecord = (data: unknown): data is SQLiteAssessmentRecord => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'sqlite_id' in data &&
    'migration_timestamp' in data &&
    'integrity_hash' in data &&
    'clinical_priority' in data &&
    'temporal_index' in data &&
    'pattern_flags' in data &&
    'analytics_metadata' in data
  );
};

export const isSQLiteMigrationState = (state: unknown): state is SQLiteMigrationState => {
  return (
    typeof state === 'object' &&
    state !== null &&
    typeof (state as any).isMigrationRequired === 'boolean' &&
    typeof (state as any).sqliteInitialized === 'boolean' &&
    typeof (state as any).encryptionStatus === 'string' &&
    typeof (state as any).clinicalDataMigrated === 'boolean'
  );
};

// SQLite Constants
export const SQLITE_CONSTANTS = {
  ENCRYPTION: {
    ALGORITHM: 'AES-256-GCM' as const,
    KEY_DERIVATION_ITERATIONS: 100000,
    SALT_LENGTH: 32, // bytes
    KEY_ROTATION_INTERVAL_DAYS: 90,
  },
  PERFORMANCE: {
    DEFAULT_CACHE_SIZE_KB: 8192, // 8MB
    MAX_QUERY_TIME_MS: 1000,
    OPTIMIZATION_INTERVAL_DAYS: 7,
    INDEX_REBUILD_THRESHOLD: 0.1, // 10% fragmentation
  },
  MIGRATION: {
    DEFAULT_BATCH_SIZE: 50,
    MAX_MIGRATION_TIME_MS: 300000, // 5 minutes
    BACKUP_RETENTION_DAYS: 30,
    ROLLBACK_TIMEOUT_MS: 60000, // 1 minute
  },
  CLINICAL: {
    CRISIS_DATA_ACCESS_MAX_MS: 200,
    ASSESSMENT_QUERY_MAX_MS: 500,
    THERAPEUTIC_PROGRESS_CACHE_HOURS: 4,
  }
} as const;

// Export utility types
export type SQLiteConfigKeys = keyof SQLiteServiceConfig;
export type SQLiteErrorCodes = keyof typeof SQLiteMigrationError;
export type AnalyticsQueryType = keyof Omit<SQLiteQueryBuilder, 'buildClinicalIndex' | 'optimizeForAnalytics' | 'validateDataIntegrity'>;