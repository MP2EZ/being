/**
 * SETTINGS STORE
 * Zustand store for app preferences (non-sensitive settings)
 *
 * STORAGE:
 * - Standard AsyncStorage (non-sensitive preferences)
 * - NO encryption needed (no sensitive wellness data)
 *
 * TODO (FEAT-6 Open Questions):
 * - [ ] Notification system integration: How to schedule notifications?
 * - [ ] Analytics opt-in/out: Where does this integrate?
 * - [ ] Accessibility preferences: Should this control global app accessibility features?
 * - [ ] Privacy compliance validation needed for privacy settings
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/core/constants/devMode';

const STORAGE_KEY = 'app_settings_v1';

/**
 * Notification preferences
 */
export interface NotificationSettings {
  checkInReminders: boolean;
  checkInTime?: string; // ISO time string (e.g., "09:00")
  breathingReminders: boolean;
  valuesReflectionPrompts: boolean;
}

/**
 * Privacy preferences
 */
export interface PrivacySettings {
  analyticsEnabled: boolean; // Opt-in/out for anonymous usage analytics
  // TODO: Add more privacy settings based on compliance requirements
}

/**
 * Accessibility preferences
 */
export interface AccessibilitySettings {
  textSize: 'small' | 'medium' | 'large' | 'xlarge';
  reducedMotion: boolean;
  highContrast: boolean;
}

/**
 * Interval-cue cadence for reflection / meditation timers (FEAT-285).
 *
 * Deliberately NOT a general scheduling knob: 'minute' emits one identical
 * pulse per elapsed minute. There is no halfway or near-end variant, because an
 * escalating cue turns resting into counting down.
 */
export type PracticeHapticsInterval = 'none' | 'minute';

/**
 * Practice preferences (FEAT-285)
 *
 * Plain AsyncStorage, unencrypted — these are interaction preferences, not
 * wellness data. Nothing here records anything about the user's state.
 */
export interface PracticeSettings {
  /** Master gate for practice haptic cues. Defaults OFF — see the opt-in note. */
  practiceHaptics: boolean;
  /**
   * Interval cues during reflection / meditation timers. Defaults to 'none'
   * and stays independent of the master toggle: turning haptics ON must not
   * silently start pulsing at a practitioner mid-session.
   */
  practiceHapticsInterval: PracticeHapticsInterval;
  /**
   * True once the single first-run opt-in has been answered, either way.
   *
   * This is what makes a decline PERMANENT. A haptic is an unrequested somatic
   * intervention during a practice that exists to sensitise the practitioner to
   * their own body, so it must be assented to — and re-asking after a decline
   * would make that assent meaningless. There is exactly one prompt, ever.
   */
  practiceHapticsPrompted: boolean;
}

/**
 * App settings metadata
 */
export interface AppSettings {
  userId: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
  practices: PracticeSettings;
  onboardingCompleted: boolean;
  appVersion: string;
  updatedAt: number;
  lastActiveTimestamp: number | null; // Tracks when app went to background (for intro animation)
}

/**
 * Settings Store State
 */
