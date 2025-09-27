/**
 * SafeOfflineCrisisManager - Safe version of crisis management
 * Integrates with simple stores to avoid property descriptor conflicts
 */

import { simpleStorage } from './SimpleStorageService';
import { simpleValidation } from './SimpleValidationService';

export interface SafeCrisisHotline {
  name: string;
  number: string;
  type: 'voice' | 'text' | 'emergency';
  available: string;
}

export interface SafeCrisisResources {
  hotlines: SafeCrisisHotline[];
  copingStrategies: string[];
  lastUpdated: number;
}

export class SafeOfflineCrisisManager {
  private static instance: SafeOfflineCrisisManager;
  private static readonly CRISIS_STORAGE_KEY = 'safe_crisis_resources';

  static getInstance(): SafeOfflineCrisisManager {
    if (!SafeOfflineCrisisManager.instance) {
      SafeOfflineCrisisManager.instance = new SafeOfflineCrisisManager();
    }
    return SafeOfflineCrisisManager.instance;
  }

  /**
   * Initialize safe crisis data for offline access
   */
  async initializeCrisisResources(): Promise<void> {
    try {
      const existingResources = await simpleStorage.getObject<SafeCrisisResources>(
        SafeOfflineCrisisManager.CRISIS_STORAGE_KEY
      );

      if (existingResources && this.isValidCrisisResources(existingResources)) {
        console.log('Crisis resources already initialized');
        return;
      }

      const crisisResources: SafeCrisisResources = {
        hotlines: [
          {
            name: '988 Suicide & Crisis Lifeline',
            number: '988',
            type: 'voice',
            available: '24/7',
          },
          {
            name: 'Crisis Text Line',
            number: '741741',
            type: 'text',
            available: '24/7',
          },
          {
            name: 'Emergency Services',
            number: '911',
            type: 'emergency',
            available: '24/7',
          },
        ],
        copingStrategies: [
          'Take three deep breaths',
          'Count 5 things you can see',
          'Name 4 things you can touch',
          'Listen for 3 sounds around you',
          'Find 2 scents you can smell',
          'Notice 1 thing you can taste',
        ],
        lastUpdated: Date.now(),
      };

      await simpleStorage.setObject(
        SafeOfflineCrisisManager.CRISIS_STORAGE_KEY,
        crisisResources
      );

      console.log('Crisis resources initialized successfully');
    } catch (error) {
      console.error('Failed to initialize crisis resources:', error);
    }
  }

  /**
   * Get crisis resources safely
   */
  async getCrisisResources(): Promise<SafeCrisisResources | null> {
    try {
      const resources = await simpleStorage.getObject<SafeCrisisResources>(
        SafeOfflineCrisisManager.CRISIS_STORAGE_KEY
      );

      if (resources && this.isValidCrisisResources(resources)) {
        return resources;
      }

      console.warn('Invalid crisis resources found, reinitializing...');
      await this.initializeCrisisResources();
      return await simpleStorage.getObject<SafeCrisisResources>(
        SafeOfflineCrisisManager.CRISIS_STORAGE_KEY
      );
    } catch (error) {
      console.error('Failed to get crisis resources:', error);
      return null;
    }
  }

  /**
   * Get emergency hotlines
   */
  async getEmergencyHotlines(): Promise<SafeCrisisHotline[]> {
    const resources = await this.getCrisisResources();
    return resources?.hotlines || [];
  }

  /**
   * Get coping strategies
   */
  async getCopingStrategies(): Promise<string[]> {
    const resources = await this.getCrisisResources();
    return resources?.copingStrategies || [];
  }

  /**
   * Validate crisis resources structure
   */
  private isValidCrisisResources(resources: any): resources is SafeCrisisResources {
    if (!resources || typeof resources !== 'object') return false;

    if (!Array.isArray(resources.hotlines)) return false;
    if (!Array.isArray(resources.copingStrategies)) return false;
    if (typeof resources.lastUpdated !== 'number') return false;

    // Validate hotlines
    for (const hotline of resources.hotlines) {
      if (!hotline.name || !hotline.number || !hotline.type || !hotline.available) {
        return false;
      }
      if (!['voice', 'text', 'emergency'].includes(hotline.type)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Clear all crisis data (for testing/reset)
   */
  async clearCrisisData(): Promise<void> {
    try {
      await simpleStorage.removeItem(SafeOfflineCrisisManager.CRISIS_STORAGE_KEY);
      console.log('Crisis data cleared');
    } catch (error) {
      console.error('Failed to clear crisis data:', error);
    }
  }
}

export const safeOfflineCrisisManager = SafeOfflineCrisisManager.getInstance();