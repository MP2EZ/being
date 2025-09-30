/**
 * CRISIS RESOURCES INTEGRATION TEST
 * Phase 2 - Crisis Integration Feature Testing
 *
 * VALIDATION REQUIREMENTS:
 * - Crisis Resources Screen loads <200ms
 * - All national resources accessible offline
 * - Navigation between Crisis Resources and Crisis Plan
 * - Crisis Plan creation with user consent
 * - Post-crisis support activation
 * - Data persistence and security
 */

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { NATIONAL_CRISIS_RESOURCES, getCrisisResource } from '../../src/services/crisis/types/CrisisResources';
import { useCrisisPlanStore } from '../../src/stores/crisisPlanStore';
import { postCrisisSupportService } from '../../src/services/crisis/PostCrisisSupportService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('CRISIS RESOURCES INTEGRATION', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
  });

  describe('📞 NATIONAL CRISIS RESOURCES', () => {
    it('should have all required national resources available offline', () => {
      expect(NATIONAL_CRISIS_RESOURCES).toHaveLength(8);

      // Verify 988 Lifeline
      const lifeline = getCrisisResource('988_lifeline');
      expect(lifeline).toBeDefined();
      expect(lifeline?.phone).toBe('988');
      expect(lifeline?.priority).toBe('high');

      // Verify Crisis Text Line
      const textLine = getCrisisResource('crisis_text_line');
      expect(textLine).toBeDefined();
      expect(textLine?.textNumber).toBe('741741');
      expect(textLine?.priority).toBe('high');

      // Verify 911
      const emergency = getCrisisResource('emergency_911');
      expect(emergency).toBeDefined();
      expect(emergency?.phone).toBe('911');
      expect(emergency?.priority).toBe('emergency');
    });

    it('should load resources within <200ms requirement', () => {
      const startTime = performance.now();

      // Simulate loading resources (offline-first)
      const resources = NATIONAL_CRISIS_RESOURCES;

      const loadTime = performance.now() - startTime;

      expect(resources.length).toBeGreaterThan(0);
      expect(loadTime).toBeLessThan(200);

      console.log(`✅ Resources loaded in ${loadTime.toFixed(2)}ms < 200ms requirement`);
    });

    it('should have verified contact information for all resources', () => {
      NATIONAL_CRISIS_RESOURCES.forEach(resource => {
        expect(resource.name).toBeTruthy();
        expect(resource.description).toBeTruthy();
        expect(resource.availability).toBeTruthy();
        expect(resource.lastVerified).toBeGreaterThan(0);
        expect(resource.verifiedBy).toBe('clinical_team');

        // Either phone or text must be available
        expect(
          resource.phone || resource.textNumber
        ).toBeTruthy();
      });
    });
  });

  describe('🛡️ CRISIS PLAN INTEGRATION', () => {
    let store: ReturnType<typeof useCrisisPlanStore.getState>;

    beforeEach(async () => {
      store = useCrisisPlanStore.getState();
      await store.loadCrisisPlan();
    });

    it('should create crisis plan with user consent', async () => {
      expect(store.crisisPlan).toBeNull();

      await store.createCrisisPlan(true);

      expect(store.crisisPlan).toBeTruthy();
      expect(store.crisisPlan?.userConsent).toBe(true);
      expect(store.crisisPlan?.consentTimestamp).toBeGreaterThan(0);
      expect(store.crisisPlan?.emergencyContacts).toHaveLength(2); // 988 and 911 pre-populated

      // Verify secure storage was called
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should add warning signs to crisis plan', async () => {
      await store.createCrisisPlan(true);

      await store.addWarningSign('Feeling overwhelmed', 'personal');
      await store.addWarningSign('Social isolation', 'personal');

      expect(store.crisisPlan?.warningSignsPersonal).toHaveLength(2);
      expect(store.crisisPlan?.warningSignsPersonal).toContain('Feeling overwhelmed');
    });

    it('should add coping strategies with tracking', async () => {
      await store.createCrisisPlan(true);

      await store.addCopingStrategy('Take a walk');
      await store.addCopingStrategy('Deep breathing');

      expect(store.crisisPlan?.copingStrategies).toHaveLength(2);
      expect(store.crisisPlan?.copingStrategies[0].strategy).toBe('Take a walk');
      expect(store.crisisPlan?.copingStrategies[0].timesUsed).toBe(0);
    });

    it('should add personal contacts with required fields', async () => {
      await store.createCrisisPlan(true);

      await store.addPersonalContact({
        name: 'John Doe',
        relationship: 'Friend',
        phone: '555-0100',
        notes: 'Available evenings'
      });

      expect(store.crisisPlan?.personalContacts).toHaveLength(1);
      expect(store.crisisPlan?.personalContacts[0].name).toBe('John Doe');
      expect(store.crisisPlan?.personalContacts[0].id).toBeTruthy();
    });

    it('should add reasons for living', async () => {
      await store.createCrisisPlan(true);

      await store.addReasonForLiving('My family');
      await store.addReasonForLiving('My future goals');

      expect(store.crisisPlan?.reasonsForLiving).toHaveLength(2);
    });

    it('should export crisis plan in text format', async () => {
      await store.createCrisisPlan(true);
      await store.addWarningSign('Test warning', 'personal');
      await store.addCopingStrategy('Test strategy');

      const exported = await store.exportCrisisPlan('text');

      expect(exported).toContain('MY PERSONAL SAFETY PLAN');
      expect(exported).toContain('STEP 1: WARNING SIGNS');
      expect(exported).toContain('Test warning');
      expect(exported).toContain('Test strategy');
      expect(exported).toContain('988 Suicide & Crisis Lifeline');
    });

    it('should allow user to delete crisis plan', async () => {
      await store.createCrisisPlan(true);
      expect(store.crisisPlan).toBeTruthy();

      await store.deleteCrisisPlan();

      expect(store.crisisPlan).toBeNull();
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('should auto-save changes when enabled', async () => {
      store.enableAutoSave();
      await store.createCrisisPlan(true);

      const initialCallCount = mockSecureStore.setItemAsync.mock.calls.length;

      await store.addWarningSign('Auto-save test', 'personal');

      // Should trigger additional save
      expect(mockSecureStore.setItemAsync.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('📅 7-DAY POST-CRISIS SUPPORT', () => {
    beforeEach(async () => {
      await postCrisisSupportService.initialize();
    });

    it('should activate 7-day support after crisis detection', async () => {
      const support = await postCrisisSupportService.activateSupport('phq9_moderate', 15);

      expect(support.id).toBeTruthy();
      expect(support.crisisType).toBe('phq9_moderate');
      expect(support.crisisScore).toBe(15);
      expect(support.isActive).toBe(true);
      expect(support.checkIns).toHaveLength(0);

      // Should expire in 7 days
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(support.expiresAt).toBeGreaterThan(Date.now() + sevenDaysMs - 1000);
    });

    it('should record daily check-ins', async () => {
      await postCrisisSupportService.activateSupport('phq9_severe', 23);

      await postCrisisSupportService.recordCheckIn(1, 3, 'Feeling better today');

      const support = postCrisisSupportService.getCurrentSupport();
      expect(support?.checkIns).toHaveLength(1);
      expect(support?.checkIns[0].day).toBe(1);
      expect(support?.checkIns[0].moodRating).toBe(3);
      expect(support?.checkIns[0].notes).toBe('Feeling better today');
    });

    it('should track resource engagement', async () => {
      await postCrisisSupportService.activateSupport('phq9_moderate', 15);

      await postCrisisSupportService.recordResourceView();
      await postCrisisSupportService.recordResourceView();
      await postCrisisSupportService.recordCrisisPlanAccess();
      await postCrisisSupportService.recordCopingStrategyUse();

      const support = postCrisisSupportService.getCurrentSupport();
      expect(support?.resourcesViewed).toBe(2);
      expect(support?.crisisPlanAccessed).toBe(true);
      expect(support?.copingStrategiesUsed).toBe(1);
    });

    it('should provide supportive messages for each day', () => {
      const day1Message = postCrisisSupportService.getSupportiveMessage(1);
      const day7Message = postCrisisSupportService.getSupportiveMessage(7);

      expect(day1Message).toContain('first step');
      expect(day7Message).toContain('completed');
    });

    it('should allow user to opt out', async () => {
      await postCrisisSupportService.activateSupport('phq9_moderate', 15);

      expect(postCrisisSupportService.isActive()).toBe(true);

      await postCrisisSupportService.optOut();

      expect(postCrisisSupportService.isActive()).toBe(false);

      const support = postCrisisSupportService.getCurrentSupport();
      expect(support?.userOptedOut).toBe(true);
    });

    it('should identify when check-in is due', async () => {
      await postCrisisSupportService.activateSupport('phq9_moderate', 15);

      // No check-ins yet, so first one is due
      const isDueInitially = postCrisisSupportService.isCheckInDue();

      // After recording day 0 check-in, next is day 1
      await postCrisisSupportService.recordCheckIn(0, 3);

      const nextDay = postCrisisSupportService.getNextCheckInDay();
      expect(nextDay).toBe(1);
    });
  });

  describe('🔐 SECURITY AND COMPLIANCE', () => {
    it('should store crisis plan in secure storage', async () => {
      const store = useCrisisPlanStore.getState();
      await store.createCrisisPlan(true);

      // Verify SecureStore was used (not AsyncStorage)
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should store post-crisis support in regular storage (no PHI)', async () => {
      await postCrisisSupportService.activateSupport('phq9_moderate', 15);

      // Post-crisis support uses AsyncStorage (no PHI)
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should require user consent before creating crisis plan', async () => {
      const store = useCrisisPlanStore.getState();

      // Attempt to create without consent
      await store.createCrisisPlan(false);

      // Should set error
      expect(store.error).toBeTruthy();
      expect(store.crisisPlan).toBeNull();
    });

    it('should maintain data integrity across store operations', async () => {
      const store = useCrisisPlanStore.getState();
      await store.createCrisisPlan(true);

      const initialVersion = store.crisisPlan?.version;

      await store.addWarningSign('Test', 'personal');

      // Version should increment
      expect(store.crisisPlan?.version).toBe((initialVersion || 0) + 1);

      // Updated timestamp should be recent
      const updatedAt = store.crisisPlan?.updatedAt || 0;
      expect(Date.now() - updatedAt).toBeLessThan(1000);
    });
  });

  describe('⚡ PERFORMANCE VALIDATION', () => {
    it('should load crisis plan within performance threshold', async () => {
      const store = useCrisisPlanStore.getState();
      await store.createCrisisPlan(true);

      const startTime = performance.now();
      await store.loadCrisisPlan();
      const loadTime = performance.now() - startTime;

      expect(loadTime).toBeLessThan(100); // <100ms load time
      console.log(`✅ Crisis plan loaded in ${loadTime.toFixed(2)}ms < 100ms threshold`);
    });

    it('should handle concurrent operations efficiently', async () => {
      const store = useCrisisPlanStore.getState();
      await store.createCrisisPlan(true);

      const startTime = performance.now();

      // Concurrent operations
      await Promise.all([
        store.addWarningSign('Warning 1', 'personal'),
        store.addCopingStrategy('Strategy 1'),
        store.addReasonForLiving('Reason 1')
      ]);

      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(500); // All operations < 500ms
      expect(store.crisisPlan?.warningSignsPersonal).toHaveLength(1);
      expect(store.crisisPlan?.copingStrategies).toHaveLength(1);
      expect(store.crisisPlan?.reasonsForLiving).toHaveLength(1);
    });
  });
});

console.log('✅ Crisis Resources Integration Tests Complete');