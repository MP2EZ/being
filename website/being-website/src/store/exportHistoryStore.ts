/**
 * Being. Clinical Export History Store
 * Clinical-grade Zustand store for export audit trail, sharing history,
 * and user access to previous exports with HIPAA compliance tracking.
 * 
 * Features:
 * - Comprehensive export audit trail with clinical metadata
 * - Secure sharing history with recipient tracking
 * - Quick access to recent and frequently used exports
 * - HIPAA-compliant audit logging and data retention
 * - Advanced search and filtering capabilities
 * - Export analytics and usage patterns
 * - Integration with configuration and process stores
 * - Data lifecycle management and automated cleanup
 */

'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ExportHistoryRecord,
  SharingHistoryRecord,
  ExportSummary,
  ExportConfiguration,
  ExportID,
  UserID,
  ISO8601Timestamp,
  ExportResult,
  ExportFormat,
  DataCategory,
  ExportPurpose,
  ConsentID,
  ExportPerformanceMetrics,
} from '../types/clinical-export';

// ============================================================================
// HISTORY STORE INTERFACES
// ============================================================================

/**
 * Export history record with comprehensive audit information
 */
export interface ExportHistoryRecord {
  readonly id: string;
  readonly exportId: ExportID;
  readonly userId: UserID;
  readonly exportType: ExportPurpose;
  readonly format: ExportFormat['type'];
  readonly dataCategories: readonly DataCategory[];
  readonly recordCount: number;
  readonly fileSize: number; // bytes
  readonly fileName: string;
  readonly createdAt: ISO8601Timestamp;
  readonly completedAt?: ISO8601Timestamp;
  readonly status: ExportHistoryStatus;
  readonly configuration: ExportConfigurationSnapshot;
  readonly performanceMetrics?: ExportPerformanceMetrics;
  readonly qualityMetrics: ExportQualityMetrics;
  readonly clinicalMetadata: ClinicalHistoryMetadata;
  readonly sharingMetadata?: ExportSharingMetadata;
  readonly retentionInfo: DataRetentionInfo;
  readonly auditEvents: readonly AuditEvent[];
}

/**
 * Export history status
 */
export type ExportHistoryStatus = 
  | 'completed'
  | 'shared'
  | 'downloaded'
  | 'expired'
  | 'purged'
  | 'archived';

/**
 * Sharing history record for recipient tracking
 */
export interface SharingHistoryRecord {
  readonly id: string;
  readonly exportId: ExportID;
  readonly exportHistoryId: string;
  readonly userId: UserID;
  readonly recipientType: 'therapist' | 'healthcare-provider' | 'family-member' | 'self' | 'research-institution';
  readonly recipientInfo: RecipientInformation;
  readonly sharedAt: ISO8601Timestamp;
  readonly shareMethod: 'email' | 'secure-link' | 'direct-download' | 'portal-access' | 'encrypted-file';
  readonly consentUsed: ConsentID;
  readonly accessPermissions: ShareAccessPermissions;
  readonly expirationDate?: ISO8601Timestamp;
  readonly accessHistory: readonly ShareAccessEvent[];
  readonly sharingStatus: SharingStatus;
  readonly privacyLevel: 'full-access' | 'limited-access' | 'summary-only' | 'anonymized';
}

/**
 * Sharing status tracking
 */
export type SharingStatus = 
  | 'pending'
  | 'delivered'
  | 'accessed'
  | 'downloaded'
  | 'expired'
  | 'revoked';

/**
 * Export summary for quick access
 */
export interface ExportSummary {
  readonly id: string;
  readonly exportId: ExportID;
  readonly title: string;
  readonly format: ExportFormat['type'];
  readonly createdAt: ISO8601Timestamp;
  readonly dataRange: DateRange;
  readonly recordCount: number;
  readonly fileSize: number;
  readonly qualityScore: number; // 0-1
  readonly isShared: boolean;
  readonly accessCount: number;
  readonly lastAccessed?: ISO8601Timestamp;
  readonly quickAccessEnabled: boolean;
}

/**
 * Export configuration snapshot for audit trail
 */
export interface ExportConfigurationSnapshot {
  readonly configurationId: string;
  readonly version: string;
  readonly preferences: Record<string, unknown>;
  readonly privacySettings: Record<string, unknown>;
  readonly consentIds: readonly ConsentID[];
  readonly timestamp: ISO8601Timestamp;
}

/**
 * Export quality metrics for history tracking
 */
export interface ExportQualityMetrics {
  readonly overallScore: number; // 0-1
  readonly dataCompleteness: number; // 0-1
  readonly clinicalAccuracy: number; // 0-1
  readonly formatCompliance: number; // 0-1
  readonly accessibilityScore: number; // 0-1
  readonly errorCount: number;
  readonly warningCount: number;
  readonly validationPassed: boolean;
  readonly clinicalReviewRequired: boolean;
}

/**
 * Clinical history metadata
 */
export interface ClinicalHistoryMetadata {
  readonly clinicalContext: string;
  readonly treatmentPeriod: DateRange;
  readonly assessmentTypes: readonly string[];
  readonly riskLevel: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  readonly clinicalSignificance: 'routine' | 'important' | 'critical';
  readonly mbctPhase?: string;
  readonly therapeuticMilestones: readonly string[];
  readonly clinicalNotes?: string;
  readonly reviewStatus: 'pending' | 'reviewed' | 'approved' | 'flagged';
}

/**
 * Data retention information
 */
export interface DataRetentionInfo {
  readonly retentionPeriodDays: number;
  readonly expirationDate: ISO8601Timestamp;
  readonly autoDeleteEnabled: boolean;
  readonly purgeScheduledDate?: ISO8601Timestamp;
  readonly retentionReason: 'user-preference' | 'legal-requirement' | 'clinical-need' | 'research-consent';
  readonly extendedRetention?: boolean;
}

/**
 * Audit event for comprehensive tracking
 */
export interface AuditEvent {
  readonly id: string;
  readonly timestamp: ISO8601Timestamp;
  readonly eventType: AuditEventType;
  readonly actor: string; // userId or system identifier
  readonly action: string;
  readonly details: Record<string, unknown>;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly clinicallySignificant: boolean;
}

/**
 * Audit event types
 */
export type AuditEventType = 
  | 'created'
  | 'accessed'
  | 'downloaded'
  | 'shared'
  | 'modified'
  | 'deleted'
  | 'purged'
  | 'consent-updated'
  | 'privacy-changed';

/**
 * Recipient information for sharing
 */
export interface RecipientInformation {
  readonly name: string;
  readonly email?: string;
  readonly organization?: string;
  readonly role: string;
  readonly credentials?: string;
  readonly contactMethod: string;
  readonly verificationStatus: 'unverified' | 'verified' | 'professional-verified';
}