export interface SettingsStore {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSettings: () => Promise<AppSettings | null>;
  updateNotificationSettings: (notifications: Partial<NotificationSettings>) => Promise<void>;
  updatePrivacySettings: (privacy: Partial<PrivacySettings>) => Promise<void>;
  updateAccessibilitySettings: (accessibility: Partial<AccessibilitySettings>) => Promise<void>;
  updatePracticeSettings: (practices: Partial<PracticeSettings>) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  resetSettings: () => Promise<void>;
  setLastActiveTimestamp: (timestamp: number) => Promise<void>;
  getLastActiveTimestamp: () => number | null;
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: Omit<AppSettings, 'userId' | 'updatedAt'> = {
  notifications: {
    checkInReminders: true, // Default: reminders enabled
    breathingReminders: false,
    valuesReflectionPrompts: false
  },
  privacy: {
    analyticsEnabled: false // Default: opt-out (privacy-first)
  },
  accessibility: {
    textSize: 'medium',
    reducedMotion: false,
    highContrast: false
  },
  practices: {
    practiceHaptics: false, // Default: OFF — assent is required, not assumed
    practiceHapticsInterval: 'none',
    practiceHapticsPrompted: false
  },
  onboardingCompleted: false,
  appVersion: '1.0.0', // TODO: Get from app config
  lastActiveTimestamp: null
};

/**
 * Merge a persisted blob over the defaults (FEAT-285).
 *
 * WHY THIS IS NECESSARY: `loadSettings` previously JSON.parsed the stored blob
 * and cast it straight to AppSettings. That is correct only while the shape
 * never changes — the moment a key is added, every EXISTING install reads it as
 * `undefined`, because their blob was written before the key existed. For a
 * boolean gate that is actively dangerous: `undefined` is falsy today but any
 * `!settings.practices.practiceHaptics` style check would throw outright when
 * the whole section is missing.
 *
 * The obvious-looking alternative — bumping STORAGE_KEY — is not a fix. It
 * "resolves" the shape mismatch by discarding every preference the user has
 * ever set.
 *
 * Section-level merge (one level deep) is sufficient and is all that is done
 * here: the settings tree is exactly two levels, and a blind deep merge would
 * happily "repair" a value that is legitimately absent.
 */
function mergeWithDefaults(stored: Partial<AppSettings> | null | undefined): Omit<AppSettings, 'userId' | 'updatedAt'> {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    notifications: { ...DEFAULT_SETTINGS.notifications, ...stored?.notifications },
    privacy: { ...DEFAULT_SETTINGS.privacy, ...stored?.privacy },
    accessibility: { ...DEFAULT_SETTINGS.accessibility, ...stored?.accessibility },
    practices: { ...DEFAULT_SETTINGS.practices, ...stored?.practices }
  };
}

/**
 * NOTE: getCurrentUserId() is now imported from devMode.ts
 * MVP: Returns 'dev-user-001' for single-user development mode
 * V2 (FEAT-16): Will integrate with real authentication service
 */

/**
 * Settings Zustand Store
 */
