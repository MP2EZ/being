/**
 * FEAT-860 — which material privacy-policy changes Home should tell the user about.
 *
 * Show predicate (all four):
 *   1. `consentStatus === 'valid'`
 *   2. onboarding is complete
 *   3. a legal-gate record exists (`getLegalGateConsents`, which is erasure-aware)
 *   4. the acknowledgement is absent, or older than the latest material revision
 *
 * Holds no cache of its own: storage is read fresh on every mount, so there is nothing for
 * an account erasure to leave stale (no `erasureResetRegistry` entry).
 *
 * FAILURE IS SILENT AND SAFE. This runs on Home, which hosts the 988 button. A storage
 * fault, a throw anywhere below, or an unmount mid-read all resolve to "nothing pending":
 * the notice is withheld for this launch and a category is logged by `readPolicyAck`. It
 * never throws and never delays render — the read is fire-and-forget behind an effect.
 *
 * `acknowledge` is the ONLY writer in this feature besides `recordLegalGateConsents`, and
 * it is called from exactly one place: the explicit "Got it" tap.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getLegalGateConsents, useConsentStore } from '@/core/stores/consentStore';
import { useSettingsStore } from '@/core/stores/settingsStore';
import { logSecurity } from '@/core/services/logging';
import { getPolicyRevisions, pendingMaterialVersions } from '../services/policyRevisions';
import { readPolicyAck, writePolicyAck } from '../services/policyAck';

export interface PolicyChangeNotice {
  /** Material versions not yet acknowledged, oldest first. Empty means: render nothing. */
  pendingVersions: string[];
  /** Record an acknowledgement and hide the notice. Never rejects. */
  acknowledge: () => Promise<void>;
}

const NONE: string[] = [];

export function usePolicyChangeNotice(): PolicyChangeNotice {
  const consentStatus = useConsentStore((s) => s.consentStatus);
  const onboardingCompleted = useSettingsStore((s) => s.settings?.onboardingCompleted === true);
  const [pendingVersions, setPendingVersions] = useState<string[]>(NONE);
  const acknowledging = useRef(false);

  useEffect(() => {
    if (consentStatus !== 'valid' || !onboardingCompleted) {
      setPendingVersions(NONE);
      return;
    }
    let cancelled = false;
    void (async (): Promise<void> => {
      try {
        const { materialVersions, latestMaterialVersion } = getPolicyRevisions();
        if (latestMaterialVersion === null) return;
        const [gate, ack] = await Promise.all([getLegalGateConsents(), readPolicyAck()]);
        if (cancelled || gate === null || ack.status === 'error') return;
        const pending = pendingMaterialVersions(
          ack.status === 'present' ? ack.ack.version : null,
          materialVersions,
        );
        setPendingVersions(pending.length > 0 ? pending : NONE);
      } catch {
        // Withheld for this launch: the notice is never worth an error on Home.
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, [consentStatus, onboardingCompleted]);

  const acknowledge = useCallback(async (): Promise<void> => {
    if (acknowledging.current) return;
    acknowledging.current = true;
    try {
      await writePolicyAck('notice');
    } catch {
      // Not recorded, so it will show again next launch. Hidden for this one: a card the
      // user cannot dismiss is worse than one that returns.
      try {
        logSecurity('privacy policy acknowledgement could not be written', 'low', {
          component: 'usePolicyChangeNotice',
          action: 'acknowledge',
          result: 'failure',
          reason: 'write_failed',
        });
      } catch {
        // Logging must not throw out of a tap handler.
      }
    } finally {
      acknowledging.current = false;
      setPendingVersions(NONE);
    }
  }, []);

  return { pendingVersions, acknowledge };
}