/**
 * Share access permissions
 */
export interface ShareAccessPermissions {
  readonly canView: boolean;
  readonly canDownload: boolean;
  readonly canPrint: boolean;
  readonly canShare: boolean;
  readonly accessLimitCount?: number;
  readonly accessLimitUsed: number;
  readonly timeBasedAccess?: {
    readonly startTime: ISO8601Timestamp;
    readonly endTime: ISO8601Timestamp;
  };
}

/**
 * Share access event tracking
 */
export interface ShareAccessEvent {
  readonly timestamp: ISO8601Timestamp;
  readonly action: 'viewed' | 'downloaded' | 'printed' | 'shared';
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly location?: string;
  readonly duration?: number; // seconds for viewing
}

/**
 * Date range specification
 */
export interface DateRange {
  readonly startDate: ISO8601Timestamp;
  readonly endDate: ISO8601Timestamp;
  readonly timezone: string;
}

/**
 * Export search criteria
 */
export interface ExportSearchCriteria {
  readonly textQuery?: string;
  readonly dateRange?: DateRange;
  readonly formats?: readonly ExportFormat['type'][];
  readonly dataCategories?: readonly DataCategory[];
  readonly status?: readonly ExportHistoryStatus[];
  readonly minQualityScore?: number;
  readonly sharedOnly?: boolean;
  readonly clinicalSignificanceOnly?: boolean;
  readonly sortBy?: 'created-date' | 'modified-date' | 'quality-score' | 'access-count';
  readonly sortOrder?: 'asc' | 'desc';
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Export analytics data
 */
export interface ExportAnalytics {
  readonly totalExports: number;
  readonly totalShares: number;
  readonly averageQualityScore: number;
  readonly mostUsedFormat: ExportFormat['type'];
  readonly mostAccessedExport: ExportSummary | null;
  readonly exportTrends: readonly ExportTrendData[];
  readonly sharingPatterns: readonly SharingPatternData[];
  readonly dataUsageByCategory: readonly DataUsageMetric[];
  readonly performanceMetrics: AggregatedPerformanceMetrics;
  readonly retentionCompliance: RetentionComplianceMetrics;
}

/**
 * Export trend data for analytics
 */
export interface ExportTrendData {
  readonly period: ISO8601Timestamp;
  readonly exportCount: number;
  readonly shareCount: number;
  readonly averageQualityScore: number;
  readonly formats: Record<ExportFormat['type'], number>;
}

/**
 * Sharing pattern analysis
 */
export interface SharingPatternData {
  readonly recipientType: SharingHistoryRecord['recipientType'];
  readonly shareCount: number;
  readonly averageAccessCount: number;
  readonly mostCommonFormat: ExportFormat['type'];
  readonly averageRetentionDays: number;
}

/**
 * Data usage metrics by category
 */
export interface DataUsageMetric {
  readonly category: DataCategory;
  readonly exportCount: number;
  readonly shareCount: number;
  readonly averageRecords: number;
  readonly clinicalSignificance: number; // 0-1
}

/**
 * Aggregated performance metrics
 */
export interface AggregatedPerformanceMetrics {
  readonly averageProcessingTime: number;
  readonly averageFileSize: number;
  readonly totalBandwidthUsed: number;
  readonly successRate: number;
  readonly averageQualityScore: number;
}

/**
 * Retention compliance tracking
 */
export interface RetentionComplianceMetrics {
  readonly totalRecords: number;
  readonly expiringSoon: number; // within 30 days
  readonly overdue: number;
  readonly complianceRate: number; // 0-1
  readonly averageRetentionDays: number;
}

/**
 * Export history store state
 */
export interface ExportHistoryState {
  // Core history data
  readonly exportHistory: readonly ExportHistoryRecord[];
  readonly sharingHistory: readonly SharingHistoryRecord[];
  
  // Quick access and favorites
  readonly recentExports: readonly ExportSummary[];
  readonly frequentlyUsedConfigs: readonly ExportConfiguration[];
  readonly pinnedExports: readonly string[]; // Export history IDs
  
  // Search and filtering
  readonly lastSearchCriteria: ExportSearchCriteria | null;
  readonly searchResults: readonly ExportHistoryRecord[];
  readonly searchInProgress: boolean;
  
  // Analytics and insights
  readonly analytics: ExportAnalytics | null;
  readonly analyticsLastUpdated: ISO8601Timestamp | null;
  
  // Data management
  readonly totalStorageUsed: number; // bytes
  readonly retentionSummary: RetentionComplianceMetrics;
  readonly nextScheduledCleanup: ISO8601Timestamp | null;
  
  // Loading and error states
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly lastSyncError: string | null;
  
  // Persistence metadata
  readonly isHydrated: boolean;
  readonly lastSavedAt: ISO8601Timestamp | null;
  readonly version: string;
}

/**
 * Export history store actions
 */
export interface ExportHistoryActions {
  // History management
  addExportRecord: (record: Omit<ExportHistoryRecord, 'id' | 'auditEvents'>) => void;
  updateExportRecord: (id: string, updates: Partial<ExportHistoryRecord>) => void;
  removeExportRecord: (id: string) => void;
  addSharingRecord: (record: Omit<SharingHistoryRecord, 'id' | 'accessHistory'>) => void;
  updateSharingRecord: (id: string, updates: Partial<SharingHistoryRecord>) => void;
  
  // Quick access management
  updateRecentExports: () => void;
  addToFrequentlyUsed: (config: ExportConfiguration) => void;
  pinExport: (historyId: string) => void;
  unpinExport: (historyId: string) => void;
  
  // Search and filtering
  searchExports: (criteria: ExportSearchCriteria) => Promise<readonly ExportHistoryRecord[]>;
  clearSearchResults: () => void;
  getExportsByDateRange: (start: ISO8601Timestamp, end: ISO8601Timestamp) => readonly ExportHistoryRecord[];
  getExportsByFormat: (format: ExportFormat['type']) => readonly ExportHistoryRecord[];
  getSharedExports: () => readonly ExportHistoryRecord[];
  
  // Analytics and insights
  generateAnalytics: () => Promise<ExportAnalytics>;
  getExportTrends: (days: number) => readonly ExportTrendData[];
  getSharingPatterns: () => readonly SharingPatternData[];
  getDataUsageMetrics: () => readonly DataUsageMetric[];
  
  // Audit trail management
  addAuditEvent: (historyId: string, event: Omit<AuditEvent, 'id'>) => void;
  getAuditTrail: (historyId: string) => readonly AuditEvent[];
  getFullAuditTrail: (startDate?: ISO8601Timestamp, endDate?: ISO8601Timestamp) => readonly AuditEvent[];
  
