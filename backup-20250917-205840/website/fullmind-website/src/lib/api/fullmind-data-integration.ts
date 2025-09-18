/**
 * FullMind Data Integration Layer - Export Service Integration
 * 
 * Seamless integration with FullMind's existing data infrastructure including
 * AsyncStorage, Zustand stores, SecureDataStore, and therapeutic workflow patterns.
 * 
 * Integration Features:
 * - Native AsyncStorage clinical data retrieval with encryption support
 * - Zustand store state synchronization for real-time export data
 * - SecureDataStore integration for sensitive therapeutic information
 * - Assessment service integration for PHQ-9/GAD-7 clinical accuracy
 * - MBCT practice data pipeline with therapeutic context preservation
 * - Crisis data handling with appropriate privacy and safety controls
 */

import type {
  ExportDataPackage,
  ClinicalExportData,
  UserID,
  ExportTimeRange,
  UserConsentRecord,
  PrivacyConfiguration,
  ISO8601Timestamp,
} from '../../types/clinical-export';

import type {
  AssessmentResult,
  MoodTracking,
  TherapeuticOutcome,
  ClinicalReport,
  PHQ9Question,
  GAD7Question,
  CrisisAssessment,
  SafetyPlan,
  MBCTModule,
  MBCTPractice,
  BreathingExercise,
} from '../../types/healthcare';

// ============================================================================
// FULLMIND STORAGE INTEGRATION INTERFACES
// ============================================================================

/**
 * AsyncStorage integration service for clinical data retrieval
 */
export interface AsyncStorageIntegrationService {
  // Assessment data retrieval
  getStoredAssessments(userId: UserID, timeRange?: ExportTimeRange): Promise<StoredAssessmentResult>;
  getStoredPHQ9Responses(userId: UserID, timeRange?: ExportTimeRange): Promise<StoredPHQ9Result>;
  getStoredGAD7Responses(userId: UserID, timeRange?: ExportTimeRange): Promise<StoredGAD7Result>;
  getAssessmentHistory(userId: UserID, assessmentType?: AssessmentType): Promise<AssessmentHistoryResult>;
  
  // Mood tracking data
  getStoredMoodData(userId: UserID, timeRange?: ExportTimeRange): Promise<StoredMoodDataResult>;
  getMoodTrackingTimeline(userId: UserID, granularity: TimeGranularity): Promise<MoodTimelineResult>;
  getCheckInResponses(userId: UserID, timeRange?: ExportTimeRange): Promise<CheckInResponseResult>;
  
  // MBCT session data
  getStoredSessionData(userId: UserID, timeRange?: ExportTimeRange): Promise<StoredSessionDataResult>;
  getPracticeEngagementData(userId: UserID): Promise<PracticeEngagementResult>;
  getBreathingSessionData(userId: UserID, timeRange?: ExportTimeRange): Promise<BreathingSessionResult>;
  getMeditationSessionData(userId: UserID, timeRange?: ExportTimeRange): Promise<MeditationSessionResult>;
  
  // Progress tracking data
  getTherapeuticProgress(userId: UserID): Promise<TherapeuticProgressResult>;
  getMilestoneAchievements(userId: UserID): Promise<MilestoneAchievementResult>;
  getGoalTrackingData(userId: UserID): Promise<GoalTrackingResult>;
  
  // Data validation and integrity
  validateStoredDataIntegrity(userId: UserID): Promise<DataIntegrityValidation>;
  repairCorruptedData(userId: UserID, corruption: DataCorruption): Promise<DataRepairResult>;
  optimizeStorageStructure(userId: UserID): Promise<StorageOptimizationResult>;
}

/**
 * Zustand store integration for real-time data synchronization
 */
export interface ZustandStoreIntegration {
  // User state integration
  getCurrentUserState(userId: UserID): Promise<UserStateSnapshot>;
  getAssessmentState(userId: UserID): Promise<AssessmentStateSnapshot>;
  getMoodTrackingState(userId: UserID): Promise<MoodTrackingStateSnapshot>;
  getSessionState(userId: UserID): Promise<SessionStateSnapshot>;
  
