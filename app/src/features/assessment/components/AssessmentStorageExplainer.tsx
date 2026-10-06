/**
 * "Your answers won't be saved" explainer for the screening's first question
 * (FEAT-717 AC3, FEAT-665 slice A2a-ii).
 *
 * UNWIRED LEAF: no importers and no barrel entry until FEAT-685 mounts it. Pinned by
 * wellnessWriteConsentBoundary.test.ts, which also allowlists this file as a reader of
 * the Art. 9 write predicate.
 *
 * Crisis ruling: it renders only at step 1, decides once per mount and never
 * subscribes, so the text cannot change under the reader mid-question. It returns plain
 * Text in normal flow or null: no role, no live region, never an alert. A predicate
 * fault renders nothing rather than throwing into the question screen. The copy
 * describes storage only, and every variant ends with the same support sentence.
 */

import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { semantic, spacing, typography } from '@/core/theme';
import {
  decideWellnessWrite,
  type WellnessWriteBlockReason,
  type WellnessWriteDecision,
} from '@/core/stores/consentStore';

/** Verbatim suffix of every variant (crisis ruling). */
export const STORAGE_EXPLAINER_SUPPORT_SENTENCE =
  'If your answers suggest you may need support, it will still appear right away.';

/**
 * The copy for each block reason (crisis 2026-10-03; refused revised by compliance
 * 2026-10-05). Null only for a reason the type does not know, which renders nothing.
 */
export function explainerCopy(reason: WellnessWriteBlockReason): string | null {
  switch (reason) {
    case 'refused':
      return "Your answers to this check-in won't be saved, because of your wellness data choice. You can change it later in Profile, under Privacy & Data. If your answers suggest you may need support, it will still appear right away.";
    case 'revoked':
      return "Your answers to this check-in won't be saved, because you withdrew your consent. If your answers suggest you may need support, it will still appear right away.";
    case 'under_age':
      return "Your answers to this check-in won't be saved, because we can't confirm that you're 18 or older. If your answers suggest you may need support, it will still appear right away.";
    case 'missing':
      return "Your answers to this check-in won't be saved, because we can't confirm your privacy choices on this device right now. If your answers suggest you may need support, it will still appear right away.";
    case 'loading':
      return "Your privacy choices are still loading, so your answers to this check-in aren't being saved yet. If your answers suggest you may need support, it will still appear right away.";
    default: {
      // A new block reason must be given copy here before it compiles.
      const unhandled: never = reason;
      void unhandled;
      return null;
    }
  }
}

export interface AssessmentStorageExplainerProps {
  /** 1-based question number. */
  currentStep: number;
}

const AssessmentStorageExplainer: React.FC<AssessmentStorageExplainerProps> = ({ currentStep }) => {
  const [decision] = useState<WellnessWriteDecision | null>(() => {
    try {
      return decideWellnessWrite();
    } catch {
      return null;
    }
  });

  if (currentStep !== 1 || decision === null || decision.allowed) return null;
  const copy = explainerCopy(decision.reason);
  if (copy === null) return null;

  return (
    <Text style={styles.explainer} testID="assessment-storage-explainer">
      {copy}
    </Text>
  );
};

const styles = StyleSheet.create({
  explainer: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.muted,
    lineHeight: typography.bodySmall.size * 1.5,
    marginBottom: spacing[16],
  },
});

export default AssessmentStorageExplainer;