  // Data lifecycle management
  updateRetentionInfo: (historyId: string, retentionInfo: Partial<DataRetentionInfo>) => void;
  scheduleExportCleanup: (historyId: string, scheduleDate: ISO8601Timestamp) => void;
  performScheduledCleanup: () => Promise<void>;
  purgeExpiredExports: () => Promise<void>;
  extendRetention: (historyId: string, additionalDays: number) => void;
  
  // Sharing management
  recordShareAccess: (sharingId: string, accessEvent: ShareAccessEvent) => void;
  revokeShare: (sharingId: string) => void;
  updateSharePermissions: (sharingId: string, permissions: Partial<ShareAccessPermissions>) => void;
  getShareAnalytics: (sharingId: string) => ShareAnalytics;
  
  // Storage management
  calculateStorageUsage: () => Promise<number>;
  optimizeStorage: () => Promise<void>;
  archiveOldExports: (olderThan: ISO8601Timestamp) => Promise<void>;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  retryLastOperation: () => Promise<void>;
  
  // Persistence
  forceSave: () => Promise<void>;
  loadHistory: () => Promise<void>;
  exportHistoryData: () => string;
  importHistoryData: (data: string) => Promise<boolean>;
  
  // Maintenance
  validateHistoryIntegrity: () => Promise<boolean>;
  repairHistoryData: () => Promise<void>;
  compactHistory: () => void;
  
