/**
 * FullMind Clinical Export API - Implementation Examples & Usage Patterns
 * 
 * Comprehensive implementation examples demonstrating the export API architecture
 * in action with real-world FullMind clinical data workflows.
 * 
 * Example Categories:
 * - Basic clinical export workflows for PDF/CSV generation
 * - Advanced therapeutic data processing with MBCT compliance
 * - Privacy-aware export handling with granular consent management
 * - Performance-optimized large dataset processing with streaming
 * - Error handling and recovery patterns for clinical safety
 * - Integration patterns with existing FullMind data infrastructure
 */

import type {
  ClinicalExportService,
  ClinicalDataAPI,
  ExportGenerationAPI,
  ExportRequestOptions,
  ExportOperationResult,
  PDFGenerationResult,
  CSVGenerationResult,
} from './clinical-export-service';

import type {
  AsyncStorageIntegrationService,
  ZustandStoreIntegration,
  SecureDataStoreIntegration,
  AssessmentServiceIntegration,
  MBCTPracticeIntegration,
} from './fullmind-data-integration';

import type {
  PDFExportProcessor,
  CSVExportProcessor,
  ClinicalDataTransformer,
  PrivacyDataProcessor,
} from './export-format-processors';

import type {
  ExportDataPackage,
  ClinicalExportData,
  UserID,
  ExportID,
  ExportFormat,
  UserConsentRecord,
  PrivacyConfiguration,
  ExportTimeRange,
  ISO8601Timestamp,
} from '../../types/clinical-export';

import type {
  AssessmentResult,
  MoodTracking,
  TherapeuticOutcome,
} from '../../types/healthcare';

// ============================================================================
// BASIC EXPORT WORKFLOW EXAMPLES
// ============================================================================

/**
 * Example 1: Generate Clinical Progress Report PDF
 * 
 * Demonstrates basic PDF export workflow for therapeutic sharing with healthcare providers.
 */
export class ClinicalProgressReportExample {
  constructor(
    private exportService: ClinicalExportService,
    private dataAPI: ClinicalDataAPI,
    private pdfProcessor: PDFExportProcessor,
    private integrationService: AsyncStorageIntegrationService
  ) {}

  async generateProgressReportPDF(
    userId: UserID,
    timeRange: ExportTimeRange,
    consent: UserConsentRecord
  ): Promise<PDFGenerationResult> {
    try {
      // Step 1: Validate user consent and privacy requirements
      const consentValidation = await this.exportService.validateExportRequest({
        userId,
        format: { type: 'pdf', template: 'clinical-report' } as ExportFormat,
        dataCategories: ['assessments', 'mood-tracking', 'mbct-progress'],
        timeRange,
        consent,
        privacy: this.getTherapeuticSharingPrivacyConfig(),
      });

      if (!consentValidation.valid) {
        throw new Error(`Consent validation failed: ${consentValidation.errors.map(e => e.message).join(', ')}`);
      }

      // Step 2: Retrieve clinical data from FullMind storage
      const [assessmentData, moodData, sessionData] = await Promise.all([
        this.dataAPI.getAssessmentData({
          userId,
          timeRange,
          includeScores: true,
          includeTrends: true,
          includeInterpretation: true,
          privacy: this.getTherapeuticSharingPrivacyConfig(),
        }),
        this.dataAPI.getMoodTrackingData({
          userId,
          timeRange,
          includeContext: true,
          includeTrends: true,
          privacy: this.getTherapeuticSharingPrivacyConfig(),
        }),
        this.dataAPI.getMBCTProgressData({
          userId,
          timeRange,
          includeSessionDetails: true,
          includePracticeMetrics: true,
          includeOutcomes: true,
          privacy: this.getTherapeuticSharingPrivacyConfig(),
        }),
      ]);

      // Step 3: Transform data for clinical presentation
      const clinicalReportData = await this.transformToClinicalReport({
        assessments: assessmentData.data.assessments,
        moodTracking: moodData.data.moodEntries,
        mbctProgress: sessionData.data,
        timeRange,
        userId,
      });

      // Step 4: Generate PDF with therapeutic styling
      const pdfResult = await this.pdfProcessor.generateClinicalReport(
        clinicalReportData,
        {
          template: {
            clinical: true,
            branding: true,
            charts: true,
            accessibility: 'AA',
          },
          styling: {
            colorScheme: this.getTherapeuticColorScheme(),
            typography: this.getClinicalTypography(),
            spacing: { clinical: true },
            clinicalFormatting: { mbctCompliant: true },
            chartStyling: { therapeutic: true },
          },
          charts: {
            includeAssessmentTrends: true,
            includeMoodVisualization: true,
            includeProgressMetrics: true,
            accessibleCharts: true,
          },
          accessibility: {
            wcagLevel: 'AA',
            screenReaderOptimized: true,
            highContrast: true,
          },
          branding: {
            includeLogo: true,
            clinicalHeader: true,
            confidentialityFooter: true,
          },
          security: {
            watermark: 'CONFIDENTIAL',
            accessRestrictions: true,
          },
          optimization: {
            compressImages: true,
            optimizeSize: true,
            fastWebView: true,
          },
        }
      );

      // Step 5: Validate PDF quality and clinical accuracy
      const validation = await this.pdfProcessor.validatePDFStructure(pdfResult.pdfBuffer);
      if (!validation.valid) {
        throw new Error(`PDF validation failed: ${validation.errors.join(', ')}`);
      }

      return pdfResult;
    } catch (error) {
      console.error('Clinical progress report generation failed:', error);
      throw new Error(`Failed to generate clinical progress report: ${error.message}`);
    }
  }

