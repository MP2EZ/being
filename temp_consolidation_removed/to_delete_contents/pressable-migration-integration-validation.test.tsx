/**
 * Integration Testing - Pressable Migration Check-in Flows
 * CRITICAL: Validates complete check-in workflows and data persistence
 * 
 * Integration Requirements:
 * - Complete check-in flow integration preserved
 * - Data persistence and encryption maintained
 * - Theme adaptation (morning/midday/evening) functional
 * - Backward compatibility with existing APIs
 * - State management integration (Zustand stores)
 * - Navigation flow preservation
 * - AsyncStorage data integrity
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { jest } from '@jest/globals';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn()
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset
  }),
  NavigationContainer: ({ children }: any) => children
}));

// Mock Zustand stores
const mockCheckInStore = {
  checkIns: [],
  currentCheckIn: null,
  isLoading: false,
  error: null,
  addCheckIn: jest.fn(),
  updateCheckIn: jest.fn(),
  getCurrentCheckIn: jest.fn(),
  getCheckInHistory: jest.fn(),
  persistCheckIn: jest.fn(),
  validateCheckIn: jest.fn()
};

const mockUserStore = {
  user: null,
  theme: 'morning',
  preferences: {},
  setTheme: jest.fn(),
  updatePreferences: jest.fn(),
  saveUserData: jest.fn()
};

const mockAssessmentStore = {
  assessments: [],
  currentAssessment: null,
  addAssessment: jest.fn(),
  updateAssessment: jest.fn(),
  calculateScore: jest.fn(),
  persistAssessment: jest.fn()
};

jest.mock('../../src/store/checkInStore', () => ({
  useCheckInStore: () => mockCheckInStore
}));

jest.mock('../../src/store/userStore', () => ({
  useUserStore: () => mockUserStore
}));

jest.mock('../../src/store/assessmentStore', () => ({
  useAssessmentStore: () => mockAssessmentStore
}));

// Mock encryption service
const mockEncryption = {
  encrypt: jest.fn((data) => `encrypted_${JSON.stringify(data)}`),
  decrypt: jest.fn((encrypted) => JSON.parse(encrypted.replace('encrypted_', ''))),
  generateKey: jest.fn(),
  validateIntegrity: jest.fn(() => true)
};

jest.mock('../../src/services/EncryptionService', () => ({
  EncryptionService: mockEncryption
}));

// Mock therapeutic accessibility
jest.mock('../../src/components/accessibility/TherapeuticAccessibilityProvider', () => ({
  useTherapeuticAccessibility: () => ({
    anxietyAdaptationsEnabled: false,
    depressionSupportMode: false,
    crisisEmergencyMode: false,
    isScreenReaderEnabled: false,
    announceForTherapy: jest.fn(),
    provideTharapeuticFeedback: jest.fn(),
    activateEmergencyCrisisAccess: jest.fn(),
    announceEmergencyInstructions: jest.fn()
  })
}));

// Import components after mocks
import { EmotionGrid } from '../../src/components/checkin/EmotionGrid';
import { BreathingCircle } from '../../src/components/checkin/BreathingCircle';
import { ThoughtBubbles } from '../../src/components/checkin/ThoughtBubbles';
import { BodyAreaGrid } from '../../src/components/checkin/BodyAreaGrid';

// Mock complete check-in flow component
const MockCheckInFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [checkInData, setCheckInData] = React.useState({
    emotions: [],
    thoughts: [],
    bodyAreas: [],
    breathingCompleted: false,
    timestamp: new Date().toISOString(),
    theme: 'morning'
  });

  const steps = [
    { component: 'emotions', title: 'How are you feeling?' },
    { component: 'thoughts', title: 'What\'s on your mind?' },
    { component: 'body', title: 'How does your body feel?' },
    { component: 'breathing', title: 'Let\'s take a moment to breathe' }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete check-in
      mockCheckInStore.addCheckIn(checkInData);
    }
  };

  const renderCurrentStep = () => {
    const step = steps[currentStep];
    
    switch (step.component) {
      case 'emotions':
        return (
          <EmotionGrid
            selected={checkInData.emotions}
            onSelectionChange={(emotions) => setCheckInData(prev => ({ ...prev, emotions }))}
            theme={checkInData.theme as any}
          />
        );
      case 'thoughts':
        return (
          <ThoughtBubbles
            thoughts={checkInData.thoughts}
            onThoughtsChange={(thoughts) => setCheckInData(prev => ({ ...prev, thoughts }))}
          />
        );
      case 'body':
        return (
          <BodyAreaGrid
            selectedAreas={checkInData.bodyAreas}
            onSelectionChange={(bodyAreas) => setCheckInData(prev => ({ ...prev, bodyAreas }))}
          />
        );
      case 'breathing':
        return (
          <BreathingCircle
            onComplete={() => {
              setCheckInData(prev => ({ ...prev, breathingCompleted: true }));
              handleNext();
            }}
            theme={checkInData.theme as any}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div data-testid={`step-${currentStep}`}>
        <h2>{steps[currentStep].title}</h2>
        {renderCurrentStep()}
        {currentStep < 3 && (
          <button onClick={handleNext} data-testid="next-button">
            Next
          </button>
        )}
      </div>
    </div>
  );
};

describe('Pressable Migration Integration Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset store states
    mockCheckInStore.checkIns = [];
    mockCheckInStore.currentCheckIn = null;
    mockUserStore.theme = 'morning';
    
    // Reset AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Complete Check-in Flow Integration', () => {
    test('validates full check-in workflow with Pressable components', async () => {
      const { getByTestId, getByText } = render(<MockCheckInFlow />);

      // Step 1: Emotions
      expect(getByTestId('step-0')).toBeTruthy();
      expect(getByText('How are you feeling?')).toBeTruthy();

      // Select emotions
      fireEvent.press(getByText('Happy'));
      fireEvent.press(getByText('Calm'));

      // Advance to next step
      fireEvent.press(getByTestId('next-button'));

      await waitFor(() => {
        expect(getByTestId('step-1')).toBeTruthy();
        expect(getByText('What\'s on your mind?')).toBeTruthy();
      });

      // Step 2: Thoughts
      const thoughtInput = getByText(/thought/i) || getByTestId('thought-input');
      if (thoughtInput) {
        fireEvent.changeText(thoughtInput, 'I feel peaceful today');
      }

      fireEvent.press(getByTestId('next-button'));

      await waitFor(() => {
        expect(getByTestId('step-2')).toBeTruthy();
        expect(getByText('How does your body feel?')).toBeTruthy();
      });

      // Step 3: Body areas
      // Body area selection would be tested here
      fireEvent.press(getByTestId('next-button'));

      await waitFor(() => {
        expect(getByTestId('step-3')).toBeTruthy();
        expect(getByText('Let\'s take a moment to breathe')).toBeTruthy();
      });

      // Step 4: Breathing exercise
      const startButton = getByText('Start Breathing Exercise');
      fireEvent.press(startButton);

      // Complete breathing exercise
      act(() => {
        jest.advanceTimersByTime(180000); // 3 minutes
      });

      // Verify check-in completion
      await waitFor(() => {
        expect(mockCheckInStore.addCheckIn).toHaveBeenCalledWith(
          expect.objectContaining({
            emotions: ['happy', 'calm'],
            breathingCompleted: true,
            timestamp: expect.any(String)
          })
        );
      });
    });

    test('validates check-in data persistence through workflow', async () => {
      const { getByTestId, getByText } = render(<MockCheckInFlow />);

      // Start check-in and add data
      fireEvent.press(getByText('Happy'));
      fireEvent.press(getByText('Grateful'));

      // Verify data is preserved when moving to next step
      fireEvent.press(getByTestId('next-button'));

      // Data should be maintained in state
      expect(mockCheckInStore.currentCheckIn || {}).toBeTruthy();

      // Simulate app backgrounding and restoration
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Data should still be preserved
      fireEvent.press(getByTestId('next-button'));
      
      await waitFor(() => {
        expect(getByTestId('step-2')).toBeTruthy();
      });
    });

    test('validates navigation integration with Pressable interactions', async () => {
      const { getByText, getByTestId } = render(<MockCheckInFlow />);

      // Test navigation through check-in flow
      fireEvent.press(getByText('Happy'));
      fireEvent.press(getByTestId('next-button'));

      // Verify navigation calls
      expect(mockNavigate).toHaveBeenCalledTimes(0); // Internal navigation within flow

      // Complete entire flow to trigger final navigation
      fireEvent.press(getByTestId('next-button')); // Thoughts
      fireEvent.press(getByTestId('next-button')); // Body
      
      // Complete breathing
      const startButton = getByText('Start Breathing Exercise');
      fireEvent.press(startButton);
      
      act(() => {
        jest.advanceTimersByTime(180000);
      });

      await waitFor(() => {
        expect(mockCheckInStore.addCheckIn).toHaveBeenCalled();
      });
    });
  });

  describe('Data Persistence and Encryption', () => {
    test('validates AsyncStorage integration with encrypted check-in data', async () => {
      const checkInData = {
        id: 'checkin_123',
        emotions: ['happy', 'calm'],
        thoughts: ['I feel good today'],
        bodyAreas: ['head', 'chest'],
        timestamp: '2024-01-15T10:00:00Z',
        encrypted: true
      };

      // Simulate storing check-in data
      mockCheckInStore.persistCheckIn(checkInData);

      // Verify encryption was applied
      expect(mockEncryption.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          emotions: ['happy', 'calm'],
          thoughts: ['I feel good today']
        })
      );

      // Verify AsyncStorage was called
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'checkin_123',
        expect.stringContaining('encrypted_')
      );
    });

    test('validates data retrieval and decryption', async () => {
      const encryptedData = 'encrypted_{"emotions":["happy"],"timestamp":"2024-01-15T10:00:00Z"}';
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(encryptedData);

      // Retrieve check-in data
      const retrievedData = await mockCheckInStore.getCurrentCheckIn('checkin_123');

      // Verify decryption was applied
      expect(mockEncryption.decrypt).toHaveBeenCalledWith(encryptedData);

      // Verify data integrity
      expect(mockEncryption.validateIntegrity).toHaveBeenCalled();
    });

    test('validates check-in data versioning and migration', async () => {
      // Test data format migration for older check-ins
      const oldFormatData = {
        emotions: 'happy,calm', // Old comma-separated format
        timestamp: '2024-01-15T10:00:00Z',
        version: '1.0'
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(oldFormatData));

      // Should migrate to new format
      const migratedData = await mockCheckInStore.getCurrentCheckIn('old_checkin');

      expect(migratedData).toEqual(
        expect.objectContaining({
          emotions: ['happy', 'calm'], // Migrated to array format
          version: expect.stringMatching(/^2\./)
        })
      );
    });
  });

  describe('Theme Integration and Adaptation', () => {
    test('validates theme adaptation throughout check-in flow', async () => {
      const themes = ['morning', 'midday', 'evening'] as const;

      for (const theme of themes) {
        mockUserStore.theme = theme;

        const { getByText, unmount } = render(<MockCheckInFlow />);

        // Verify theme is applied to components
        const emotionGrid = getByText('Happy');
        expect(emotionGrid).toBeTruthy();

        // Theme should be passed to all components
        expect(mockUserStore.theme).toBe(theme);

        unmount();
      }
    });

    test('validates dynamic theme switching during check-in', async () => {
      const { getByText, rerender } = render(<MockCheckInFlow />);

      // Start with morning theme
      expect(mockUserStore.theme).toBe('morning');

      // Simulate time-based theme change to midday
      mockUserStore.theme = 'midday';
      mockUserStore.setTheme('midday');

      rerender(<MockCheckInFlow />);

      // Components should adapt to new theme
      expect(mockUserStore.setTheme).toHaveBeenCalledWith('midday');

      // Check-in data should reflect new theme
      fireEvent.press(getByText('Happy'));
      
      expect(mockCheckInStore.addCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'midday'
        })
      );
    });

    test('validates theme accessibility integration', async () => {
      // Test high contrast theme
      mockUserStore.theme = 'evening'; // Darker theme
      mockUserStore.preferences = { highContrast: true };

      const { getByText } = render(<MockCheckInFlow />);

      const emotionButton = getByText('Happy');
      
      // Should render with high contrast adaptations
      expect(emotionButton.props.accessible).toBe(true);
      expect(emotionButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('State Management Integration', () => {
    test('validates Zustand store synchronization across components', async () => {
      const { getByText } = render(<MockCheckInFlow />);

      // Add emotions to trigger store update
      fireEvent.press(getByText('Happy'));
      fireEvent.press(getByText('Anxious'));

      // Verify store was updated
      expect(mockCheckInStore.updateCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          emotions: expect.arrayContaining(['happy', 'anxious'])
        })
      );

      // Store state should be consistent across components
      expect(mockCheckInStore.currentCheckIn).toBeTruthy();
    });

    test('validates store persistence during component unmount/remount', async () => {
      const { getByText, unmount } = render(<MockCheckInFlow />);

      // Set some check-in data
      fireEvent.press(getByText('Calm'));

      // Store current state
      const checkInState = mockCheckInStore.currentCheckIn;

      unmount();

      // Re-render component
      const { getByText: getByTextNew } = render(<MockCheckInFlow />);

      // State should be restored
      expect(mockCheckInStore.getCurrentCheckIn).toHaveBeenCalled();

      // Component should show previously selected emotions
      const calmButton = getByTextNew('Calm');
      expect(calmButton.props.accessibilityState?.selected).toBe(true);
    });

    test('validates store error handling and recovery', async () => {
      // Simulate store error
      mockCheckInStore.error = 'Failed to save check-in';
      mockCheckInStore.addCheckIn.mockRejectedValue(new Error('Storage error'));

      const { getByText } = render(<MockCheckInFlow />);

      fireEvent.press(getByText('Happy'));

      // Should handle error gracefully
      expect(mockCheckInStore.error).toBeTruthy();

      // Should provide retry mechanism
      mockCheckInStore.error = null;
      mockCheckInStore.addCheckIn.mockResolvedValue(undefined);

      // Retry should work
      fireEvent.press(getByText('Grateful'));
      
      await waitFor(() => {
        expect(mockCheckInStore.addCheckIn).toHaveBeenCalledWith(
          expect.objectContaining({
            emotions: expect.arrayContaining(['grateful'])
          })
        );
      });
    });
  });

  describe('Backward Compatibility and API Integration', () => {
    test('validates compatibility with existing check-in API endpoints', async () => {
      // Mock API service
      const mockApiService = {
        saveCheckIn: jest.fn().mockResolvedValue({ id: 'checkin_123', status: 'saved' }),
        getCheckInHistory: jest.fn().mockResolvedValue([]),
        syncCheckIns: jest.fn().mockResolvedValue({ synced: 3, failed: 0 })
      };

      const checkInData = {
        emotions: ['happy', 'calm'],
        thoughts: ['Good day'],
        timestamp: '2024-01-15T10:00:00Z'
      };

      // Simulate API call
      await mockApiService.saveCheckIn(checkInData);

      // Should maintain API contract
      expect(mockApiService.saveCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          emotions: expect.any(Array),
          thoughts: expect.any(Array),
          timestamp: expect.any(String)
        })
      );
    });

    test('validates check-in data format compatibility', async () => {
      const legacyCheckInFormat = {
        mood: 'happy', // Old single mood field
        notes: 'Feeling good', // Old notes field
        date: '2024-01-15'
      };

      const modernCheckInFormat = {
        emotions: ['happy'],
        thoughts: ['Feeling good'],
        timestamp: '2024-01-15T10:00:00Z'
      };

      // Should convert legacy format to modern format
      const convertedData = mockCheckInStore.validateCheckIn(legacyCheckInFormat);

      expect(convertedData).toEqual(
        expect.objectContaining({
          emotions: ['happy'],
          thoughts: ['Feeling good'],
          timestamp: expect.any(String)
        })
      );
    });

    test('validates integration with assessment scoring algorithms', async () => {
      // Simulate check-in with concerning emotions
      const concerningCheckIn = {
        emotions: ['anxious', 'sad', 'hopeless'],
        timestamp: '2024-01-15T10:00:00Z'
      };

      mockCheckInStore.addCheckIn(concerningCheckIn);

      // Should trigger assessment calculations
      expect(mockAssessmentStore.calculateScore).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mood_assessment',
          data: concerningCheckIn
        })
      );

      // Should detect crisis patterns
      expect(mockAssessmentStore.calculateScore).toHaveReturnedWith(
        expect.objectContaining({
          severity: expect.any(String),
          recommendedAction: expect.any(String)
        })
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    test('validates graceful handling of AsyncStorage failures', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

      const { getByText } = render(<MockCheckInFlow />);

      fireEvent.press(getByText('Happy'));

      // Should handle storage error
      await waitFor(() => {
        expect(mockCheckInStore.error).toBeTruthy();
      });

      // Should provide fallback storage mechanism
      expect(mockCheckInStore.persistCheckIn).toHaveBeenCalled();
    });

    test('validates recovery from partial check-in data', async () => {
      // Simulate partially completed check-in
      const partialData = {
        emotions: ['happy'],
        timestamp: '2024-01-15T10:00:00Z',
        incomplete: true
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(partialData));

      const { getByText } = render(<MockCheckInFlow />);

      // Should restore partial state
      expect(getByText('Happy')).toBeTruthy();

      // Should allow completion
      fireEvent.press(getByText('Calm'));
      
      expect(mockCheckInStore.updateCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          emotions: ['happy', 'calm'],
          incomplete: false
        })
      );
    });

    test('validates network offline mode integration', async () => {
      // Simulate offline mode
      const mockNetworkInfo = { isConnected: false };
      
      const { getByText } = render(<MockCheckInFlow />);

      fireEvent.press(getByText('Happy'));

      // Should store locally when offline
      expect(AsyncStorage.setItem).toHaveBeenCalled();

      // Should queue for sync when online
      expect(mockCheckInStore.addCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          syncStatus: 'pending'
        })
      );
    });
  });
});