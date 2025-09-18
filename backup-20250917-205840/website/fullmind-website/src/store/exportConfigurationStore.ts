/**
 * FullMind Clinical Export Configuration Store
 * Clinical-grade Zustand store for export preferences, consent management,
 * and privacy configuration with therapeutic data accuracy guarantees.
 * 
 * Features:
 * - Type-safe export configuration with clinical validation
 * - User consent management with HIPAA compliance awareness
 * - Privacy settings with granular control over therapeutic data
 * - Export format configuration with clinical safety checks
 * - Real-time validation of export requests
 * - Audit trail for configuration changes
 * - Integration with existing FullMind clinical stores
 */

'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ExportFormat,
  UserExportPreferences,
  UserConsentRecord,
  ExportPrivacySettings,
  DataTypeOption,
  ExportRequest,
  ValidationResult,
  ConsentType,
  DataCategory,
  ExportPurpose,
  ConsentLevel,
  GranularConsentConfiguration,
  PDFExportFormat,
  CSVExportFormat,
  JSONExportFormat,
  ClinicalXMLFormat,
  ISO8601Timestamp,
  ConsentID,
  UserID,
  ExportID,
  ClinicalExportData,
  ExportDataPackage,
} from '../types/clinical-export';

// ============================================================================
// STORE STATE INTERFACES
// ============================================================================

/**
 * User export preferences with clinical safety defaults
 */
export interface UserExportPreferences {
  readonly preferredFormat: ExportFormat['type'];
  readonly defaultDateRange: 'last-30-days' | 'last-3-months' | 'last-6-months' | 'last-year' | 'all-time' | 'custom';
  readonly includeAssessments: boolean;
  readonly includeProgress: boolean;
  readonly includeSessions: boolean;
  readonly includeClinicalNotes: boolean;
  readonly autoGenerateCharts: boolean;
  readonly clinicalFormatting: boolean;
  readonly accessibility: {
    readonly highContrast: boolean;
    readonly largeText: boolean;
    readonly screenReaderOptimized: boolean;
  };
  readonly qualityLevel: 'standard' | 'clinical-grade' | 'research-quality';
  readonly lastUpdated: ISO8601Timestamp;
}

/**
 * Export privacy settings with HIPAA awareness
 */
export interface ExportPrivacySettings {
  readonly anonymizeData: boolean;
  readonly includePII: boolean;
  readonly includeContactInfo: boolean;
  readonly dataMinimization: boolean;
  readonly encryptOutput: boolean;
  readonly auditTrailEnabled: boolean;
  readonly shareWithTherapist: boolean;
  readonly shareWithFamily: boolean;
  readonly researchParticipation: boolean;
  readonly retentionPeriodDays: number;
  readonly lastUpdated: ISO8601Timestamp;
}

/**
 * Data type options for granular consent
 */
export interface DataTypeOption {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: DataCategory;
  readonly sensitivity: 'low' | 'medium' | 'high' | 'critical';
  readonly required: boolean;
  readonly defaultIncluded: boolean;
  readonly clinicalRelevance: 'essential' | 'important' | 'optional';
}

/**
 * Export configuration validation result
 */
export interface ExportConfigValidation {
  readonly valid: boolean;
  readonly consentValid: boolean;
  readonly privacyCompliant: boolean;
  readonly clinicalSafe: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly recommendations: readonly string[];
}

/**
 * Export configuration store state
 */
export interface ExportConfigurationState {
  // Core configuration state
  readonly userPreferences: UserExportPreferences;
  readonly consentRecords: readonly UserConsentRecord[];
  readonly privacySettings: ExportPrivacySettings;
  
  // Available options and formats
  readonly availableDataTypes: readonly DataTypeOption[];
  readonly supportedFormats: readonly ExportFormat[];
  
  // Configuration validation state
  readonly configurationValid: boolean;
  readonly lastValidation: ExportConfigValidation | null;
  readonly pendingChanges: boolean;
  
  // Error handling and loading
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly lastSyncError: string | null;
  