  // State management
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
}

/**
 * Share analytics for individual sharing records
 */
export interface ShareAnalytics {
  readonly totalAccesses: number;
  readonly lastAccessed?: ISO8601Timestamp;
  readonly accessPattern: 'single' | 'multiple' | 'regular' | 'intensive';
  readonly averageSessionDuration: number;
  readonly downloadCount: number;
  readonly shareCount: number;
  readonly complianceStatus: 'compliant' | 'warning' | 'violation';
}

/**
 * Combined export history store interface
 */
export interface ExportHistoryStore extends ExportHistoryState, ExportHistoryActions {}

// ============================================================================
// DEFAULT VALUES AND CONSTANTS
// ============================================================================

const DEFAULT_RETENTION_SUMMARY: RetentionComplianceMetrics = {
  totalRecords: 0,
  expiringSoon: 0,
  overdue: 0,
  complianceRate: 1.0,
  averageRetentionDays: 90,
};

const INITIAL_STATE: ExportHistoryState = {
  exportHistory: [],
  sharingHistory: [],
  recentExports: [],
  frequentlyUsedConfigs: [],
  pinnedExports: [],
  lastSearchCriteria: null,
  searchResults: [],
  searchInProgress: false,
  analytics: null,
  analyticsLastUpdated: null,
  totalStorageUsed: 0,
  retentionSummary: DEFAULT_RETENTION_SUMMARY,
  nextScheduledCleanup: null,
  isLoading: false,
  error: null,
  lastSyncError: null,
  isHydrated: false,
  lastSavedAt: null,
  version: '1.0.0',
};

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

const STORAGE_KEY = 'being-export-history';
const STORAGE_VERSION = '1.0.0';

const createExportHistoryStorage = () => {
  const storage = createJSONStorage(() => {
    if (typeof window === 'undefined') {
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      };
    }

    return {
      getItem: (key: string) => {
        try {
          const item = localStorage.getItem(key);
          if (!item) return null;
          
          const parsed = JSON.parse(item);
          
          if (parsed.version !== STORAGE_VERSION) {
            console.warn('Export history version mismatch, will migrate');
            return null;
          }
          
          return parsed;
        } catch (error) {
          console.error('Failed to load export history from localStorage:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('Failed to save export history to localStorage:', error);
          throw error;
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Failed to remove export history from localStorage:', error);
        }
      },
    };
  });
  
  return storage;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique history record ID
 */
const generateHistoryId = (): string => {
  return `hist_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

/**
 * Generate unique audit event ID
 */
const generateAuditId = (): string => {
  return `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

/**
 * Create ISO timestamp
 */
const createTimestamp = (): ISO8601Timestamp => {
  return new Date().toISOString() as ISO8601Timestamp;
};

/**
 * Calculate quality score from metrics
 */
const calculateQualityScore = (metrics: ExportQualityMetrics): number => {
  const weights = {
    dataCompleteness: 0.3,
    clinicalAccuracy: 0.4,
    formatCompliance: 0.2,
    accessibilityScore: 0.1,
  };
  
  return (
    metrics.dataCompleteness * weights.dataCompleteness +
    metrics.clinicalAccuracy * weights.clinicalAccuracy +
    metrics.formatCompliance * weights.formatCompliance +
    metrics.accessibilityScore * weights.accessibilityScore
  );
};

/**
 * Check if export is expired based on retention info
 */
const isExportExpired = (retentionInfo: DataRetentionInfo): boolean => {
  return new Date() > new Date(retentionInfo.expirationDate);
};

/**
 * Calculate days until expiration
 */
const getDaysUntilExpiration = (retentionInfo: DataRetentionInfo): number => {
  const now = new Date();
  const expiration = new Date(retentionInfo.expirationDate);
  const diffMs = expiration.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useExportHistoryStore = create<ExportHistoryStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // Initial state
      ...INITIAL_STATE,

      // History management
      addExportRecord: (recordData) => {
        const record: ExportHistoryRecord = {
          ...recordData,
          id: generateHistoryId(),
          auditEvents: [{
            id: generateAuditId(),
            timestamp: createTimestamp(),
            eventType: 'created',
            actor: recordData.userId,
            action: 'Export record created',
            details: { exportId: recordData.exportId },
            clinicallySignificant: recordData.clinicalMetadata.clinicalSignificance !== 'routine',
          }],
        };

        set(state => ({
          exportHistory: [...state.exportHistory, record],
          totalStorageUsed: state.totalStorageUsed + record.fileSize,
          lastSavedAt: createTimestamp(),
        }));

        // Update recent exports
        get().updateRecentExports();
      },

      updateExportRecord: (id: string, updates) => {
        set(state => {
          const newHistory = state.exportHistory.map(record => {
            if (record.id === id) {
              const updatedRecord = { ...record, ...updates };
              
              // Add audit event for update
              const auditEvent: AuditEvent = {
                id: generateAuditId(),
                timestamp: createTimestamp(),
                eventType: 'modified',
                actor: record.userId,
                action: 'Export record updated',
                details: { changes: Object.keys(updates) },
                clinicallySignificant: Boolean(updates.clinicalMetadata),
              };
              
              updatedRecord.auditEvents = [...updatedRecord.auditEvents, auditEvent];
              
              return updatedRecord;
            }
            return record;
          });

          // Update total storage if file size changed
          const oldRecord = state.exportHistory.find(r => r.id === id);
          const newRecord = newHistory.find(r => r.id === id);
          const sizeDiff = newRecord && oldRecord ? newRecord.fileSize - oldRecord.fileSize : 0;

          return {
            exportHistory: newHistory,
            totalStorageUsed: state.totalStorageUsed + sizeDiff,
          };
        });
      },

      removeExportRecord: (id: string) => {
        const record = get().exportHistory.find(r => r.id === id);
        if (!record) return;

        set(state => ({
          exportHistory: state.exportHistory.filter(r => r.id !== id),
          totalStorageUsed: state.totalStorageUsed - record.fileSize,
          pinnedExports: state.pinnedExports.filter(pin => pin !== id),
        }));

        // Remove associated sharing records
        set(state => ({
          sharingHistory: state.sharingHistory.filter(share => share.exportHistoryId !== id),
        }));
      },

      addSharingRecord: (recordData) => {
        const record: SharingHistoryRecord = {
          ...recordData,
          id: generateHistoryId(),
          accessHistory: [],
        };

        set(state => ({
          sharingHistory: [...state.sharingHistory, record],
        }));

        // Add audit event to export record
        get().addAuditEvent(recordData.exportHistoryId, {
          timestamp: createTimestamp(),
          eventType: 'shared',
          actor: recordData.userId,
          action: `Export shared with ${recordData.recipientType}`,
          details: { recipientInfo: recordData.recipientInfo },
          clinicallySignificant: recordData.privacyLevel === 'full-access',
        });

        // Update export record status
        get().updateExportRecord(recordData.exportHistoryId, { status: 'shared' });
      },

      updateSharingRecord: (id: string, updates) => {
        set(state => ({
          sharingHistory: state.sharingHistory.map(record => 
            record.id === id ? { ...record, ...updates } : record
          ),
        }));
      },

      // Quick access management
      updateRecentExports: () => {
        const { exportHistory } = get();
        
        const recentExports = exportHistory
          .slice() // Create a copy
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10) // Get top 10 most recent
          .map(record => ({
            id: record.id,
            exportId: record.exportId,
            title: `${record.format.toUpperCase()} Export - ${new Date(record.createdAt).toLocaleDateString()}`,
            format: record.format,
            createdAt: record.createdAt,
            dataRange: {
              startDate: record.configuration.timestamp, // Simplified - would need actual range
              endDate: record.createdAt,
              timezone: 'UTC',
            },
            recordCount: record.recordCount,
            fileSize: record.fileSize,
            qualityScore: calculateQualityScore(record.qualityMetrics),
            isShared: Boolean(record.sharingMetadata),
            accessCount: record.auditEvents.filter(e => e.eventType === 'accessed').length,
            lastAccessed: record.auditEvents
              .filter(e => e.eventType === 'accessed')
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp,
            quickAccessEnabled: true,
          }));

        set({ recentExports });
      },

      addToFrequentlyUsed: (config: ExportConfiguration) => {
        set(state => {
          const existing = state.frequentlyUsedConfigs.find(c => c.id === config.id);
          if (existing) return state; // Already in frequently used
          
          const newConfigs = [...state.frequentlyUsedConfigs, config]
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, 5); // Keep top 5
          
          return { frequentlyUsedConfigs: newConfigs };
        });
      },

      pinExport: (historyId: string) => {
        set(state => ({
          pinnedExports: [...new Set([...state.pinnedExports, historyId])],
        }));
      },

      unpinExport: (historyId: string) => {
        set(state => ({
          pinnedExports: state.pinnedExports.filter(pin => pin !== historyId),
        }));
      },

      // Search and filtering
      searchExports: async (criteria: ExportSearchCriteria): Promise<readonly ExportHistoryRecord[]> => {
        set({ searchInProgress: true, lastSearchCriteria: criteria });

        try {
          const { exportHistory } = get();
          let results = [...exportHistory];

          // Text query filter
          if (criteria.textQuery) {
            const query = criteria.textQuery.toLowerCase();
            results = results.filter(record => 
              record.fileName.toLowerCase().includes(query) ||
              record.clinicalMetadata.clinicalNotes?.toLowerCase().includes(query) ||
              record.dataCategories.some(category => category.toLowerCase().includes(query))
            );
          }

          // Date range filter
          if (criteria.dateRange) {
            const startDate = new Date(criteria.dateRange.startDate);
            const endDate = new Date(criteria.dateRange.endDate);
            results = results.filter(record => {
              const recordDate = new Date(record.createdAt);
              return recordDate >= startDate && recordDate <= endDate;
            });
          }

          // Format filter
          if (criteria.formats && criteria.formats.length > 0) {
            results = results.filter(record => criteria.formats!.includes(record.format));
          }

          // Data categories filter
          if (criteria.dataCategories && criteria.dataCategories.length > 0) {
            results = results.filter(record => 
              criteria.dataCategories!.some(category => record.dataCategories.includes(category))
            );
          }

          // Status filter
          if (criteria.status && criteria.status.length > 0) {
            results = results.filter(record => criteria.status!.includes(record.status));
          }

          // Quality score filter
          if (criteria.minQualityScore !== undefined) {
            results = results.filter(record => 
              calculateQualityScore(record.qualityMetrics) >= criteria.minQualityScore!
            );
          }

          // Shared only filter
          if (criteria.sharedOnly) {
            results = results.filter(record => Boolean(record.sharingMetadata));
          }

          // Clinical significance filter
          if (criteria.clinicalSignificanceOnly) {
            results = results.filter(record => 
              record.clinicalMetadata.clinicalSignificance !== 'routine'
            );
          }

          // Sorting
          if (criteria.sortBy) {
            results = results.sort((a, b) => {
              let aValue: any, bValue: any;
              
              switch (criteria.sortBy) {
                case 'created-date':
                  aValue = new Date(a.createdAt);
                  bValue = new Date(b.createdAt);
                  break;
                case 'modified-date':
                  aValue = new Date(a.auditEvents[a.auditEvents.length - 1]?.timestamp || a.createdAt);
                  bValue = new Date(b.auditEvents[b.auditEvents.length - 1]?.timestamp || b.createdAt);
                  break;
                case 'quality-score':
                  aValue = calculateQualityScore(a.qualityMetrics);
                  bValue = calculateQualityScore(b.qualityMetrics);
                  break;
                case 'access-count':
                  aValue = a.auditEvents.filter(e => e.eventType === 'accessed').length;
                  bValue = b.auditEvents.filter(e => e.eventType === 'accessed').length;
                  break;
                default:
                  aValue = a.createdAt;
                  bValue = b.createdAt;
              }
              
              const order = criteria.sortOrder === 'asc' ? 1 : -1;
              return aValue > bValue ? order : aValue < bValue ? -order : 0;
            });
          }

          // Pagination
          const start = criteria.offset || 0;
          const limit = criteria.limit || results.length;
          results = results.slice(start, start + limit);

          set({ searchResults: results, searchInProgress: false });
          return results;
        } catch (error) {
          set({ 
            searchInProgress: false,
            error: `Search failed: ${error}`,
          });
          throw error;
        }
      },

      clearSearchResults: () => {
        set({ 
          searchResults: [],
          lastSearchCriteria: null,
        });
      },

      getExportsByDateRange: (start: ISO8601Timestamp, end: ISO8601Timestamp) => {
        const { exportHistory } = get();
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        return exportHistory.filter(record => {
          const recordDate = new Date(record.createdAt);
          return recordDate >= startDate && recordDate <= endDate;
        });
      },

      getExportsByFormat: (format: ExportFormat['type']) => {
        const { exportHistory } = get();
        return exportHistory.filter(record => record.format === format);
      },

      getSharedExports: () => {
        const { exportHistory } = get();
        return exportHistory.filter(record => Boolean(record.sharingMetadata));
      },

      // Analytics and insights
      generateAnalytics: async (): Promise<ExportAnalytics> => {
        const { exportHistory, sharingHistory } = get();
        
        // Calculate basic metrics
        const totalExports = exportHistory.length;
        const totalShares = sharingHistory.length;
        const averageQualityScore = totalExports > 0 
          ? exportHistory.reduce((sum, record) => sum + calculateQualityScore(record.qualityMetrics), 0) / totalExports
          : 0;

        // Find most used format
        const formatCounts = exportHistory.reduce((acc, record) => {
          acc[record.format] = (acc[record.format] || 0) + 1;
          return acc;
        }, {} as Record<ExportFormat['type'], number>);
        const mostUsedFormat = Object.entries(formatCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] as ExportFormat['type'] || 'pdf';

        // Find most accessed export
        const exportAccessCounts = exportHistory.map(record => ({
          record,
          accessCount: record.auditEvents.filter(e => e.eventType === 'accessed').length,
        }));
        const mostAccessed = exportAccessCounts
          .sort((a, b) => b.accessCount - a.accessCount)[0];
        
        const mostAccessedExport: ExportSummary | null = mostAccessed?.accessCount > 0 ? {
          id: mostAccessed.record.id,
          exportId: mostAccessed.record.exportId,
          title: `${mostAccessed.record.format.toUpperCase()} Export`,
          format: mostAccessed.record.format,
          createdAt: mostAccessed.record.createdAt,
          dataRange: {
            startDate: mostAccessed.record.configuration.timestamp,
            endDate: mostAccessed.record.createdAt,
            timezone: 'UTC',
          },
          recordCount: mostAccessed.record.recordCount,
          fileSize: mostAccessed.record.fileSize,
          qualityScore: calculateQualityScore(mostAccessed.record.qualityMetrics),
          isShared: Boolean(mostAccessed.record.sharingMetadata),
          accessCount: mostAccessed.accessCount,
          quickAccessEnabled: true,
        } : null;

        // Generate trend data (last 30 days)
        const exportTrends = get().getExportTrends(30);

        // Generate sharing patterns
        const sharingPatterns = get().getSharingPatterns();

        // Data usage by category
        const dataUsageByCategory = get().getDataUsageMetrics();

        // Performance metrics
        const performanceMetrics: AggregatedPerformanceMetrics = {
          averageProcessingTime: exportHistory
            .filter(r => r.performanceMetrics)
            .reduce((sum, r) => sum + r.performanceMetrics!.processingTime, 0) / 
            Math.max(exportHistory.filter(r => r.performanceMetrics).length, 1),
          averageFileSize: totalExports > 0 
            ? exportHistory.reduce((sum, r) => sum + r.fileSize, 0) / totalExports
            : 0,
          totalBandwidthUsed: exportHistory.reduce((sum, r) => sum + r.fileSize, 0),
          successRate: exportHistory.filter(r => r.status === 'completed').length / Math.max(totalExports, 1),
          averageQualityScore,
        };

        // Retention compliance
        const now = new Date();
        const expiringSoon = exportHistory.filter(record => 
          getDaysUntilExpiration(record.retentionInfo) <= 30
        ).length;
        const overdue = exportHistory.filter(record => 
          isExportExpired(record.retentionInfo)
        ).length;

        const retentionCompliance: RetentionComplianceMetrics = {
          totalRecords: totalExports,
          expiringSoon,
          overdue,
          complianceRate: totalExports > 0 ? (totalExports - overdue) / totalExports : 1,
          averageRetentionDays: totalExports > 0
            ? exportHistory.reduce((sum, r) => sum + r.retentionInfo.retentionPeriodDays, 0) / totalExports
            : 90,
        };

        const analytics: ExportAnalytics = {
          totalExports,
          totalShares,
          averageQualityScore,
          mostUsedFormat,
          mostAccessedExport,
          exportTrends,
          sharingPatterns,
          dataUsageByCategory,
          performanceMetrics,
          retentionCompliance,
        };

        set({ 
          analytics,
          analyticsLastUpdated: createTimestamp(),
          retentionSummary: retentionCompliance,
        });

        return analytics;
      },

      getExportTrends: (days: number) => {
        const { exportHistory, sharingHistory } = get();
        const now = new Date();
        const trends: ExportTrendData[] = [];

        for (let i = 0; i < days; i++) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayExports = exportHistory.filter(record => 
            record.createdAt.startsWith(dateStr)
          );
          const dayShares = sharingHistory.filter(record => 
            record.sharedAt.startsWith(dateStr)
          );

          const formatCounts = dayExports.reduce((acc, record) => {
            acc[record.format] = (acc[record.format] || 0) + 1;
            return acc;
          }, {} as Record<ExportFormat['type'], number>);

          trends.push({
            period: date.toISOString() as ISO8601Timestamp,
            exportCount: dayExports.length,
            shareCount: dayShares.length,
            averageQualityScore: dayExports.length > 0
              ? dayExports.reduce((sum, r) => sum + calculateQualityScore(r.qualityMetrics), 0) / dayExports.length
              : 0,
            formats: formatCounts,
          });
        }

        return trends.reverse(); // Chronological order
      },