  // Progress state integration
  getProgressTrackingState(userId: UserID): Promise<ProgressStateSnapshot>;
  getTherapeuticGoalState(userId: UserID): Promise<GoalStateSnapshot>;
  getMilestoneState(userId: UserID): Promise<MilestoneStateSnapshot>;
  
  // Real-time synchronization
  syncStateForExport(userId: UserID): Promise<StateSyncResult>;
  freezeStateSnapshot(userId: UserID): Promise<FrozenStateSnapshot>;
  validateStateConsistency(userId: UserID): Promise<StateConsistencyResult>;
  
  // Store performance optimization
  optimizeStoreForExport(userId: UserID): Promise<StoreOptimizationResult>;
  preloadExportData(userId: UserID, categories: readonly DataCategory[]): Promise<PreloadResult>;
  cacheFrequentQueries(userId: UserID): Promise<QueryCacheResult>;
}

/**
 * SecureDataStore integration for sensitive information
 */
export interface SecureDataStoreIntegration {
  // Encrypted assessment data
  getSecureAssessmentData(userId: UserID, decryptionKey: string): Promise<SecureAssessmentResult>;
  getEncryptedCrisisData(userId: UserID, accessLevel: AccessLevel): Promise<SecureCrisisResult>;
  getSecureConsentRecords(userId: UserID): Promise<SecureConsentResult>;
  
  // Sensitive therapeutic data
  getEncryptedTherapeuticNotes(userId: UserID, accessLevel: AccessLevel): Promise<SecureNotesResult>;
  getSecureSafetyPlan(userId: UserID): Promise<SecureSafetyPlanResult>;
  getEncryptedRiskAssessments(userId: UserID): Promise<SecureRiskAssessmentResult>;
  
  // Data security operations
  validateSecurityIntegrity(userId: UserID): Promise<SecurityIntegrityResult>;
  rotateEncryptionKeys(userId: UserID): Promise<KeyRotationResult>;
  auditSecureAccess(userId: UserID, operation: SecureOperation): Promise<SecurityAuditResult>;
  
  // Export-specific security
  generateExportDecryptionKey(userId: UserID, exportId: string): Promise<DecryptionKeyResult>;
  encryptExportData(data: ClinicalExportData, encryptionConfig: EncryptionConfig): Promise<EncryptedExportResult>;
  validateExportSecurity(exportData: EncryptedExportData): Promise<ExportSecurityValidation>;
}

// ============================================================================
// CLINICAL DATA PIPELINE INTEGRATION
// ============================================================================

/**
 * Assessment service integration for clinical accuracy
 */
export interface AssessmentServiceIntegration {
  // PHQ-9 integration
  getPHQ9Results(userId: UserID, timeRange?: ExportTimeRange): Promise<PHQ9ResultSet>;
  validatePHQ9Scoring(responses: readonly PHQ9Response[]): Promise<PHQ9ValidationResult>;
  calculatePHQ9Trends(results: readonly PHQ9Result[]): Promise<PHQ9TrendAnalysis>;
  detectPHQ9CrisisThresholds(results: readonly PHQ9Result[]): Promise<CrisisDetectionResult>;
  
  // GAD-7 integration
  getGAD7Results(userId: UserID, timeRange?: ExportTimeRange): Promise<GAD7ResultSet>;
  validateGAD7Scoring(responses: readonly GAD7Response[]): Promise<GAD7ValidationResult>;
  calculateGAD7Trends(results: readonly GAD7Result[]): Promise<GAD7TrendAnalysis>;
  detectGAD7CrisisThresholds(results: readonly GAD7Result[]): Promise<CrisisDetectionResult>;
  
  // Combined assessment analysis
  performCombinedAssessmentAnalysis(phq9: PHQ9ResultSet, gad7: GAD7ResultSet): Promise<CombinedAssessmentAnalysis>;
  calculateComorbidityRisk(combined: CombinedAssessmentAnalysis): Promise<ComorbidityRiskAssessment>;
  generateClinicalRecommendations(analysis: CombinedAssessmentAnalysis): Promise<readonly ClinicalRecommendation[]>;
  