  private getTherapeuticSharingPrivacyConfig(): PrivacyConfiguration {
    return {
      dataMinimization: {
        enabled: true,
        purpose: 'therapeutic-sharing',
        retainEssentialData: true,
      },
      anonymization: {
        level: 'none', // Therapeutic sharing requires identifiable data
        preserveClinicalContext: true,
      },
      encryption: {
        algorithm: 'AES-256-GCM',
        keyManagement: 'user-controlled',
      },
      accessControls: {
        recipientValidation: true,
        timeBasedAccess: true,
        auditTrail: true,
      },
      retentionPolicy: {
        maxRetentionDays: 90,
        autoDelete: true,
      },
      auditRequirements: {
        logAllAccess: true,
        notifyUser: true,
      },
    };
  }

  private async transformToClinicalReport(data: {
    assessments: readonly AssessmentResult[];
    moodTracking: readonly MoodTracking[];
    mbctProgress: any;
    timeRange: ExportTimeRange;
    userId: UserID;
  }): Promise<ClinicalReportData> {
    // Implementation would transform raw data into clinical report structure
    return {
      reportMetadata: {
        reportId: `clinical-report-${data.userId}-${Date.now()}`,
        generatedAt: new Date().toISOString() as ISO8601Timestamp,
        reportPeriod: data.timeRange,
        patientInfo: {
          userId: data.userId,
          anonymized: false,
          clinicalContext: 'therapeutic-sharing',
        },
        clinicalContext: {
          purpose: 'progress-assessment',
          provider: 'fullmind-mbct',
          treatmentType: 'mbct',
        },
        confidentialityLevel: 'confidential',
        distributionList: ['referring-clinician', 'treating-therapist'],
      },
      executiveSummary: {
        overallProgress: this.calculateOverallProgress(data.assessments),
        keyFindings: this.extractKeyFindings(data),
        criticalAlerts: this.identifyCriticalAlerts(data.assessments),
        therapeuticRecommendations: this.generateRecommendations(data),
        nextSteps: this.suggestNextSteps(data),
      },
      assessmentTimeline: {
        phq9Timeline: this.createPHQ9Timeline(data.assessments),
        gad7Timeline: this.createGAD7Timeline(data.assessments),
        combinedTrends: this.analyzeCombinedTrends(data.assessments),
        clinicalMilestones: this.identifyMilestones(data.assessments),
        riskIndicators: this.assessRiskIndicators(data.assessments),
      },
      mbctProgressReport: {
        practiceEngagement: this.analyzePracticeEngagement(data.mbctProgress),
        skillDevelopment: this.trackSkillDevelopment(data.mbctProgress),
        sessionSummaries: this.summarizeSessions(data.mbctProgress),
        therapeuticOutcomes: this.measureOutcomes(data.mbctProgress),
        complianceMetrics: this.calculateMBCTCompliance(data.mbctProgress),
      },
      therapeuticMilestones: this.identifyTherapeuticMilestones(data),
      clinicalRecommendations: this.generateClinicalRecommendations(data),
      riskAssessment: this.performRiskAssessment(data.assessments),
      supportingData: {
        rawAssessmentData: data.assessments,
        moodTrackingData: data.moodTracking,
        sessionData: data.mbctProgress,
        dataQualityMetrics: this.calculateDataQuality(data),
      },
    };
  }

