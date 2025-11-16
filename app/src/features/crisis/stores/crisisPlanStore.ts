/**
 * CRISIS PLAN STORE
 * Zustand store for personalized crisis safety planning
 *
 * SAFETY PLANNING MODEL:
 * Based on Stanley-Brown Safety Planning Intervention
 * https://suicidepreventionlifeline.org/wp-content/uploads/2016/08/Brown_StanleySafetyPlanTemplate.pdf
 *
 * CLINICAL REQUIREMENTS:
 * - User-controlled and user-owned data
 * - Encrypted storage (SecureStore for sensitive data)
 * - Offline-first architecture
 * - Auto-save functionality
 * - Export capability for sharing with providers
 *
 * COMPLIANCE:
 * - HIPAA: PHI stored locally, encrypted
 * - User consent required before creation
 * - User can delete at any time
 * - No cloud sync of crisis plan without explicit consent
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { logPerformance, logSecurity, logError, LogCategory } from '@/services/logging';
import { crisisAnalyticsService } from '@/features/crisis/services/CrisisAnalyticsService';

/**
 * CRISIS PLAN DATA TYPES
 * Following Stanley-Brown Safety Planning Model (7 steps)
 */

export interface CopingStrategy {
  strategy: string;
  effectiveness?: (1 | 2 | 3 | 4 | 5) | undefined;
  lastUsed?: number | undefined;
  timesUsed?: number | undefined;
}

export interface PersonalContact {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  notes?: string;
  preferredMethod?: 'call' | 'text' | 'visit';
}

export interface ProfessionalContact {
  id: string;
  name: string;
  type: 'therapist' | 'psychiatrist' | 'doctor' | 'case_manager' | 'other';
  phone: string;
  address?: string;
  availability?: string;
  emergencyNumber?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  type: '988' | '911' | 'crisis_center' | 'emergency_room' | 'other';
  phone: string;
  address?: string;
  notes?: string;
}

export interface PersonalizedCrisisPlan {
  id: string;
  userId?: string;
  createdAt: number;
  updatedAt: number;
  version: number;

  // Step 1: Warning Signs
  warningSignsPersonal: string[];  // "I notice I'm feeling..."
  warningSignsTriggers: string[];  // "Things that make it worse..."

  // Step 2: Internal Coping Strategies
  copingStrategies: CopingStrategy[];

  // Step 3: Social Contacts & Distractions
  personalContacts: PersonalContact[];
  distractionActivities: string[];

  // Step 4: Professional Contacts
  professionalContacts: ProfessionalContact[];

  // Step 5: Emergency Contacts
  emergencyContacts: EmergencyContact[];

  // Step 6: Reasons for Living
  reasonsForLiving: string[];

  // Step 7: Environment Safety
  environmentSafety: string[];

  // Plan Activation Tracking
  lastActivated?: number;
  timesActivated?: number;
  lastEffectivenessRating?: 'helped' | 'somewhat' | 'not_helpful';

  // User Consent
  userConsent: boolean;
  consentTimestamp: number;
}

export interface CrisisPlanStore {
  // State
  crisisPlan: PersonalizedCrisisPlan | null;
  isLoading: boolean;
  error: string | null;
  autoSaveEnabled: boolean;

  // Core Actions
  loadCrisisPlan: () => Promise<void>;
  createCrisisPlan: (userConsent: boolean) => Promise<void>;
  updateCrisisPlan: (updates: Partial<PersonalizedCrisisPlan>) => Promise<void>;
  deleteCrisisPlan: () => Promise<void>;

  // Warning Signs
  addWarningSign: (sign: string, type: 'personal' | 'trigger') => Promise<void>;
  removeWarningSign: (index: number, type: 'personal' | 'trigger') => Promise<void>;

  // Coping Strategies
  addCopingStrategy: (strategy: string) => Promise<void>;
  removeCopingStrategy: (index: number) => Promise<void>;
  updateCopingStrategyEffectiveness: (index: number, effectiveness: 1 | 2 | 3 | 4 | 5) => Promise<void>;
  recordCopingStrategyUse: (index: number) => Promise<void>;

  // Contacts
  addPersonalContact: (contact: Omit<PersonalContact, 'id'>) => Promise<void>;
  removePersonalContact: (contactId: string) => Promise<void>;
  addProfessionalContact: (contact: Omit<ProfessionalContact, 'id'>) => Promise<void>;
  removeProfessionalContact: (contactId: string) => Promise<void>;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  removeEmergencyContact: (contactId: string) => Promise<void>;

  // Reasons for Living
  addReasonForLiving: (reason: string) => Promise<void>;
  removeReasonForLiving: (index: number) => Promise<void>;

