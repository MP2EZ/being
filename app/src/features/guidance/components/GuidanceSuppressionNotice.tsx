/**
 * What a suppressed reader sees instead of domain guidance (FEAT-433, slice 3a).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 THIS RENDERS ZERO DOMAIN CONTENT. That is the invariant, and it outranks
 * everything else in this file. No tier, no validation callout, no practice — and
 * the screen must not have called `loadGuidanceContent` to get here.
 *
 * WHY THIS SURFACE EXISTS AT ALL, RATHER THAN A BARE AUTO-REDIRECT.
 * The hand-off uses `navigate`, never `replace` (zero crisis entry points in this
 * app use `replace`). `navigate` PUSHES CrisisResources on top of this screen, so
 * backing out of crisis resources lands the reader here again, still suppressed.
 * An unguarded auto-redirect would immediately re-push and trap them with no way
 * back — so the screen fires its redirect at most once per mount, and this notice
 * is what remains underneath, carrying a manual route back in.
 *
 * COPY CONSTRAINTS (crisis lens, FEAT-433 planning):
 *   · never name a score, a threshold, or an assessment
 *   · never diagnose
 *   · frame the swap as "this is not the right thing right now", never as
 *     "you are too unwell for this"
 * The reader did nothing wrong and nothing is being withheld as a penalty; the
 * copy has to carry that or the routing reads as punishment.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadius, colorSystem, semantic, spacing, typography } from '@/core/theme';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';

interface GuidanceSuppressionNoticeProps {
  readonly onOpenCrisisResources: () => void;
}

const GuidanceSuppressionNotice: React.FC<GuidanceSuppressionNoticeProps> = ({
  onOpenCrisisResources,
}) => (
  <View style={styles.container} testID="guidance-suppression-notice">
    <Text style={styles.heading} accessibilityRole="header">
      Let's start somewhere else
    </Text>

    {/* "right thing", not "most useful thing": ranking the reader's choice on a
        utility scale implies they misjudged. And no "today" — temporally bounding
        the distress minimises it for exactly the cohort this surface exists for,
        so "any time" states the 24/7 fact instead. */}
    <Text style={styles.body}>
      Reflection is worth coming back to, but it isn't the right thing right now.
      There are people you can talk to any time who can help with what's going on.
    </Text>

    {/* accessibilityLabel must CONTAIN the visible label (WCAG 2.5.3, Label in Name):
        this is the only hand-off control on the surface, and a Voice Control user
        speaking the words they can see has to be able to activate it. */}
    <Pressable
      onPress={onOpenCrisisResources}
      style={styles.action}
      accessibilityRole="button"
      accessibilityLabel="See support options"
      accessibilityHint="Shows crisis lines and immediate support options"
      testID="guidance-open-crisis-resources"
    >
      <Text style={styles.actionLabel}>See support options</Text>
    </Pressable>

    {/* NOT "whenever you want it". The gate declares no staleness window
        (guidanceGate.ts), so a suppressing score keeps suppressing until a NEW
        assessment is taken — wanting it back is not what restores it. A reader who
        returns tomorrow to the same notice would read the broken promise as exactly
        the penalty this copy must not convey. */}
    <Text style={styles.footnote}>
      The guidance will still be here.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing[24],
  },
  heading: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[12],
  },
  body: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight,
    color: semantic.text.primary,
    marginBottom: spacing[24],
  },
  action: {
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    // status.info (#2563EB) against base.white measures 5.17:1 — passes WCAG AA for
    // normal text (4.5:1). Measured, not assumed; re-check if the token moves.
    backgroundColor: colorSystem.status.info,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing[24],
  },
  actionLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  footnote: {
    marginTop: spacing[16],
    // Quieting is STRUCTURAL here, not chromatic: semantic.text.secondary is a
    // deliberate alias of primary (DEBUG-323 — the gray ramp has no accessible
    // step between them), so a lighter colour is not available and would be an
    // AA failure if minted. Size and position carry the subordination instead.
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
  },
});

export default GuidanceSuppressionNotice;