  private getTherapeuticColorScheme() {
    return {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#059669',
      positive: '#16a34a',
      negative: '#dc2626',
      neutral: '#6b7280',
      crisis: '#ef4444',
      therapeutic: '#8b5cf6',
    };
  }

  private getClinicalTypography() {
    return {
      fontFamily: 'system-ui',
      headingFont: 'Inter',
      bodyFont: 'Inter',
      codeFont: 'Fira Code',
      sizes: {
        small: 10,
        body: 11,
        heading: 14,
        title: 18,
      },
      clinical: {
        readabilityOptimized: true,
        dyslexiaFriendly: true,
      },
    };
  }

  // Helper methods for data transformation (implementation details would be extensive)
  private calculateOverallProgress(assessments: readonly AssessmentResult[]) {
    // Implementation would calculate therapeutic progress metrics
    return {
      improvement: 'moderate',
      confidence: 0.85,
      trajectory: 'positive',
    };
  }

  private extractKeyFindings(data: any) {
    // Implementation would extract clinically significant findings
    return [
      'Significant reduction in PHQ-9 scores over 4-week period',
      'Increased engagement with breathing exercises',
      'Improved mood stability with reduced variability',
    ];
  }

  private identifyCriticalAlerts(assessments: readonly AssessmentResult[]) {
    // Implementation would identify crisis thresholds and alerts
    return [];
  }

  private generateRecommendations(data: any) {
    // Implementation would generate evidence-based recommendations
    return [
      'Continue current MBCT practice schedule',
      'Consider gradual increase in session duration',
      'Monitor mood tracking consistency',
    ];
  }

  private suggestNextSteps(data: any) {
    // Implementation would suggest clinical next steps
    return [
      'Schedule follow-up assessment in 2 weeks',
      'Discuss practice barriers in next session',
      'Consider adding mindful movement practices',
    ];
  }

  // Additional helper methods would continue with similar patterns...
  private createPHQ9Timeline(assessments: readonly AssessmentResult[]) { return {}; }
  private createGAD7Timeline(assessments: readonly AssessmentResult[]) { return {}; }
  private analyzeCombinedTrends(assessments: readonly AssessmentResult[]) { return {}; }
  private identifyMilestones(assessments: readonly AssessmentResult[]) { return []; }
  private assessRiskIndicators(assessments: readonly AssessmentResult[]) { return []; }
  private analyzePracticeEngagement(mbctProgress: any) { return {}; }
  private trackSkillDevelopment(mbctProgress: any) { return {}; }
  private summarizeSessions(mbctProgress: any) { return []; }
  private measureOutcomes(mbctProgress: any) { return []; }
  private calculateMBCTCompliance(mbctProgress: any) { return {}; }
  private identifyTherapeuticMilestones(data: any) { return []; }
  private generateClinicalRecommendations(data: any) { return []; }
  private performRiskAssessment(assessments: readonly AssessmentResult[]) { return {}; }
  private calculateDataQuality(data: any) { return {}; }
}