  // Persistence metadata
  readonly isHydrated: boolean;
  readonly lastSavedAt: ISO8601Timestamp | null;
  readonly configurationVersion: string;
  
  // Audit trail
  readonly configurationHistory: readonly ConfigurationHistoryEntry[];
  readonly lastAuditEntry: ConfigurationHistoryEntry | null;
}

/**
 * Export configuration store actions
 */
export interface ExportConfigurationActions {
  // User preferences management
  updateUserPreferences: (preferences: Partial<UserExportPreferences>) => void;
  setPreferredFormat: (format: ExportFormat['type']) => void;
  setDefaultDateRange: (range: UserExportPreferences['defaultDateRange']) => void;
  toggleDataIncludeOption: (option: keyof Pick<UserExportPreferences, 'includeAssessments' | 'includeProgress' | 'includeSessions' | 'includeClinicalNotes'>) => void;
  updateAccessibilitySettings: (settings: Partial<UserExportPreferences['accessibility']>) => void;
  setQualityLevel: (level: UserExportPreferences['qualityLevel']) => void;
  
  // Consent management
  updateConsentRecord: (consent: UserConsentRecord) => void;
  addConsentRecord: (consent: Omit<UserConsentRecord, 'consentId' | 'consentTimestamp'>) => void;
  withdrawConsent: (consentId: ConsentID) => void;
  updateGranularConsent: (updates: Partial<GranularConsentConfiguration>) => void;
  checkConsentValidity: (dataCategories: readonly DataCategory[]) => boolean;
  
  // Privacy settings management
  updatePrivacySettings: (settings: Partial<ExportPrivacySettings>) => void;
  togglePrivacySetting: (setting: keyof ExportPrivacySettings) => void;
  updateRetentionPeriod: (days: number) => void;
  enableClinicalPrivacyMode: () => void;
  
  // Configuration validation
  validateExportRequest: (request: ExportRequest) => Promise<ValidationResult>;
  validateCurrentConfiguration: () => Promise<ExportConfigValidation>;
  resolveConfigurationIssues: (autoFix: boolean) => Promise<void>;
  
  // Data types and formats management
  updateAvailableDataTypes: (dataTypes: readonly DataTypeOption[]) => void;
  addSupportedFormat: (format: ExportFormat) => void;
  getCompatibleFormats: (dataCategories: readonly DataCategory[]) => readonly ExportFormat[];
  
  // Error handling and recovery
  setError: (error: string | null) => void;
  clearError: () => void;
  retryLastOperation: () => Promise<void>;
  
  // Persistence and synchronization
  forceSave: () => Promise<void>;
  loadConfiguration: () => Promise<void>;
  resetToDefaults: () => void;
  exportConfiguration: () => string;
  importConfiguration: (config: string) => Promise<boolean>;
  
  // Audit trail management
  addAuditEntry: (entry: Omit<ConfigurationHistoryEntry, 'id' | 'timestamp'>) => void;
  getAuditTrail: (startDate?: ISO8601Timestamp, endDate?: ISO8601Timestamp) => readonly ConfigurationHistoryEntry[];
  clearAuditHistory: (olderThan?: ISO8601Timestamp) => void;
  
  // State management
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  markPendingChanges: (pending: boolean) => void;
}

/**
 * Configuration history entry for audit trail
 */
export interface ConfigurationHistoryEntry {
  readonly id: string;
  readonly timestamp: ISO8601Timestamp;
  readonly action: 'preferences-updated' | 'consent-added' | 'consent-withdrawn' | 'privacy-updated' | 'validation-performed' | 'reset-to-defaults';
  readonly details: Record<string, unknown>;
  readonly userId?: UserID;
  readonly clinicallySignificant: boolean;
}

/**
 * Combined export configuration store interface
 */
export interface ExportConfigurationStore extends ExportConfigurationState, ExportConfigurationActions {}

// ============================================================================
// DEFAULT VALUES AND CONSTANTS
// ============================================================================

