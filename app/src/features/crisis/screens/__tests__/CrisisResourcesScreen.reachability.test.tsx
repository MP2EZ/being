/**
 * DEBUG-432 — the 988 control on the crisis DESTINATION is reachable without scrolling.
 *
 * THE INVARIANT, from RootCrisisButton.tsx and re-earned by DEBUG-390 on LegalGate:
 * suppression is earned by an affordance reachable WITHOUT SCROLLING, never by one that
 * merely exists. `CrisisResources` is in `RootCrisisButton.SUPPRESSED_ROUTES`, so the
 * root overlay is deliberately absent here and `crisis-call-988-button` is the ONLY 988
 * affordance on the screen. This is also the screen every other crisis affordance in the
 * app routes to, which makes it the worst possible place for the invariant to fail.
 *
 * IT DID FAIL. Measured on a Release build (provenance 505fc417, clean tree) via
 * `maestro hierarchy` real bounds — not screenshots, per DEBUG-403, which records two
 * wrong fixes diagnosed from renders that were pixel-identical:
 *
 *   iPhone SE 3   375x667  default type  fold y=86..667   button y=746..797   FAIL  -130pt
 *   iPhone SE 3   375x667  AX5           fold y=86..667   button y=3926..4095 FAIL  -3428pt
 *   16 Pro Max    440x956  default type  fold y=128..956  button y=776..827   pass  +95pt
 *   16 Pro Max    440x956  AX5           fold y=128..956  button y=3612..3781 FAIL  -2859pt
 *
 * Three of four configurations failed, including the small phone at DEFAULT Dynamic Type,
 * where the button was not merely clipped but absent from the accessibility tree — 0% of
 * a 51pt tap target on screen, 79pt of dead space between the fold and its top edge.
 *
 * WHY THIS SUITE EXISTS RATHER THAN A MAESTRO ASSERTION ALONE. `.maestro/
 * deeplink-consent-gate.yaml` has asserted `crisis-call-988-button` visible on this exact
 * screen for its whole life, green, while the defect was live. The assertion is not
 * vacuous — run on an SE 3 it fails correctly — but `scripts/e2e-sim-device.sh` pins no
 * simulator MODEL, so the gate's verdict was a function of whichever device the operator
 * last booted. A green run on a 6.9" phone certifies nothing about a 4.7" one. This suite
 * runs in CI on every PR and cannot be silenced by a device choice.
 *
 * Companion pins:
 *   • __tests__/safety/crisis-zero-988-windows.test.tsx — source-shape, runs in precommit.
 *   • .maestro/crisis-button-reachability.yaml — real on-device layout, the only pin that
 *     sees safe-area insets and the modal card offset at all.
 * This one is authoritative for STRUCTURE: it survives extracting the bar into its own
 * component, which a source-shape assertion does not.
 */

import React from 'react';
import { render, within } from '@testing-library/react-native';
import { Alert, Linking, ScrollView } from 'react-native';
import { TOUCH_TARGETS } from '@/core/theme';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackScreenView: jest.fn(),
    trackCrisisResourcesViewed: jest.fn(),
    trackCrisisHotlineTapped: jest.fn(),
  }),
}));

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

import CrisisResourcesScreen from '../CrisisResourcesScreen';

const renderScreen = () => render(<CrisisResourcesScreen />);

/** Flatten a possibly-nested RN style prop into one object. */
const flatten = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
  return (style ?? {}) as Record<string, unknown>;
};

describe('DEBUG-432 — the 988 control is pinned outside the ScrollView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.openURL as jest.Mock).mockResolvedValue(true);
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
  });

  /**
   * THE contract. A child of the ScrollView is clipped by it at scroll offset 0, so
   * position inside that subtree is the property under test — not presence, which is
   * what the pre-DEBUG-432 assertions all tested and why they passed throughout.
   */
  it('does not render the 988 control inside the ScrollView', () => {
    const screen = renderScreen();
    const scrollView = screen.UNSAFE_getByType(ScrollView);

    expect(within(scrollView).queryByTestId('crisis-call-988-button')).toBeNull();
  });

  /**
   * Guards the opposite failure: deleting the control entirely satisfies the position
   * test above trivially. Also pins the count at exactly one — DEBUG-341 reverted a
   * duplicated crisis control because two differently-labelled Call-988 buttons on one
   * screen is worse for a screen reader user than the gap it was meant to close, and a
   * duplicate testID makes every existing selector ambiguous (two Maestro flows address
   * this id: crisis-988-dial.yaml and deeplink-consent-gate.yaml).
   */
  it('renders exactly one 988 control on the screen', () => {
    const screen = renderScreen();

    expect(screen.getAllByTestId('crisis-call-988-button')).toHaveLength(1);
  });

  /**
   * The 911 banner must survive the reorder. DEBUG-432 moved it below the 988 card
   * because 911 dispatches law enforcement and 988 is the non-police option for this
   * population — but "de-emphasised" must never decay into "deleted".
   */
  it('keeps the 911 emergency affordance inside the scroll region', () => {
    const screen = renderScreen();
    const scrollView = screen.UNSAFE_getByType(ScrollView);

    expect(within(scrollView).getByLabelText('Call 911 for emergency')).toBeTruthy();
  });

  /**
   * TOUCH_TARGETS.large names "Crisis buttons" as its application. DEBUG-390's footer
   * shipped at ~34.7pt, which cleared WCAG 2.2 AA 2.5.8 (24) but failed 2.5.5 AAA / iOS
   * HIG (44) and this repo's own token.
   */
  it('gives the pinned control a crisis-grade touch target', () => {
    const screen = renderScreen();
    const style = flatten(screen.getByTestId('crisis-call-988-button').props.style);

    expect(style.minHeight).toBe(TOUCH_TARGETS.large);
  });
});