      getSharingPatterns: () => {
        const { sharingHistory } = get();
        const patterns = new Map<SharingHistoryRecord['recipientType'], {
          shareCount: number;
          totalAccesses: number;
          formats: Record<ExportFormat['type'], number>;
          totalRetentionDays: number;
        }>();

        for (const share of sharingHistory) {
          const pattern = patterns.get(share.recipientType) || {
            shareCount: 0,
            totalAccesses: 0,
            formats: {},
            totalRetentionDays: 0,
          };

          pattern.shareCount++;
          pattern.totalAccesses += share.accessHistory.length;
          
          // Would need to get format from export record
          // pattern.formats[exportFormat] = (pattern.formats[exportFormat] || 0) + 1;
          
          if (share.expirationDate) {
            const retentionDays = Math.ceil(
              (new Date(share.expirationDate).getTime() - new Date(share.sharedAt).getTime()) 
              / (24 * 60 * 60 * 1000)
            );
            pattern.totalRetentionDays += retentionDays;
          }

          patterns.set(share.recipientType, pattern);
        }

        return Array.from(patterns.entries()).map(([recipientType, data]) => ({
          recipientType,
          shareCount: data.shareCount,
          averageAccessCount: data.totalAccesses / data.shareCount,
          mostCommonFormat: Object.entries(data.formats)
            .sort(([, a], [, b]) => b - a)[0]?.[0] as ExportFormat['type'] || 'pdf',
          averageRetentionDays: data.totalRetentionDays / data.shareCount,
        }));
      },