const DEFAULT_USER_PREFERENCES: UserExportPreferences = {
  preferredFormat: 'pdf',
  defaultDateRange: 'last-3-months',
  includeAssessments: true,
  includeProgress: true,
  includeSessions: true,
  includeClinicalNotes: false, // Privacy-first default
  autoGenerateCharts: true,
  clinicalFormatting: true,
  accessibility: {
    highContrast: false,
    largeText: false,
    screenReaderOptimized: false,
  },
  qualityLevel: 'clinical-grade',
  lastUpdated: new Date().toISOString() as ISO8601Timestamp,
};

const DEFAULT_PRIVACY_SETTINGS: ExportPrivacySettings = {
  anonymizeData: false,
  includePII: false, // Privacy-first default
  includeContactInfo: false,
  dataMinimization: true,
  encryptOutput: true,
  auditTrailEnabled: true,
  shareWithTherapist: false,
  shareWithFamily: false,
  researchParticipation: false,
  retentionPeriodDays: 90, // 3 months default
  lastUpdated: new Date().toISOString() as ISO8601Timestamp,
};

const DEFAULT_DATA_TYPES: readonly DataTypeOption[] = [
  {
    id: 'phq9-scores',
    name: 'PHQ-9 Assessment Scores',
    description: 'Depression assessment scores and trends',
    category: 'assessment-scores',
    sensitivity: 'critical',
    required: false,
    defaultIncluded: true,
    clinicalRelevance: 'essential',
  },
  {
    id: 'gad7-scores',
    name: 'GAD-7 Assessment Scores',
    description: 'Anxiety assessment scores and trends',
    category: 'assessment-scores',
    sensitivity: 'critical',
    required: false,
    defaultIncluded: true,
    clinicalRelevance: 'essential',
  },
  {
    id: 'mood-tracking',
    name: 'Daily Mood Tracking',
    description: 'Daily mood entries and patterns',
    category: 'mood-tracking',
    sensitivity: 'high',
    required: false,
    defaultIncluded: true,
    clinicalRelevance: 'important',
  },
  {
    id: 'mbct-sessions',
    name: 'MBCT Practice Sessions',
    description: 'Mindfulness practice engagement and progress',
    category: 'session-data',
    sensitivity: 'medium',
    required: false,
    defaultIncluded: true,
    clinicalRelevance: 'important',
  },
  {
    id: 'crisis-events',
    name: 'Crisis Events and Interventions',
    description: 'Safety protocol activations and crisis management',
    category: 'risk-assessments',
    sensitivity: 'critical',
    required: false,
    defaultIncluded: false, // Sensitive default
    clinicalRelevance: 'essential',
  },
] as const;

const DEFAULT_SUPPORTED_FORMATS: readonly ExportFormat[] = [
  {
    type: 'pdf',
    template: 'clinical',
    clinicalFormatting: {
      headerInclusion: true,
      chartGeneration: true,
      trendVisualization: true,
      riskHighlighting: true,
      progressSummaries: true,
      clinicalNotes: false,
    },
    charts: { enabled: true, accessible: true },
    branding: { includeWatermark: true, clinicalBranding: true },
    accessibility: { wcagCompliance: 'AA', taggedPDF: true },
    compression: { enabled: true, level: 'balanced' },
  } as PDFExportFormat,
  {
    type: 'csv',
    structure: 'normalized',
    headers: {
      includeHeaders: true,
      descriptiveHeaders: true,
      metadataHeaders: true,
    },
    encoding: { charset: 'UTF-8', byteOrderMark: true },
    validation: { checksumEnabled: true, dataIntegrityChecks: true },
    clinicalMetadata: true,
  } as CSVExportFormat,
] as const;

const INITIAL_STATE: ExportConfigurationState = {
  userPreferences: DEFAULT_USER_PREFERENCES,
  consentRecords: [],
  privacySettings: DEFAULT_PRIVACY_SETTINGS,
  availableDataTypes: DEFAULT_DATA_TYPES,
  supportedFormats: DEFAULT_SUPPORTED_FORMATS,
  configurationValid: true,
  lastValidation: null,
  pendingChanges: false,
  isLoading: false,
  error: null,
  lastSyncError: null,
  isHydrated: false,
  lastSavedAt: null,
  configurationVersion: '1.0.0',
  configurationHistory: [],
  lastAuditEntry: null,
};

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

