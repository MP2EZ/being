/**
 * FullMind Clinical Components - Export Index
 * 
 * Centralized export for all clinical-grade components supporting
 * therapeutic data export functionality with MBCT compliance.
 */

// Export Configuration Component
export { ExportConfiguration } from './ExportConfiguration/ExportConfiguration';
export type { ExportConfigurationProps } from './ExportConfiguration/ExportConfiguration';

// Export Progress Component
export { ExportProgress } from './ExportProgress/ExportProgress';
export type { ExportProgressProps } from './ExportProgress/ExportProgress';

// Consent Interface Component
export { ConsentInterface } from './ConsentInterface/ConsentInterface';
export type { ConsentInterfaceProps } from './ConsentInterface/ConsentInterface';

// Export Results Component
export { ExportResults } from './ExportResults/ExportResults';
export type { ExportResultsProps } from './ExportResults/ExportResults';

// Clinical Export Demo Component
export { ClinicalExportDemo } from './ClinicalExportDemo/ClinicalExportDemo';
export type { ClinicalExportDemoProps } from './ClinicalExportDemo/ClinicalExportDemo';

// Re-export key types for convenience
export type {
  ClinicalExportOptions,
  ExportStatus,
  ExportStage,
  UserConsentRecord,
  ExportResult,
  SharingMethod,
  SharingConfiguration,
  DataCategory,
  ConsentLevel,
  ExportFormat,
  ExportIntendedUse,
  MBCTConsentGuidance
} from '@/types/clinical-export';