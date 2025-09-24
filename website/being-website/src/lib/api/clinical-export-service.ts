/**
 * Being. Clinical Export Service API - Implementation Architecture
 * 
 * Comprehensive API service for clinical-grade export functionality supporting
 * PDF/CSV generation with therapeutic data accuracy and HIPAA-ready compliance.
 * 
 * Core Implementation Principles:
 * - Type-safe clinical data processing with zero tolerance for corruption
 * - Performance-optimized streaming for large therapeutic datasets
 * - HIPAA-aware privacy controls with granular consent management
 * - Resilient error handling with clinical safety as priority
 * - Seamless integration with existing Being. data infrastructure
 */

import type {
  ExportDataPackage,
  ClinicalExportData,
  ExportFormat,
  ExportValidationResult,
  UserConsentRecord,
  PrivacyConfiguration,
  ClinicalExportContext,
  ExportID,
  UserID,
  ExportMetadata,
  PerformanceRequirements,
  ExportError,
  ISO8601Timestamp,
  ValidatedExportPackage,
  ClinicalAccuracyValidation,
  DataIntegrityValidation,
  PrivacyComplianceValidation,
} from '../../types/clinical-export';

import type {
  AssessmentResult,
  MoodTracking,
  TherapeuticOutcome,
  ClinicalReport,
  HIPAACompliance,
} from '../../types/healthcare';

import type {
  APIResponse,
  RequestConfig,
} from '../../types/api';

// ============================================================================
// EXPORT SERVICE API INTERFACES
// ============================================================================

/**
 * Primary export service interface with clinical validation
 */
export interface ClinicalExportService {
  // Core export operations
  generateExport(options: ExportRequestOptions): Promise<ExportOperationResult>;
  previewExportData(options: ExportPreviewOptions): Promise<ExportPreviewResult>;
  validateExportRequest(options: ExportValidationOptions): Promise<ExportValidationResult>;
  
  // Export status and management
  getExportStatus(exportId: ExportID): Promise<ExportStatusResult>;
  cancelExport(exportId: ExportID): Promise<ExportCancellationResult>;
  getExportHistory(userId: UserID, options?: ExportHistoryOptions): Promise<ExportHistoryResult>;
  
  // Export retrieval and access
  downloadExport(exportId: ExportID, accessToken: string): Promise<ExportDownloadResult>;
  getExportMetadata(exportId: ExportID): Promise<ExportMetadataResult>;
  verifyExportIntegrity(exportId: ExportID): Promise<ExportIntegrityResult>;
  
  // Capability and configuration
  getExportCapabilities(userId?: UserID): Promise<ExportCapabilitiesResult>;
  getFormatCapabilities(format: ExportFormat['type']): Promise<FormatCapabilitiesResult>;
}

/**
 * Clinical data API for therapeutic data retrieval and formatting
 */
export interface ClinicalDataAPI {
  // Assessment data retrieval
  getAssessmentData(request: AssessmentDataRequest): Promise<AssessmentDataResult>;
  getAssessmentTrends(request: AssessmentTrendRequest): Promise<AssessmentTrendResult>;
  validateAssessmentAccuracy(data: AssessmentResult[]): Promise<AssessmentValidationResult>;
  
  // MBCT progress data
  getMBCTProgressData(request: MBCTProgressRequest): Promise<MBCTProgressResult>;
  getPracticeEngagement(request: PracticeEngagementRequest): Promise<PracticeEngagementResult>;
  getTherapeuticOutcomes(request: TherapeuticOutcomeRequest): Promise<TherapeuticOutcomeResult>;
  
  // Mood and session data
  getMoodTrackingData(request: MoodTrackingRequest): Promise<MoodTrackingResult>;
  getSessionSummaries(request: SessionSummaryRequest): Promise<SessionSummaryResult>;
  getCheckInData(request: CheckInDataRequest): Promise<CheckInDataResult>;
  
  // Crisis and safety data (with privacy controls)
  getCrisisDataForExport(request: CrisisDataRequest): Promise<CrisisDataResult>;
  getSafetyPlanData(request: SafetyPlanRequest): Promise<SafetyPlanResult>;
  getRiskAssessmentHistory(request: RiskAssessmentRequest): Promise<RiskAssessmentResult>;
  
  // Aggregated clinical metrics
  getAggregatedMetrics(request: AggregatedMetricsRequest): Promise<AggregatedMetricsResult>;
  getClinicalSummary(request: ClinicalSummaryRequest): Promise<ClinicalSummaryResult>;
  getProgressMilestones(request: ProgressMilestonesRequest): Promise<ProgressMilestonesResult>;
}

