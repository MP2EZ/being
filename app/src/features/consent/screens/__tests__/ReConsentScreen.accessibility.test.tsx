/**
 * ReConsentScreen — accessibility contract (FEAT-376 slice C1)
 *
 * `npm run test:accessibility` is `jest --testPathPattern=accessibility`, matched
 * on PATH, and it is a strict CI gate inside `ci-pass`. The consent invariants
 * (no pre-checked boxes, the Art. 9 propagation, the notice copy) live in the
 * sibling `.consentInvariant.privacy.test.tsx` instead, because `test:privacy` is
 * what precommit runs — see that file's header.
 *
 * TWO THINGS THIS SCREEN HAS THAT NO OTHER CONSENT SCREEN DOES:
 *
 *   1. It is the only consent screen whose 988 affordance is the ROOT OVERLAY.
 *      `LegalGate` is in `RootCrisisButton.SUPPRESSED_ROUTES` and re-earns that
 *      suppression with its own pinned footer; `ReConsent` is deliberately NOT
 *      suppressed and owns no crisis section (founder decision D1). So any prop
 *      that hides or covers the overlay is a total 988 blackout HERE
 *      specifically. Guarded below.
 *
 *   2. Every one of its eight controls mounts UNCHECKED, so the unchecked and
 *      disabled states are not edge cases — they are what every user sees first.
 *      That is why the indicator border and the disabled button contrast are
 *      asserted, and why this screen deliberately diverges from
 *      `CombinedLegalGateScreen`'s tokens for both.
 *
 * Yoga does not run under jest, so there are no measured widths or heights —
 * style objects and source only. Same reasoning recorded at
 * `CombinedLegalGateScreen.accessibility.test.tsx:140-146`.
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet, Linking, AccessibilityInfo } from 'react-native';
import {
  colorSystem,
  semantic,
  getContrastRatio,
  TOUCH_TARGETS,
} from '@/core/theme';
import ReConsentScreen from '../ReConsentScreen';
import type { ConsentDelta, ConsentPreferences } from '@/core/stores/consentStore';

const SCREEN_PATH = path.join(__dirname, '../ReConsentScreen.tsx');
const source = fs.readFileSync(SCREEN_PATH, 'utf-8');

/**
 * Source with comments stripped, for assertions about what the screen DOES
 * rather than what it says. This file's header and the screen's own comments
 * deliberately NAME the forbidden props in prose to warn the next reader off
 * them — asserting against raw source would flag those warnings as violations
 * (DEBUG-390).
 */
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** The stylesheet block for a single named style, for source-level assertions. */
const styleBlock = (name: string): string => {
  const start = source.indexOf(`  ${name}: {`);
  if (start === -1) throw new Error(`style "${name}" not found in ReConsentScreen`);
  return source.slice(start, source.indexOf('\n  },', start));
};

const DELTA: ConsentDelta = {
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  changes: [{ version: '1.1.0', summary: 'We raised the minimum age to use Being to 18.' }],
  changedKeys: ['ageGate', 'mentalHealthProcessingConsent'],
  isKnownVersion: true,
};

const CURRENT: ConsentPreferences = {
  analyticsEnabled: true,
  crashReportsEnabled: false,
  cloudSyncEnabled: true,
  researchEnabled: false,
  mentalHealthProcessingConsent: true,
};

const renderScreen = (
  overrides: Partial<React.ComponentProps<typeof ReConsentScreen>> = {},
) =>
  render(
    <ReConsentScreen
      delta={DELTA}
      currentPreferences={CURRENT}
      isSubmitting={false}
      errorMessage={null}
      onSubmit={jest.fn()}
      onDecline={jest.fn()}
      {...overrides}
    />,
  );

// `jest.config.js` sets no `clearMocks`, and `announceForAccessibility` /
// `Linking.openURL` are global `jest.fn()`s from the shared setup — without this
// they bleed across tests.
beforeEach(() => {
  jest.clearAllMocks();
});