  // Assessment export preparation
  prepareAssessmentDataForExport(userId: UserID, privacy: PrivacyConfiguration): Promise<ExportReadyAssessmentData>;
  validateAssessmentExportAccuracy(data: ExportReadyAssessmentData): Promise<AssessmentExportValidation>;
  formatAssessmentDataForExport(data: ExportReadyAssessmentData, format: ExportFormat): Promise<FormattedAssessmentData>;
}

/**
 * MBCT practice integration service
 */
export interface MBCTPracticeIntegration {
  // Practice session integration
  getPracticeSessionHistory(userId: UserID, timeRange?: ExportTimeRange): Promise<PracticeSessionHistoryResult>;
  getBreathingExerciseData(userId: UserID, timeRange?: ExportTimeRange): Promise<BreathingExerciseDataResult>;
  getMeditationSessionData(userId: UserID, timeRange?: ExportTimeRange): Promise<MeditationSessionDataResult>;
  getBodyScanSessionData(userId: UserID, timeRange?: ExportTimeRange): Promise<BodyScanSessionDataResult>;
  
  // Practice engagement analysis
  calculatePracticeConsistency(userId: UserID): Promise<PracticeConsistencyAnalysis>;
  assessSkillDevelopment(userId: UserID): Promise<SkillDevelopmentAssessment>;
  trackTherapeuticOutcomes(userId: UserID): Promise<TherapeuticOutcomeTracking>;
  measureMBCTCompliance(userId: UserID): Promise<MBCTComplianceMetrics>;
  
  // Practice effectiveness measurement
  correlateWithAssessmentScores(userId: UserID): Promise<PracticeAssessmentCorrelation>;
  measureProgressiveImprovement(userId: UserID): Promise<ProgressiveImprovementAnalysis>;
  identifyOptimalPractices(userId: UserID): Promise<OptimalPracticeIdentification>;
  
  // Export preparation
  prepareMBCTDataForExport(userId: UserID, privacy: PrivacyConfiguration): Promise<ExportReadyMBCTData>;
  validateMBCTExportCompliance(data: ExportReadyMBCTData): Promise<MBCTExportValidation>;
  formatMBCTDataForExport(data: ExportReadyMBCTData, format: ExportFormat): Promise<FormattedMBCTData>;
}

/**
 * Crisis data integration with privacy controls
 */
export interface CrisisDataIntegration {
  // Crisis assessment data (with strict privacy controls)
  getCrisisAssessmentHistory(userId: UserID, accessLevel: AccessLevel): Promise<CrisisAssessmentHistoryResult>;
  getSafetyPlanData(userId: UserID, accessLevel: AccessLevel): Promise<SafetyPlanDataResult>;
  getRiskFactorHistory(userId: UserID, accessLevel: AccessLevel): Promise<RiskFactorHistoryResult>;
  getInterventionHistory(userId: UserID, accessLevel: AccessLevel): Promise<InterventionHistoryResult>;
  
  // Crisis data sanitization for export
  sanitizeCrisisDataForExport(data: CrisisData, exportPurpose: ExportPurpose): Promise<SanitizedCrisisData>;
  applyCrisisPrivacyFilters(data: CrisisData, consent: UserConsentRecord): Promise<FilteredCrisisData>;
  validateCrisisDataExportSafety(data: FilteredCrisisData): Promise<CrisisExportSafetyValidation>;
  
  // Emergency contact integration
  getEmergencyContactData(userId: UserID, accessLevel: AccessLevel): Promise<EmergencyContactDataResult>;
  validateEmergencyContactPrivacy(data: EmergencyContactData, export: ExportContext): Promise<ContactPrivacyValidation>;
  
  // Crisis export preparation
  prepareCrisisDataForExport(userId: UserID, privacy: PrivacyConfiguration, purpose: ExportPurpose): Promise<ExportReadyCrisisData>;
  validateCrisisExportCompliance(data: ExportReadyCrisisData): Promise<CrisisExportValidation>;
}

