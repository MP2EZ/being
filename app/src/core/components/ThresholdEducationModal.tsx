/**
 * Threshold Education Modal
 * Educational content about assessment scoring and thresholds
 * Bottom sheet presentation with philosopher-validated copy
 *
 * ── WHY THIS IS NOT AN RN <Modal> (DEBUG-406) ──
 *
 * It used to be one. RN's <Modal> renders in a SEPARATE NATIVE WINDOW above the
 * JS view hierarchy, and `RootCrisisButton` mounts inside `NavigationContainer`
 * — so while this sheet was open the root crisis button was not dimmed, not
 * covered, but NOT ON SCREEN. That is a zero-988-affordance render state, which
 * `__tests__/safety/crisis-zero-988-windows.test.tsx` exists to forbid.
 *
 * DEBUG-403 established the rule and fixed the immersive case, then scoped this
 * site out along with three others BY ANALOGY — none sits on an immersive route,
 * each is opened by an explicit user tap. DEBUG-406 audited the four
 * individually and ruled that this one DOES NOT STAND, on its own facts:
 *
 *   • The content instructs the user to seek help — "Consider reaching out to a
 *     mental health professional, your doctor, or a trusted person in your life"
 *     — while occluding the app's only route to it. That is a self-contained
 *     contradiction on a single surface; it needs no assumption about the
 *     reader's state to be wrong.
 *   • It carries no 988 affordance of its own.
 *   • Dwell is unbounded and expected to be long: four prose sections in a
 *     scroll view. The other audited sites are transactional.
 *   • Its subject is PHQ-9 / GAD-7 severity semantics, read overwhelmingly by
 *     someone trying to interpret their own number.
 *
 * Do NOT convert this back to <Modal>. `scripts/check-modal-occlusion-guard.js`
 * fails the build if you do.
 *
 * ── WHAT <Modal> SUPPLIED FOR FREE AND IS NOW HAND-ROLLED ──
 *   • the iOS focus trap                → `accessibilityViewIsModal`
 *   • Android back-to-dismiss           → an explicit BackHandler, live only
 *                                         while `visible` (an always-mounted
 *                                         listener swallows back app-wide)
 *   • touch isolation from the content  → the backdrop claims the responder
 *   • JSX paint order                   → this renders AFTER its host's content;
 *                                         placed before, a plain absolute
 *                                         sibling paints UNDERNEATH it
 *
 * ── ACCESSIBILITY DEFECTS FIXED IN THE SAME PASS (DEBUG-406) ──
 *
 * 1. The backdrop used to be the PARENT of the sheet, and `Pressable` defaults
 *    `accessible` to true. On iOS an accessible view sets
 *    `isAccessibilityElement = YES` and VoiceOver does not recurse into it — so
 *    the entire sheet (title, all four sections, the dismiss button) collapsed
 *    into ONE VoiceOver stop announced as "Close assessment information, button".
 *    The inner `accessible={false}` could not undo the outer element. The
 *    educational content was unreachable to VoiceOver, and so was the labelled
 *    way out. The backdrop is now a non-accessible SIBLING.
 *
 *    A full-screen `accessibilityRole="button"` was also the wrong semantic
 *    regardless: under touch-to-explore every point on the screen announced
 *    "Close assessment information" and a double-tap anywhere dismissed. A
 *    backdrop is a pointer-only convenience with an equivalent in the explicit
 *    dismiss button, so it should not be an accessibility element at all.
 *
 * 2. This file used to claim "Dismissible via swipe" and announce "Swipe or tap
 *    to dismiss" — with no gesture handler anywhere in it. A VoiceOver user was
 *    told to swipe, swiped, and nothing happened, on the only route back to 988.
 *    The announcement is gone; focus now moves to the heading instead, which is
 *    what actually signals the surface change.
 *
 * 3. It also claimed "Focus management on open/close" and had none —
 *    `announceForAccessibility` interrupts the speech queue, it does not move
 *    focus. Real focus management is implemented below, including restoring
 *    focus to the trigger on close, which <Modal> gave partially for free when
 *    its window tore down and a plain View does not give at all.
 *
 * ── PHILOSOPHER-VALIDATED (unchanged) ──
 * - Non-catastrophizing language (amber, not red)
 * - Empowering tone ("in your power")
 * - Stoic framing of awareness and agency
 * - No medicalization or diagnostic language
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  BackHandler,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import { spacing, borderRadius, typography } from '@/core/theme';
import { OVERLAY_ACTION_ROW_PADDING_RIGHT } from '@/features/crisis/constants/crisisButtonGeometry';

interface ThresholdEducationModalProps {
  visible: boolean;
  onDismiss: () => void;
  /**
   * The control that opened this sheet. Focus returns here on close.
   *
   * <Modal> used to give partial restoration for free when its native window
   * tore down; a plain overlay gives none, so leaving this unset drops the
   * screen-reader user at the top of the screen with no sense of where they
   * were. Optional so existing call sites keep compiling, but hosts should pass
   * it.
   */
  returnFocusRef?: React.RefObject<React.ComponentRef<typeof Pressable> | null>;
}