describe('FEAT-376 — the screen cannot occlude the root crisis overlay', () => {
  /**
   * `RootCrisisButton` is a later sibling of the entire `Stack.Navigator` inside
   * `<View style={styles.root}>` (`CleanRootNavigator.tsx:693-721`), and the root
   * stack is a JS stack — so a `transparentModal` screen renders beneath it and
   * no in-screen `zIndex` can reach it. Deliberately NOT asserting anything about
   * `zIndex` or absolute positioning here: those pin nothing real. Only the four
   * things that genuinely defeat the overlay are guarded.
   */
  it.each([
    ['accessibilityViewIsModal', /accessibilityViewIsModal\s*[=:]/],
    ['accessibilityElementsHidden', /accessibilityElementsHidden\s*[=:]/],
    [
      'importantForAccessibility="no-hide-descendants"',
      /importantForAccessibility\s*=\s*["'{]?\s*["']?no-hide-descendants/,
    ],
  ])('does not use %s', (_label, propUsage) => {
    expect(code).not.toMatch(propUsage);
  });

  it('renders no React Native <Modal>', () => {
    // RN Modals render in a separate native view hierarchy (UIViewController on
    // iOS, Dialog on Android — unchanged by Fabric) ABOVE any JS overlay.
    // `RootCrisisButton.tsx:46-50` names this as the one thing it cannot survive.
    expect(code).not.toMatch(/<Modal[\s/>]/);
    expect(code).not.toMatch(/^\s*Modal,\s*$/m);
  });

  it('does not block the flow behind a native Alert', () => {
    // Alert is native and sits above the overlay for as long as it is open. A
    // "are you sure?" confirmation on Decline is the most likely way this screen
    // would ship a zero-988 window.
    expect(code).not.toMatch(/Alert\.alert\s*\(/);
  });

  it('the anti-pattern assertions can actually fail', () => {
    // Guards the guards. Comment-stripping plus prop-shaped regexes is exactly
    // the combination that quietly matches nothing at all (DEBUG-390).
    expect('accessibilityViewIsModal={true}').toMatch(/accessibilityViewIsModal\s*[=:]/);
    expect('accessibilityElementsHidden={true}').toMatch(/accessibilityElementsHidden\s*[=:]/);
    expect('importantForAccessibility="no-hide-descendants"').toMatch(
      /importantForAccessibility\s*=\s*["'{]?\s*["']?no-hide-descendants/,
    );
    expect('  <Modal visible={x}>').toMatch(/<Modal[\s/>]/);
    expect('Alert.alert("x")').toMatch(/Alert\.alert\s*\(/);
    expect(code.length).toBeGreaterThan(1000);
  });

  it('keeps the action footer clear of the crisis button corner', () => {
    // `CollapsibleCrisisButton` is 44pt (`:105`) at `right: 0` (`:473`) with
    // hitSlop 12 (`:456`), so it owns x ∈ [right−56, right]. Its `bottom: 100`
    // (`:471`) assumes a tab bar; ReConsent is a root modal with none, so that
    // band lands on this footer and the FAB wins hit-testing.
    expect(styleBlock('actionFooter')).toContain('paddingRight: CRISIS_FAB_CLEARANCE');
    expect(source).toMatch(/const CRISIS_FAB_CLEARANCE = spacing\[72\]/);
  });
});

describe('FEAT-376 — the eight controls are individually reachable', () => {
  /**
   * THE highest-consequence assertion in this file. `accessible={true}` on an
   * ancestor collapses the whole subtree into ONE iOS element, hiding every
   * control from VoiceOver AND from Maestro (INFRA-181, documented at
   * `ConsentToggleCard.tsx:91` and `OnboardingScreen.tsx:655-657`). Nothing else
   * catches it — the screen still renders and still works by touch.
   */
  it.each([['reconsent-group-required'], ['reconsent-group-optional'], ['reconsent-delta']])(
    '%s does not collapse its subtree',
    (testID) => {
      expect(renderScreen().getByTestId(testID).props.accessible).toBe(false);
    },
  );

  it('exposes four checkboxes and four switches', () => {
    const screen = renderScreen();
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    expect(screen.getAllByRole('switch')).toHaveLength(4);
  });

  it('gives every control a non-empty, unique label', () => {
    // Pinning the SHAPE rather than eight exact strings — the latter tests the
    // copy, not the accessibility contract, and goes red on every wording tweak.
    const screen = renderScreen();
    const labels = [...screen.getAllByRole('checkbox'), ...screen.getAllByRole('switch')].map(
      (node) => node.props.accessibilityLabel,
    );

    expect(labels.every((l) => typeof l === 'string' && l.length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(8);
  });
});

describe('FEAT-376 — group structure is navigable non-visually', () => {
  it('declares exactly one level-1 header', () => {
    const headers = renderScreen().getAllByRole('header');
    expect(headers.filter((h) => h.props.accessibilityLevel === 1)).toHaveLength(1);
  });

  it('marks every group and subsection title as a header', () => {
    // RN has no group role, so heading navigation (VoiceOver's rotor, TalkBack's
    // heading jump) IS the group boundary. `CombinedLegalGateScreen.tsx:263,296`
    // ships bare Text for its section titles — a gap in that file, not a
    // convention to mirror.
    const screen = renderScreen();
    expect(screen.getByText('What you agree to').props.accessibilityRole).toBe('header');
    expect(screen.getByText('Optional data sharing').props.accessibilityRole).toBe('header');

    // FEAT-475 subsection split. `Optional — wellness data processing` is
    // deliberately NOT bare `Optional`: this screen already ships `Optional data
    // sharing`, and one rotor entry being a prefix of another is a real
    // navigation ambiguity. `accessibilityLevel` cannot resolve it — RN maps
    // level to AccessibilityNodeInfo on Android only, iOS has no heading-level
    // API — so distinct text is the only channel that works on both platforms.
    const required = screen.getByText('Required to continue');
    const optional = screen.getByText('Optional — wellness data processing');
    expect(required.props.accessibilityRole).toBe('header');
    expect(optional.props.accessibilityRole).toBe('header');
    expect(required.props.accessibilityLevel).toBe(3);
    expect(optional.props.accessibilityLevel).toBe(3);
  });

  it('keeps the subsection headings in sentence case', () => {
    // Uppercase presentation comes from `textTransform` in the style. A literal
    // all-caps string would be spelled out letter-by-letter by some screen readers.
    const screen = renderScreen();
    expect(screen.getByText('Required to continue')).toBeTruthy();
    expect(screen.queryByText('REQUIRED TO CONTINUE')).toBeNull();
  });

  it('states each REQUIRED control\'s obligation on the control itself', () => {
    // Survives a rotor jump into the middle of the list, which a heading does not.
    // Narrowed by FEAT-475 to the three required boxes — NOT weakened to
    // "hint is non-empty", which would stop distinguishing them at all.
    const boxes = renderScreen().getAllByRole('checkbox');
    [0, 1, 2].forEach((i) => {
      expect(boxes[i].props.accessibilityHint).toBe('Required to continue');
      expect(boxes[i].props.accessibilityLabel).toMatch(/, required$/);
    });
  });

  it('states the Art. 9 control is optional, on the control itself', () => {
    const art9 = renderScreen().getAllByRole('checkbox')[3];

    expect(art9.props.accessibilityHint).toMatch(/^Optional\b/);
    expect(art9.props.accessibilityLabel).toMatch(/, optional$/);
    expect(art9.props.accessibilityLabel).not.toMatch(/, required/);
  });

  it('carries optional in the LABEL, which the user cannot switch off', () => {
    // Guards the guard. iOS VoiceOver → Verbosity → Speak Hints disables hints
    // outright and TalkBack truncates them, so a future edit that moved the
    // marker into the hint alone would leave every other assertion here green
    // while the information became unreachable for some users.
    const art9 = renderScreen().getAllByRole('checkbox')[3];

    expect(art9.props.accessibilityLabel.toLowerCase()).toContain('optional');
  });

  it('does not count the Art. 9 box toward the required total', () => {
    /**
     * Asserts the hint is UNCHANGED by toggling Art. 9, not merely that it reads
     * "3 remaining". A bare count assertion here is vacuous: `4 - accepted` and
     * `3 - requiredRemaining` coincide for every state in which Art. 9 is ticked,
     * so it passed against the bundled implementation too. Invariance under the
     * toggle is the property only an unbundled counter has.
     */
    const screen = renderScreen();
    const submitHint = () => screen.getByTestId('reconsent-submit').props.accessibilityHint;
    const onMount = submitHint();

    fireEvent.press(screen.getAllByRole('checkbox')[3]);

    expect(submitHint()).toBe(onMount);
    expect(submitHint()).toMatch(/3 remaining/);
    expect(screen.getByTestId('reconsent-submit').props.accessibilityState.disabled).toBe(true);
  });
});

describe('FEAT-376 — the disabled submit button discloses WHY', () => {
  /**
   * `CombinedLegalGateScreen.tsx:399-414` announces "Continue, dimmed, button"
   * and nothing else — three different conditions can disable it and none is
   * disclosed. Not copied.
   */
  it('is disabled on mount and names what is missing', () => {
    const screen = renderScreen();
    const submit = screen.getByTestId('reconsent-submit');

    expect(submit.props.accessibilityState.disabled).toBe(true);
    expect(submit.props.accessibilityHint).toMatch(/3 remaining/);
  });

  it('changes its hint once enabled', () => {
    // A static hint is announced in BOTH states, which trains users to ignore
    // hints. This asserts the hint is actually state-dependent.
    const screen = renderScreen();
    const submitHint = () => screen.getByTestId('reconsent-submit').props.accessibilityHint;
    const disabledHint = submitHint();

    // Only the three required — pressing all four would still enable Submit and
    // the assertion would pass without proving the Art. 9 box is optional.
    const boxes = screen.getAllByRole('checkbox');
    [0, 1, 2].forEach((i) => fireEvent.press(boxes[i]));

    expect(screen.getByTestId('reconsent-submit').props.accessibilityState.disabled).toBe(false);
    expect(submitHint()).not.toBe(disabledHint);
  });

  it('counts down as boxes are ticked', () => {
    const screen = renderScreen();
    fireEvent.press(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByTestId('reconsent-submit').props.accessibilityHint).toMatch(/2 remaining/);
  });

  it('reports busy while submitting', () => {
    const screen = renderScreen({ isSubmitting: true });
    expect(screen.getByTestId('reconsent-submit').props.accessibilityState.busy).toBe(true);
  });
});

describe('FEAT-376 — the document links are reachable by screen reader', () => {
  /**
   * `Pressable` defaults `accessible` to true (`Pressable.js:252`), collapsing
   * its subtree into one element on iOS — so an inline `<Text onPress>` inside a
   * checkbox label has no a11y node and a double-tap toggles the checkbox
   * instead of opening the document.
   *
   * `CombinedLegalGateScreen` had the same defect — where it was worse, because
   * those two inline links were the ONLY path to the Terms and Privacy Policy on
   * the pre-consent gate. DEBUG-430 closed it (2026-08-14) by porting this
   * shape, and removed the never-rendered `styles.linkRow` this note used to
   * cite as evidence. Both screens now carry it; neither reproduces the defect.
   */
  it('exposes an open-document action on the Terms and Privacy checkboxes', () => {
    const boxes = renderScreen().getAllByRole('checkbox');

    expect(boxes[0].props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual(
      expect.arrayContaining(['activate', 'openDocument']),
    );
    expect(boxes[1].props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual(
      expect.arrayContaining(['activate', 'openDocument']),
    );
  });

  it('opens the document when the custom action fires', () => {
    const boxes = renderScreen().getAllByRole('checkbox');

    fireEvent(boxes[0], 'accessibilityAction', {
      nativeEvent: { actionName: 'openDocument' },
    });

    expect(Linking.openURL).toHaveBeenCalledWith('https://being.fyi/terms');
  });

  it('still toggles the checkbox on the activate action', () => {
    // Declaring an `activate` action routes activation through
    // `onAccessibilityAction`. If the handler forgets the default branch, the
    // checkbox becomes untickable by screen reader while still working by touch.
    const screen = renderScreen();
    const box = screen.getAllByRole('checkbox')[0];

    fireEvent(box, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

    expect(screen.getAllByRole('checkbox')[0].props.accessibilityState.checked).toBe(true);
  });
});

describe('FEAT-376 — errors are both marked and announced', () => {
  it('marks the error node for Android live regions', () => {
    const screen = renderScreen({ errorMessage: 'Something went wrong. Please try again.' });
    const error = screen.getByTestId('reconsent-error');

    expect(error.props.accessibilityRole).toBe('alert');
    expect(error.props.accessibilityLiveRegion).toBe('assertive');
  });

  it('announces on iOS, where accessibilityLiveRegion does nothing', () => {
    // The load-bearing half. `accessibilityLiveRegion` is Android-only and
    // `accessibilityRole="alert"` maps to no auto-announcing iOS trait, so
    // without this the error is silent on iOS — the state `ExportDataScreen.tsx:255`
    // and `DeleteAccountScreen.tsx:128` are both in today.
    renderScreen({ errorMessage: 'Something went wrong. Please try again.' });

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      expect.stringMatching(/^Error: /),
    );
  });

  it('says nothing when there is no error', () => {
    renderScreen();
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
  });
});

describe('FEAT-376 — touch targets', () => {
  it('gives every checkbox at least the 44pt floor', () => {
    // Read off the Pressable, NOT the testID node — per INFRA-181 the testID sits
    // on the 24pt indicator, so flattening that would measure the wrong element
    // and pass at 24.
    renderScreen()
      .getAllByRole('checkbox')
      .forEach((box) => {
        expect(StyleSheet.flatten(box.props.style).minHeight).toBeGreaterThanOrEqual(
          TOUCH_TARGETS.minimum,
        );
      });
  });

  it.each([['reconsent-submit'], ['reconsent-decline']])(
    '%s meets the large-target bar for a primary action',
    (testID) => {
      // Assert the BAR, not the shipped value — a later bump must not go red.
      expect(
        StyleSheet.flatten(renderScreen().getByTestId(testID).props.style).minHeight,
      ).toBeGreaterThanOrEqual(TOUCH_TARGETS.large);
    },
  );

  it('declares the checkbox minHeight in the stylesheet', () => {
    // Style-object assertions alone can be satisfied by a value a later token
    // change silently drops.
    expect(styleBlock('checkbox')).toContain('minHeight');
  });
});

describe('FEAT-376 — contrast in the states this screen actually starts in', () => {
  /**
   * Asserted from tokens, never off a rendered node — jest has no compositor and
   * no layout. Method inherited from DEBUG-396 via
   * `CombinedLegalGateScreen.accessibility.test.tsx:196-215`.
   */
  it('the unchecked indicator border clears 1.4.11', () => {
    // The 2px border is the ONLY visual signal an unchecked box exists, and every
    // control here mounts unchecked. `CombinedLegalGateScreen.tsx:552` uses
    // gray[400], which is 1.463:1 on this card background — half the required
    // ratio. This screen uses gray[600] instead; the divergence is deliberate.
    expect(getContrastRatio(colorSystem.gray[600], colorSystem.gray[100])).toBeGreaterThanOrEqual(3);
  });

  it('the disabled submit label is legible', () => {
    // WCAG exempts inactive controls, so this is not a violation on other
    // screens — but disabled is this screen's DEFAULT state, so the label is what
    // every user reads first. white-on-gray[400] (the legal gate's disabled
    // token) is 1.527:1.
    expect(
      getContrastRatio(semantic.text.secondary, colorSystem.gray[300]),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('the error text clears 1.4.3', () => {
    // status.error (#DC2626) on #FEE2E2 — the legal gate's pairing — is 3.953:1
    // and fails at 14pt/500. status.critical on errorBackground is 7.597:1.
    expect(
      getContrastRatio(colorSystem.status.critical, colorSystem.status.errorBackground),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('the inline document links clear 1.4.3 on the card background', () => {
    expect(
      getContrastRatio(colorSystem.base.midnightBlue, colorSystem.gray[100]),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('body copy clears 1.4.3 on the card background', () => {
    expect(getContrastRatio(semantic.text.secondary, colorSystem.gray[100])).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