// ============================================================================
// DATA SYNCHRONIZATION & CONSISTENCY
// ============================================================================

/**
 * Data synchronization service for export consistency
 */
export interface ExportDataSynchronizationService {
  // Cross-store synchronization
  synchronizeAcrossStores(userId: UserID): Promise<CrossStoreSyncResult>;
  reconcileDataInconsistencies(userId: UserID, inconsistencies: readonly DataInconsistency[]): Promise<ReconciliationResult>;
  validateDataConsistency(userId: UserID): Promise<DataConsistencyValidation>;
  
  // Real-time data capture for export
  captureRealTimeSnapshot(userId: UserID): Promise<RealTimeDataSnapshot>;
  freezeDataForExport(userId: UserID, exportId: string): Promise<FrozenDataSnapshot>;
  validateSnapshotIntegrity(snapshot: FrozenDataSnapshot): Promise<SnapshotIntegrityValidation>;
  
  // Incremental data updates
  trackIncrementalChanges(userId: UserID, since: ISO8601Timestamp): Promise<IncrementalChangesResult>;
  applyIncrementalUpdates(baseData: ExportDataPackage, updates: IncrementalChanges): Promise<UpdatedExportData>;
  validateIncrementalConsistency(updates: IncrementalChanges): Promise<IncrementalValidationResult>;
  
  // Data conflict resolution
  detectDataConflicts(userId: UserID): Promise<DataConflictDetectionResult>;
  resolveDataConflicts(conflicts: readonly DataConflict[]): Promise<ConflictResolutionResult>;
  auditConflictResolution(resolution: ConflictResolutionResult): Promise<ResolutionAuditResult>;
}

/**
 * Performance optimization for FullMind integration
 */
export interface FullMindPerformanceOptimizer {
  // Storage access optimization
  optimizeAsyncStorageQueries(userId: UserID, queries: readonly StorageQuery[]): Promise<QueryOptimizationResult>;
  batchStorageOperations(operations: readonly StorageOperation[]): Promise<BatchOperationResult>;
  cacheFrequentlyAccessedData(userId: UserID): Promise<DataCacheResult>;
  
  // State management optimization
  optimizeZustandStoreAccess(userId: UserID): Promise<StoreOptimizationResult>;
  preloadExportRelevantState(userId: UserID, exportCategories: readonly DataCategory[]): Promise<StatePreloadResult>;
  minimizeStateRecomputations(userId: UserID): Promise<RecomputationOptimizationResult>;
  
  // Security operation optimization
  optimizeSecureDataAccess(userId: UserID): Promise<SecureAccessOptimizationResult>;
  batchDecryptionOperations(operations: readonly DecryptionOperation[]): Promise<BatchDecryptionResult>;
  cacheDecryptedData(userId: UserID, cacheConfig: SecureCacheConfig): Promise<SecureCacheResult>;
  
  // Memory and resource management
  monitorExportMemoryUsage(exportOperation: ExportOperation): Promise<MemoryUsageMonitoring>;
  optimizeResourceAllocation(exportOperation: ExportOperation): Promise<ResourceOptimizationResult>;
  implementGarbageCollectionStrategy(exportOperation: ExportOperation): Promise<GCOptimizationResult>;
}

// ============================================================================
// RESULT & DATA TYPES
// ============================================================================

export interface StoredAssessmentResult {
  readonly assessments: readonly StoredAssessment[];
  readonly metadata: AssessmentStorageMetadata;
  readonly integrity: StorageIntegrityStatus;
  readonly lastUpdated: ISO8601Timestamp;
}

export interface StoredAssessment {
  readonly id: string;
  readonly userId: UserID;
  readonly type: AssessmentType;
  readonly responses: readonly AssessmentResponse[];
  readonly score: number;
  readonly severity: SeverityLevel;
  readonly completedAt: ISO8601Timestamp;
  readonly storageMetadata: AssessmentStorageInfo;
}

export interface StoredMoodDataResult {
  readonly moodEntries: readonly StoredMoodEntry[];
  readonly checkIns: readonly StoredCheckIn[];
  readonly trends: MoodTrendData;
  readonly metadata: MoodDataStorageMetadata;
}

