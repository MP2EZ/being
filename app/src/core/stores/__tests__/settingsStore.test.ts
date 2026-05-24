/**
 * Settings Store regression tests (TEST-19a)
 *
 * Validates round-trip persistence + default-shape invariants:
 *   - loadSettings creates defaults on first launch (no AsyncStorage key)
 *   - updateNotificationSettings / updatePrivacySettings /
 *     updateAccessibilitySettings each write through to AsyncStorage
 *   - markOnboardingComplete is durable across reload
 *   - setLastActiveTimestamp persists + getLastActiveTimestamp reads back
 *   - resetSettings restores defaults
 *
 * Failure mode the audit cared about: if AsyncStorage.setItem silently fails,
 * users lose their preferences between sessions. We assert the writes actually
 * land on the in-memory mock AND survive a "kill in-memory state, reload"
 * cycle.
 */

const mockAsyncStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockAsyncStorage[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncStorage[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockAsyncStorage[key];
    }),
  },
}));

jest.mock('@/core/constants/devMode', () => ({
  getCurrentUserId: () => 'test-user-id',
}));

import { useSettingsStore } from '../settingsStore';

const STORAGE_KEY = 'app_settings_v1';
const state = () => useSettingsStore.getState();

describe('settingsStore', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockAsyncStorage)) delete mockAsyncStorage[k];
    useSettingsStore.setState({ settings: null, isLoading: false, error: null });
  });

  describe('defaults on first launch', () => {
    test('loadSettings with empty storage creates + persists defaults', async () => {
      const settings = await state().loadSettings();
      expect(settings).not.toBeNull();
      expect(settings?.onboardingCompleted).toBe(false);
      expect(settings?.notifications.checkInReminders).toBe(true);
      expect(settings?.privacy.analyticsEnabled).toBe(false); // opt-out
      expect(settings?.accessibility.textSize).toBe('medium');
      expect(settings?.accessibility.reducedMotion).toBe(false);
      expect(settings?.accessibility.highContrast).toBe(false);
      // Persisted to storage
      expect(mockAsyncStorage[STORAGE_KEY]).toBeDefined();
    });

    test('loadSettings returns existing settings when key is present', async () => {
      await state().loadSettings(); // seed defaults
      await state().updateAccessibilitySettings({ textSize: 'xlarge' });

      // drop in-memory state
      useSettingsStore.setState({ settings: null });
      const reloaded = await state().loadSettings();
      expect(reloaded?.accessibility.textSize).toBe('xlarge');
    });
  });

  describe('round-trip persistence', () => {
    test('notification update survives reload', async () => {
      await state().loadSettings();
      await state().updateNotificationSettings({
        breathingReminders: true,
        valuesReflectionPrompts: true,
      });
      useSettingsStore.setState({ settings: null });
      const reloaded = await state().loadSettings();
      expect(reloaded?.notifications.breathingReminders).toBe(true);
      expect(reloaded?.notifications.valuesReflectionPrompts).toBe(true);
      expect(reloaded?.notifications.checkInReminders).toBe(true); // unchanged
    });

    test('privacy update survives reload (analytics opt-in)', async () => {
      await state().loadSettings();
      await state().updatePrivacySettings({ analyticsEnabled: true });
      useSettingsStore.setState({ settings: null });
      const reloaded = await state().loadSettings();
      expect(reloaded?.privacy.analyticsEnabled).toBe(true);
    });

    test('accessibility multi-field update survives reload', async () => {
      await state().loadSettings();
      await state().updateAccessibilitySettings({
        textSize: 'large',
        reducedMotion: true,
        highContrast: true,
      });
      useSettingsStore.setState({ settings: null });
      const reloaded = await state().loadSettings();
      expect(reloaded?.accessibility.textSize).toBe('large');
      expect(reloaded?.accessibility.reducedMotion).toBe(true);
      expect(reloaded?.accessibility.highContrast).toBe(true);
    });
  });

  describe('onboarding + lifecycle', () => {
    test('markOnboardingComplete persists durably', async () => {
      await state().loadSettings();
      expect(state().settings?.onboardingCompleted).toBe(false);
      await state().markOnboardingComplete();
      expect(state().settings?.onboardingCompleted).toBe(true);
      useSettingsStore.setState({ settings: null });
      const reloaded = await state().loadSettings();
      expect(reloaded?.onboardingCompleted).toBe(true);
    });

    test('setLastActiveTimestamp + getLastActiveTimestamp round-trip', async () => {
      await state().loadSettings();
      const ts = 1_700_000_000_000;
      await state().setLastActiveTimestamp(ts);
      expect(state().getLastActiveTimestamp()).toBe(ts);
      useSettingsStore.setState({ settings: null });
      await state().loadSettings();
      expect(state().getLastActiveTimestamp()).toBe(ts);
    });

    test('getLastActiveTimestamp returns null when never set', async () => {
      await state().loadSettings();
      expect(state().getLastActiveTimestamp()).toBeNull();
    });
  });

  describe('reset', () => {
    test('resetSettings restores defaults and persists', async () => {
      await state().loadSettings();
      await state().updateAccessibilitySettings({ textSize: 'xlarge' });
      await state().markOnboardingComplete();
      await state().resetSettings();
      expect(state().settings?.accessibility.textSize).toBe('medium');
      expect(state().settings?.onboardingCompleted).toBe(false);
      // Defaults were re-persisted
      useSettingsStore.setState({ settings: null });
      const reloaded = await state().loadSettings();
      expect(reloaded?.accessibility.textSize).toBe('medium');
      expect(reloaded?.onboardingCompleted).toBe(false);
    });
  });
});