/**
 * Example 2: Generate Research Data CSV Export
 * 
 * Demonstrates CSV export workflow for anonymized research data.
 */
export class ResearchDataCSVExample {
  constructor(
    private exportService: ClinicalExportService,
    private dataAPI: ClinicalDataAPI,
    private csvProcessor: CSVExportProcessor,
    private privacyProcessor: PrivacyDataProcessor
  ) {}

  async generateResearchDataCSV(
    userId: UserID,
    timeRange: ExportTimeRange,
    researchConsent: UserConsentRecord
  ): Promise<CSVGenerationResult> {
    try {
      // Step 1: Validate research consent
      const consentValidation = await this.exportService.validateExportRequest({
        userId,
        format: { type: 'csv', structure: 'research-optimized' } as ExportFormat,
        dataCategories: ['assessments', 'mood-tracking', 'session-data'],
        timeRange,
        consent: researchConsent,
        privacy: this.getResearchPrivacyConfig(),
      });

      if (!consentValidation.valid) {
        throw new Error(`Research consent validation failed: ${consentValidation.errors.map(e => e.message).join(', ')}`);
      }

      // Step 2: Retrieve and anonymize clinical data
      const clinicalData = await this.dataAPI.getAggregatedMetrics({
        userId,
        timeRange,
        includePersonalIdentifiers: false,
        researchCompliant: true,
        privacy: this.getResearchPrivacyConfig(),
      });

      // Step 3: Apply research-grade anonymization
      const anonymizedData = await this.privacyProcessor.anonymizeIdentifiers(
        clinicalData.data,
        'research-grade'
      );

      // Step 4: Transform to research CSV structure
      const researchCSVData = await this.transformToResearchFormat(anonymizedData);

      // Step 5: Generate CSV with research-specific configuration
      const csvResult = await this.csvProcessor.generateResearchDataCSV(
        researchCSVData,
        {
          structure: {
            format: 'normalized',
            relationships: 'separate-files',
            nullHandling: 'na',
            dateFormat: 'iso8601',
            numberFormat: {
              decimals: 3,
              scientific: false,
              locale: 'en-US',
            },
          },
          encoding: {
            charset: 'UTF-8',
            bom: false,
            lineEnding: 'unix',
          },
          headers: {
            includeHeaders: true,
            headerStyle: 'snake_case',
            includeUnits: true,
            includeDescriptions: true,
            clinicalMetadata: false, // Research data excludes clinical metadata
          },
          formatting: {
            delimiter: ',',
            quoteChar: '"',
            escapeChar: '\\',
            quoteMode: 'minimal',
          },
          validation: {
            strictTypes: true,
            rangeValidation: true,
            consistencyChecks: true,
          },
          privacy: {
            removeIdentifiers: true,
            dataMinimization: true,
            aggregationLevel: 'individual', // vs 'cohort'
          },
          optimization: {
            compression: true,
            chunkSize: 10000,
            memoryOptimized: true,
          },
        }
      );

      return csvResult;
    } catch (error) {
      console.error('Research CSV generation failed:', error);
      throw new Error(`Failed to generate research CSV: ${error.message}`);
    }
  }

  private getResearchPrivacyConfig(): PrivacyConfiguration {
    return {
      dataMinimization: {
        enabled: true,
        purpose: 'research-participation',
        retainEssentialData: true,
      },
      anonymization: {
        level: 'advanced',
        preserveClinicalContext: false,
        researchCompliant: true,
      },
      encryption: {
        algorithm: 'AES-256-GCM',
        keyManagement: 'research-controlled',
      },
      accessControls: {
        recipientValidation: true,
        institutionalReview: true,
        auditTrail: true,
      },
      retentionPolicy: {
        maxRetentionDays: 2555, // 7 years for research
        autoDelete: false,
      },
      auditRequirements: {
        logAllAccess: true,
        institutionalReporting: true,
      },
    };
  }

