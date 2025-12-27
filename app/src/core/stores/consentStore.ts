/**
 * CONSENT STORE
 * Zustand store for user consent management (FEAT-90)
 *
 * SECURITY:
 * - Consent records stored in SecureStore (encrypted)
 * - Consent preferences cached for fast validation (<5ms)
 * - Fail-safe defaults: missing consent = block access
 * - Emergency override for crisis intervention only
 *
 * COMPLIANCE:
 * - Privacy: Granular consent scopes with audit trail
 * - COPPA: Age verification gate (13+ years)
 * - CCPA/VCDPA: Opt-out defaults, export capability
 * - Dark pattern prevention: No pre-checked boxes
 *
 * NON-NEGOTIABLE:
 * - Crisis button access NEVER gated by consent
 * - All non-essential consents default to false (opt-out)
 * - Consent changes take effect immediately
 */

import { create } from 'zustand';
import { generateRandomString } from '@/core/utils/id';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/core/constants/devMode';

// Storage keys
const CONSENT_SECURE_KEY = 'consent_record_v1';
const CONSENT_CACHE_KEY = 'consent_cache_v1';
const AGE_VERIFICATION_KEY = 'age_verification_v1';
const CONSENT_HISTORY_KEY = 'consent_history_v1';

/**
 * Consent categories (FEAT-90 requirements)
 * All default to false (opt-out, privacy-first)
 */
export interface ConsentPreferences {
  /** Anonymous usage analytics (default: false) */
  analyticsEnabled: boolean;
  /** Automatic crash reporting (default: false) */
  crashReportsEnabled: boolean;
  /** Cloud backup and sync (default: false) */
  cloudSyncEnabled: boolean;
  /** Research participation (default: false) */
  researchEnabled: boolean;
}

/**
 * Age verification data (COPPA compliance)
 */
export interface AgeVerification {
  /** Whether age has been verified */
  verified: boolean;
  /** Birth year (not full DOB for privacy) */
  birthYear?: number;
  /** Calculated age at verification */
  ageAtVerification?: number;
  /** Timestamp of verification */
  verifiedAt?: number;
  /** Whether user is eligible (13+) */
  isEligible?: boolean;
}

/**
 * Full consent record (stored securely)
 */
export interface ConsentRecord {
  /** Unique consent ID */
  consentId: string;
  /** User ID */
  userId: string;
  /** Consent version (for re-consent on policy changes) */
  version: string;
  /** User's consent preferences */
  preferences: ConsentPreferences;
  /** Age verification data */
  ageVerification: AgeVerification;
  /** Timestamp of consent */
  timestamp: number;
  /** Timestamp of last update */
  updatedAt: number;
  /** Expiry timestamp (optional, for annual renewal) */
  expiresAt?: number;
  /** Whether consent has been revoked */
  revoked: boolean;
  /** Revocation timestamp */
  revokedAt?: number;
  /** Revocation reason */
  revocationReason?: string;
}

/**
 * Consent history entry (for audit trail)
 */
export interface ConsentHistoryEntry {
  /** Previous consent record hash (tamper detection) */
  previousHash?: string;
  /** Action taken */
  action: 'granted' | 'updated' | 'revoked' | 'renewed';
  /** What changed */
  changes: Partial<ConsentPreferences>;
  /** Timestamp */
  timestamp: number;
}

/**
 * Consent store state
 */
export interface ConsentStore {
  // State
  currentConsent: ConsentRecord | null;
  consentHistory: ConsentHistoryEntry[];
  consentStatus: 'loading' | 'valid' | 'invalid' | 'expired' | 'missing' | 'under_age';
  isLoading: boolean;
  error: string | null;

  // Cached for fast validation (<5ms)
  consentCache: {
    canCollectAnalytics: boolean;
    canCollectCrashReports: boolean;
    canSyncToCloud: boolean;
    canParticipateInResearch: boolean;
    ageVerified: boolean;
    isEligible: boolean;
    cacheTimestamp: number;
  };

  // Actions
  loadConsent: () => Promise<ConsentRecord | null>;
  grantConsent: (preferences: ConsentPreferences, ageVerification: AgeVerification) => Promise<void>;
  updateConsent: (preferences: Partial<ConsentPreferences>) => Promise<void>;
  revokeConsent: (reason?: string) => Promise<void>;
  verifyAge: (birthYear: number) => Promise<{ eligible: boolean; age: number }>;
  getStoredAgeVerification: () => Promise<AgeVerification | null>;