  // Environment Safety
  addEnvironmentSafety: (item: string) => Promise<void>;
  removeEnvironmentSafety: (index: number) => Promise<void>;

  // Distraction Activities
  addDistractionActivity: (activity: string) => Promise<void>;
  removeDistractionActivity: (index: number) => Promise<void>;

  // Safety Plan Activation
  activateSafetyPlan: () => Promise<void>;
  recordEffectiveness: (effectiveness: 'helped' | 'somewhat' | 'not_helpful') => Promise<void>;

  // Utility
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  exportCrisisPlan: (format: 'text' | 'json') => Promise<string>;
}

const STORAGE_KEY = '@crisis_plan_v1';
const SECURE_STORAGE_KEY = '@crisis_plan_secure_v1';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create default crisis plan structure
 */
function createDefaultCrisisPlan(userConsent: boolean): PersonalizedCrisisPlan {
  return {
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    warningSignsPersonal: [],
    warningSignsTriggers: [],
    copingStrategies: [],
    personalContacts: [],
    distractionActivities: [],
    professionalContacts: [],
    emergencyContacts: [
      // Pre-populate with national resources
      {
        id: generateId(),
        name: '988 Suicide & Crisis Lifeline',
        type: '988',
        phone: '988',
        notes: '24/7 crisis support'
      },
      {
        id: generateId(),
        name: 'Emergency Services',
        type: '911',
        phone: '911',
        notes: 'For life-threatening emergencies only'
      }
    ],
    reasonsForLiving: [],
    environmentSafety: [],
    userConsent,
    consentTimestamp: Date.now()
  };
}

/**
 * Crisis Plan Zustand Store
 */