/**
 * Format-specific export generation API
 */
export interface ExportGenerationAPI {
  // PDF generation
  generatePDFReport(data: ClinicalExportData, config: PDFExportConfig): Promise<PDFGenerationResult>;
  generateProgressReport(data: ProgressReportData, config: PDFReportConfig): Promise<PDFGenerationResult>;
  generateAssessmentCharts(data: AssessmentChartData, config: ChartConfig): Promise<ChartGenerationResult>;
  
  // CSV generation
  generateCSVExport(data: ClinicalExportData, config: CSVExportConfig): Promise<CSVGenerationResult>;
  generateTimeSeriesCSV(data: TimeSeriesData, config: TimeSeriesConfig): Promise<CSVGenerationResult>;
  generateResearchDataCSV(data: ResearchExportData, config: ResearchDataConfig): Promise<CSVGenerationResult>;
  
  // JSON export
  generateJSONExport(data: ClinicalExportData, config: JSONExportConfig): Promise<JSONGenerationResult>;
  generateStructuredData(data: ClinicalExportData, schema: ExportSchema): Promise<StructuredDataResult>;
  
  // Format validation and quality assurance
  validateGeneratedExport(exportData: ExportFileData, format: ExportFormat): Promise<FormatValidationResult>;
  optimizeExportSize(exportData: ExportFileData, constraints: SizeConstraints): Promise<OptimizationResult>;
}

// ============================================================================
// REQUEST & RESPONSE TYPES
// ============================================================================

/**
 * Export request options with clinical context
 */
export interface ExportRequestOptions {
  readonly userId: UserID;
  readonly format: ExportFormat;
  readonly dataCategories: readonly DataCategory[];
  readonly timeRange: ExportTimeRange;
  readonly consent: UserConsentRecord;
  readonly privacy: PrivacyConfiguration;
  readonly clinicalContext?: ClinicalExportContext;
  readonly performance?: PerformanceRequirements;
  readonly customization?: ExportCustomizationOptions;
}

/**
 * Export operation result with tracking
 */
export interface ExportOperationResult extends APIResponse<ExportOperationData> {
  readonly data: ExportOperationData;
}

export interface ExportOperationData {
  readonly exportId: ExportID;
  readonly status: ExportStatus;
  readonly estimatedCompletion: ISO8601Timestamp;
  readonly progress: ExportProgress;
  readonly validationResults: ExportValidationResult;
  readonly downloadToken?: string;
  readonly metadata: ExportMetadata;
}

/**
 * Export preview options and results
 */
export interface ExportPreviewOptions {
  readonly userId: UserID;
  readonly dataCategories: readonly DataCategory[];
  readonly timeRange: ExportTimeRange;
  readonly consent: UserConsentRecord;
  readonly privacy: PrivacyConfiguration;
  readonly sampleSize?: number;
}

export interface ExportPreviewResult extends APIResponse<ExportPreviewData> {
  readonly data: ExportPreviewData;
}

export interface ExportPreviewData {
  readonly dataStructure: DataStructurePreview;
  readonly recordCounts: RecordCountSummary;
  readonly estimatedSize: SizeEstimate;
  readonly privacyFiltering: PrivacyFilteringSummary;
  readonly qualityAssessment: DataQualityAssessment;
  readonly sampleData: SampleDataPreview;
}

/**
 * Clinical data request types
 */
export interface AssessmentDataRequest {
  readonly userId: UserID;
  readonly timeRange: ExportTimeRange;
  readonly assessmentTypes?: readonly AssessmentType[];
  readonly includeScores: boolean;
  readonly includeTrends: boolean;
  readonly includeInterpretation: boolean;
  readonly privacy: PrivacyConfiguration;
}

export interface AssessmentDataResult extends APIResponse<ClinicalAssessmentData> {
  readonly data: ClinicalAssessmentData;
}

export interface ClinicalAssessmentData {
  readonly assessments: readonly EnhancedAssessmentResult[];
  readonly trends: readonly AssessmentTrend[];
  readonly aggregatedScores: AssessmentScoreSummary;
  readonly clinicalInterpretation: ClinicalInterpretationSummary;
  readonly riskIndicators: readonly RiskIndicator[];
  readonly qualityMetrics: AssessmentQualityMetrics;
}