  // Fast validation (uses cache, <5ms)
  canPerformOperation: (operation: 'analytics' | 'crash_reports' | 'cloud_sync' | 'research') => boolean;
  hasValidConsent: () => boolean;
  isAgeVerified: () => boolean;

  // Export (CCPA compliance)
  exportConsentRecords: () => Promise<{
    currentConsent: ConsentRecord | null;
    history: ConsentHistoryEntry[];
    exportedAt: number;
  }>;

  // Reset (for testing/development)
  resetConsent: () => Promise<void>;
}

/**
 * Default consent preferences (all opt-out)
 */
const DEFAULT_PREFERENCES: ConsentPreferences = {
  analyticsEnabled: false,
  crashReportsEnabled: false,
  cloudSyncEnabled: false,
  researchEnabled: false,
};

/**
 * Default consent cache (all blocked)
 */
const DEFAULT_CACHE = {
  canCollectAnalytics: false,
  canCollectCrashReports: false,
  canSyncToCloud: false,
  canParticipateInResearch: false,
  ageVerified: false,
  isEligible: false,
  cacheTimestamp: 0,
};

/**
 * Current consent version (update when policy changes)
 */
const CONSENT_VERSION = '1.0.0';

/**
 * Generate unique consent ID
 */
const generateConsentId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = generateRandomString(6);
  return `consent_${timestamp}_${randomPart}`;
};

/**
 * Calculate age from birth year
 */
const calculateAge = (birthYear: number): number => {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
};

/**
 * Consent Zustand Store
 */
