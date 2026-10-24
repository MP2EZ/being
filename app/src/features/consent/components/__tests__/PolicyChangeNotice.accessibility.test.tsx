/**
 * FEAT-860 — accessibility of the policy-change notice card.
 *
 * Pins what a screen reader and a switch user get: one heading, two named buttons whose
 * accessible names equal their visible text, 44pt minimum targets, text that is never
 * truncated at large sizes, and contrast of the two button faces. The crisis-reachability
 * half (no modal, no hiding props, frames clear of the 988 column) is pinned in
 * `__tests__/safety/policyNoticeCrisisReachability.test.tsx`.
 */
const mockSecure = new Map<string, string>();
const mockSettings = { settings: { onboardingCompleted: true } };

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockSecure.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecure.delete(k);
  }),
}));
jest.mock('@/core/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: typeof mockSettings) => unknown) => selector(mockSettings),
}));

import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { colorSystem, getContrastRatio, semantic, TOUCH_TARGETS } from '@/core/theme';
import { useConsentStore } from '@/core/stores/consentStore';
import PolicyChangeNotice, { POLICY_NOTICE_TEST_IDS } from '../PolicyChangeNotice';
import { POLICY_MATERIAL_CHANGE_SUMMARIES } from '../../constants/policyMaterialChanges';
import { getPolicyRevisions } from '../../services/policyRevisions';

const flat = (s: unknown) => (StyleSheet.flatten(s as never) ?? {}) as Record<string, unknown>;

beforeEach(() => {
  mockSecure.clear();
  mockSecure.set(
    'legal_gate_consents_v1',
    JSON.stringify({
      tosAccepted: true,
      privacyAccepted: true,
      wellnessDisclaimerAcknowledged: true,
      mentalHealthProcessingConsent: true,
      timestamp: 1_790_000_000_000,
      version: '1.1.0',
    }),
  );
  useConsentStore.setState({ consentStatus: 'valid' });
});

const shown = async () => {
  const utils = render(<PolicyChangeNotice onReadPolicy={() => {}} />);
  await utils.findByTestId(POLICY_NOTICE_TEST_IDS.card);
  return utils;
};

describe('PolicyChangeNotice accessibility', () => {
  it('renders nothing when there is nothing to tell', async () => {
    useConsentStore.setState({ consentStatus: 'missing' });
    const { queryByTestId, toJSON } = render(<PolicyChangeNotice onReadPolicy={() => {}} />);
    await new Promise<void>((r) => setImmediate(r));
    expect(queryByTestId(POLICY_NOTICE_TEST_IDS.card)).toBeNull();
    expect(toJSON()).toBeNull();
  });

  it('has exactly one heading, "Privacy Policy updated", below the screen h1', async () => {
    const { getByText, getAllByRole } = await shown();
    const title = getByText('Privacy Policy updated');
    expect(title.props.accessibilityRole).toBe('header');
    expect(title.props.accessibilityLevel).toBe(2);
    expect(getAllByRole('header')).toHaveLength(1);
  });

  it('exposes two buttons whose accessible names equal their visible text, each with a hint', async () => {
    const { getByTestId, getByText } = await shown();
    for (const [id, label, hint] of [
      [POLICY_NOTICE_TEST_IDS.read, 'Read the policy', 'Opens the full privacy policy'],
      [POLICY_NOTICE_TEST_IDS.dismiss, 'Got it', 'Dismisses this notice'],
    ] as const) {
      const button = getByTestId(id);
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBe(label);
      expect(getByText(label)).toBeTruthy();
      expect(button.props.accessibilityHint).toBe(hint);
    }
  });

  it('uses neutral acknowledgement wording, never acceptance', async () => {
    const { queryByText } = await shown();
    expect(queryByText(/accept|agree|consent/i)).toBeNull();
  });

  it('keeps both buttons at or above the 44pt minimum touch target', async () => {
    const { getByTestId } = await shown();
    for (const id of [POLICY_NOTICE_TEST_IDS.read, POLICY_NOTICE_TEST_IDS.dismiss]) {
      expect(flat(getByTestId(id).props.style).minHeight).toBeGreaterThanOrEqual(TOUCH_TARGETS.minimum);
    }
  });

  it('shows one bullet per pending version with its one-line summary, untruncated', async () => {
    const { getByTestId, getByText } = await shown();
    for (const version of getPolicyRevisions().materialVersions) {
      expect(getByTestId(`policy-change-notice-item-${version}`)).toBeTruthy();
      const summary = getByText(POLICY_MATERIAL_CHANGE_SUMMARIES[version] as string);
      // Text that wraps at large sizes is the contract; a line cap would hide the change.
      expect(summary.props.numberOfLines).toBeUndefined();
    }
  });

  it('puts no fixed width or height on the card, so it grows with the text size', async () => {
    const { getByTestId } = await shown();
    const card = flat(getByTestId(POLICY_NOTICE_TEST_IDS.card).props.style);
    expect(card.height).toBeUndefined();
    expect(card.width).toBeUndefined();
    expect(card.maxHeight).toBeUndefined();
  });

  it('both button faces and the body text clear 4.5:1', () => {
    expect(getContrastRatio(colorSystem.base.white, colorSystem.base.midnightBlue)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(colorSystem.base.midnightBlue, colorSystem.base.white)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(semantic.text.secondary, colorSystem.base.white)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(semantic.text.primary, colorSystem.base.white)).toBeGreaterThanOrEqual(4.5);
  });
});
