/**
 * Legal Documents Content
 *
 * Wraps the auto-generated string exports in `./legalContent.generated.ts` with
 * the metadata (title, description, etc.) used by the LegalDocumentScreen.
 *
 * The generator (`scripts/generate-legal-content.js`) syncs from the canonical
 * sources at `docs/legal/*.md` (worktree root, outside `app/`) into a TS module
 * inside `app/src/` so Metro can resolve it in Release-mode bundling. Edit the
 * `.md` sources, not the generated file — `postinstall` and `prestart`/`preios`/
 * `preandroid` regenerate. The generated file is gitignored.
 */

import {
  privacyPolicyContent,
  termsOfServiceContent,
  medicalDisclaimerContent,
  californiaPrivacyContent,
  multiStatePrivacyContent,
  supportContent,
} from './legalContent.generated';

export type LegalDocumentType =
  | 'privacy-policy'
  | 'terms-of-service'
  | 'medical-disclaimer'
  | 'california-privacy'
  | 'multi-state-privacy'
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
  'california-privacy': {
    id: 'california-privacy',
    title: 'California Privacy Rights',
    shortTitle: 'California',
    description: 'Additional rights for California residents',
    content: californiaPrivacyContent,
  },
  'multi-state-privacy': {
    id: 'multi-state-privacy',
    title: 'Multi-State Privacy Rights',
    shortTitle: 'Multi-State',
    description: 'Rights for TX, CO, CT, VA residents (and CA summary)',
    content: multiStatePrivacyContent,
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