      getDataUsageMetrics: () => {
        const { exportHistory } = get();
        const categories = new Map<DataCategory, {
          exportCount: number;
          shareCount: number;
          totalRecords: number;
          clinicalSignificanceTotal: number;
        }>();

        for (const record of exportHistory) {
          for (const category of record.dataCategories) {
            const metric = categories.get(category) || {
              exportCount: 0,
              shareCount: 0,
              totalRecords: 0,
              clinicalSignificanceTotal: 0,
            };

            metric.exportCount++;
            metric.totalRecords += record.recordCount;
            
            if (record.sharingMetadata) {
              metric.shareCount++;
            }

            const significanceScore = record.clinicalMetadata.clinicalSignificance === 'critical' ? 1 :
                                     record.clinicalMetadata.clinicalSignificance === 'important' ? 0.7 :
                                     0.3;
            metric.clinicalSignificanceTotal += significanceScore;

            categories.set(category, metric);
          }
        }

        return Array.from(categories.entries()).map(([category, data]) => ({
          category,
          exportCount: data.exportCount,
          shareCount: data.shareCount,
          averageRecords: data.totalRecords / data.exportCount,
          clinicalSignificance: data.clinicalSignificanceTotal / data.exportCount,
        }));
      },

      // Audit trail management
      addAuditEvent: (historyId: string, event) => {
        const auditEvent: AuditEvent = {
          ...event,
          id: generateAuditId(),
        };

        set(state => ({
          exportHistory: state.exportHistory.map(record => 
            record.id === historyId 
              ? { ...record, auditEvents: [...record.auditEvents, auditEvent] }
              : record
          ),
        }));
      },

      getAuditTrail: (historyId: string) => {
        const record = get().exportHistory.find(r => r.id === historyId);
        return record?.auditEvents || [];
      },

      getFullAuditTrail: (startDate, endDate) => {
        const { exportHistory } = get();
        const allEvents = exportHistory.flatMap(record => record.auditEvents);
        
        if (!startDate && !endDate) return allEvents;
        
        return allEvents.filter(event => {
          const eventDate = new Date(event.timestamp);
          const start = startDate ? new Date(startDate) : new Date(0);
          const end = endDate ? new Date(endDate) : new Date();
          
          return eventDate >= start && eventDate <= end;
        });
      },

      // Data lifecycle management
      updateRetentionInfo: (historyId: string, retentionInfo) => {
        get().updateExportRecord(historyId, { retentionInfo });
      },

      scheduleExportCleanup: (historyId: string, scheduleDate: ISO8601Timestamp) => {
        get().updateRetentionInfo(historyId, {
          purgeScheduledDate: scheduleDate,
          autoDeleteEnabled: true,
        });
        
        // Update next scheduled cleanup time
        const { nextScheduledCleanup } = get();
        if (!nextScheduledCleanup || new Date(scheduleDate) < new Date(nextScheduledCleanup)) {
          set({ nextScheduledCleanup: scheduleDate });
        }
      },

      performScheduledCleanup: async () => {
        const { exportHistory } = get();
        const now = new Date();
        
        const toCleanup = exportHistory.filter(record => 
          record.retentionInfo.purgeScheduledDate &&
          new Date(record.retentionInfo.purgeScheduledDate) <= now
        );

        for (const record of toCleanup) {
          get().removeExportRecord(record.id);
          get().addAuditEvent(record.id, {
            timestamp: createTimestamp(),
            eventType: 'purged',
            actor: 'system',
            action: 'Scheduled cleanup performed',
            details: { reason: 'retention-policy' },
            clinicallySignificant: false,
          });
        }

        // Update next scheduled cleanup
        const remaining = exportHistory
          .filter(record => record.retentionInfo.purgeScheduledDate)
          .map(record => record.retentionInfo.purgeScheduledDate!)
          .sort()
          .filter(date => new Date(date) > now);

        set({ 
          nextScheduledCleanup: remaining.length > 0 ? remaining[0] : null,
        });
      },

      purgeExpiredExports: async () => {
        const { exportHistory } = get();
        
        const expired = exportHistory.filter(record => 
          isExportExpired(record.retentionInfo)
        );

        for (const record of expired) {
          get().updateExportRecord(record.id, { status: 'purged' });
          get().addAuditEvent(record.id, {
            timestamp: createTimestamp(),
            eventType: 'purged',
            actor: 'system',
            action: 'Export expired and purged',
            details: { retentionPolicy: record.retentionInfo },
            clinicallySignificant: record.clinicalMetadata.clinicalSignificance !== 'routine',
          });
        }
      },

      extendRetention: (historyId: string, additionalDays: number) => {
        const record = get().exportHistory.find(r => r.id === historyId);
        if (!record) return;

        const currentExpiration = new Date(record.retentionInfo.expirationDate);
        const newExpiration = new Date(currentExpiration.getTime() + additionalDays * 24 * 60 * 60 * 1000);

        get().updateRetentionInfo(historyId, {
          expirationDate: newExpiration.toISOString() as ISO8601Timestamp,
          extendedRetention: true,
          retentionPeriodDays: record.retentionInfo.retentionPeriodDays + additionalDays,
        });

        get().addAuditEvent(historyId, {
          timestamp: createTimestamp(),
          eventType: 'modified',
          actor: record.userId,
          action: 'Retention period extended',
          details: { additionalDays, newExpiration: newExpiration.toISOString() },
          clinicallySignificant: true,
        });
      },