export interface MBCTProgressRequest {
  readonly userId: UserID;
  readonly timeRange: ExportTimeRange;
  readonly includeSessionDetails: boolean;
  readonly includePracticeMetrics: boolean;
  readonly includeOutcomes: boolean;
  readonly privacy: PrivacyConfiguration;
}

export interface MBCTProgressResult extends APIResponse<MBCTProgressData> {
  readonly data: MBCTProgressData;
}

export interface MBCTProgressData {
  readonly sessions: readonly TherapeuticSession[];
  readonly practiceEngagement: PracticeEngagementMetrics;
  readonly skillDevelopment: SkillDevelopmentTracking;
  readonly therapeuticOutcomes: readonly TherapeuticOutcome[];
  readonly progressMilestones: readonly ProgressMilestone[];
  readonly mbctCompliance: MBCTComplianceMetrics;
}

// ============================================================================
// DATA PROCESSING PIPELINE INTERFACES
// ============================================================================

/**
 * Export data processing pipeline with clinical safety
 */
export interface ExportDataPipeline {
  // Data collection phase
  collectClinicalData(request: DataCollectionRequest): Promise<RawClinicalDataset>;
  validateSourceData(dataset: RawClinicalDataset): Promise<DataValidationResult>;
  
  // Privacy and consent filtering
  applyPrivacyFilters(dataset: RawClinicalDataset, privacy: PrivacyConfiguration): Promise<FilteredDataset>;
  validateConsentCompliance(dataset: FilteredDataset, consent: UserConsentRecord): Promise<ConsentValidationResult>;
  
  // Clinical data transformation
  transformClinicalData(dataset: FilteredDataset, format: ExportFormat): Promise<TransformedDataset>;
  validateClinicalAccuracy(dataset: TransformedDataset): Promise<ClinicalAccuracyValidation>;
  
  // Format-specific generation
  generateExportFile(dataset: TransformedDataset, format: ExportFormat): Promise<ExportFileData>;
  validateExportIntegrity(exportFile: ExportFileData): Promise<IntegrityValidationResult>;
  
  // Security and encryption
  applySecurityMeasures(exportFile: ExportFileData, security: SecurityConfiguration): Promise<SecureExportFile>;
  generateAccessToken(exportFile: SecureExportFile, permissions: AccessPermissions): Promise<AccessTokenResult>;
}

/**
 * Streaming data processor for large datasets
 */
export interface StreamingDataProcessor {
  // Streaming operations
  createDataStream(request: StreamingRequest): Promise<ClinicalDataStream>;
  processDataChunks(stream: ClinicalDataStream, processor: ChunkProcessor): Promise<ProcessingResult>;
  aggregateStreamResults(results: readonly ProcessingResult[]): Promise<AggregatedResult>;
  
  // Memory management
  optimizeMemoryUsage(config: MemoryOptimizationConfig): Promise<OptimizationResult>;
  monitorPerformance(stream: ClinicalDataStream): Promise<PerformanceMonitoringResult>;
  
  // Error handling and recovery
  handleProcessingErrors(errors: readonly ProcessingError[]): Promise<ErrorHandlingResult>;
  recoverFromFailures(failure: ProcessingFailure): Promise<RecoveryResult>;
}

// ============================================================================
// ERROR HANDLING & VALIDATION INTERFACES
// ============================================================================

/**
 * Comprehensive error handling for export operations
 */
export interface ExportErrorHandler {
  // Error classification and handling
  classifyError(error: Error): ExportErrorClassification;
  handleValidationError(error: ValidationError): ValidationErrorHandling;
  handleClinicalError(error: ClinicalError): ClinicalErrorHandling;
  handlePrivacyError(error: PrivacyError): PrivacyErrorHandling;
  
  // Recovery strategies
  determineRecoveryStrategy(error: ExportError): RecoveryStrategy;
  executeRecovery(strategy: RecoveryStrategy): Promise<RecoveryResult>;
  
  // User communication
  generateUserMessage(error: ExportError): UserErrorMessage;
  escalateToSupport(error: CriticalError): Promise<EscalationResult>;
}

/**
 * Clinical validation service for export accuracy
 */
export interface ClinicalValidationService {
  // Assessment validation
  validateAssessmentScores(scores: readonly AssessmentResult[]): Promise<ScoreValidationResult>;
  validateTrendCalculations(trends: readonly AssessmentTrend[]): Promise<TrendValidationResult>;
  validateClinicalInterpretation(interpretation: ClinicalInterpretation): Promise<InterpretationValidationResult>;
  