export const useCrisisPlanStore = create<CrisisPlanStore>((set, get) => ({
  crisisPlan: null,
  isLoading: false,
  error: null,
  autoSaveEnabled: true,

  /**
   * Load crisis plan from secure storage
   */
  loadCrisisPlan: async () => {
    const startTime = performance.now();
    set({ isLoading: true, error: null });

    try {
      // Try to load from secure storage first
      const secureData = await SecureStore.getItemAsync(SECURE_STORAGE_KEY);

      if (secureData) {
        const crisisPlan = JSON.parse(secureData) as PersonalizedCrisisPlan;

        set({ crisisPlan, isLoading: false });

        const loadTime = performance.now() - startTime;
        console.log('Crisis plan loaded', loadTime, { category: 'storage', target: 500 });

        return;
      }

      // No plan exists
      set({ crisisPlan: null, isLoading: false });
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to load crisis plan', error instanceof Error ? error : new Error(String(error)));
      set({ error: 'Failed to load crisis plan', isLoading: false });
    }
  },

  /**
   * Create new crisis plan
   */
  createCrisisPlan: async (userConsent: boolean) => {
    if (!userConsent) {
      set({ error: 'User consent required to create crisis plan' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const crisisPlan = createDefaultCrisisPlan(userConsent);

      // Save to secure storage
      await SecureStore.setItemAsync(SECURE_STORAGE_KEY, JSON.stringify(crisisPlan));

      set({ crisisPlan, isLoading: false });

      // Track analytics
      await crisisAnalyticsService.trackEvent('crisis_plan_created');

      logSecurity('Crisis plan created', 'low', {
        component: 'CrisisPlanStore',
        action: 'create',
        result: 'success'
      });
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to create crisis plan', error instanceof Error ? error : new Error(String(error)));
      set({ error: 'Failed to create crisis plan', isLoading: false });
    }
  },

  /**
   * Update crisis plan
   * Uses functional update pattern to prevent race conditions
   */
  updateCrisisPlan: async (updates: Partial<PersonalizedCrisisPlan>) => {
    return new Promise<void>((resolve) => {
      const autoSaveEnabled = get().autoSaveEnabled;

      // Atomic state update using functional pattern
      set((state) => {
        if (!state.crisisPlan) {
          return { error: 'No crisis plan to update' };
        }

        const updatedPlan: PersonalizedCrisisPlan = {
          ...state.crisisPlan,
          ...updates,
          updatedAt: Date.now(),
          version: state.crisisPlan.version + 1
        };

        return { crisisPlan: updatedPlan };
      });

      // Auto-save after atomic update
      const updatedPlan = get().crisisPlan;

      if (autoSaveEnabled && updatedPlan) {
        SecureStore.setItemAsync(SECURE_STORAGE_KEY, JSON.stringify(updatedPlan))
          .then(() => resolve())
          .catch(error => {
            logError(LogCategory.CRISIS, 'Failed to auto-save crisis plan', error instanceof Error ? error : new Error(String(error)));
            resolve();
          });
      } else {
        resolve();
      }
    });
  },

  /**
   * Delete crisis plan
   */
  deleteCrisisPlan: async () => {
    try {
      await SecureStore.deleteItemAsync(SECURE_STORAGE_KEY);
      set({ crisisPlan: null });

      // Track analytics
      await crisisAnalyticsService.trackEvent('crisis_plan_deleted');

      logSecurity('Crisis plan deleted', 'low', {
        component: 'CrisisPlanStore',
        action: 'delete',
        result: 'success'
      });
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to delete crisis plan', error instanceof Error ? error : new Error(String(error)));
      set({ error: 'Failed to delete crisis plan' });
    }
  },

  /**
   * Add warning sign
   */
  addWarningSign: async (sign: string, type: 'personal' | 'trigger') => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    if (type === 'personal') {
      await updateCrisisPlan({
        warningSignsPersonal: [...crisisPlan.warningSignsPersonal, sign]
      });
    } else {
      await updateCrisisPlan({
        warningSignsTriggers: [...crisisPlan.warningSignsTriggers, sign]
      });
    }

    // Track analytics
    await crisisAnalyticsService.trackEvent('warning_sign_added');
  },

  /**
   * Remove warning sign
   */
  removeWarningSign: async (index: number, type: 'personal' | 'trigger') => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    if (type === 'personal') {
      const updated = [...crisisPlan.warningSignsPersonal];
      updated.splice(index, 1);
      await updateCrisisPlan({ warningSignsPersonal: updated });
    } else {
      const updated = [...crisisPlan.warningSignsTriggers];
      updated.splice(index, 1);
      await updateCrisisPlan({ warningSignsTriggers: updated });
    }
  },

  /**
   * Add coping strategy
   */
  addCopingStrategy: async (strategy: string) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    await updateCrisisPlan({
      copingStrategies: [
        ...crisisPlan.copingStrategies,
        { strategy, timesUsed: 0 }
      ]
    });

    // Track analytics
    await crisisAnalyticsService.trackEvent('coping_strategy_added');
  },

  /**
   * Remove coping strategy
   */
  removeCopingStrategy: async (index: number) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    const updated = [...crisisPlan.copingStrategies];
    updated.splice(index, 1);
    await updateCrisisPlan({ copingStrategies: updated });
  },

  /**
   * Update coping strategy effectiveness
   */
  updateCopingStrategyEffectiveness: async (index: number, effectiveness: 1 | 2 | 3 | 4 | 5) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    const updated = [...crisisPlan.copingStrategies];
    updated[index] = { ...updated[index], effectiveness } as CopingStrategy;
    await updateCrisisPlan({ copingStrategies: updated });
  },

  /**
   * Record coping strategy use
   */
  recordCopingStrategyUse: async (index: number) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    const updated = [...crisisPlan.copingStrategies];
    updated[index] = {
      ...updated[index],
      lastUsed: Date.now(),
      timesUsed: (updated[index]!.timesUsed || 0) + 1
    } as CopingStrategy;
    await updateCrisisPlan({ copingStrategies: updated });

    // Track analytics
    await crisisAnalyticsService.trackEvent('coping_strategy_used');
  },

  /**
   * Add personal contact
   */
  addPersonalContact: async (contact: Omit<PersonalContact, 'id'>) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    await updateCrisisPlan({
      personalContacts: [
        ...crisisPlan.personalContacts,
        { ...contact, id: generateId() }
      ]
    });

    // Track analytics
    await crisisAnalyticsService.trackEvent('contact_added');
  },

  /**
   * Remove personal contact
   */
  removePersonalContact: async (contactId: string) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    await updateCrisisPlan({
      personalContacts: crisisPlan.personalContacts.filter(c => c.id !== contactId)
    });
  },

  /**
   * Add professional contact
   */
  addProfessionalContact: async (contact: Omit<ProfessionalContact, 'id'>) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    await updateCrisisPlan({
      professionalContacts: [
        ...crisisPlan.professionalContacts,
        { ...contact, id: generateId() }
      ]
    });
  },

  /**
   * Remove professional contact
   */
  removeProfessionalContact: async (contactId: string) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    await updateCrisisPlan({
      professionalContacts: crisisPlan.professionalContacts.filter(c => c.id !== contactId)
    });
  },

  /**
   * Add emergency contact
   */
  addEmergencyContact: async (contact: Omit<EmergencyContact, 'id'>) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    await updateCrisisPlan({
      emergencyContacts: [
        ...crisisPlan.emergencyContacts,
        { ...contact, id: generateId() }
      ]
    });
  },

  /**
   * Remove emergency contact
   */
  removeEmergencyContact: async (contactId: string) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    await updateCrisisPlan({
      emergencyContacts: crisisPlan.emergencyContacts.filter(c => c.id !== contactId)
    });
  },

  /**
   * Add reason for living
   */
  addReasonForLiving: async (reason: string) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    await updateCrisisPlan({
      reasonsForLiving: [...crisisPlan.reasonsForLiving, reason]
    });

    // Track analytics
    await crisisAnalyticsService.trackEvent('reason_for_living_added');
  },

  /**
   * Remove reason for living
   */
  removeReasonForLiving: async (index: number) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    const updated = [...crisisPlan.reasonsForLiving];
    updated.splice(index, 1);
    await updateCrisisPlan({ reasonsForLiving: updated });
  },

  /**
   * Add environment safety item
   */
  addEnvironmentSafety: async (item: string) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    await updateCrisisPlan({
      environmentSafety: [...crisisPlan.environmentSafety, item]
    });
  },

  /**
   * Remove environment safety item
   */
  removeEnvironmentSafety: async (index: number) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    const updated = [...crisisPlan.environmentSafety];
    updated.splice(index, 1);
    await updateCrisisPlan({ environmentSafety: updated });
  },

  /**
   * Add distraction activity
   */
  addDistractionActivity: async (activity: string) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    await updateCrisisPlan({
      distractionActivities: [...crisisPlan.distractionActivities, activity]
    });
  },

  /**
   * Remove distraction activity
   */
  removeDistractionActivity: async (index: number) => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    const updated = [...crisisPlan.distractionActivities];
    updated.splice(index, 1);
    await updateCrisisPlan({ distractionActivities: updated });
  },

  /**
   * Activate safety plan
   */
  activateSafetyPlan: async () => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    await updateCrisisPlan({
      lastActivated: Date.now(),
      timesActivated: (crisisPlan.timesActivated || 0) + 1
    });

    logSecurity('Safety plan activated', 'medium', {
      component: 'CrisisPlanStore',
      action: 'activate',
      result: 'success'
    });
  },

  /**
   * Record effectiveness rating
   */
  recordEffectiveness: async (effectiveness: 'helped' | 'somewhat' | 'not_helpful') => {
    const { crisisPlan, updateCrisisPlan } = get();
    if (!crisisPlan) return;

    await updateCrisisPlan({
      lastEffectivenessRating: effectiveness
    });

    // Effectiveness recorded - no performance measurement needed
  },

  /**
   * Enable auto-save
   */
  enableAutoSave: () => {
    set({ autoSaveEnabled: true });
  },

  /**
   * Disable auto-save
   */
  disableAutoSave: () => {
    set({ autoSaveEnabled: false });
  },

  /**
   * Export crisis plan
   */
  exportCrisisPlan: async (format: 'text' | 'json') => {
    const { crisisPlan } = get();

    if (!crisisPlan) {
      throw new Error('No crisis plan to export');
    }

    if (format === 'json') {
      return JSON.stringify(crisisPlan, null, 2);
    }

    // Text format for easy sharing with providers
    const lines: string[] = [
      'MY PERSONAL SAFETY PLAN',
      '='.repeat(40),
      '',
      'STEP 1: WARNING SIGNS',
      'Personal warning signs:',
      ...crisisPlan.warningSignsPersonal.map(s => `- ${s}`),
      '',
      'Triggers:',
      ...crisisPlan.warningSignsTriggers.map(t => `- ${t}`),
      '',
      'STEP 2: COPING STRATEGIES',
      ...crisisPlan.copingStrategies.map(c => `- ${c.strategy}`),
      '',
      'STEP 3: DISTRACTIONS & SOCIAL CONTACTS',
      'Activities:',
      ...crisisPlan.distractionActivities.map(a => `- ${a}`),
      '',
      'Personal contacts:',
      ...crisisPlan.personalContacts.map(c =>
        `- ${c.name} (${c.relationship}): ${c.phone || 'No phone'}`
      ),
      '',
      'STEP 4: PROFESSIONAL CONTACTS',
      ...crisisPlan.professionalContacts.map(c =>
        `- ${c.name} (${c.type}): ${c.phone}`
      ),
      '',
      'STEP 5: EMERGENCY CONTACTS',
      ...crisisPlan.emergencyContacts.map(c =>
        `- ${c.name}: ${c.phone}`
      ),
      '',
      'STEP 6: REASONS FOR LIVING',
      ...crisisPlan.reasonsForLiving.map(r => `- ${r}`),
      '',
      'STEP 7: ENVIRONMENT SAFETY',
      ...crisisPlan.environmentSafety.map(e => `- ${e}`),
      '',
      '='.repeat(40),
      `Created: ${new Date(crisisPlan.createdAt).toLocaleDateString()}`,
      `Last Updated: ${new Date(crisisPlan.updatedAt).toLocaleDateString()}`
    ];

    // Track analytics
    await crisisAnalyticsService.trackEvent('crisis_plan_exported');

    return lines.join('\n');
  }
}));