      // Sharing management
      recordShareAccess: (sharingId: string, accessEvent: ShareAccessEvent) => {
        set(state => ({
          sharingHistory: state.sharingHistory.map(share => 
            share.id === sharingId 
              ? { ...share, accessHistory: [...share.accessHistory, accessEvent] }
              : share
          ),
        }));

        // Update access permissions count
        const share = get().sharingHistory.find(s => s.id === sharingId);
        if (share && share.accessPermissions.accessLimitCount) {
          get().updateSharingRecord(sharingId, {
            accessPermissions: {
              ...share.accessPermissions,
              accessLimitUsed: share.accessPermissions.accessLimitUsed + 1,
            },
          });
        }

        // Add audit event to export record
        if (share) {
          get().addAuditEvent(share.exportHistoryId, {
            timestamp: accessEvent.timestamp,
            eventType: 'accessed',
            actor: 'recipient',
            action: `Export ${accessEvent.action} by recipient`,
            details: { sharingId, accessEvent },
            ipAddress: accessEvent.ipAddress,
            userAgent: accessEvent.userAgent,
            clinicallySignificant: accessEvent.action === 'downloaded',
          });
        }
      },

      revokeShare: (sharingId: string) => {
        const share = get().sharingHistory.find(s => s.id === sharingId);
        if (!share) return;

        get().updateSharingRecord(sharingId, {
          sharingStatus: 'revoked',
        });

        get().addAuditEvent(share.exportHistoryId, {
          timestamp: createTimestamp(),
          eventType: 'modified',
          actor: share.userId,
          action: 'Share access revoked',
          details: { sharingId, recipientType: share.recipientType },
          clinicallySignificant: true,
        });
      },

      updateSharePermissions: (sharingId: string, permissions) => {
        const share = get().sharingHistory.find(s => s.id === sharingId);
        if (!share) return;

        get().updateSharingRecord(sharingId, {
          accessPermissions: { ...share.accessPermissions, ...permissions },
        });
      },

      getShareAnalytics: (sharingId: string): ShareAnalytics => {
        const share = get().sharingHistory.find(s => s.id === sharingId);
        if (!share) {
          return {
            totalAccesses: 0,
            accessPattern: 'single',
            averageSessionDuration: 0,
            downloadCount: 0,
            shareCount: 0,
            complianceStatus: 'compliant',
          };
        }

        const accessEvents = share.accessHistory;
        const totalAccesses = accessEvents.length;
        const downloadCount = accessEvents.filter(e => e.action === 'downloaded').length;
        const shareCount = accessEvents.filter(e => e.action === 'shared').length;
        const viewEvents = accessEvents.filter(e => e.action === 'viewed');
        
        const averageSessionDuration = viewEvents.length > 0 
          ? viewEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / viewEvents.length
          : 0;

        const lastAccessed = accessEvents.length > 0
          ? accessEvents[accessEvents.length - 1].timestamp
          : undefined;

        // Determine access pattern
        let accessPattern: ShareAnalytics['accessPattern'] = 'single';
        if (totalAccesses > 10) accessPattern = 'intensive';
        else if (totalAccesses > 3) accessPattern = 'multiple';
        else if (totalAccesses > 1) accessPattern = 'regular';

        // Check compliance
        let complianceStatus: ShareAnalytics['complianceStatus'] = 'compliant';
        if (share.accessPermissions.accessLimitCount && 
            share.accessPermissions.accessLimitUsed > share.accessPermissions.accessLimitCount) {
          complianceStatus = 'violation';
        } else if (share.expirationDate && new Date() > new Date(share.expirationDate)) {
          complianceStatus = 'warning';
        }

        return {
          totalAccesses,
          lastAccessed,
          accessPattern,
          averageSessionDuration,
          downloadCount,
          shareCount,
          complianceStatus,
        };
      },

      // Storage management
      calculateStorageUsage: async (): Promise<number> => {
        const { exportHistory } = get();
        const totalSize = exportHistory.reduce((sum, record) => sum + record.fileSize, 0);
        
        set({ totalStorageUsed: totalSize });
        return totalSize;
      },

      optimizeStorage: async () => {
        // Remove duplicate entries and compress audit trails
        set(state => {
          const optimizedHistory = state.exportHistory.map(record => ({
            ...record,
            auditEvents: record.auditEvents.slice(-50), // Keep only last 50 audit events
          }));

          return { exportHistory: optimizedHistory };
        });

        await get().calculateStorageUsage();
      },

      archiveOldExports: async (olderThan: ISO8601Timestamp) => {
        const cutoffDate = new Date(olderThan);
        
        set(state => ({
          exportHistory: state.exportHistory.map(record => 
            new Date(record.createdAt) < cutoffDate && record.status !== 'archived'
              ? { ...record, status: 'archived' as ExportHistoryStatus }
              : record
          ),
        }));
      },

