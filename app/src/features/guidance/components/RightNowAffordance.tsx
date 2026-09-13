/**
 * The Home entry point into domain-specific guidance (FEAT-457, slice 4).
 *
 * Until this shipped, `DomainGuidance` was registered on the root stack and
 * reachable only by an explicit `navigate` — the feature was inert in production
 * and that unreachability WAS the rollout control. This is what replaces it, so
 * the flag (`domain_guidance`) is now the control instead.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TWO-LINE LABEL RESOLVES A REAL DILEMMA. Do not collapse it to one line.
 *
 * A purely GENERIC label ("Facing something hard right now") is a bait-and-switch:
 * `AVAILABLE_DOMAINS` is `['conflict']` and a SituationPicker is out of scope
 * until a second domain exists, so a generic label navigates straight into
 * conflict-specific content. A reader in grief taps it, gets a page about
 * conflict, and the app has demonstrated at the worst possible moment that it does
 * not know what they need.
 *
 * A purely SPECIFIC label ("Conflict with someone") presented as a peer of Daily
 * Practice ASSERTS a hardship at a reader who may not be in one.
 *
 * So: a generic frame that promises no menu, plus the honest destination beneath
 * it. When career/grief/pain land, the secondary line becomes the picker entry and
 * the primary line does not change — the label is forward-compatible with the
 * SituationPicker rather than needing to be relitigated.
 *
 * On shared-device exposure (compliance, amended ruling): this row renders
 * IDENTICALLY for every user, every day, regardless of scores, assessment history,
 * or whether it has ever been opened. It therefore discloses a fact about the
 * APP'S CONTENT CATALOG, not a fact about this user's STATE — categorically
 * weaker than a score-conditional affordance, which is the thing that was
 * rejected. `accessibilityLabel` mirrors the visible text exactly rather than
 * being reduced: once the visible row is cleared, the assistive channel carries
 * the same information, and stripping it would be an accessibility regression
 * traded for no privacy gain.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🔴 THIS COMPONENT MUST NOT READ ASSESSMENT STATE. No `useGuidanceGate`, no
 * `decideGuidanceAccess`, no store read. One gate, one site — and it is on the
 * destination screen, not here. Two consequences that look like bugs and are not:
 *
 *   · It stays visible, unstyled and undisabled for a SUPPRESSED reader. An
 *     affordance that disappears based on a score is an ambient disclosure of that
 *     score to anyone who can see the screen. And for a suppressed reader the tap
 *     is a NET-POSITIVE path: it lands on `GuidanceSuppressionNotice`, which
 *     carries a live button into CrisisResources tagged `source: 'guidance_gate'`.
 *     Suppression is a routing decision, never a hiding decision.
 *   · It is reachable pre-assessment. A reader with no assessment data resolves to
 *     `gentle` and gets real Tier 0/1 content. Gating this on assessment
 *     completion would create a second, ungoverned gate outside the real one.
 *
 * NO CONTENT PREVIEW. No tier text, no quote, no domain copy beyond the
 * situation-first binding label — Home is not behind the gate, so anything
 * rendered here bypasses it entirely.
 *
 * NEVER a badge, count, urgency colour or state indicator. It must look identical
 * every day: an always-present affordance that changes appearance becomes a prompt
 * to be in distress.
 *
 * Import note (FEAT-376): this file pulls in `DOMAIN_BINDINGS` only — constants
 * over types, with no edge to `guidanceGate` or `guidanceContent`. That is what
 * keeps Home's eager module graph clean, and it is why there is still no
 * `features/guidance/index.ts` barrel to import this from.
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { colorSystem, semantic, spacing, typography } from '@/core/theme';
import { CRISIS_BUTTON_EXCLUSION_RECT } from '@/features/crisis/constants/crisisButtonGeometry';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';
import { useAnalytics } from '@/core/analytics';
import { DOMAIN_BINDINGS } from '../constants/domainBindings';
import type { GuidanceDomain } from '../types/guidance';

/**
 * The single authored domain. Read from `AVAILABLE_DOMAINS`' only member rather
 * than hardcoded, so adding a second domain surfaces here as a decision to make
 * (a picker) rather than a string that silently stayed correct.
 */
const ENTRY_DOMAIN: GuidanceDomain = 'conflict';

const PRIMARY_LABEL = 'Something hard right now';

type Nav = StackNavigationProp<RootStackParamList>;

const RightNowAffordance: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { trackGuidanceOpened } = useAnalytics();

  // Situation-language, read from the binding table rather than hardcoded —
  // `domainBindings.ts` clause 2: a distressed reader will not translate "my
  // mother died" into "review Radical Acceptance", so the label is the situation
  // and never the principle.
  const destination = DOMAIN_BINDINGS[ENTRY_DOMAIN].label;

  const handlePress = useCallback(() => {
    // Reach only, and NO `domain` argument — the tracker takes none by design.
    // The hardship domain is the wellness inference itself.
    trackGuidanceOpened();
    navigation.navigate('DomainGuidance', { domain: ENTRY_DOMAIN });
  }, [navigation, trackGuidanceOpened]);

  return (
    <Pressable
      style={styles.row}
      onPress={handlePress}
      accessibilityRole="button"
      // Parity with the visible text, not a reduction (compliance ruling).
      accessibilityLabel={`${PRIMARY_LABEL}: ${destination}`}
      accessibilityHint={`Opens guidance for ${destination.toLowerCase()}`}
      testID="home-guidance-entry"
    >
      <View style={styles.labels}>
        <Text style={styles.primary}>{PRIMARY_LABEL}</Text>
        <Text style={styles.secondary}>{destination}</Text>
      </View>
      <Text style={styles.action}>›</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // A quiet ROW, never a card. A card would make this a peer of Daily Practice and
  // therefore a thing to do today; it is an always-available door, not a ritual.
  //
  // Intrinsic height (no flexGrow), for the same reason FEAT-293 gave the Practices
  // row one: a growing sibling competes with the daily card for vertical budget.
  // The mechanism moved in DEBUG-469 — Home now scrolls, and the card is
  // `flexGrow: 1` with a `minHeight` floor rather than `flex: 1` — so this row no
  // longer squeezes the card without bound; past the floor the ScrollView scrolls.
  // The rule survives the rewrite even though its original justification did not.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGETS.minimum,
    paddingVertical: spacing[12],
    marginTop: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
    // DEBUG-547: moves the Pressable's OWN FRAME out of the crisis FAB's
    // contested column. Must NOT be `paddingRight`: the testID and this style are
    // on the same Pressable, so padding sits inside its border box — the frame
    // stays put, the FAB at zIndex 9999 keeps winning every tap in the overlap,
    // and only the glyph moves. Measured on device before the fix:
    //   crisis-button-root [331,523][375,567] vs the sibling Practices row [24,516][351,561].
    // The correctness criterion is `intersectsCrisisButtonExclusion(...) === false`
    // — right edge <= 303 — NOT "the label moved". Note the FAB's real touch band
    // starts at x=319, not the 331 the hierarchy reports, because of its 12pt
    // hitSlop; clearing only the painted bounds under-fixes by 12pt.
    // Declared LAST because RN StyleSheet is last-key-wins: a `marginHorizontal`
    // added below this line would silently override it.
    marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left,
  },
  labels: {
    flex: 1,
  },
  primary: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.primary,
  },
  secondary: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    marginTop: spacing[4],
  },
  action: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
    marginLeft: spacing[12],
  },
});

export default RightNowAffordance;