  // Therapeutic data validation
  validateMBCTCompliance(data: MBCTProgressData): Promise<MBCTValidationResult>;
  validateTherapeuticOutcomes(outcomes: readonly TherapeuticOutcome[]): Promise<OutcomeValidationResult>;
  validateRiskAssessments(assessments: readonly RiskAssessment[]): Promise<RiskValidationResult>;
  
  // Data integrity validation
  validateDataRelationships(dataset: ClinicalExportData): Promise<RelationshipValidationResult>;
  validateTimestampConsistency(dataset: ClinicalExportData): Promise<TimestampValidationResult>;
  validateDataCompleteness(dataset: ClinicalExportData): Promise<CompletenessValidationResult>;
}

// ============================================================================
// PERFORMANCE OPTIMIZATION INTERFACES
// ============================================================================

/**
 * Performance optimization service for large export operations
 */
export interface ExportPerformanceOptimizer {
  // Query optimization
  optimizeDataQueries(request: ExportRequestOptions): Promise<OptimizedQueryPlan>;
  cacheFrequentlyAccessedData(userId: UserID): Promise<CacheResult>;
  precomputeAggregations(userId: UserID, timeRange: ExportTimeRange): Promise<PrecomputationResult>;
  
  // Processing optimization
  parallelizeDataProcessing(dataset: LargeDataset): Promise<ParallelProcessingResult>;
  streamLargeDatasets(dataset: LargeDataset): Promise<StreamingResult>;
  compressExportData(exportData: ExportFileData): Promise<CompressionResult>;
  
  // Resource management
  monitorMemoryUsage(operation: ExportOperation): Promise<MemoryUsageResult>;
  manageConnectionPools(request: DatabaseRequest): Promise<ConnectionPoolResult>;
  optimizeNetworkTransfer(exportFile: ExportFileData): Promise<NetworkOptimizationResult>;
}

/**
 * Caching service for improved export performance
 */
export interface ExportCacheService {
  // Data caching
  cacheAssessmentData(userId: UserID, data: AssessmentData): Promise<CacheResult>;
  cacheMBCTProgress(userId: UserID, progress: MBCTProgressData): Promise<CacheResult>;
  cacheAggregatedMetrics(userId: UserID, metrics: AggregatedMetrics): Promise<CacheResult>;
  
  // Cache management
  invalidateUserCache(userId: UserID): Promise<InvalidationResult>;
  updateCacheOnDataChange(userId: UserID, changeEvent: DataChangeEvent): Promise<UpdateResult>;
  optimizeCacheStorage(config: CacheOptimizationConfig): Promise<OptimizationResult>;
  
  // Cache retrieval
  getCachedData(cacheKey: CacheKey): Promise<CachedDataResult>;
  checkCacheValidity(cacheKey: CacheKey): Promise<CacheValidityResult>;
  refreshExpiredCache(cacheKey: CacheKey): Promise<RefreshResult>;
}

// ============================================================================
// SECURITY & PRIVACY INTERFACES
// ============================================================================

/**
 * Privacy control service for HIPAA-compliant exports
 */
export interface ExportPrivacyService {
  // Consent management
  validateUserConsent(consent: UserConsentRecord, dataCategories: readonly DataCategory[]): Promise<ConsentValidationResult>;
  enforceDataMinimization(dataset: ClinicalExportData, consent: UserConsentRecord): Promise<MinimizedDataset>;
  applyAnonymization(dataset: ClinicalExportData, level: AnonymizationLevel): Promise<AnonymizedDataset>;
  
  // Access control
  generateAccessToken(exportId: ExportID, permissions: AccessPermissions): Promise<AccessTokenResult>;
  validateAccessPermissions(token: string, operation: ExportOperation): Promise<PermissionValidationResult>;
  auditAccessAttempts(userId: UserID, operation: ExportOperation): Promise<AuditResult>;
  
  // Data protection
  encryptExportData(exportData: ExportFileData, encryption: EncryptionConfig): Promise<EncryptedExportResult>;
  sanitizeSensitiveData(dataset: ClinicalExportData, sensitivity: SensitivityLevel): Promise<SanitizedDataset>;
  validatePrivacyCompliance(operation: ExportOperation): Promise<PrivacyComplianceValidation>;
}

/**
 * Audit trail service for compliance tracking
 */
export interface ExportAuditService {
  // Audit logging
  logExportRequest(request: ExportRequestOptions): Promise<AuditLogResult>;
  logDataAccess(userId: UserID, dataAccessed: DataAccessInfo): Promise<AuditLogResult>;
  logPrivacyDecisions(decisions: readonly PrivacyDecision[]): Promise<AuditLogResult>;
  