      // Error handling
      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null, lastSyncError: null });
      },

      retryLastOperation: async () => {
        const state = get();
        if (!state.lastSyncError) return;
        
        try {
          set({ isLoading: true, error: null });
          await get().generateAnalytics();
          set({ isLoading: false, lastSyncError: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Retry failed';
          set({ 
            isLoading: false,
            error: errorMessage,
            lastSyncError: errorMessage,
          });
        }
      },

      // Persistence
      forceSave: async () => {
        try {
          set({ isLoading: true });
          // Zustand persist middleware handles actual saving
          set({ 
            isLoading: false,
            lastSavedAt: createTimestamp(),
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Save failed';
          set({ 
            isLoading: false,
            error: errorMessage,
            lastSyncError: errorMessage,
          });
        }
      },

      loadHistory: async () => {
        try {
          set({ isLoading: true });
          // Zustand persist middleware handles loading
          get().updateRecentExports();
          await get().calculateStorageUsage();
          set({ 
            isLoading: false,
            isHydrated: true,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Load failed';
          set({ 
            isLoading: false,
            error: errorMessage,
            lastSyncError: errorMessage,
          });
        }
      },

      exportHistoryData: (): string => {
        const { exportHistory, sharingHistory, recentExports, frequentlyUsedConfigs } = get();
        return JSON.stringify({
          exportHistory,
          sharingHistory,
          recentExports,
          frequentlyUsedConfigs,
          exportedAt: createTimestamp(),
          version: STORAGE_VERSION,
        });
      },

      importHistoryData: async (data: string): Promise<boolean> => {
        try {
          const parsed = JSON.parse(data);
          
          if (parsed.version !== STORAGE_VERSION) {
            throw new Error('History data version mismatch');
          }

          set({
            exportHistory: parsed.exportHistory || [],
            sharingHistory: parsed.sharingHistory || [],
            recentExports: parsed.recentExports || [],
            frequentlyUsedConfigs: parsed.frequentlyUsedConfigs || [],
          });

          await get().calculateStorageUsage();
          await get().generateAnalytics();
          
          return true;
        } catch (error) {
          set({ error: `History import failed: ${error}` });
          return false;
        }
      },

      // Maintenance
      validateHistoryIntegrity: async (): Promise<boolean> => {
        const { exportHistory, sharingHistory } = get();
        let isValid = true;
        
        // Check for orphaned sharing records
        for (const share of sharingHistory) {
          if (!exportHistory.find(record => record.id === share.exportHistoryId)) {
            console.warn(`Orphaned sharing record found: ${share.id}`);
            isValid = false;
          }
        }

        // Check for invalid dates
        for (const record of exportHistory) {
          if (isNaN(new Date(record.createdAt).getTime())) {
            console.warn(`Invalid creation date in record: ${record.id}`);
            isValid = false;
          }
        }

        return isValid;
      },

      repairHistoryData: async () => {
        // Remove orphaned sharing records
        set(state => {
          const validExportIds = new Set(state.exportHistory.map(r => r.id));
          return {
            sharingHistory: state.sharingHistory.filter(share => 
              validExportIds.has(share.exportHistoryId)
            ),
          };
        });

        // Fix invalid dates
        set(state => ({
          exportHistory: state.exportHistory.map(record => {
            if (isNaN(new Date(record.createdAt).getTime())) {
              return { ...record, createdAt: createTimestamp() };
            }
            return record;
          }),
        }));
      },

      compactHistory: () => {
        // Remove old completed exports beyond retention
        const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
        
        set(state => ({
          exportHistory: state.exportHistory.filter(record => 
            record.status !== 'completed' || 
            new Date(record.createdAt) > sixMonthsAgo ||
            state.pinnedExports.includes(record.id)
          ),
        }));
      },

      // State management
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
      },
    })),
    {
      name: STORAGE_KEY,
      storage: createExportHistoryStorage(),
      version: 1,
      
      // Only persist essential history data
      partialize: (state) => ({
        exportHistory: state.exportHistory.slice(-100), // Keep last 100 exports
        sharingHistory: state.sharingHistory,
        recentExports: state.recentExports,
        frequentlyUsedConfigs: state.frequentlyUsedConfigs,
        pinnedExports: state.pinnedExports,
        totalStorageUsed: state.totalStorageUsed,
        retentionSummary: state.retentionSummary,
        version: STORAGE_VERSION,
        lastSavedAt: state.lastSavedAt,
      }),
      
      // Handle rehydration
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Failed to rehydrate export history store:', error);
            state?.setError(`Rehydration failed: ${error.message}`);
          } else {
            state?.setHydrated(true);
            state?.loadHistory();
            console.log('Export history store rehydrated successfully');
          }
        };
      },
      
      // Migration support
      migrate: (persistedState: any, version: number) => {
        // Future migration logic would go here
        return persistedState;
      },
    }
  )
);

// ============================================================================
// COMPUTED SELECTORS
// ============================================================================

export const exportHistorySelectors = {
  // Get exports by status
  getExportsByStatus: (state: ExportHistoryState, status: ExportHistoryStatus): readonly ExportHistoryRecord[] => {
    return state.exportHistory.filter(record => record.status === status);
  },

  // Get exports requiring attention (expiring, overdue, etc.)
  getExportsRequiringAttention: (state: ExportHistoryState): readonly ExportHistoryRecord[] => {
    const now = new Date();
    return state.exportHistory.filter(record => {
      const daysUntilExpiry = getDaysUntilExpiration(record.retentionInfo);
      return (
        daysUntilExpiry <= 7 || // Expiring within a week
        isExportExpired(record.retentionInfo) || // Already expired
        record.qualityMetrics.clinicalReviewRequired // Needs review
      );
    });
  },

  // Get storage summary
  getStorageSummary: (state: ExportHistoryState) => {
    const totalSize = state.totalStorageUsed;
    const exportCount = state.exportHistory.length;
    const averageSize = exportCount > 0 ? totalSize / exportCount : 0;
    
    const formatBreakdown = state.exportHistory.reduce((acc, record) => {
      acc[record.format] = (acc[record.format] || 0) + record.fileSize;
      return acc;
    }, {} as Record<ExportFormat['type'], number>);

    return {
      totalSize,
      exportCount,
      averageSize,
      formatBreakdown,
      largestExport: Math.max(...state.exportHistory.map(r => r.fileSize), 0),
    };
  },

  // Get sharing statistics
  getSharingStatistics: (state: ExportHistoryState) => {
    const totalShares = state.sharingHistory.length;
    const activeShares = state.sharingHistory.filter(s => 
      !['expired', 'revoked'].includes(s.sharingStatus)
    ).length;
    const totalAccesses = state.sharingHistory.reduce((sum, share) => 
      sum + share.accessHistory.length, 0
    );

    return {
      totalShares,
      activeShares,
      totalAccesses,
      averageAccessesPerShare: totalShares > 0 ? totalAccesses / totalShares : 0,
      mostActiveShare: state.sharingHistory
        .sort((a, b) => b.accessHistory.length - a.accessHistory.length)[0] || null,
    };
  },

  // Get clinical significance summary
  getClinicalSignificanceSummary: (state: ExportHistoryState) => {
    const total = state.exportHistory.length;
    const critical = state.exportHistory.filter(r => 
      r.clinicalMetadata.clinicalSignificance === 'critical'
    ).length;
    const important = state.exportHistory.filter(r => 
      r.clinicalMetadata.clinicalSignificance === 'important'
    ).length;
    const routine = state.exportHistory.filter(r => 
      r.clinicalMetadata.clinicalSignificance === 'routine'
    ).length;

    return {
      total,
      critical,
      important,
      routine,
      criticalPercentage: total > 0 ? critical / total : 0,
      importantPercentage: total > 0 ? important / total : 0,
    };
  },
};

// ============================================================================
// PERIODIC MAINTENANCE
// ============================================================================

// Scheduled cleanup interval
if (typeof window !== 'undefined') {
  // Daily cleanup check
  setInterval(() => {
    const state = useExportHistoryStore.getState();
    state.performScheduledCleanup();
    state.purgeExpiredExports();
  }, 24 * 60 * 60 * 1000); // Every 24 hours

  // Weekly analytics update
  setInterval(() => {
    const state = useExportHistoryStore.getState();
    state.generateAnalytics();
  }, 7 * 24 * 60 * 60 * 1000); // Every week

  // Monthly maintenance
  setInterval(() => {
    const state = useExportHistoryStore.getState();
    state.validateHistoryIntegrity().then(isValid => {
      if (!isValid) {
        state.repairHistoryData();
      }
    });
    state.optimizeStorage();
  }, 30 * 24 * 60 * 60 * 1000); // Every month
}

export default useExportHistoryStore;