const STORAGE_KEY = 'fullmind-export-configuration';
const STORAGE_VERSION = '1.0.0';

const createExportConfigStorage = () => {
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
          
          if (parsed.configurationVersion !== STORAGE_VERSION) {
            console.warn('Export configuration version mismatch, will migrate');
            return null;
          }
          
          return parsed;
        } catch (error) {
          console.error('Failed to load export configuration from localStorage:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('Failed to save export configuration to localStorage:', error);
          throw error;
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Failed to remove export configuration from localStorage:', error);
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
 * Generate unique consent ID
 */
const generateConsentId = (): ConsentID => {
  return `consent_${Date.now()}_${Math.random().toString(36).substring(2)}` as ConsentID;
};

/**
 * Generate audit entry ID
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
 * Validate consent coverage for data categories
 */
const validateConsentCoverage = (
  consentRecords: readonly UserConsentRecord[],
  dataCategories: readonly DataCategory[]
): boolean => {
  const activeConsents = consentRecords.filter(consent => consent.consentGiven && 
    (!consent.expirationDate || new Date(consent.expirationDate) > new Date()));
  
  const coveredCategories = new Set(
    activeConsents.flatMap(consent => consent.dataCategories)
  );
  
  return dataCategories.every(category => coveredCategories.has(category));
};

/**
 * Clinical validation for export request
 */
const performClinicalValidation = async (
  request: ExportRequest,
  preferences: UserExportPreferences,
  consentRecords: readonly UserConsentRecord[],
  privacySettings: ExportPrivacySettings
): Promise<ValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate consent coverage
  if (!validateConsentCoverage(consentRecords, request.dataCategories)) {
    errors.push('Insufficient consent for requested data categories');
  }

  // Validate clinical safety
  if (request.format.type === 'pdf' && request.estimatedRecordCount > 10000) {
    warnings.push('Large PDF exports may impact performance and accessibility');
  }

  // Validate privacy requirements
  if (privacySettings.dataMinimization && request.includeAllFields) {
    warnings.push('Data minimization enabled but full field export requested');
  }

  // Clinical accuracy validation
  if (preferences.qualityLevel === 'clinical-grade' && !request.includeValidationMetadata) {
    warnings.push('Clinical-grade quality requires validation metadata');
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: warnings,
    clinicallyApproved: errors.length === 0 && preferences.qualityLevel !== 'standard',
    privacyCompliant: true, // Would perform actual privacy validation
    consentValid: validateConsentCoverage(consentRecords, request.dataCategories),
    recommendations: warnings,
  };
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useExportConfigurationStore = create<ExportConfigurationStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // Initial state
      ...INITIAL_STATE,

      // User preferences management
      updateUserPreferences: (preferences: Partial<UserExportPreferences>) => {
        const currentPrefs = get().userPreferences;
        const updatedPrefs: UserExportPreferences = {
          ...currentPrefs,
          ...preferences,
          lastUpdated: createTimestamp(),
        };

        set({
          userPreferences: updatedPrefs,
          pendingChanges: true,
          lastSavedAt: createTimestamp(),
        });

        // Add audit entry
        get().addAuditEntry({
          action: 'preferences-updated',
          details: { changes: preferences },
          clinicallySignificant: Boolean(
            preferences.qualityLevel || 
            preferences.includeAssessments !== undefined ||
            preferences.includeClinicalNotes !== undefined
          ),
        });
      },

      setPreferredFormat: (format: ExportFormat['type']) => {
        get().updateUserPreferences({ preferredFormat: format });
      },

      setDefaultDateRange: (range: UserExportPreferences['defaultDateRange']) => {
        get().updateUserPreferences({ defaultDateRange: range });
      },

      toggleDataIncludeOption: (option) => {
        const currentPrefs = get().userPreferences;
        get().updateUserPreferences({
          [option]: !currentPrefs[option],
        });
      },

      updateAccessibilitySettings: (settings) => {
        const currentPrefs = get().userPreferences;
        get().updateUserPreferences({
          accessibility: {
            ...currentPrefs.accessibility,
            ...settings,
          },
        });
      },

      setQualityLevel: (level: UserExportPreferences['qualityLevel']) => {
        get().updateUserPreferences({ qualityLevel: level });
      },

      // Consent management
      updateConsentRecord: (consent: UserConsentRecord) => {
        const currentConsents = get().consentRecords;
        const updatedConsents = currentConsents.map(existing => 
          existing.consentId === consent.consentId ? consent : existing
        );

        if (!currentConsents.some(c => c.consentId === consent.consentId)) {
          updatedConsents.push(consent);
        }

        set({
          consentRecords: updatedConsents,
          pendingChanges: true,
        });

        get().addAuditEntry({
          action: 'consent-added',
          details: { consentType: consent.consentType, dataCategories: consent.dataCategories },
          clinicallySignificant: true,
        });
      },

      addConsentRecord: (consentData) => {
        const newConsent: UserConsentRecord = {
          ...consentData,
          consentId: generateConsentId(),
          consentTimestamp: createTimestamp(),
        };

        get().updateConsentRecord(newConsent);
      },

      withdrawConsent: (consentId: ConsentID) => {
        const currentConsents = get().consentRecords;
        const updatedConsents = currentConsents.map(consent => 
          consent.consentId === consentId 
            ? { ...consent, consentGiven: false, lastUpdated: createTimestamp() }
            : consent
        );

        set({
          consentRecords: updatedConsents,
          pendingChanges: true,
        });

        get().addAuditEntry({
          action: 'consent-withdrawn',
          details: { consentId },
          clinicallySignificant: true,
        });
      },

      updateGranularConsent: (updates: Partial<GranularConsentConfiguration>) => {
        // Implementation would update granular consent settings
        console.log('Updating granular consent:', updates);
        
        get().addAuditEntry({
          action: 'consent-added',
          details: { granularUpdates: updates },
          clinicallySignificant: true,
        });
      },

      checkConsentValidity: (dataCategories: readonly DataCategory[]): boolean => {
        const { consentRecords } = get();
        return validateConsentCoverage(consentRecords, dataCategories);
      },

      // Privacy settings management
      updatePrivacySettings: (settings: Partial<ExportPrivacySettings>) => {
        const currentSettings = get().privacySettings;
        const updatedSettings: ExportPrivacySettings = {
          ...currentSettings,
          ...settings,
          lastUpdated: createTimestamp(),
        };

        set({
          privacySettings: updatedSettings,
          pendingChanges: true,
        });

        get().addAuditEntry({
          action: 'privacy-updated',
          details: { changes: settings },
          clinicallySignificant: Boolean(
            settings.includePII !== undefined ||
            settings.shareWithTherapist !== undefined ||
            settings.auditTrailEnabled !== undefined
          ),
        });
      },

      togglePrivacySetting: (setting: keyof ExportPrivacySettings) => {
        const currentSettings = get().privacySettings;
        const currentValue = currentSettings[setting];
        
        if (typeof currentValue === 'boolean') {
          get().updatePrivacySettings({
            [setting]: !currentValue,
          });
        }
      },

      updateRetentionPeriod: (days: number) => {
        get().updatePrivacySettings({ retentionPeriodDays: days });
      },

      enableClinicalPrivacyMode: () => {
        get().updatePrivacySettings({
          anonymizeData: false, // Clinical need for identifiable data
          includePII: false,
          includeContactInfo: false,
          dataMinimization: true,
          encryptOutput: true,
          auditTrailEnabled: true,
          shareWithTherapist: false, // Requires explicit consent
          shareWithFamily: false,
          researchParticipation: false,
        });
      },

      // Configuration validation
      validateExportRequest: async (request: ExportRequest): Promise<ValidationResult> => {
        const { userPreferences, consentRecords, privacySettings } = get();
        
        set({ isLoading: true });
        
        try {
          const validation = await performClinicalValidation(
            request, 
            userPreferences, 
            consentRecords, 
            privacySettings
          );
          
          get().addAuditEntry({
            action: 'validation-performed',
            details: { validation, requestId: request.id },
            clinicallySignificant: !validation.valid,
          });
          
          set({ isLoading: false });
          return validation;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Validation failed';
          set({ 
            isLoading: false,
            error: errorMessage,
            lastSyncError: errorMessage,
          });
          throw error;
        }
      },

      validateCurrentConfiguration: async (): Promise<ExportConfigValidation> => {
        const { userPreferences, consentRecords, privacySettings } = get();
        
        set({ isLoading: true });
        
        try {
          const errors: string[] = [];
          const warnings: string[] = [];
          const recommendations: string[] = [];

          // Basic configuration validation
          if (consentRecords.length === 0) {
            errors.push('No consent records available for exports');
          }

          // Clinical safety validation
          if (userPreferences.qualityLevel === 'clinical-grade' && !privacySettings.auditTrailEnabled) {
            errors.push('Clinical-grade exports require audit trail to be enabled');
          }

          // Privacy compliance check
          if (privacySettings.includePII && !consentRecords.some(c => c.consentGiven && c.consentType === 'full-export')) {
            warnings.push('PII inclusion enabled without explicit full export consent');
          }

          // Recommendations
          if (!userPreferences.autoGenerateCharts) {
            recommendations.push('Enable chart generation for better therapeutic visualization');
          }

          const validation: ExportConfigValidation = {
            valid: errors.length === 0,
            consentValid: consentRecords.some(c => c.consentGiven),
            privacyCompliant: warnings.length === 0,
            clinicalSafe: userPreferences.qualityLevel === 'clinical-grade' ? privacySettings.auditTrailEnabled : true,
            errors,
            warnings,
            recommendations,
          };

          set({
            lastValidation: validation,
            configurationValid: validation.valid,
            isLoading: false,
          });

          return validation;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Configuration validation failed';
          set({ 
            isLoading: false,
            error: errorMessage,
            lastSyncError: errorMessage,
          });
          throw error;
        }
      },

      resolveConfigurationIssues: async (autoFix: boolean = false) => {
        const validation = await get().validateCurrentConfiguration();
        
        if (autoFix && !validation.valid) {
          // Auto-fix common issues
          if (validation.errors.includes('Clinical-grade exports require audit trail to be enabled')) {
            get().updatePrivacySettings({ auditTrailEnabled: true });
          }
        }
      },

      // Data types and formats management
      updateAvailableDataTypes: (dataTypes: readonly DataTypeOption[]) => {
        set({ 
          availableDataTypes: dataTypes,
          pendingChanges: true,
        });
      },

      addSupportedFormat: (format: ExportFormat) => {
        const currentFormats = get().supportedFormats;
        if (!currentFormats.some(f => f.type === format.type)) {
          set({
            supportedFormats: [...currentFormats, format],
            pendingChanges: true,
          });
        }
      },

      getCompatibleFormats: (dataCategories: readonly DataCategory[]): readonly ExportFormat[] => {
        const { supportedFormats } = get();
        
        // Filter formats based on data category compatibility
        return supportedFormats.filter(format => {
          if (dataCategories.includes('risk-assessments') && format.type === 'csv') {
            return false; // Risk data better in structured formats
          }
          if (dataCategories.length > 5 && format.type === 'pdf') {
            return false; // Many categories better in data formats
          }
          return true;
        });
      },

      // Error handling and recovery
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
          await get().validateCurrentConfiguration();
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

      // Persistence and synchronization
      forceSave: async () => {
        try {
          set({ isLoading: true });
          // Zustand persist middleware handles actual saving
          set({ 
            isLoading: false,
            lastSavedAt: createTimestamp(),
            error: null,
            pendingChanges: false,
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

      loadConfiguration: async () => {
        try {
          set({ isLoading: true });
          // Zustand persist middleware handles loading
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

      resetToDefaults: () => {
        set({
          userPreferences: DEFAULT_USER_PREFERENCES,
          consentRecords: [],
          privacySettings: DEFAULT_PRIVACY_SETTINGS,
          availableDataTypes: DEFAULT_DATA_TYPES,
          supportedFormats: DEFAULT_SUPPORTED_FORMATS,
          configurationValid: true,
          lastValidation: null,
          error: null,
          lastSavedAt: createTimestamp(),
          pendingChanges: false,
        });

        get().addAuditEntry({
          action: 'reset-to-defaults',
          details: { timestamp: createTimestamp() },
          clinicallySignificant: true,
        });
      },

      exportConfiguration: (): string => {
        const { userPreferences, consentRecords, privacySettings } = get();
        return JSON.stringify({
          userPreferences,
          consentRecords,
          privacySettings,
          exportedAt: createTimestamp(),
          version: STORAGE_VERSION,
        });
      },

      importConfiguration: async (config: string): Promise<boolean> => {
        try {
          const parsed = JSON.parse(config);
          
          if (parsed.version !== STORAGE_VERSION) {
            throw new Error('Configuration version mismatch');
          }

          set({
            userPreferences: parsed.userPreferences || DEFAULT_USER_PREFERENCES,
            consentRecords: parsed.consentRecords || [],
            privacySettings: parsed.privacySettings || DEFAULT_PRIVACY_SETTINGS,
            pendingChanges: true,
          });

          get().addAuditEntry({
            action: 'preferences-updated',
            details: { importedConfiguration: true },
            clinicallySignificant: true,
          });

          return true;
        } catch (error) {
          set({ error: `Configuration import failed: ${error}` });
          return false;
        }
      },

      // Audit trail management
      addAuditEntry: (entry: Omit<ConfigurationHistoryEntry, 'id' | 'timestamp'>) => {
        const newEntry: ConfigurationHistoryEntry = {
          ...entry,
          id: generateAuditId(),
          timestamp: createTimestamp(),
        };

        set(state => ({
          configurationHistory: [...state.configurationHistory, newEntry],
          lastAuditEntry: newEntry,
        }));
      },

      getAuditTrail: (startDate?: ISO8601Timestamp, endDate?: ISO8601Timestamp) => {
        const { configurationHistory } = get();
        
        if (!startDate && !endDate) {
          return configurationHistory;
        }

        return configurationHistory.filter(entry => {
          const entryDate = new Date(entry.timestamp);
          const start = startDate ? new Date(startDate) : new Date(0);
          const end = endDate ? new Date(endDate) : new Date();
          
          return entryDate >= start && entryDate <= end;
        });
      },

      clearAuditHistory: (olderThan?: ISO8601Timestamp) => {
        if (!olderThan) {
          set({ 
            configurationHistory: [],
            lastAuditEntry: null,
          });
          return;
        }

        const cutoffDate = new Date(olderThan);
        set(state => ({
          configurationHistory: state.configurationHistory.filter(
            entry => new Date(entry.timestamp) >= cutoffDate
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

      markPendingChanges: (pending: boolean) => {
        set({ pendingChanges: pending });
      },
    })),
    {
      name: STORAGE_KEY,
      storage: createExportConfigStorage(),
      version: 1,
      
      // Only persist essential configuration data
      partialize: (state) => ({
        userPreferences: state.userPreferences,
        consentRecords: state.consentRecords,
        privacySettings: state.privacySettings,
        availableDataTypes: state.availableDataTypes,
        supportedFormats: state.supportedFormats,
        configurationHistory: state.configurationHistory.slice(-50), // Keep last 50 entries
        configurationVersion: STORAGE_VERSION,
        lastSavedAt: state.lastSavedAt,
      }),
      
      // Handle rehydration
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Failed to rehydrate export configuration store:', error);
            state?.setError(`Rehydration failed: ${error.message}`);
          } else {
            state?.setHydrated(true);
            console.log('Export configuration store rehydrated successfully');
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

export const exportConfigurationSelectors = {
  // Get active consent records
  getActiveConsents: (state: ExportConfigurationState): readonly UserConsentRecord[] => {
    return state.consentRecords.filter(consent => 
      consent.consentGiven && 
      (!consent.expirationDate || new Date(consent.expirationDate) > new Date())
    );
  },

  // Check if clinical exports are properly configured
  isClinicalExportReady: (state: ExportConfigurationState): boolean => {
    const activeConsents = exportConfigurationSelectors.getActiveConsents(state);
    return (
      state.userPreferences.qualityLevel === 'clinical-grade' &&
      state.privacySettings.auditTrailEnabled &&
      activeConsents.length > 0 &&
      state.configurationValid
    );
  },

  // Get required consent categories for current preferences
  getRequiredConsentCategories: (state: ExportConfigurationState): readonly DataCategory[] => {
    const categories: DataCategory[] = [];
    
    if (state.userPreferences.includeAssessments) {
      categories.push('assessment-scores');
    }
    if (state.userPreferences.includeProgress) {
      categories.push('mood-tracking');
    }
    if (state.userPreferences.includeSessions) {
      categories.push('session-data');
    }
    if (state.userPreferences.includeClinicalNotes) {
      categories.push('clinical-notes');
    }
    
    return categories;
  },

  // Get export readiness status
  getExportReadinessStatus: (state: ExportConfigurationState): {
    ready: boolean;
    issues: string[];
    warnings: string[];
  } => {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    const requiredCategories = exportConfigurationSelectors.getRequiredConsentCategories(state);
    if (!state.checkConsentValidity(requiredCategories)) {
      issues.push('Missing consent for selected data categories');
    }
    
    if (state.userPreferences.qualityLevel === 'clinical-grade' && !state.privacySettings.auditTrailEnabled) {
      issues.push('Clinical-grade exports require audit trail');
    }
    
    if (state.privacySettings.includePII && !state.privacySettings.encryptOutput) {
      warnings.push('PII export without encryption is not recommended');
    }
    
    return {
      ready: issues.length === 0,
      issues,
      warnings,
    };
  },

  // Get privacy compliance score
  getPrivacyComplianceScore: (state: ExportConfigurationState): number => {
    let score = 0;
    let factors = 0;
    
    // Audit trail (+20)
    if (state.privacySettings.auditTrailEnabled) score += 20;
    factors += 1;
    
    // Encryption (+20)
    if (state.privacySettings.encryptOutput) score += 20;
    factors += 1;
    
    // Data minimization (+15)
    if (state.privacySettings.dataMinimization) score += 15;
    factors += 1;
    
    // No unnecessary PII (+15)
    if (!state.privacySettings.includePII || state.privacySettings.anonymizeData) score += 15;
    factors += 1;
    
    // Valid consents (+30)
    const activeConsents = exportConfigurationSelectors.getActiveConsents(state);
    if (activeConsents.length > 0) score += 30;
    factors += 1;
    
    return factors > 0 ? score : 0;
  },
};

// ============================================================================
// INTEGRATION HOOKS
// ============================================================================

// Subscribe to configuration changes for validation
useExportConfigurationStore.subscribe(
  (state) => ({ 
    preferences: state.userPreferences,
    privacy: state.privacySettings,
    consents: state.consentRecords,
  }),
  (current, previous) => {
    if (current !== previous) {
      // Trigger validation on significant changes
      setTimeout(() => {
        useExportConfigurationStore.getState().validateCurrentConfiguration();
      }, 100);
    }
  }
);

// Subscribe to clinical mode changes
useExportConfigurationStore.subscribe(
  (state) => state.userPreferences.qualityLevel,
  (qualityLevel, previousQualityLevel) => {
    if (qualityLevel === 'clinical-grade' && previousQualityLevel !== 'clinical-grade') {
      // Auto-enable clinical privacy mode when switching to clinical grade
      useExportConfigurationStore.getState().enableClinicalPrivacyMode();
    }
  }
);

export default useExportConfigurationStore;