  // Compliance reporting
  generateComplianceReport(userId: UserID, timeRange: ExportTimeRange): Promise<ComplianceReportResult>;
  trackConsentChanges(userId: UserID): Promise<ConsentChangeTrackingResult>;
  monitorDataUsage(userId: UserID): Promise<DataUsageMonitoringResult>;
  
  // Audit queries
  queryAuditLogs(query: AuditQuery): Promise<AuditQueryResult>;
  detectAnomalousAccess(userId: UserID): Promise<AnomalyDetectionResult>;
  validateAuditIntegrity(timeRange: ExportTimeRange): Promise<AuditIntegrityResult>;
}

// ============================================================================
// INTEGRATION INTERFACES
// ============================================================================

/**
 * Being. data integration service
 */
export interface Being.DataIntegration {
  // AsyncStorage integration
  getStoredAssessments(userId: UserID): Promise<StoredAssessmentResult>;
  getStoredMoodData(userId: UserID): Promise<StoredMoodDataResult>;
  getStoredSessionData(userId: UserID): Promise<StoredSessionDataResult>;
  
  // Zustand store integration
  getCurrentUserState(userId: UserID): Promise<UserStateResult>;
  getProgressState(userId: UserID): Promise<ProgressStateResult>;
  getSessionState(userId: UserID): Promise<SessionStateResult>;
  
  // SecureDataStore integration
  getSecureAssessmentData(userId: UserID): Promise<SecureDataResult>;
  getSecureCrisisData(userId: UserID): Promise<SecureCrisisDataResult>;
  getSecureConsentRecords(userId: UserID): Promise<SecureConsentResult>;
  
  // Data synchronization
  syncDataForExport(userId: UserID): Promise<DataSyncResult>;
  validateDataConsistency(userId: UserID): Promise<ConsistencyValidationResult>;
  resolveDataConflicts(conflicts: readonly DataConflict[]): Promise<ConflictResolutionResult>;
}

/**
 * External system integration for clinical workflows
 */
export interface ClinicalSystemIntegration {
  // Therapist portal integration
  sendExportToTherapist(exportId: ExportID, therapistInfo: TherapistInfo): Promise<TherapistDeliveryResult>;
  notifyTherapistOfNewExport(exportId: ExportID, therapistInfo: TherapistInfo): Promise<NotificationResult>;
  
  // Healthcare system integration
  formatForEHR(exportData: ClinicalExportData, ehrFormat: EHRFormat): Promise<EHRFormattingResult>;
  submitToHealthcareProvider(exportData: FormattedEHRData, provider: HealthcareProvider): Promise<SubmissionResult>;
  
  // Research platform integration
  anonymizeForResearch(exportData: ClinicalExportData, researchConsent: ResearchConsent): Promise<ResearchDataResult>;
  submitToResearchDatabase(researchData: AnonymizedResearchData, study: ResearchStudy): Promise<ResearchSubmissionResult>;
}

// ============================================================================
// IMPLEMENTATION SERVICE TYPES
// ============================================================================

/**
 * Export service factory for creating configured instances
 */
export interface ExportServiceFactory {
  createClinicalExportService(config: ClinicalExportConfig): ClinicalExportService;
  createDataAPI(config: DataAPIConfig): ClinicalDataAPI;
  createGenerationAPI(config: GenerationAPIConfig): ExportGenerationAPI;
  createPrivacyService(config: PrivacyServiceConfig): ExportPrivacyService;
  createPerformanceOptimizer(config: PerformanceOptimizerConfig): ExportPerformanceOptimizer;
}

/**
 * Service configuration types
 */
export interface ClinicalExportConfig {
  readonly validation: ValidationConfig;
  readonly performance: PerformanceConfig;
  readonly privacy: PrivacyConfig;
  readonly security: SecurityConfig;
  readonly clinical: ClinicalConfig;
  readonly audit: AuditConfig;
}

export interface ValidationConfig {
  readonly strictMode: boolean;
  readonly clinicalAccuracyThreshold: number;
  readonly dataIntegrityChecks: boolean;
  readonly privacyValidation: boolean;
  readonly customValidators: readonly CustomValidator[];
}

export interface PerformanceConfig {
  readonly maxProcessingTime: number;
  readonly maxMemoryUsage: number;
  readonly enableCaching: boolean;
  readonly enableStreaming: boolean;
  readonly concurrencyLimit: number;
  readonly optimizationStrategies: readonly OptimizationStrategy[];
}