// WCAG-AA compliant colors
const colors = {
  white: '#FFFFFF',
  black: '#1C1C1C',
  gray100: '#F3F4F6',
  gray600: '#4B5563',
  gray700: '#374151',
  primaryOrange: '#FF9F43',
};

/**
 * DEBUG-406 — the backdrop is OPAQUE, and it is white.
 *
 * It used to be `rgba(0, 0, 0, 0.5)`. Two independent reasons that cannot come
 * back:
 *
 * 1. DIRECTION. Once this stopped being a <Modal>, the crisis button composites
 *    over this layer. `status.critical` (#991B1B) is a mid-dark red, so
 *    darkening the backdrop does not merely fail 3:1 — the ratio is
 *    NON-MONOTONIC: it falls to ~2.10 around #808080 and recovers only to 2.53
 *    at pure black. There is no dark backdrop at any alpha that passes.
 *    `rgba(0,0,0,0.5)` over this white host measured 2.10:1. White is the
 *    ceiling at 8.31:1 on a standard route, where the button is at full opacity.
 *
 * 2. OPACITY, not alpha. An alpha scrim's composite is a function of whatever
 *    the host renders behind it, so a passing measurement measures TODAY'S
 *    SCREEN rather than this overlay. A future dark card behind it would break
 *    WCAG 1.4.11 with no diff in this file — and `rgba(0,0,0,0.5)` over #171717
 *    measures 2.35:1 and IMPROVES as you darken, which is exactly the trap.
 *    Opaque means the composite is a property of this overlay alone and can be
 *    pinned by a unit test against the token.
 */
const BACKDROP_COLOR = colors.white;

