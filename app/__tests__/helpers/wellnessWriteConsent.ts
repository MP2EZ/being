/**
 * Consent seeding for suites that reach a FEAT-318 write gate (FEAT-667).
 *
 * `consentStore` boots at `loading`, which `decideWellnessWrite()` blocks
 * (FEAT-664). A suite that persists wellness data but is not ABOUT consent seeds
 * `granted` in a `beforeEach` rather than editing its assertions; a suite that is
 * about the gate seeds each blocked reason directly.
 *
 * Seeds the real store, so the real predicate decides — nothing here mocks it.
 * `missing` relies on the legal-gate mirror being empty, which it is unless a
 * suite records legal-gate consents.
 */

import { useConsentStore, type WellnessWriteBlockReason } from '@/core/stores/consentStore';

export type SeededWellnessWriteConsent = 'granted' | WellnessWriteBlockReason;

export function seedWellnessWriteConsent(state: SeededWellnessWriteConsent): void {
  const { consentCache } = useConsentStore.getState();
  if (state === 'granted' || state === 'refused') {
    useConsentStore.setState({
      consentStatus: 'valid',
      consentCache: { ...consentCache, canProcessMentalHealthData: state === 'granted' },
    });
    return;
  }
  useConsentStore.setState({ consentStatus: state });
}
