/**
 * Profile Feature - Public API
 *
 * User profile, account settings, and app configuration
 */

export { default as ProfileScreen } from './screens/ProfileScreen';
export { default as AccountSettingsScreen } from './screens/AccountSettingsScreen';
export { default as AppSettingsScreen } from './screens/AppSettingsScreen';
export { default as LegalDocumentsListScreen } from './screens/LegalDocumentsListScreen';
export { default as LegalDocumentScreen } from './screens/LegalDocumentScreen';

// Legal document content and types
export {
  legalDocuments,
  legalDocumentsList,
  getLegalDocument,
  type LegalDocument,
  type LegalDocumentType,
} from './content/legalDocuments';
