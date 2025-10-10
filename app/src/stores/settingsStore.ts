/**
 * SETTINGS STORE
 * Zustand store for app preferences (non-sensitive settings)
 *
 * STORAGE:
 * - Standard AsyncStorage (non-sensitive preferences)
 * - NO encryption needed (no PHI data)
 *
 * TODO (FEAT-6 Open Questions):
 * - [ ] Notification system integration: How to schedule notifications?
 * - [ ] Analytics opt-in/out: Where does this integrate?
 * - [ ] Accessibility preferences: Should this control global app accessibility features?
 * - [ ] HIPAA compliance validation needed for privacy settings
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
 * App settings metadata
 */
export interface AppSettings {
  userId: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
  appVersion: string;
  updatedAt: number;
}

/**
 * Settings Store State
 */
export interface SettingsStore {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSettings: () => Promise<void>;
  updateNotificationSettings: (notifications: Partial<NotificationSettings>) => Promise<void>;
  updatePrivacySettings: (privacy: Partial<PrivacySettings>) => Promise<void>;
  updateAccessibilitySettings: (accessibility: Partial<AccessibilitySettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
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
  appVersion: '1.0.0' // TODO: Get from app config
};

/**
 * Get current user ID
 * TODO: Integrate with AuthenticationService
 */
function getCurrentUserId(): string {
  return 'user_placeholder_id';
}

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
        const settings = JSON.parse(storedData) as AppSettings;
        set({ settings, isLoading: false });
        return;
      }

      // No settings stored - create defaults
      const userId = getCurrentUserId();
      const defaultSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        userId,
        updatedAt: Date.now()
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
      set({ settings: defaultSettings, isLoading: false });
    } catch (error) {
      console.error('[Settings] Failed to load settings', error);
      set({ error: 'Failed to load settings', isLoading: false });
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
  }
}));

/**
 * Convenience hooks
 */
export const useNotificationSettings = () => useSettingsStore((state) => state.settings?.notifications);
export const usePrivacySettings = () => useSettingsStore((state) => state.settings?.privacy);
export const useAccessibilitySettings = () => useSettingsStore((state) => state.settings?.accessibility);