const ThresholdEducationModal: React.FC<ThresholdEducationModalProps> = ({
  visible,
  onDismiss,
  returnFocusRef,
}) => {
  const titleRef = useRef<React.ComponentRef<typeof Text> | null>(null);

  /**
   * Restore focus to the trigger, then dismiss. Wrapped so every exit path —
   * backdrop, button, Android back — behaves identically; a partial
   * implementation is how focus restoration silently regresses.
   */
  const handleDismiss = useCallback(() => {
    const handle = returnFocusRef?.current
      ? findNodeHandle(returnFocusRef.current)
      : null;
    if (handle != null) {
      AccessibilityInfo.setAccessibilityFocus(handle);
    }
    onDismiss();
  }, [onDismiss, returnFocusRef]);

  // Android hardware back — replaces `<Modal onRequestClose={onDismiss}>`.
  // Registered ONLY while visible: a listener mounted unconditionally would
  // swallow back navigation for the whole app.
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible, handleDismiss]);

  /**
   * Move accessibility focus to the heading on open.
   *
   * This replaces the old `announceForAccessibility`, which spoke a string
   * without moving focus — and spoke a swipe instruction for a gesture that did
   * not exist. Moving focus is also what supplies the surface-change
   * announcement that <Modal> used to give for free.
   *
   * The rAF + delayed retry is `HapticsOptInPrompt`'s pattern:
   * `setAccessibilityFocus` silently no-ops if it lands during a window change,
   * and TalkBack in particular needs the later attempt.
   */
  useEffect(() => {
    if (!visible) return undefined;

    const focusTitle = (): void => {
      const handle = titleRef.current ? findNodeHandle(titleRef.current) : null;
      if (handle != null) {
        AccessibilityInfo.setAccessibilityFocus(handle);
      }
    };

    const raf = requestAnimationFrame(focusTitle);
    // TalkBack needs the later attempt: setAccessibilityFocus silently no-ops
    // if it lands during a window change.
    const timer = setTimeout(focusTitle, 350);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      style={styles.overlay}
      accessibilityViewIsModal
      testID="threshold-education-overlay"
      // Touch isolation. <Modal>'s separate window made content beneath
      // unreachable outright; an inline overlay only blocks where its own views
      // cover, and a pan STARTING on the backdrop would otherwise scroll the
      // host's ScrollView underneath. Never `pointerEvents="box-none"` here.
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
    >
      {/*
        Backdrop as a non-accessible SIBLING of the sheet — see docblock item 1.
        No role, no label: it is a pointer-only convenience whose keyboard and
        screen-reader equivalent is the explicit dismiss button below.
      */}
      <Pressable
        style={styles.backdrop}
        onPress={handleDismiss}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      <View style={styles.bottomSheet}>
        {/*
          Prose scrolls; the action does NOT. DEBUG-403 shipped a card whose
          primary action ended up ~13pt inside a clipped region — Maestro
          reported the tap COMPLETED while the app never received it, and the
          user saw the button sliced in half. The fix shape is: cap the sheet,
          let the prose shrink, pin the action outside the scroll region.
        */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.dragIndicator} accessibilityElementsHidden={true} />

          <Text
            ref={titleRef}
            style={styles.title}
            accessibilityRole="header"
            accessible
          >
            About Assessment Scoring
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What Assessments Measure</Text>
            <Text style={styles.bodyText}>
              The PHQ-9 and GAD-7 are scientifically-validated tools that help you notice patterns in your mood and anxiety over the past two weeks. They're a starting point for understanding your experience, not a diagnosis.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Severity Ranges</Text>
            <Text style={styles.bodyText}>
              Scores fall into ranges like "minimal," "mild," "moderate," or "severe." These categories help you and your healthcare provider understand what level of support might be helpful.
            </Text>
            <Text style={styles.bodyText}>
              <Text style={styles.bold}>PHQ-9 (Depression):</Text> Scores range from 0-27
            </Text>
            <Text style={styles.bodyText}>
              <Text style={styles.bold}>GAD-7 (Anxiety):</Text> Scores range from 0-21
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>When to Seek Support</Text>
            <Text style={styles.bodyText}>
              If your score indicates moderate or severe symptoms, this is information in your power to act on. Consider reaching out to a mental health professional, your doctor, or a trusted person in your life.
            </Text>
            <Text style={styles.bodyText}>
              These assessments are tools for awareness, not labels. Your experience is valid regardless of the number.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Regular Check-Ins</Text>
            <Text style={styles.bodyText}>
              Completing assessments every 2-3 weeks helps you notice trends and patterns over time. This awareness is part of practicing mindful self-knowledge.
            </Text>
          </View>
        </ScrollView>

        {/*
          Pinned action row. `paddingRight` keeps this control clear of the
          crisis button's exclusion rect — the button renders at zIndex 9999 and
          WINS an overlapping tap, so an overlap would both fire a crisis entry
          the user did not ask for and swallow the dismissal they did.
        */}
        <View style={styles.actions}>
          <Pressable
            style={styles.dismissButton}
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Got it, thanks. Close assessment information."
            testID="threshold-education-dismiss"
          >
            <Text style={styles.dismissButtonText}>Got It, Thanks</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BACKDROP_COLOR,
  },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '80%',
    paddingBottom: spacing[40], // Safe area padding
    // Reads as layered without a wash — see BACKDROP_COLOR on why a scrim is
    // not available on this surface.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollView: {
    paddingHorizontal: spacing[24],
    flexShrink: 1,
  },
  actions: {
    paddingHorizontal: spacing[24],
    // DEBUG-406 — clears the crisis button's contested column. Derived, never
    // re-typed: see crisisButtonGeometry.ts.
    paddingRight: OVERLAY_ACTION_ROW_PADDING_RIGHT,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray600,
    borderRadius: borderRadius.xs,
    alignSelf: 'center',
    marginTop: spacing[16],
    marginBottom: spacing[24],
  },
  title: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    marginBottom: spacing[24],
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing[24],
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
    marginBottom: spacing[8],
  },
  bodyText: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 24,
    color: colors.gray700,
    marginBottom: spacing[8],
  },
  bold: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  dismissButton: {
    backgroundColor: colors.primaryOrange,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.large,
    marginTop: spacing[16],
    marginBottom: spacing[32],
    minHeight: 48, // Touch target minimum
  },
  dismissButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    textAlign: 'center',
  },
});

export default ThresholdEducationModal;