  private async transformToResearchFormat(data: any): Promise<ResearchExportData> {
    // Implementation would transform clinical data to research format
    return {
      studyMetadata: {
        studyId: 'mbct-effectiveness-2024',
        version: '1.0',
        generatedAt: new Date().toISOString() as ISO8601Timestamp,
        participantCount: 1,
        dataCategories: ['assessments', 'mood-tracking', 'engagement'],
      },
      anonymizedData: {
        participantId: this.generatePseudonym(),
        demographics: this.anonymizeDemographics(),
        assessmentData: this.anonymizeAssessments(data),
        behavioralData: this.anonymizeBehavioralData(data),
        outcomeData: this.anonymizeOutcomes(data),
      },
      outcomeMetrics: this.calculateResearchOutcomes(data),
      demographicData: {
        ageGroup: this.categorizeAge(),
        genderCategory: this.categorizeGender(),
        locationRegion: this.generalizeLocation(),
        treatmentHistory: this.generalizeTreatmentHistory(),
      },
      consentInformation: {
        researchConsentGiven: true,
        dataCategories: ['assessments', 'mood-tracking', 'session-data'],
        withdrawalRights: true,
        contactPreferences: 'anonymized',
      },
    };
  }

  // Helper methods for anonymization (implementation details would be extensive)
  private generatePseudonym(): string {
    return `PARTICIPANT_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private anonymizeDemographics() {
    return {
      ageGroup: '25-34',
      education: 'university',
      employment: 'employed',
      relationships: 'partnered',
    };
  }

  private anonymizeAssessments(data: any) {
    // Remove timestamps, add noise, generalize scores
    return data;
  }

  private anonymizeBehavioralData(data: any) {
    // Aggregate patterns, remove specific details
    return data;
  }

  private anonymizeOutcomes(data: any) {
    // Generalize improvement metrics
    return data;
  }

  private calculateResearchOutcomes(data: any) {
    return [
      {
        metric: 'phq9_improvement',
        value: 0.25,
        confidence: 0.95,
        significance: 'p<0.05',
      },
    ];
  }

  private categorizeAge(): string { return '25-34'; }
  private categorizeGender(): string { return 'prefer-not-to-say'; }
  private generalizeLocation(): string { return 'north-america'; }
  private generalizeTreatmentHistory(): string { return 'first-time'; }
}

/**
 * Example 3: Streaming Large Dataset Export
 * 
 * Demonstrates memory-efficient streaming for large therapeutic datasets.
 */
export class StreamingExportExample {
  constructor(
    private exportService: ClinicalExportService,
    private streamingProcessor: StreamingExportProcessor,
    private integrationService: AsyncStorageIntegrationService
  ) {}

  async generateLargeDatasetExport(
    userId: UserID,
    timeRange: ExportTimeRange,
    format: ExportFormat
  ): Promise<ExportOperationResult> {
    try {
      // Step 1: Estimate export size and configure streaming
      const sizeEstimate = await this.estimateExportSize(userId, timeRange);
      
      if (sizeEstimate.estimatedRecords > 50_000) {
        return this.executeStreamingExport(userId, timeRange, format);
      } else {
        return this.executeStandardExport(userId, timeRange, format);
      }
    } catch (error) {
      console.error('Large dataset export failed:', error);
      throw new Error(`Failed to export large dataset: ${error.message}`);
    }
  }

  private async executeStreamingExport(
    userId: UserID,
    timeRange: ExportTimeRange,
    format: ExportFormat
  ): Promise<ExportOperationResult> {
    // Step 1: Create data stream
    const dataStream = await this.streamingProcessor.createDataStream(
      {
        userId,
        timeRange,
        dataCategories: ['assessments', 'mood-tracking', 'session-data'],
      },
      {
        chunkSize: 5_000,
        bufferSize: 10_000,
        maxMemoryUsage: 128 * 1024 * 1024, // 128MB
        timeout: 300_000, // 5 minutes
        errorHandling: 'retry-with-backoff',
        progressReporting: true,
      }
    );

    // Step 2: Process data in chunks
    const chunkProcessor = {
      chunkSize: 5_000,
      processChunk: async (chunk: DataChunk) => {
        // Transform chunk data
        const transformedChunk = await this.transformChunk(chunk, format);
        
        // Validate chunk integrity
        const validation = await this.validateChunk(transformedChunk);
        if (!validation.valid) {
          throw new Error(`Chunk validation failed: ${validation.errors.join(', ')}`);
        }

        return transformedChunk;
      },
      validateChunk: async (chunk: DataChunk) => {
        return this.validateChunk(chunk);
      },
      handleChunkError: async (chunk: DataChunk, error: ChunkError) => {
        console.warn(`Chunk processing error: ${error.message}`);
        return this.recoverFromChunkError(chunk, error);
      },
    };

    // Step 3: Execute streaming processing
    const processingResult = await this.streamingProcessor.processStreamChunks(
      dataStream,
      chunkProcessor
    );

    // Step 4: Aggregate results
    const aggregatedResult = await this.streamingProcessor.aggregateStreamResults([
      processingResult,
    ]);

    return {
      success: true,
      data: {
        exportId: aggregatedResult.exportId,
        status: 'completed',
        estimatedCompletion: new Date().toISOString() as ISO8601Timestamp,
        progress: {
          percentage: 100,
          currentStage: 'completed',
          estimatedTimeRemaining: 0,
          recordsProcessed: aggregatedResult.recordsProcessed,
          totalRecords: aggregatedResult.totalRecords,
        },
        validationResults: aggregatedResult.validation,
        downloadToken: aggregatedResult.downloadToken,
        metadata: aggregatedResult.metadata,
      },
    };
  }

  private async executeStandardExport(
    userId: UserID,
    timeRange: ExportTimeRange,
    format: ExportFormat
  ): Promise<ExportOperationResult> {
    // Standard export implementation for smaller datasets
    return this.exportService.generateExport({
      userId,
      format,
      dataCategories: ['assessments', 'mood-tracking', 'session-data'],
      timeRange,
      consent: await this.getDefaultConsent(userId),
      privacy: this.getStandardPrivacyConfig(),
    });
  }

  private async estimateExportSize(userId: UserID, timeRange: ExportTimeRange) {
    // Implementation would estimate data size
    return {
      estimatedRecords: 25_000,
      estimatedSizeMB: 15,
      estimatedProcessingTime: 120_000, // 2 minutes
    };
  }

  private async transformChunk(chunk: DataChunk, format: ExportFormat): Promise<ProcessedChunk> {
    // Implementation would transform chunk based on format
    return chunk as ProcessedChunk;
  }

  private async validateChunk(chunk: ProcessedChunk): Promise<ChunkValidationResult> {
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  private async recoverFromChunkError(chunk: DataChunk, error: ChunkError): Promise<ChunkErrorHandling> {
    return {
      strategy: 'retry',
      retryCount: 1,
      maxRetries: 3,
      backoffMs: 1000,
    };
  }

  private async getDefaultConsent(userId: UserID): Promise<UserConsentRecord> {
    // Implementation would retrieve user consent
    return {} as UserConsentRecord;
  }

  private getStandardPrivacyConfig(): PrivacyConfiguration {
    return {
      dataMinimization: { enabled: true, purpose: 'personal-records' },
      anonymization: { level: 'none' },
      encryption: { algorithm: 'AES-256-GCM' },
      accessControls: { recipientValidation: false },
      retentionPolicy: { maxRetentionDays: 90 },
      auditRequirements: { logAllAccess: true },
    };
  }
}

// ============================================================================
// TYPE DEFINITIONS FOR EXAMPLES
// ============================================================================

interface ClinicalReportData {
  reportMetadata: any;
  executiveSummary: any;
  assessmentTimeline: any;
  mbctProgressReport: any;
  therapeuticMilestones: any[];
  clinicalRecommendations: any[];
  riskAssessment: any;
  supportingData: any;
}

interface ResearchExportData {
  studyMetadata: any;
  anonymizedData: any;
  outcomeMetrics: any[];
  demographicData: any;
  consentInformation: any;
}

interface DataChunk {
  id: string;
  data: any[];
  metadata: any;
}

interface ProcessedChunk extends DataChunk {
  processed: true;
}

interface ChunkValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ChunkError extends Error {
  chunkId: string;
  recoverable: boolean;
}

interface ChunkErrorHandling {
  strategy: 'retry' | 'skip' | 'abort';
  retryCount: number;
  maxRetries: number;
  backoffMs: number;
}

// ============================================================================
// USAGE PATTERN EXAMPLES
// ============================================================================

/**
 * Example usage patterns for the export API
 */
export const EXPORT_API_USAGE_EXAMPLES = {
  
  // Basic PDF export for therapeutic sharing
  async basicPDFExport(exportService: ClinicalExportService, userId: UserID) {
    const result = await exportService.generateExport({
      userId,
      format: { type: 'pdf', template: 'clinical-summary' } as ExportFormat,
      dataCategories: ['assessments', 'mood-tracking'],
      timeRange: {
        startDate: '2024-01-01T00:00:00Z' as ISO8601Timestamp,
        endDate: '2024-01-31T23:59:59Z' as ISO8601Timestamp,
        timezone: 'UTC',
        precision: 'day',
      },
      consent: {} as UserConsentRecord, // Would be actual consent record
      privacy: {} as PrivacyConfiguration, // Would be actual privacy config
    });
    
    return result;
  },

  // CSV export for research participation
  async researchCSVExport(exportService: ClinicalExportService, userId: UserID) {
    const result = await exportService.generateExport({
      userId,
      format: { type: 'csv', structure: 'research-optimized' } as ExportFormat,
      dataCategories: ['assessments', 'session-data'],
      timeRange: {
        startDate: '2024-01-01T00:00:00Z' as ISO8601Timestamp,
        endDate: '2024-12-31T23:59:59Z' as ISO8601Timestamp,
        timezone: 'UTC',
        precision: 'day',
      },
      consent: {} as UserConsentRecord,
      privacy: {} as PrivacyConfiguration,
    });
    
    return result;
  },

  // Preview export data before generation
  async previewExportData(exportService: ClinicalExportService, userId: UserID) {
    const preview = await exportService.previewExportData({
      userId,
      dataCategories: ['assessments', 'mood-tracking', 'session-data'],
      timeRange: {
        startDate: '2024-01-01T00:00:00Z' as ISO8601Timestamp,
        endDate: '2024-01-31T23:59:59Z' as ISO8601Timestamp,
        timezone: 'UTC',
        precision: 'day',
      },
      consent: {} as UserConsentRecord,
      privacy: {} as PrivacyConfiguration,
      sampleSize: 100,
    });
    
    return preview;
  },

  // Monitor export progress
  async monitorExportProgress(exportService: ClinicalExportService, exportId: ExportID) {
    const status = await exportService.getExportStatus(exportId);
    
    if (status.data.status === 'processing') {
      console.log(`Export progress: ${status.data.progress.percentage}%`);
      console.log(`Current stage: ${status.data.progress.currentStage}`);
      console.log(`ETA: ${status.data.progress.estimatedTimeRemaining}ms`);
    }
    
    return status;
  },

  // Download completed export
  async downloadExport(exportService: ClinicalExportService, exportId: ExportID, accessToken: string) {
    const download = await exportService.downloadExport(exportId, accessToken);
    
    if (download.success) {
      console.log(`Downloaded export: ${download.data.filename}`);
      console.log(`File size: ${download.data.size} bytes`);
      console.log(`Format: ${download.data.format}`);
    }
    
    return download;
  },

} as const;