/**
 * Legal Documents Content
 * Imports all legal documents from docs/legal/public/ and exports them
 * for use in the LegalDocumentScreen component.
 *
 * COMPLIANCE:
 * - Single source of truth: Same files used by website and app
 * - Offline available: Bundled at build time via Metro transformer
 * - Always accessible: No network dependency
 *
 * IMPLEMENTATION NOTE:
 * Uses require() instead of import because TypeScript's module resolution
 * can't find files outside the app/ directory. Metro handles the actual
 * bundling at build time, so this still works correctly at runtime.
 * The files remain in docs/legal/public/ (single source of truth).
 */

// Import markdown files as raw text strings using require()
// This bypasses TypeScript module resolution and lets Metro handle it at runtime
// Path: app/src/features/profile/content -> ../../../../../docs/legal/public/
/* eslint-disable @typescript-eslint/no-require-imports */
const privacyPolicyContent: string = require('../../../../../docs/legal/public/privacy-policy.md').default;
const termsOfServiceContent: string = require('../../../../../docs/legal/public/terms-of-service.md').default;
const medicalDisclaimerContent: string = require('../../../../../docs/legal/public/medical-disclaimer.md').default;
const noticeOfPrivacyPracticesContent: string = require('../../../../../docs/legal/public/notice-of-privacy-practices.md').default;
const californiaPrivacyContent: string = require('../../../../../docs/legal/public/california-privacy.md').default;
const doNotSellContent: string = require('../../../../../docs/legal/public/do-not-sell.md').default;
const supportContent: string = require('../../../../../docs/legal/public/support.md').default;
/* eslint-enable @typescript-eslint/no-require-imports */

export type LegalDocumentType =
  | 'privacy-policy'
  | 'terms-of-service'
  | 'medical-disclaimer'
  | 'notice-of-privacy-practices'
  | 'california-privacy'
  | 'do-not-sell'
  | 'support';

export interface LegalDocument {
  id: LegalDocumentType;
  title: string;
  shortTitle: string;
  description: string;
  content: string;
}

export const legalDocuments: Record<LegalDocumentType, LegalDocument> = {
  'privacy-policy': {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    shortTitle: 'Privacy',
    description: 'How we collect, use, and protect your data',
    content: privacyPolicyContent,
  },
  'terms-of-service': {
    id: 'terms-of-service',
    title: 'Terms of Service',
    shortTitle: 'Terms',
    description: 'Rules and conditions for using Being',
    content: termsOfServiceContent,
  },
  'medical-disclaimer': {
    id: 'medical-disclaimer',
    title: 'Medical Disclaimer',
    shortTitle: 'Medical',
    description: 'Important limitations on wellness guidance',
    content: medicalDisclaimerContent,
  },
  'notice-of-privacy-practices': {
    id: 'notice-of-privacy-practices',
    title: 'Notice of Privacy Practices',
    shortTitle: 'HIPAA Notice',
    description: 'Your rights under health privacy laws',
    content: noticeOfPrivacyPracticesContent,
  },
  'california-privacy': {
    id: 'california-privacy',
    title: 'California Privacy Rights',
    shortTitle: 'California',
    description: 'Additional rights for California residents',
    content: californiaPrivacyContent,
  },
  'do-not-sell': {
    id: 'do-not-sell',
    title: 'Do Not Sell My Personal Information',
    shortTitle: 'Do Not Sell',
    description: 'Opt-out of data sales (we never sell)',
    content: doNotSellContent,
  },
  'support': {
    id: 'support',
    title: 'Support',
    shortTitle: 'Support',
    description: 'How to contact us and get help',
    content: supportContent,
  },
};

export const legalDocumentsList: LegalDocument[] = Object.values(legalDocuments);

export function getLegalDocument(id: LegalDocumentType): LegalDocument | undefined {
  return legalDocuments[id];
}
