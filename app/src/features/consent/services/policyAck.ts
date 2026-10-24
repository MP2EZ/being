/**
 * FEAT-860 — the local record that a user has seen the privacy policy at some version.
 *
 * Its own SecureStore key, deliberately NOT a field on `LegalGateConsents`: that record's
 * `version` is `CONSENT_VERSION` (the consent schema), its shape is validated field by
 * field (`isLegalGateConsents`), and widening it would change what counts as a valid gate
 * pass. This is not wellness data either (no `storeWellnessBlob`, no DPIA change), and it is
 * local only: not in Settings Backup, not in any payload.
 *
 * ACKNOWLEDGEMENT, NEVER CONSENT. Nothing reads this to permit processing; it only decides
 * whether Home shows the "Privacy Policy updated" notice. It is written (a) by
 * `recordLegalGateConsents`, at the bundled `headerVersion`, because a user who just ticked
 * the privacy-policy box has seen the current text, and (b) on an explicit tap of the
 * notice's "Got it". Never on render, never on background.
 *
 * Erasure: the key is in `ACCOUNT_ERASURE_SECURE_STORE_KEYS` (`SecureStorageService.ts`),
 * deleted by `resetConsent`, and swept by `retireErasedRecords`. This module holds no
 * module-scope or zustand cache, so nothing needs an `erasureResetRegistry` entry.
 *
 * Imports nothing from `consentStore` (which imports this), so it adds no cycle.
 */
import * as SecureStore from 'expo-secure-store';
import { logSecurity } from '@/core/services/logging';
import { getPolicyRevisions } from './policyRevisions';

export const PRIVACY_POLICY_ACK_KEY = 'privacy_policy_ack_v1';

export type PolicyAckSource = 'legal_gate' | 'notice';

export interface PolicyAck {
  version: string;
  acknowledgedAt: number;
  source: PolicyAckSource;
}

export type PolicyAckRead =
  | { status: 'absent' }
  | { status: 'present'; ack: PolicyAck }
  | { status: 'error' };

const isPolicyAck = (value: unknown): value is PolicyAck => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r['version'] === 'string' &&
    r['version'].length > 0 &&
    typeof r['acknowledgedAt'] === 'number' &&
    (r['source'] === 'legal_gate' || r['source'] === 'notice')
  );
};

/**
 * Never rejects. `absent` covers a missing key AND a malformed value: a corrupt record
 * vouches for nothing, so the notice may show and the user's tap rewrites it. `error` is a
 * storage fault, and the caller hides for this launch. The log carries a category only.
 */
export async function readPolicyAck(): Promise<PolicyAckRead> {
  let stored: string | null;
  try {
    stored = await SecureStore.getItemAsync(PRIVACY_POLICY_ACK_KEY);
  } catch {
    try {
      logSecurity('privacy policy acknowledgement could not be read', 'low', {
        component: 'policyAck',
        action: 'readPolicyAck',
        result: 'failure',
        reason: 'read_failed',
      });
    } catch {
      // A logger fault must not escape a read that is never allowed to throw.
    }
    return { status: 'error' };
  }
  if (!stored) return { status: 'absent' };
  try {
    const parsed: unknown = JSON.parse(stored);
    return isPolicyAck(parsed) ? { status: 'present', ack: parsed } : { status: 'absent' };
  } catch {
    return { status: 'absent' };
  }
}

/**
 * Record an acknowledgement at the bundled policy's header version. Rejects on a storage
 * fault so the explicit "Got it" tap can tell. A bundled policy with no parseable header
 * writes nothing (there is no version to record).
 */
export async function writePolicyAck(source: PolicyAckSource): Promise<void> {
  const { headerVersion } = getPolicyRevisions();
  if (headerVersion === null) return;
  const ack: PolicyAck = { version: headerVersion, acknowledgedAt: Date.now(), source };
  await SecureStore.setItemAsync(PRIVACY_POLICY_ACK_KEY, JSON.stringify(ack));
}
