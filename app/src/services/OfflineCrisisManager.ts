/**
 * OfflineCrisisManager - Offline crisis resource management and failsafe protocols
 * CRITICAL: Ensures crisis support remains available without network connectivity
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CrisisHotline {
  name: string;
  number: string;
  type?: 'voice' | 'text' | 'emergency';
  available?: string;
  message?: string;
}

export interface CrisisResources {
  hotlines: CrisisHotline[];
  localResources: any[];
  safetyPlan: any;
  copingStrategies: string[];
  lastUpdated: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}

export class OfflineCrisisManager {
  private static readonly CRISIS_STORAGE_KEY = '@fullmind_offline_crisis_resources';
  private static readonly EMERGENCY_CONTACTS_KEY = '@fullmind_emergency_contacts';
  private static readonly SAFETY_PLAN_KEY = '@fullmind_safety_plan';

  /**
   * Initialize critical crisis data for offline access
   * Must be called on app launch to ensure offline availability
   */
  static async initializeOfflineCrisisData(): Promise<void> {
    try {
      const crisisResources: CrisisResources = {
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
            message: 'HOME'
          },
          {
            name: 'Emergency Services',
            number: '911',
            type: 'emergency',
            available: '24/7'
          },
          {
            name: 'National Domestic Violence Hotline',
            number: '18007997233',
            type: 'voice',
            available: '24/7'
          },
          {
            name: 'Veterans Crisis Line',
            number: '18002738255',
            type: 'voice',
            available: '24/7'
          }
        ],
        localResources: [], // Will be populated with user's location-specific resources
        safetyPlan: null,
        copingStrategies: [
          'Call a trusted friend or family member',
          'Go to a safe, public place',
          'Practice deep breathing: 4 counts in, 4 counts hold, 4 counts out',
          'Use the 5-4-3-2-1 grounding technique',
          'Write down your feelings',
          'Listen to calming music',
          'Take a warm shower or bath',
          'Do light physical exercise',
          'Hold an ice cube or cold object',
          'Reach out to your therapist or counselor'
        ],
        lastUpdated: Date.now()
      };

      await AsyncStorage.setItem(
        this.CRISIS_STORAGE_KEY,
        JSON.stringify(crisisResources)
      );

      console.log('✅ Offline crisis resources initialized successfully');
    } catch (error) {
      console.error('❌ Failed to store offline crisis resources:', error);
      // This is critical - log but don't throw to prevent app crash
    }
  }

  /**
   * Get crisis resources with guaranteed offline availability
   * Never fails - always returns usable crisis information
   */
  static async getOfflineCrisisResources(): Promise<CrisisResources> {
    try {
      const stored = await AsyncStorage.getItem(this.CRISIS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate stored data is complete
        if (parsed.hotlines && parsed.hotlines.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load stored crisis resources:', error);
    }

    // Fallback to hardcoded resources that never fail
    return this.getHardcodedCrisisResources();
  }

  /**
   * Hardcoded fallback crisis resources that never fail
   * This is the absolute last resort for crisis situations
   */
  private static getHardcodedCrisisResources(): CrisisResources {
    return {
      hotlines: [
        {
          name: '988 Suicide & Crisis Lifeline',
          number: '988',
          type: 'voice',
          available: '24/7'
        },
        {
          name: 'Emergency Services',
          number: '911',
          type: 'emergency',
          available: '24/7'
        },
        {
          name: 'Crisis Text Line',
          number: '741741',
          type: 'text',
          message: 'HOME'
        }
      ],
      localResources: [],
      safetyPlan: null,
      copingStrategies: [
        'Call a trusted friend or family member',
        'Go to a safe, public place',
        'Practice deep breathing exercises',
        'Use grounding techniques'
      ],
      lastUpdated: Date.now()
    };
  }

  /**
   * Get emergency contacts for crisis situations
   */
  static async getEmergencyContacts(): Promise<EmergencyContact[]> {
    try {
      const stored = await AsyncStorage.getItem(this.EMERGENCY_CONTACTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load emergency contacts:', error);
      return [];
    }
  }

  /**
   * Store emergency contacts
   */
  static async setEmergencyContacts(contacts: EmergencyContact[]): Promise<boolean> {
    try {
      await AsyncStorage.setItem(
        this.EMERGENCY_CONTACTS_KEY,
        JSON.stringify(contacts)
      );
      return true;
    } catch (error) {
      console.error('Failed to store emergency contacts:', error);
      return false;
    }
  }

  /**
   * Get user's personal safety plan
   */
  static async getSafetyPlan(): Promise<any> {
    try {
      const stored = await AsyncStorage.getItem(this.SAFETY_PLAN_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load safety plan:', error);
      return null;
    }
  }

  /**
   * Store user's personal safety plan
   */
  static async setSafetyPlan(safetyPlan: any): Promise<boolean> {
    try {
      await AsyncStorage.setItem(
        this.SAFETY_PLAN_KEY,
        JSON.stringify(safetyPlan)
      );
      return true;
    } catch (error) {
      console.error('Failed to store safety plan:', error);
      return false;
    }
  }

  /**
   * Generate formatted crisis message for offline display
   */
  static async getOfflineCrisisMessage(): Promise<string> {
    const resources = await this.getOfflineCrisisResources();
    const emergencyContacts = await this.getEmergencyContacts();

    let message = '🆘 IMMEDIATE CRISIS SUPPORT AVAILABLE\n\n';

    // National hotlines
    message += '📞 CRISIS HOTLINES:\n';
    resources.hotlines.forEach(hotline => {
      if (hotline.type === 'text') {
        message += `• ${hotline.name}: Text "${hotline.message}" to ${hotline.number}\n`;
      } else {
        message += `• ${hotline.name}: ${hotline.number}\n`;
      }
    });

    // Emergency contacts if available
    if (emergencyContacts.length > 0) {
      message += '\n👥 YOUR EMERGENCY CONTACTS:\n';
      emergencyContacts.slice(0, 3).forEach(contact => {
        message += `• ${contact.name} (${contact.relationship}): ${contact.phone}\n`;
      });
    }

    // Immediate coping strategies
    message += '\n🛡️ IMMEDIATE COPING STRATEGIES:\n';
    resources.copingStrategies.slice(0, 4).forEach(strategy => {
      message += `• ${strategy}\n`;
    });

    return message;
  }

  /**
   * Update local crisis resources (for when user adds local info)
   */
  static async updateLocalResources(localResources: any[]): Promise<boolean> {
    try {
      const currentResources = await this.getOfflineCrisisResources();
      const updatedResources: CrisisResources = {
        ...currentResources,
        localResources,
        lastUpdated: Date.now()
      };

      await AsyncStorage.setItem(
        this.CRISIS_STORAGE_KEY,
        JSON.stringify(updatedResources)
      );

      return true;
    } catch (error) {
      console.error('Failed to update local crisis resources:', error);
      return false;
    }
  }

  /**
   * Check if crisis resources are up to date
   */
  static async isCrisisDataCurrent(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<boolean> {
    try {
      const resources = await this.getOfflineCrisisResources();
      return (Date.now() - resources.lastUpdated) < maxAgeMs;
    } catch {
      return false;
    }
  }

  /**
   * Clear all crisis data (for testing or user reset)
   */
  static async clearAllCrisisData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.CRISIS_STORAGE_KEY,
        this.EMERGENCY_CONTACTS_KEY,
        this.SAFETY_PLAN_KEY
      ]);
    } catch (error) {
      console.error('Failed to clear crisis data:', error);
    }
  }
}

export default OfflineCrisisManager;