export interface StoredMoodEntry {
  readonly id: string;
  readonly userId: UserID;
  readonly timestamp: ISO8601Timestamp;
  readonly mood: MoodData;
  readonly context: MoodContext;
  readonly notes?: string;
  readonly storageMetadata: MoodStorageInfo;
}

export interface StoredSessionDataResult {
  readonly sessions: readonly StoredTherapeuticSession[];
  readonly practices: readonly StoredPracticeSession[];
  readonly engagement: SessionEngagementData;
  readonly metadata: SessionStorageMetadata;
}

export interface StoredTherapeuticSession {
  readonly id: string;
  readonly userId: UserID;
  readonly sessionType: SessionType;
  readonly startTime: ISO8601Timestamp;
  readonly duration: number;
  readonly completion: SessionCompletion;
  readonly effectiveness: SessionEffectiveness;
  readonly storageMetadata: SessionStorageInfo;
}

export interface UserStateSnapshot {
  readonly userId: UserID;
  readonly snapshotTime: ISO8601Timestamp;
  readonly currentAssessmentState: AssessmentState;
  readonly currentMoodState: MoodState;
  readonly currentSessionState: SessionState;
  readonly currentProgressState: ProgressState;
  readonly stateMetadata: StateSnapshotMetadata;
}

export interface SecureAssessmentResult {
  readonly encryptedData: EncryptedAssessmentData;
  readonly accessMetadata: SecureAccessMetadata;
  readonly decryptionHints: DecryptionHints;
  readonly securityLevel: SecurityLevel;
}

export interface PracticeSessionHistoryResult {
  readonly sessions: readonly PracticeSession[];
  readonly engagementMetrics: PracticeEngagementMetrics;
  readonly skillProgression: SkillProgressionData;
  readonly therapeuticOutcomes: readonly TherapeuticOutcome[];
}

export interface CrisisAssessmentHistoryResult {
  readonly assessments: readonly SanitizedCrisisAssessment[];
  readonly riskTrends: RiskTrendData;
  readonly interventions: readonly CrisisIntervention[];
  readonly privacyLevel: PrivacyLevel;
}

// ============================================================================
// INTEGRATION CONFIGURATION TYPES
// ============================================================================

export interface FullMindIntegrationConfig {
  readonly asyncStorage: AsyncStorageConfig;
  readonly zustandStore: ZustandStoreConfig;
  readonly secureDataStore: SecureDataStoreConfig;
  readonly performance: PerformanceConfig;
  readonly privacy: PrivacyConfig;
  readonly synchronization: SyncConfig;
}

export interface AsyncStorageConfig {
  readonly encryptionEnabled: boolean;
  readonly compressionEnabled: boolean;
  readonly batchSize: number;
  readonly retryAttempts: number;
  readonly cacheStrategy: CacheStrategy;
}

export interface ZustandStoreConfig {
  readonly snapshotFrequency: number;
  readonly stateValidation: boolean;
  readonly performanceMonitoring: boolean;
  readonly memoryOptimization: boolean;
}

export interface SecureDataStoreConfig {
  readonly encryptionAlgorithm: string;
  readonly keyRotationFrequency: number;
  readonly accessLogging: boolean;
  readonly integrityChecks: boolean;
  readonly auditTrail: boolean;
}

// ============================================================================
// UTILITY TYPES & HELPERS
// ============================================================================

export type AssessmentType = 'PHQ9' | 'GAD7' | 'custom' | 'composite';
export type SessionType = 'breathing' | 'meditation' | 'body-scan' | 'mindful-movement' | 'formal-practice' | 'informal-practice';
export type SeverityLevel = 'minimal' | 'mild' | 'moderate' | 'moderately-severe' | 'severe';
export type AccessLevel = 'basic' | 'standard' | 'elevated' | 'maximum';
export type SecurityLevel = 'standard' | 'enhanced' | 'maximum';
export type PrivacyLevel = 'public' | 'limited' | 'private' | 'confidential';
export type TimeGranularity = 'hour' | 'day' | 'week' | 'month';
export type CacheStrategy = 'none' | 'memory' | 'persistent' | 'hybrid';
export type ExportPurpose = 'therapeutic-sharing' | 'personal-records' | 'clinical-consultation' | 'research-participation';

