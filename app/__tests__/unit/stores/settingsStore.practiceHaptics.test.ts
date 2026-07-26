/**
 * FEAT-285 — practice-haptics preference + the upgrade-safety merge.
 *
 * The interesting case here is NOT the fresh install. It is the existing
 * install: `loadSettings` used to JSON.parse the persisted blob and cast it
 * straight to AppSettings with no merge against defaults, so ANY key added
 * later read as `undefined` for every user who already had settings stored.
 * Bumping STORAGE_KEY would "fix" that by wiping everyone's preferences, which
 * is not a fix. So the merge is the thing under test.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '@/core/stores/settingsStore';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store[k] ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store[k] = v;
      }),
      removeItem: jest.fn(async (k: string) => {
        delete store[k];
      }),
      __reset: () => {
        store = {};
      },
      __seed: (k: string, v: string) => {
        store[k] = v;
      },
      __raw: () => store,
    },
  };
});

jest.mock('@/core/constants/devMode', () => ({
  getCurrentUserId: () => 'test-user-001',
}));

const mockStorage = AsyncStorage as unknown as {
  __reset: () => void;
  __seed: (k: string, v: string) => void;
  __raw: () => Record<string, string>;
};

const STORAGE_KEY = 'app_settings_v1';

beforeEach(() => {
  mockStorage.__reset();
  useSettingsStore.setState({ settings: null, isLoading: false, error: null });
  jest.clearAllMocks();
});

describe('practice-haptics defaults on a fresh install', () => {
  it('defaults the master toggle to OFF', async () => {
    const settings = await useSettingsStore.getState().loadSettings();
    expect(settings?.practices.practiceHaptics).toBe(false);
  });

  it('defaults the interval cadence to none, independently of the master toggle', async () => {
    const settings = await useSettingsStore.getState().loadSettings();
    expect(settings?.practices.practiceHapticsInterval).toBe('none');
  });

  it('has not yet shown the one-and-only opt-in prompt', async () => {
    const settings = await useSettingsStore.getState().loadSettings();
    expect(settings?.practices.practiceHapticsPrompted).toBe(false);
  });
});

describe('round-trip persistence', () => {
  it('persists an enabled toggle and reads it back on the next load', async () => {
    await useSettingsStore.getState().loadSettings();
    await useSettingsStore.getState().updatePracticeSettings({ practiceHaptics: true });

    // Simulate a cold start: drop in-memory state, reload from storage.
    useSettingsStore.setState({ settings: null });
    const reloaded = await useSettingsStore.getState().loadSettings();

    expect(reloaded?.practices.practiceHaptics).toBe(true);
  });

  it('writes through to AsyncStorage under the existing key (no key bump)', async () => {
    await useSettingsStore.getState().loadSettings();
    await useSettingsStore.getState().updatePracticeSettings({ practiceHaptics: true });

    const persisted = JSON.parse(mockStorage.__raw()[STORAGE_KEY]);
    expect(persisted.practices.practiceHaptics).toBe(true);
    expect(Object.keys(mockStorage.__raw())).toEqual([STORAGE_KEY]);
  });

  it('leaves unrelated preferences untouched when updating practices', async () => {
    await useSettingsStore.getState().loadSettings();
    await useSettingsStore.getState().updateAccessibilitySettings({ highContrast: true });
    await useSettingsStore.getState().updatePracticeSettings({ practiceHaptics: true });

    const settings = useSettingsStore.getState().settings;
    expect(settings?.accessibility.highContrast).toBe(true);
    expect(settings?.practices.practiceHaptics).toBe(true);
  });

  it('records a permanent decline distinctly from never having been asked', async () => {
    await useSettingsStore.getState().loadSettings();
    await useSettingsStore.getState().updatePracticeSettings({
      practiceHapticsPrompted: true,
      practiceHaptics: false,
    });

    const settings = useSettingsStore.getState().settings;
    expect(settings?.practices.practiceHapticsPrompted).toBe(true);
    expect(settings?.practices.practiceHaptics).toBe(false);
  });
});

describe('upgrade safety — an install that predates FEAT-285', () => {
  /** Exactly the shape persisted before this change: no `practices` key at all. */
  const LEGACY_SETTINGS = {
    userId: 'test-user-001',
    notifications: {
      checkInReminders: false,
      breathingReminders: true,
      valuesReflectionPrompts: false,
    },
    privacy: { analyticsEnabled: true },
    accessibility: { textSize: 'large', reducedMotion: true, highContrast: false },
    onboardingCompleted: true,
    appVersion: '1.0.0',
    updatedAt: 1_700_000_000_000,
    lastActiveTimestamp: 1_700_000_000_000,
  };

  it('fills in the missing practices section with defaults', async () => {
    mockStorage.__seed(STORAGE_KEY, JSON.stringify(LEGACY_SETTINGS));

    const settings = await useSettingsStore.getState().loadSettings();

    expect(settings?.practices).toEqual({
      practiceHaptics: false,
      practiceHapticsInterval: 'none',
      practiceHapticsPrompted: false,
    });
  });

  it('PRESERVES every pre-existing preference through the merge', async () => {
    mockStorage.__seed(STORAGE_KEY, JSON.stringify(LEGACY_SETTINGS));

    const settings = await useSettingsStore.getState().loadSettings();

    expect(settings?.notifications.checkInReminders).toBe(false);
    expect(settings?.notifications.breathingReminders).toBe(true);
    expect(settings?.privacy.analyticsEnabled).toBe(true);
    expect(settings?.accessibility.textSize).toBe('large');
    expect(settings?.accessibility.reducedMotion).toBe(true);
    expect(settings?.onboardingCompleted).toBe(true);
    expect(settings?.userId).toBe('test-user-001');
    expect(settings?.lastActiveTimestamp).toBe(1_700_000_000_000);
  });

  it('does not wipe stored settings by bumping the storage key', async () => {
    mockStorage.__seed(STORAGE_KEY, JSON.stringify(LEGACY_SETTINGS));
    await useSettingsStore.getState().loadSettings();

    expect(Object.keys(mockStorage.__raw())).toEqual([STORAGE_KEY]);
  });

  it('fills a partially-missing nested section without clobbering its siblings', async () => {
    // A blob where `practices` exists but predates the interval cadence.
    mockStorage.__seed(
      STORAGE_KEY,
      JSON.stringify({
        ...LEGACY_SETTINGS,
        practices: { practiceHaptics: true },
      })
    );

    const settings = await useSettingsStore.getState().loadSettings();

    expect(settings?.practices.practiceHaptics).toBe(true);
    expect(settings?.practices.practiceHapticsInterval).toBe('none');
    expect(settings?.practices.practiceHapticsPrompted).toBe(false);
  });

  it('survives an accessibility section missing a newer key', async () => {
    const { highContrast: _dropped, ...partialA11y } = LEGACY_SETTINGS.accessibility;
    mockStorage.__seed(
      STORAGE_KEY,
      JSON.stringify({ ...LEGACY_SETTINGS, accessibility: partialA11y })
    );

    const settings = await useSettingsStore.getState().loadSettings();

    expect(settings?.accessibility.highContrast).toBe(false);
    expect(settings?.accessibility.textSize).toBe('large');
  });

  it('recovers to full defaults when the persisted blob is corrupt', async () => {
    mockStorage.__seed(STORAGE_KEY, '{not valid json');

    const settings = await useSettingsStore.getState().loadSettings();

    expect(settings).not.toBeNull();
    expect(settings?.practices.practiceHaptics).toBe(false);
    expect(useSettingsStore.getState().error).toBeNull();
  });
});

describe('updatePracticeSettings guards', () => {
  it('no-ops when settings have not been loaded yet', async () => {
    await expect(
      useSettingsStore.getState().updatePracticeSettings({ practiceHaptics: true })
    ).resolves.toBeUndefined();
    expect(useSettingsStore.getState().settings).toBeNull();
  });

  it('surfaces an error instead of throwing when persistence fails', async () => {
    await useSettingsStore.getState().loadSettings();
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await useSettingsStore.getState().updatePracticeSettings({ practiceHaptics: true });

    expect(useSettingsStore.getState().error).toBe('Failed to update settings');
  });
});