export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  /**
   * Load settings from AsyncStorage
   */
  loadSettings: async () => {
    set({ isLoading: true, error: null });

    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);

      if (storedData) {
        // Parse defensively and separately from the storage read: a corrupt
        // blob is unrecoverable, and falling through to defaults beats handing
        // the app a null settings object whose every field then reads
        // `undefined`. A *storage* failure is a different thing and still
        // surfaces as an error below.
        let parsed: Partial<AppSettings> | null = null;
        try {
          parsed = JSON.parse(storedData) as Partial<AppSettings>;
        } catch (parseError) {
          console.error('[Settings] Stored settings were corrupt; falling back to defaults', parseError);
        }

        if (parsed) {
          const settings: AppSettings = {
            ...mergeWithDefaults(parsed),
            userId: parsed.userId ?? getCurrentUserId(),
            updatedAt: parsed.updatedAt ?? Date.now()
          };
          set({ settings, isLoading: false });
          return settings;
        }
      }

      // No settings stored (or unreadable) - create defaults
      const userId = getCurrentUserId();
      const defaultSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        userId,
        updatedAt: Date.now()
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
      set({ settings: defaultSettings, isLoading: false });
      return defaultSettings;
    } catch (error) {
      console.error('[Settings] Failed to load settings', error);
      set({ error: 'Failed to load settings', isLoading: false });
      return null;
    }
  },

  /**
   * Update notification settings
   * TODO: Integrate with notification scheduling system
   */
  updateNotificationSettings: async (notifications: Partial<NotificationSettings>) => {
    const { settings } = get();
    if (!settings) return;

    set({ isLoading: true, error: null });

    try {
      const updatedSettings: AppSettings = {
        ...settings,
        notifications: {
          ...settings.notifications,
          ...notifications
        },
        updatedAt: Date.now()
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      set({ settings: updatedSettings, isLoading: false });
    } catch (error) {
      console.error('[Settings] Failed to update notification settings', error);
      set({ error: 'Failed to update settings', isLoading: false });
    }
  },

  /**
   * Update privacy settings
   * TODO: Compliance validation needed
   */
  updatePrivacySettings: async (privacy: Partial<PrivacySettings>) => {
    const { settings } = get();
    if (!settings) return;

    set({ isLoading: true, error: null });

    try {
      const updatedSettings: AppSettings = {
        ...settings,
        privacy: {
          ...settings.privacy,
          ...privacy
        },
        updatedAt: Date.now()
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      set({ settings: updatedSettings, isLoading: false });
    } catch (error) {
      console.error('[Settings] Failed to update privacy settings', error);
      set({ error: 'Failed to update settings', isLoading: false });
    }
  },

  /**
   * Update accessibility settings
   */
  updateAccessibilitySettings: async (accessibility: Partial<AccessibilitySettings>) => {
    const { settings } = get();
    if (!settings) return;

    set({ isLoading: true, error: null });

    try {
      const updatedSettings: AppSettings = {
        ...settings,
        accessibility: {
          ...settings.accessibility,
          ...accessibility
        },
        updatedAt: Date.now()
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      set({ settings: updatedSettings, isLoading: false });
    } catch (error) {
      console.error('[Settings] Failed to update accessibility settings', error);
      set({ error: 'Failed to update settings', isLoading: false });
    }
  },

  /**
   * Update practice settings (FEAT-285 — haptic cue preferences)
   */
  updatePracticeSettings: async (practices: Partial<PracticeSettings>) => {
    const { settings } = get();
    if (!settings) return;

    set({ isLoading: true, error: null });

    try {
      const updatedSettings: AppSettings = {
        ...settings,
        practices: {
          ...settings.practices,
          ...practices
        },
        updatedAt: Date.now()
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      set({ settings: updatedSettings, isLoading: false });
    } catch (error) {
      console.error('[Settings] Failed to update practice settings', error);
      set({ error: 'Failed to update settings', isLoading: false });
    }
  },

  /**
   * Mark onboarding as completed
   */
  markOnboardingComplete: async () => {
    const { settings } = get();
    if (!settings) return;

    set({ isLoading: true, error: null });

    try {
      const updatedSettings: AppSettings = {
        ...settings,
        onboardingCompleted: true,
        updatedAt: Date.now()
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      set({ settings: updatedSettings, isLoading: false });
    } catch (error) {
      console.error('[Settings] Failed to mark onboarding complete', error);
      set({ error: 'Failed to update settings', isLoading: false });
    }
  },

  /**
   * Reset settings to defaults
   */
  resetSettings: async () => {
    const userId = getCurrentUserId();
    const defaultSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      userId,
      updatedAt: Date.now()
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
      set({ settings: defaultSettings, error: null });
    } catch (error) {
      console.error('[Settings] Failed to reset settings', error);
      set({ error: 'Failed to reset settings' });
    }
  },

  /**
   * Set last active timestamp (called when app goes to background)
   * Used by intro animation to determine if 30+ minutes have passed
   */
  setLastActiveTimestamp: async (timestamp: number) => {
    const { settings } = get();
    if (!settings) return;

    try {
      const updatedSettings: AppSettings = {
        ...settings,
        lastActiveTimestamp: timestamp,
        updatedAt: Date.now()
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      set({ settings: updatedSettings });
    } catch (error) {
      console.error('[Settings] Failed to update last active timestamp', error);
    }
  },

  /**
   * Get last active timestamp (for intro animation check)
   */
  getLastActiveTimestamp: () => {
    const { settings } = get();
    return settings?.lastActiveTimestamp ?? null;
  }
}));

/**
 * Convenience hooks
 */
export const useNotificationSettings = () => useSettingsStore((state) => state.settings?.notifications);
export const usePrivacySettings = () => useSettingsStore((state) => state.settings?.privacy);
export const useAccessibilitySettings = () => useSettingsStore((state) => state.settings?.accessibility);
export const usePracticeSettings = () => useSettingsStore((state) => state.settings?.practices);