export const useConsentStore = create<ConsentStore>((set, get) => ({
  currentConsent: null,
  consentHistory: [],
  consentStatus: 'loading',
  isLoading: false,
  error: null,
  consentCache: DEFAULT_CACHE,

  /**
   * Load consent from SecureStore
   */
  loadConsent: async () => {
    set({ isLoading: true, error: null });

    try {
      // Load consent record from SecureStore
      const storedConsent = await SecureStore.getItemAsync(CONSENT_SECURE_KEY);

      if (!storedConsent) {
        // No consent found - fail-safe: block access
        set({
          currentConsent: null,
          consentStatus: 'missing',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return null;
      }

      const consent = JSON.parse(storedConsent) as ConsentRecord;

      // Validate consent integrity
      if (!consent.consentId || !consent.userId || consent.revoked) {
        set({
          currentConsent: null,
          consentStatus: 'invalid',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return null;
      }

      // Check age eligibility
      if (!consent.ageVerification.isEligible) {
        set({
          currentConsent: consent,
          consentStatus: 'under_age',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return consent;
      }

      // Check expiry (if set)
      if (consent.expiresAt && consent.expiresAt < Date.now()) {
        set({
          currentConsent: consent,
          consentStatus: 'expired',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return consent;
      }

      // Load consent history from SecureStore (for audit trail persistence)
      const storedHistory = await SecureStore.getItemAsync(CONSENT_HISTORY_KEY);
      const history: ConsentHistoryEntry[] = storedHistory ? JSON.parse(storedHistory) : [];

      // Update cache for fast validation
      const cache = {
        canCollectAnalytics: consent.preferences.analyticsEnabled,
        canCollectCrashReports: consent.preferences.crashReportsEnabled,
        canSyncToCloud: consent.preferences.cloudSyncEnabled,
        canParticipateInResearch: consent.preferences.researchEnabled,
        ageVerified: consent.ageVerification.verified,
        isEligible: consent.ageVerification.isEligible ?? false,
        cacheTimestamp: Date.now(),
      };

      // Cache preferences in AsyncStorage for fast access
      await AsyncStorage.setItem(CONSENT_CACHE_KEY, JSON.stringify(cache));

      set({
        currentConsent: consent,
        consentHistory: history,
        consentStatus: 'valid',
        consentCache: cache,
        isLoading: false,
      });

      return consent;
    } catch (error) {
      console.error('[Consent] Failed to load consent', error);
      set({
        error: 'Failed to load consent',
        consentStatus: 'invalid',
        consentCache: DEFAULT_CACHE,
        isLoading: false,
      });
      return null;
    }
  },

  /**
   * Grant consent (initial consent collection)
   */
  grantConsent: async (preferences: ConsentPreferences, ageVerification: AgeVerification) => {
    set({ isLoading: true, error: null });

    try {
      const userId = getCurrentUserId();
      const now = Date.now();
      const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);

      const consent: ConsentRecord = {
        consentId: generateConsentId(),
        userId,
        version: CONSENT_VERSION,
        preferences,
        ageVerification,
        timestamp: now,
        updatedAt: now,
        expiresAt: oneYearFromNow,
        revoked: false,
      };

      // Store consent in SecureStore
      await SecureStore.setItemAsync(CONSENT_SECURE_KEY, JSON.stringify(consent));

      // Add to history
      const historyEntry: ConsentHistoryEntry = {
        action: 'granted',
        changes: preferences,
        timestamp: now,
      };

      // Persist history to SecureStore (Privacy audit trail requirement)
      const updatedHistory = [historyEntry];
      await SecureStore.setItemAsync(CONSENT_HISTORY_KEY, JSON.stringify(updatedHistory));

      // Update cache
      const cache = {
        canCollectAnalytics: preferences.analyticsEnabled,
        canCollectCrashReports: preferences.crashReportsEnabled,
        canSyncToCloud: preferences.cloudSyncEnabled,
        canParticipateInResearch: preferences.researchEnabled,
        ageVerified: ageVerification.verified,
        isEligible: ageVerification.isEligible ?? false,
        cacheTimestamp: now,
      };

      await AsyncStorage.setItem(CONSENT_CACHE_KEY, JSON.stringify(cache));

      set({
        currentConsent: consent,
        consentHistory: updatedHistory,
        consentStatus: ageVerification.isEligible ? 'valid' : 'under_age',
        consentCache: cache,
        isLoading: false,
      });

      if (__DEV__) {
        console.log('[Consent] Consent granted:', consent.consentId);
      }
    } catch (error) {
      console.error('[Consent] Failed to grant consent', error);
      set({
        error: 'Failed to save consent',
        isLoading: false,
      });
    }
  },

  /**
   * Update consent preferences
   */
  updateConsent: async (updates: Partial<ConsentPreferences>) => {
    const { currentConsent, consentHistory } = get();
    if (!currentConsent) {
      set({ error: 'No existing consent to update' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const now = Date.now();
      const updatedPreferences = {
        ...currentConsent.preferences,
        ...updates,
      };

      const updatedConsent: ConsentRecord = {
        ...currentConsent,
        preferences: updatedPreferences,
        updatedAt: now,
      };

      // Store updated consent
      await SecureStore.setItemAsync(CONSENT_SECURE_KEY, JSON.stringify(updatedConsent));

      // Add to history
      const historyEntry: ConsentHistoryEntry = {
        action: 'updated',
        changes: updates,
        timestamp: now,
      };

      // Persist history to SecureStore (Privacy audit trail requirement)
      const updatedHistory = [...consentHistory, historyEntry];
      await SecureStore.setItemAsync(CONSENT_HISTORY_KEY, JSON.stringify(updatedHistory));

      // Update cache
      const cache = {
        canCollectAnalytics: updatedPreferences.analyticsEnabled,
        canCollectCrashReports: updatedPreferences.crashReportsEnabled,
        canSyncToCloud: updatedPreferences.cloudSyncEnabled,
        canParticipateInResearch: updatedPreferences.researchEnabled,
        ageVerified: updatedConsent.ageVerification.verified,
        isEligible: updatedConsent.ageVerification.isEligible ?? false,
        cacheTimestamp: now,
      };

      await AsyncStorage.setItem(CONSENT_CACHE_KEY, JSON.stringify(cache));

      set({
        currentConsent: updatedConsent,
        consentHistory: updatedHistory,
        consentCache: cache,
        isLoading: false,
      });

      if (__DEV__) {
        console.log('[Consent] Consent updated:', Object.keys(updates).join(', '));
      }
    } catch (error) {
      console.error('[Consent] Failed to update consent', error);
      set({
        error: 'Failed to update consent',
        isLoading: false,
      });
    }
  },

  /**
   * Revoke consent
   */
  revokeConsent: async (reason?: string) => {
    const { currentConsent, consentHistory } = get();
    if (!currentConsent) {
      set({ error: 'No consent to revoke' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const now = Date.now();
      const revokedConsent: ConsentRecord = {
        ...currentConsent,
        revoked: true,
        revokedAt: now,
        ...(reason ? { revocationReason: reason } : {}),
        updatedAt: now,
      };

      // Store revoked consent
      await SecureStore.setItemAsync(CONSENT_SECURE_KEY, JSON.stringify(revokedConsent));

      // Add to history
      const historyEntry: ConsentHistoryEntry = {
        action: 'revoked',
        changes: {},
        timestamp: now,
      };

      // Persist history to SecureStore (Privacy audit trail requirement)
      const updatedHistory = [...consentHistory, historyEntry];
      await SecureStore.setItemAsync(CONSENT_HISTORY_KEY, JSON.stringify(updatedHistory));

      // Clear cache
      await AsyncStorage.removeItem(CONSENT_CACHE_KEY);

      set({
        currentConsent: revokedConsent,
        consentHistory: updatedHistory,
        consentStatus: 'invalid',
        consentCache: DEFAULT_CACHE,
        isLoading: false,
      });

      if (__DEV__) {
        console.log('[Consent] Consent revoked');
      }
    } catch (error) {
      console.error('[Consent] Failed to revoke consent', error);
      set({
        error: 'Failed to revoke consent',
        isLoading: false,
      });
    }
  },

  /**
   * Verify age (COPPA compliance)
   * Validates birth year is within acceptable range before processing
   */
  verifyAge: async (birthYear: number) => {
    const currentYear = new Date().getFullYear();

    // Validate input - security requirement
    if (!Number.isInteger(birthYear)) {
      throw new Error('Birth year must be an integer');
    }
    if (birthYear < 1900 || birthYear > currentYear) {
      throw new Error(`Birth year must be between 1900 and ${currentYear}`);
    }

    const age = calculateAge(birthYear);
    const eligible = age >= 13;

    const verification: AgeVerification = {
      verified: true,
      birthYear,
      ageAtVerification: age,
      verifiedAt: Date.now(),
      isEligible: eligible,
    };

    // Store age verification separately (for pre-consent check)
    await SecureStore.setItemAsync(AGE_VERIFICATION_KEY, JSON.stringify(verification));

    return { eligible, age };
  },

  /**
   * Get stored age verification (for onboarding flow)
   */
  getStoredAgeVerification: async () => {
    try {
      const stored = await SecureStore.getItemAsync(AGE_VERIFICATION_KEY);
      if (stored) {
        return JSON.parse(stored) as AgeVerification;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Fast consent validation (uses cache, <5ms)
   */
  canPerformOperation: (operation) => {
    const { consentCache, consentStatus } = get();

    // Block if no valid consent (fail-safe)
    if (consentStatus !== 'valid') {
      return false;
    }

    switch (operation) {
      case 'analytics':
        return consentCache.canCollectAnalytics;
      case 'crash_reports':
        return consentCache.canCollectCrashReports;
      case 'cloud_sync':
        return consentCache.canSyncToCloud;
      case 'research':
        return consentCache.canParticipateInResearch;
      default:
        return false;
    }
  },

  /**
   * Check if user has valid consent
   */
  hasValidConsent: () => {
    const { consentStatus } = get();
    return consentStatus === 'valid';
  },

  /**
   * Check if age is verified
   */
  isAgeVerified: () => {
    const { consentCache } = get();
    return consentCache.ageVerified && consentCache.isEligible;
  },

  /**
   * Export consent records (CCPA compliance)
   */
  exportConsentRecords: async () => {
    const { currentConsent, consentHistory } = get();

    return {
      currentConsent,
      history: consentHistory,
      exportedAt: Date.now(),
    };
  },

  /**
   * Reset consent (for testing/development)
   */
  resetConsent: async () => {
    try {
      await SecureStore.deleteItemAsync(CONSENT_SECURE_KEY);
      await SecureStore.deleteItemAsync(AGE_VERIFICATION_KEY);
      await AsyncStorage.removeItem(CONSENT_CACHE_KEY);

      set({
        currentConsent: null,
        consentHistory: [],
        consentStatus: 'missing',
        consentCache: DEFAULT_CACHE,
        isLoading: false,
        error: null,
      });

      console.log('[Consent] Consent reset');
    } catch (error) {
      console.error('[Consent] Failed to reset consent', error);
    }
  },
}));

/**
 * Convenience hooks
 */
export const useConsentPreferences = () => useConsentStore((state) => state.currentConsent?.preferences);
export const useConsentStatus = () => useConsentStore((state) => state.consentStatus);
export const useAgeVerification = () => useConsentStore((state) => state.currentConsent?.ageVerification);

/**
 * CRITICAL: Crisis intervention is NEVER gated by consent
 * This function always returns true for emergency access
 */
export const canPerformCrisisIntervention = (): boolean => {
  // Emergency override - crisis access ALWAYS allowed
  // This is a Privacy vital interests exception
  return true;
};
