/**
 * Secure Data Store Tests
 * Validates encrypted storage for mental health data
 */

import { secureDataStore } from '../SecureDataStore';
import { UserProfile, CheckIn, Assessment, CrisisPlan } from '../../../types';

// Mock the encryption service
jest.mock('../security/EncryptionService', () => ({
  encryptionService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    encryptData: jest.fn().mockImplementation((data, sensitivity) => 
      Promise.resolve({
        encryptedData: `encrypted_${JSON.stringify(data)}`,
        iv: 'mock_iv',
        timestamp: new Date().toISOString()
      })
    ),
    decryptData: jest.fn().mockImplementation((encryptedResult, sensitivity) => {
      const data = encryptedResult.encryptedData.replace('encrypted_', '');
      return Promise.resolve(JSON.parse(data));
    }),
    getEncryptionStatus: jest.fn().mockResolvedValue({
      initialized: true,
      keyVersion: 1,
      lastRotation: new Date().toISOString(),
      daysUntilRotation: 60,
      supportedAlgorithms: ['aes-256-gcm']
    })
  },
  DataSensitivity: {
    CLINICAL: 'clinical',
    PERSONAL: 'personal',
    THERAPEUTIC: 'therapeutic',
    SYSTEM: 'system'
  }
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('SecureDataStore', () => {
  const mockUser: UserProfile = {
    id: 'user-123',
    createdAt: '2024-01-01T00:00:00Z',
    onboardingCompleted: true,
    values: ['compassion', 'growth', 'acceptance'],
    notifications: {
      enabled: true,
      morning: '08:00',
      midday: '13:00',
      evening: '20:00'
    },
    preferences: {
      haptics: true,
      theme: 'light'
    }
  };

  const mockCheckIn: CheckIn = {
    id: 'checkin-123',
    type: 'morning',
    startedAt: '2024-01-01T08:00:00Z',
    completedAt: '2024-01-01T08:15:00Z',
    skipped: false,
    data: {
      emotions: ['calm', 'focused'],
      energyLevel: 7,
      anxietyLevel: 3,
      todayValue: 'compassion',
      intention: 'Practice mindful breathing'
    }
  };

  const mockAssessment: Assessment = {
    id: 'assessment-123',
    type: 'phq9',
    completedAt: '2024-01-01T10:00:00Z',
    answers: [1, 1, 0, 1, 2, 0, 0, 1, 0],
    score: 6,
    severity: 'mild',
    context: 'onboarding'
  };

  const mockCrisisPlan: CrisisPlan = {
    id: 'crisis-123',
    updatedAt: '2024-01-01T12:00:00Z',
    warningSigns: ['Persistent negative thoughts', 'Social isolation'],
    copingStrategies: ['Deep breathing', 'Call a friend'],
    contacts: {
      crisisLine: '988',
      trustedFriends: [
        { name: 'John Doe', phone: '555-0123' }
      ]
    },
    safetyMeasures: ['Remove harmful items', 'Stay with trusted person'],
    isActive: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AsyncStorage responses with encrypted data format
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      const mockEncryptedData = {
        encryptedData: 'mock_encrypted_data',
        iv: 'mock_iv',
        timestamp: new Date().toISOString(),
        __ENCRYPTED_V1__: true,
        sensitivity: 'personal'
      };

      switch (key) {
        case '@fullmind_user':
          return Promise.resolve(JSON.stringify({
            ...mockEncryptedData,
            encryptedData: `encrypted_${JSON.stringify(mockUser)}`
          }));
        case '@fullmind_checkins':
          return Promise.resolve(JSON.stringify({
            ...mockEncryptedData,
            encryptedData: `encrypted_${JSON.stringify([mockCheckIn])}`
          }));
        case '@fullmind_assessments':
          return Promise.resolve(JSON.stringify({
            ...mockEncryptedData,
            encryptedData: `encrypted_${JSON.stringify([mockAssessment])}`,
            sensitivity: 'clinical'
          }));
        case '@fullmind_crisis':
          return Promise.resolve(JSON.stringify({
            ...mockEncryptedData,
            encryptedData: `encrypted_${JSON.stringify(mockCrisisPlan)}`,
            sensitivity: 'clinical'
          }));
        default:
          return Promise.resolve(null);
      }
    });

    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
      '@fullmind_user',
      '@fullmind_checkins',
      '@fullmind_assessments',
      '@fullmind_crisis'
    ]);
  });

  describe('User Profile Management', () => {
    test('should save and retrieve user profile with encryption', async () => {
      await secureDataStore.saveUser(mockUser);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@fullmind_user',
        expect.stringContaining('encryptedData')
      );

      const retrievedUser = await secureDataStore.getUser();
      expect(retrievedUser).toEqual(mockUser);
    });

    test('should handle null user profile', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      
      const user = await secureDataStore.getUser();
      expect(user).toBeNull();
    });
  });

  describe('Check-in Management', () => {
    test('should save check-in with personal data encryption', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null); // No existing check-ins
      
      await secureDataStore.saveCheckIn(mockCheckIn);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@fullmind_checkins',
        expect.stringContaining('encryptedData')
      );
    });

    test('should retrieve check-ins and decrypt', async () => {
      const checkIns = await secureDataStore.getCheckIns();
      
      expect(checkIns).toHaveLength(1);
      expect(checkIns[0]).toEqual(mockCheckIn);
    });

    test('should filter check-ins by type', async () => {
      const morningCheckIns = await secureDataStore.getCheckInsByType('morning');
      
      expect(morningCheckIns).toHaveLength(1);
      expect(morningCheckIns[0].type).toBe('morning');
    });

    test('should update check-in securely', async () => {
      const updates = { data: { energyLevel: 8 } };
      
      await secureDataStore.updateCheckIn('checkin-123', updates);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@fullmind_checkins',
        expect.stringContaining('encryptedData')
      );
    });
  });

  describe('Assessment Management (Clinical Data)', () => {
    test('should save assessment with clinical encryption', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null); // No existing assessments
      
      await secureDataStore.saveAssessment(mockAssessment);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@fullmind_assessments',
        expect.stringContaining('encryptedData')
      );
    });

    test('should validate assessment scoring before saving', async () => {
      const invalidAssessment = {
        ...mockAssessment,
        score: 99 // Wrong score for the answers
      };

      await expect(
        secureDataStore.saveAssessment(invalidAssessment)
      ).rejects.toThrow('Assessment scoring error');
    });

    test('should retrieve assessments by type', async () => {
      const phq9Assessments = await secureDataStore.getAssessmentsByType('phq9');
      
      expect(phq9Assessments).toHaveLength(1);
      expect(phq9Assessments[0].type).toBe('phq9');
    });

    test('should get latest assessment', async () => {
      const latestAssessment = await secureDataStore.getLatestAssessment('phq9');
      
      expect(latestAssessment).toEqual(mockAssessment);
    });
  });

  describe('Crisis Plan Management', () => {
    test('should save crisis plan with clinical encryption', async () => {
      await secureDataStore.saveCrisisPlan(mockCrisisPlan);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@fullmind_crisis',
        expect.stringContaining('encryptedData')
      );
    });

    test('should auto-set crisis line if missing', async () => {
      const crisisPlanWithoutLine = {
        ...mockCrisisPlan,
        contacts: {
          ...mockCrisisPlan.contacts,
          crisisLine: ''
        }
      };

      await secureDataStore.saveCrisisPlan(crisisPlanWithoutLine);
      
      // Crisis line should be set to default
      const savedPlan = await secureDataStore.getCrisisPlan();
      expect(savedPlan?.contacts.crisisLine).toBe('988');
    });

    test('should delete crisis plan securely', async () => {
      await secureDataStore.deleteCrisisPlan();
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@fullmind_crisis');
    });
  });

  describe('Data Export', () => {
    test('should export all data with security metadata', async () => {
      const exportData = await secureDataStore.exportData();
      
      expect(exportData.user).toEqual(mockUser);
      expect(exportData.checkIns).toEqual([mockCheckIn]);
      expect(exportData.assessments).toEqual([mockAssessment]);
      expect(exportData.crisisPlan).toEqual(mockCrisisPlan);
      expect(exportData.version).toBe('1.1-encrypted');
      expect(exportData.disclaimer).toContain('encrypted');
    });
  });

  describe('Data Validation', () => {
    test('should validate all data types', async () => {
      const validation = await secureDataStore.validateData();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect missing IDs', async () => {
      // Mock invalid data
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@fullmind_checkins') {
          const invalidCheckIn = { ...mockCheckIn, id: '' };
          return Promise.resolve(JSON.stringify({
            encryptedData: `encrypted_${JSON.stringify([invalidCheckIn])}`,
            __ENCRYPTED_V1__: true
          }));
        }
        return Promise.resolve(null);
      });

      const validation = await secureDataStore.validateData();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('CheckIn 0 missing ID');
    });

    test('should validate assessment scoring accuracy', async () => {
      // Mock assessment with wrong score
      const invalidAssessment = { ...mockAssessment, score: 99 };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@fullmind_assessments') {
          return Promise.resolve(JSON.stringify({
            encryptedData: `encrypted_${JSON.stringify([invalidAssessment])}`,
            __ENCRYPTED_V1__: true
          }));
        }
        return Promise.resolve(null);
      });

      const validation = await secureDataStore.validateData();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(error => 
        error.includes('score mismatch')
      )).toBe(true);
    });
  });

  describe('Security Status', () => {
    test('should provide comprehensive security status', async () => {
      const securityStatus = await secureDataStore.getSecurityStatus();
      
      expect(securityStatus.encrypted).toBe(true);
      expect(securityStatus.clinicalDataSecure).toBe(true);
      expect(securityStatus.complianceLevel).toBe('full');
      expect(Array.isArray(securityStatus.recommendations)).toBe(true);
    });

    test('should detect unencrypted clinical data as non-compliant', async () => {
      // Mock migration status showing unencrypted assessments
      jest.doMock('../EncryptedDataStore', () => ({
        encryptedDataStore: {
          ...jest.requireActual('../EncryptedDataStore').encryptedDataStore,
          checkMigrationStatus: jest.fn().mockResolvedValue({
            isRequired: true,
            unencryptedKeys: ['ASSESSMENTS'],
            estimatedItems: 1,
            lastMigration: null
          })
        }
      }));

      // Re-import to get mocked version
      const { secureDataStore: testStore } = await import('../SecureDataStore');
      const securityStatus = await testStore.getSecurityStatus();
      
      expect(securityStatus.clinicalDataSecure).toBe(false);
      expect(securityStatus.complianceLevel).toBe('none');
      expect(securityStatus.recommendations).toContain(
        'CRITICAL: Encrypt PHQ-9/GAD-7 assessment data immediately'
      );
    });
  });

  describe('Emergency Export', () => {
    test('should perform emergency export with security metadata', async () => {
      const emergencyResult = await secureDataStore.emergencyExport();
      
      expect(emergencyResult.success).toBe(true);
      expect(emergencyResult.exportData).toBeDefined();
      expect(emergencyResult.exportData?.disclaimer).toContain('Security Status');
    });
  });

  describe('Partial Session Management', () => {
    test('should save partial check-in with encryption', async () => {
      const partialCheckIn = {
        id: 'partial-123',
        type: 'morning' as const,
        data: {
          emotions: ['tired']
        }
      };

      await secureDataStore.savePartialCheckIn(partialCheckIn);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/@fullmind_partial_sessions_current_checkin_morning_\d+/),
        expect.stringContaining('encryptedData')
      );
    });

    test('should retrieve and decrypt partial check-in', async () => {
      const partialData = {
        id: 'partial-123',
        type: 'morning',
        data: { emotions: ['tired'] },
        savedAt: new Date().toISOString()
      };

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@fullmind_partial_sessions_current_checkin_morning_1234567890'
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        encryptedData: `encrypted_${JSON.stringify(partialData)}`,
        __ENCRYPTED_V1__: true,
        sensitivity: 'personal'
      }));

      const retrieved = await secureDataStore.getPartialCheckIn('morning');
      
      expect(retrieved).toEqual(partialData);
    });
  });

  describe('Legacy Data Handling', () => {
    test('should handle unencrypted legacy data', async () => {
      // Mock legacy unencrypted data
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockUser) // No encryption marker
      );

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const user = await secureDataStore.getUser();
      
      expect(user).toEqual(mockUser);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Loading legacy unencrypted user data'
      );

      consoleSpy.mockRestore();
    });
  });
});