// ============================================================================
// HELPER TYPES & ENUMS
// ============================================================================

export type ExportStatus = 
  | 'pending'
  | 'processing'
  | 'validation'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DataCategory = 
  | 'assessments'
  | 'mood-tracking'
  | 'session-data'
  | 'clinical-notes'
  | 'risk-assessments'
  | 'therapeutic-plans'
  | 'mbct-progress';

export type AssessmentType = 'PHQ9' | 'GAD7' | 'custom' | 'composite';

export type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical';

export type AnonymizationLevel = 'none' | 'basic' | 'advanced' | 'full';

export interface ExportTimeRange {
  readonly startDate: ISO8601Timestamp;
  readonly endDate: ISO8601Timestamp;
  readonly timezone: string;
  readonly precision: 'day' | 'hour' | 'minute';
}

export interface ExportProgress {
  readonly percentage: number;
  readonly currentStage: string;
  readonly estimatedTimeRemaining: number;
  readonly recordsProcessed: number;
  readonly totalRecords: number;
}

// ============================================================================
// CONSTANTS & DEFAULTS
// ============================================================================

export const CLINICAL_EXPORT_CONSTANTS = {
  // Performance limits
  MAX_EXPORT_RECORDS: 100_000,
  MAX_PROCESSING_TIME_MS: 600_000, // 10 minutes
  MAX_MEMORY_USAGE_MB: 512,
  DEFAULT_CHUNK_SIZE: 1_000,
  
  // Clinical accuracy requirements
  CLINICAL_ACCURACY_THRESHOLD: 0.999, // 99.9%
  ASSESSMENT_SCORE_TOLERANCE: 0.001,
  TREND_CALCULATION_TOLERANCE: 0.01,
  
  // Privacy and security
  DEFAULT_RETENTION_DAYS: 90,
  ACCESS_TOKEN_EXPIRY_HOURS: 24,
  ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  
  // Export formats
  SUPPORTED_PDF_VERSIONS: ['1.4', '1.7', '2.0'] as const,
  SUPPORTED_CSV_ENCODINGS: ['UTF-8', 'UTF-16', 'ASCII'] as const,
  SUPPORTED_JSON_SCHEMAS: ['v1.0', 'v1.1', 'v2.0'] as const,
  
  // API limits
  MAX_CONCURRENT_EXPORTS_PER_USER: 3,
  RATE_LIMIT_REQUESTS_PER_HOUR: 50,
  MAX_PREVIEW_SAMPLE_SIZE: 100,
} as const;

/**
 * Default configuration for production-grade clinical exports
 */
export const DEFAULT_CLINICAL_EXPORT_SERVICE_CONFIG: ClinicalExportConfig = {
  validation: {
    strictMode: true,
    clinicalAccuracyThreshold: CLINICAL_EXPORT_CONSTANTS.CLINICAL_ACCURACY_THRESHOLD,
    dataIntegrityChecks: true,
    privacyValidation: true,
    customValidators: [],
  },
  performance: {
    maxProcessingTime: CLINICAL_EXPORT_CONSTANTS.MAX_PROCESSING_TIME_MS,
    maxMemoryUsage: CLINICAL_EXPORT_CONSTANTS.MAX_MEMORY_USAGE_MB * 1024 * 1024,
    enableCaching: true,
    enableStreaming: true,
    concurrencyLimit: 4,
    optimizationStrategies: ['caching', 'streaming', 'compression'],
  },
  privacy: {
    enforceConsent: true,
    dataMinimization: true,
    anonymizationDefault: 'basic',
    auditAllAccess: true,
    encryptionRequired: true,
  },
  security: {
    accessTokenRequired: true,
    accessTokenExpiryHours: CLINICAL_EXPORT_CONSTANTS.ACCESS_TOKEN_EXPIRY_HOURS,
    encryptionAlgorithm: CLINICAL_EXPORT_CONSTANTS.ENCRYPTION_ALGORITHM,
    integrityChecks: true,
  },
  clinical: {
    accuracyValidation: true,
    mbctCompliance: true,
    riskAssessmentValidation: true,
    therapeuticDataPreservation: true,
    clinicalReviewRequired: false,
  },
  audit: {
    logAllOperations: true,
    retainLogsForDays: 2555, // 7 years for clinical compliance
    complianceReporting: true,
    anomalyDetection: true,
  },
} as const;