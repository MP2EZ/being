/**
 * FEAT-860 — an inline card on Home telling the user the privacy policy changed materially.
 *
 * AN INLINE CARD, NOT A BLOCKING SURFACE (crisis ruling). Home hosts the 988 button, and the
 * root `RootCrisisButton` floats over it; everything below exists so this card can never
 * stand between a user and that button:
 *   - no RN `Modal`, no `Alert`, no presenter call — it is ordinary content in Home's ScrollView;
 *   - nothing here sets `accessibilityViewIsModal`, `accessibilityElementsHidden` or
 *     `importantForAccessibility="no-hide-descendants"`, so a screen reader keeps the crisis
 *     button in its tree;
 *   - no focus is moved on mount and nothing is announced: the card is found by exploring,
 *     like the rest of Home;
 *   - both controls keep their frames clear of the crisis button's exclusion column
 *     (`marginRight`, the `home-practices-entry` precedent) and carry the __DEV__ check.
 *
 * ACKNOWLEDGEMENT, NEVER CONSENT. "Got it" records that the user saw the notice; there is no
 * "Accept" or "I agree", and nothing is gated on the answer. The acknowledgement is written
 * only on that explicit tap (`usePolicyChangeNotice.acknowledge`) — never on render.
 *
 * Imported by `CleanHomeScreen.tsx` ONLY, by deep path and never through the consent barrel
 * (FEAT-376): a barrel re-export would put this in every importer's eager graph, safety
 * paths included. `policyNoticeCrisisReachability.test.tsx` pins the importer set.
 *
 * Renders nothing unless something is pending, so a user with nothing to read sees no change
 * to Home at all.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colorSystem, semantic, spacing, borderRadius, typography, TOUCH_TARGETS } from '@/core/theme';
import { CRISIS_BUTTON_EXCLUSION_RECT } from '@/features/crisis/constants/crisisButtonGeometry';
import { useCrisisExclusionAssertion } from '@/core/hooks/useCrisisExclusionAssertion';
import { POLICY_MATERIAL_CHANGE_SUMMARIES } from '../constants/policyMaterialChanges';
import { usePolicyChangeNotice } from '../hooks/usePolicyChangeNotice';

export const POLICY_NOTICE_TEST_IDS = {
  card: 'policy-change-notice',
  read: 'policy-change-notice-read',
  dismiss: 'policy-change-notice-dismiss',
} as const;

interface PolicyChangeNoticeProps {
  /** Opens the bundled policy text. Supplied by the host, which owns navigation. */
  onReadPolicy: () => void;
}

const PolicyChangeNotice: React.FC<PolicyChangeNoticeProps> = ({ onReadPolicy }) => {
  const { pendingVersions, acknowledge } = usePolicyChangeNotice();
  // DEBUG-643: __DEV__-only check that each control really is clear of the crisis FAB's
  // exclusion region on the running device; undefined in Release.
  const readExclusionCheck = useCrisisExclusionAssertion(POLICY_NOTICE_TEST_IDS.read, 'scrolls');
  const dismissExclusionCheck = useCrisisExclusionAssertion(POLICY_NOTICE_TEST_IDS.dismiss, 'scrolls');

  if (pendingVersions.length === 0) return null;

  return (
    <View style={styles.card} testID={POLICY_NOTICE_TEST_IDS.card}>
      <Text style={styles.title} accessibilityRole="header" accessibilityLevel={2}>
        Privacy Policy updated
      </Text>
      <View style={styles.list}>
        {pendingVersions.map((version) => (
          <View key={version} style={styles.row} testID={`policy-change-notice-item-${version}`}>
            <Text style={styles.bullet}>{'•'}</Text>
            <Text style={styles.summary}>{POLICY_MATERIAL_CHANGE_SUMMARIES[version] ?? ''}</Text>
          </View>
        ))}
      </View>
      <Pressable
        style={[styles.button, styles.readButton]}
        onLayout={readExclusionCheck}
        onPress={onReadPolicy}
        accessibilityRole="button"
        accessibilityLabel="Read the policy"
        accessibilityHint="Opens the full privacy policy"
        testID={POLICY_NOTICE_TEST_IDS.read}
      >
        <Text style={styles.readButtonText}>Read the policy</Text>
      </Pressable>
      <Pressable
        style={[styles.button, styles.dismissButton]}
        onLayout={dismissExclusionCheck}
        onPress={() => {
          void acknowledge();
        }}
        accessibilityRole="button"
        accessibilityLabel="Got it"
        accessibilityHint="Dismisses this notice"
        testID={POLICY_NOTICE_TEST_IDS.dismiss}
      >
        <Text style={styles.dismissButtonText}>Got it</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: spacing[16],
    padding: spacing[16],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colorSystem.gray[400],
  },
  title: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[8],
  },
  list: {
    marginBottom: spacing[12],
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing[8],
  },
  bullet: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    marginRight: spacing[8],
  },
  summary: {
    flex: 1,
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
  },
  // Stacked, not side by side: each control is inset from the right by the crisis button's
  // exclusion column, so two across would leave neither wide enough for its label at large
  // text sizes. `marginRight` (never `paddingRight`) moves the Pressable's own FRAME, which
  // is what `intersectsCrisisButtonExclusion` measures. It is declared last because
  // StyleSheet is last-key-wins.
  button: {
    minHeight: TOUCH_TARGETS.minimum,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[8],
    marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left,
  },
  readButton: {
    borderWidth: 1,
    borderColor: colorSystem.base.midnightBlue,
  },
  readButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.midnightBlue,
  },
  dismissButton: {
    backgroundColor: colorSystem.base.midnightBlue,
  },
  dismissButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
});

export default PolicyChangeNotice;