export interface DataCategory {
  readonly name: string;
  readonly sensitivity: SensitivityLevel;
  readonly requiredConsent: ConsentLevel;
  readonly storageLocation: StorageLocation;
}

export type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical';
export type ConsentLevel = 'none' | 'basic' | 'explicit' | 'enhanced';
export type StorageLocation = 'async-storage' | 'zustand-store' | 'secure-data-store' | 'hybrid';

// ============================================================================
// CONSTANTS & DEFAULTS
// ============================================================================

export const FULLMIND_INTEGRATION_CONSTANTS = {
  // Storage limits and performance
  MAX_ASYNC_STORAGE_BATCH_SIZE: 1_000,
  MAX_ZUSTAND_SNAPSHOT_SIZE_MB: 10,
  MAX_SECURE_DATA_OPERATION_TIME_MS: 5_000,
  
  // Data consistency
  SYNC_TIMEOUT_MS: 30_000,
  CONSISTENCY_CHECK_INTERVAL_MS: 60_000,
  MAX_CONFLICT_RESOLUTION_ATTEMPTS: 3,
  
  // Security and privacy
  DEFAULT_ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  KEY_ROTATION_INTERVAL_DAYS: 90,
  ACCESS_LOG_RETENTION_DAYS: 365,
  
  // Performance optimization
  CACHE_TTL_MINUTES: 30,
  PRELOAD_TIMEOUT_MS: 10_000,
  MEMORY_THRESHOLD_MB: 128,
  
  // Clinical accuracy
  ASSESSMENT_PRECISION_DIGITS: 3,
  TREND_CALCULATION_PRECISION: 2,
  CRISIS_THRESHOLD_TOLERANCE: 0.001,
  
  // Export preparation
  SNAPSHOT_VALIDITY_HOURS: 2,
  EXPORT_DATA_FRESHNESS_MINUTES: 15,
  CROSS_STORE_SYNC_TIMEOUT_MS: 45_000,
} as const;

/**
 * Default configuration for FullMind integration
 */
export const DEFAULT_FULLMIND_INTEGRATION_CONFIG: FullMindIntegrationConfig = {
  asyncStorage: {
    encryptionEnabled: true,
    compressionEnabled: true,
    batchSize: FULLMIND_INTEGRATION_CONSTANTS.MAX_ASYNC_STORAGE_BATCH_SIZE,
    retryAttempts: 3,
    cacheStrategy: 'hybrid',
  },
  zustandStore: {
    snapshotFrequency: 5_000, // 5 seconds
    stateValidation: true,
    performanceMonitoring: true,
    memoryOptimization: true,
  },
  secureDataStore: {
    encryptionAlgorithm: FULLMIND_INTEGRATION_CONSTANTS.DEFAULT_ENCRYPTION_ALGORITHM,
    keyRotationFrequency: FULLMIND_INTEGRATION_CONSTANTS.KEY_ROTATION_INTERVAL_DAYS,
    accessLogging: true,
    integrityChecks: true,
    auditTrail: true,
  },
  performance: {
    cacheEnabled: true,
    cacheTTL: FULLMIND_INTEGRATION_CONSTANTS.CACHE_TTL_MINUTES * 60 * 1000,
    memoryThreshold: FULLMIND_INTEGRATION_CONSTANTS.MEMORY_THRESHOLD_MB * 1024 * 1024,
    concurrentOperations: 4,
  },
  privacy: {
    strictMode: true,
    auditAllAccess: true,
    anonymizeByDefault: false,
    consentValidation: true,
  },
  synchronization: {
    autoSync: true,
    syncInterval: FULLMIND_INTEGRATION_CONSTANTS.CONSISTENCY_CHECK_INTERVAL_MS,
    conflictResolution: 'user-guided',
    crossStoreValidation: true,
  },
} as const;