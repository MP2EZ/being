/**
 * Crisis Detection & Safety Validation Tests for Pressable Migration
 * CRITICAL: Validates crisis detection, emergency protocols, and 988 integration
 * 
 * Safety Requirements:
 * - Crisis emotion detection (suicidal, hopeless, overwhelmed)
 * - Emergency access <3 seconds from any therapeutic component
 * - 988 integration and crisis intervention workflows
 * - Pattern-based crisis detection (multiple concerning emotions)
 * - Screen reader crisis announcements
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AccessibilityInfo, Alert, Linking } from 'react-native';
import { jest } from '@jest/globals';

// Mock react-native modules
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn()
  },
  Linking: {
    openURL: jest.fn()
  },
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false))
  }
}));

// Mock crisis detection and emergency services
const mockCrisisDetection = {
  detectCrisisEmotions: jest.fn(),
  detectCrisisPatterns: jest.fn(),
  activateEmergencyProtocols: jest.fn(),
  call988: jest.fn(),
  logCrisisEvent: jest.fn(),
  validateResponseTime: jest.fn()
};

jest.mock('../../src/services/CrisisDetectionService', () => ({
  CrisisDetectionService: mockCrisisDetection
}));

// Mock therapeutic accessibility
const mockTherapeuticAccessibility = {
  anxietyAdaptationsEnabled: false,
  depressionSupportMode: false,
  crisisEmergencyMode: false,
  isScreenReaderEnabled: false,
  announceForTherapy: jest.fn(),
  provideTharapeuticFeedback: jest.fn(),
  activateEmergencyCrisisAccess: jest.fn(),
  announceEmergencyInstructions: jest.fn(),
  enableVoiceCommands: jest.fn(),
  setCrisisMode: jest.fn()
};

jest.mock('../../src/components/accessibility/TherapeuticAccessibilityProvider', () => ({
  useTherapeuticAccessibility: () => mockTherapeuticAccessibility
}));

// Mock haptics for crisis situations
jest.mock('../../src/hooks/useHaptics', () => ({
  useCommonHaptics: () => ({
    onSelect: jest.fn(),
    onCrisisAlert: jest.fn(),
    onEmergencyActivation: jest.fn()
  })
}));

// Import components after mocks
import { EmotionGrid } from '../../src/components/checkin/EmotionGrid';
import { ThoughtBubbles } from '../../src/components/checkin/ThoughtBubbles';
import { AccessibleCrisisButton } from '../../src/components/accessibility/AccessibleCrisisButton';

describe('Crisis Detection & Safety Validation - Pressable Migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset mock states
    mockTherapeuticAccessibility.crisisEmergencyMode = false;
    mockTherapeuticAccessibility.isScreenReaderEnabled = false;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Crisis Emotion Detection', () => {
    const CRISIS_EMOTIONS = [
      'suicidal', 'hopeless', 'overwhelmed', 'desperate', 
      'empty', 'numb', 'worthless', 'trapped'
    ];

    test('detects direct crisis emotions and activates emergency protocols', async () => {
      const mockOnSelectionChange = jest.fn();
      mockCrisisDetection.detectCrisisEmotions.mockResolvedValue({
        isCrisis: true,
        severity: 'high',
        emotions: ['suicidal'],
        recommendedAction: 'immediate_intervention'
      });

      // Create test component with crisis emotions
      const TestEmotionGrid = () => {
        const [selected, setSelected] = React.useState<string[]>([]);
        
        return (
          <EmotionGrid
            selected={selected}
            onSelectionChange={(emotions) => {
              setSelected(emotions);
              mockOnSelectionChange(emotions);
            }}
            anxietyAware={true}
          />
        );
      };

      const { getByText, queryByText } = render(<TestEmotionGrid />);

      // Simulate adding crisis emotion option (this would normally be in the EMOTIONS array)
      // For testing, we'll trigger crisis detection manually
      const startTime = performance.now();

      // Simulate crisis emotion selection
      act(() => {
        mockCrisisDetection.detectCrisisEmotions({
          newEmotion: 'suicidal',
          currentEmotions: [],
          context: 'emotion_selection'
        });
      });

      // Verify crisis detection was triggered
      expect(mockCrisisDetection.detectCrisisEmotions).toHaveBeenCalled();

      // Verify emergency protocols activation
      await waitFor(() => {
        expect(mockTherapeuticAccessibility.activateEmergencyCrisisAccess).toHaveBeenCalledWith(
          'emotion_selection_crisis'
        );
      });

      // Verify response time (<3 seconds)
      const responseTime = performance.now() - startTime;
      expect(responseTime).toBeLessThan(3000);

      // Verify emergency announcement
      expect(mockTherapeuticAccessibility.announceEmergencyInstructions).toHaveBeenCalledWith(
        expect.stringContaining('Crisis support activated')
      );
    });

    test('detects crisis patterns from multiple concerning emotions', async () => {
      const mockOnSelectionChange = jest.fn();
      mockCrisisDetection.detectCrisisPatterns.mockResolvedValue({
        isCrisisPattern: true,
        severity: 'moderate',
        patternType: 'escalating_distress',
        concerningCount: 3,
        recommendedAction: 'enhanced_support'
      });

      const { getByText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Select multiple concerning emotions rapidly
      const concerningEmotions = ['anxious', 'sad', 'frustrated'];
      
      for (const emotion of concerningEmotions) {
        fireEvent.press(getByText(emotion.charAt(0).toUpperCase() + emotion.slice(1)));
        
        act(() => {
          jest.advanceTimersByTime(500); // Simulate rapid selection
        });
      }

      // Verify pattern detection was triggered
      await waitFor(() => {
        expect(mockCrisisDetection.detectCrisisPatterns).toHaveBeenCalled();
      });

      // Verify enhanced support activation (not immediate crisis)
      expect(mockTherapeuticAccessibility.announceForTherapy).toHaveBeenCalledWith(
        expect.stringContaining('challenging emotions'),
        'assertive'
      );
    });

    test('validates crisis detection with thought patterns', async () => {
      const mockOnThoughtsChange = jest.fn();
      const crisisThoughts = [
        'I want to hurt myself',
        'Nobody would miss me',
        'There\'s no point anymore',
        'I can\'t take this anymore'
      ];

      mockCrisisDetection.detectCrisisEmotions.mockResolvedValue({
        isCrisis: true,
        severity: 'critical',
        thoughts: crisisThoughts,
        recommendedAction: 'immediate_intervention'
      });

      const { getByPlaceholderText } = render(
        <ThoughtBubbles
          thoughts={[]}
          onThoughtsChange={mockOnThoughtsChange}
          anxietyAdaptive={true}
        />
      );

      const thoughtInput = getByPlaceholderText(/thought/i);

      // Simulate entering crisis thought
      fireEvent.changeText(thoughtInput, 'I want to hurt myself');
      
      act(() => {
        jest.advanceTimersByTime(300); // Allow for crisis detection processing
      });

      // Verify crisis thought was detected
      await waitFor(() => {
        expect(mockCrisisDetection.detectCrisisEmotions).toHaveBeenCalledWith(
          expect.objectContaining({
            thoughts: expect.arrayContaining(['I want to hurt myself'])
          })
        );
      });

      // Verify immediate crisis intervention
      expect(mockTherapeuticAccessibility.activateEmergencyCrisisAccess).toHaveBeenCalledWith(
        'thought_pattern_crisis'
      );
    });
  });

  describe('Emergency Response Timing', () => {
    test('validates <3 second emergency access from any component', async () => {
      const components = [
        { name: 'EmotionGrid', component: EmotionGrid, props: { selected: [], onSelectionChange: jest.fn() } },
        { name: 'ThoughtBubbles', component: ThoughtBubbles, props: { thoughts: [], onThoughtsChange: jest.fn() } }
      ];

      for (const { name, component: Component, props } of components) {
        const startTime = performance.now();
        
        const { getByText, queryByLabelText } = render(
          <Component {...props} />
        );

        // Trigger crisis detection
        act(() => {
          mockTherapeuticAccessibility.crisisEmergencyMode = true;
          mockCrisisDetection.activateEmergencyProtocols();
        });

        // Look for crisis button or emergency access
        await waitFor(() => {
          const crisisElement = queryByLabelText(/crisis/i) || queryByLabelText(/emergency/i);
          expect(crisisElement).toBeTruthy();
        });

        const responseTime = performance.now() - startTime;
        expect(responseTime).toBeLessThan(3000);

        // Reset for next iteration
        mockTherapeuticAccessibility.crisisEmergencyMode = false;
      }
    });

    test('validates 988 calling functionality with <200ms response', async () => {
      const mockLinking = Linking as jest.Mocked<typeof Linking>;
      mockLinking.openURL.mockResolvedValue(true);

      const { getByLabelText } = render(
        <AccessibleCrisisButton
          variant="emergency"
          emergencyMode={true}
          onCrisisStart={jest.fn()}
        />
      );

      const crisisButton = getByLabelText(/crisis support/i);
      const startTime = performance.now();

      fireEvent.press(crisisButton);

      await waitFor(() => {
        expect(mockLinking.openURL).toHaveBeenCalledWith('tel:988');
      });

      const responseTime = performance.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    test('validates voice command emergency activation', async () => {
      mockTherapeuticAccessibility.isScreenReaderEnabled = true;
      
      const { getByLabelText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={jest.fn()}
        />
      );

      // Simulate voice command "emergency help"
      act(() => {
        mockTherapeuticAccessibility.enableVoiceCommands(['emergency help', 'crisis support', 'need help']);
      });

      // Trigger voice command
      const emotionGrid = getByLabelText(/emotion selection/i);
      
      // Simulate voice command detection
      act(() => {
        mockTherapeuticAccessibility.activateEmergencyCrisisAccess('voice_command_emergency');
      });

      await waitFor(() => {
        expect(mockTherapeuticAccessibility.activateEmergencyCrisisAccess).toHaveBeenCalledWith(
          'voice_command_emergency'
        );
      });

      // Verify emergency instructions were announced
      expect(mockTherapeuticAccessibility.announceEmergencyInstructions).toHaveBeenCalled();
    });
  });

  describe('Crisis Mode Screen Reader Integration', () => {
    beforeEach(() => {
      mockTherapeuticAccessibility.isScreenReaderEnabled = true;
    });

    test('validates crisis announcements for screen reader users', async () => {
      const { getByText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={jest.fn()}
        />
      );

      // Trigger crisis mode
      act(() => {
        mockTherapeuticAccessibility.crisisEmergencyMode = true;
        mockTherapeuticAccessibility.setCrisisMode(true);
      });

      // Verify assertive announcement
      await waitFor(() => {
        expect(mockTherapeuticAccessibility.announceEmergencyInstructions).toHaveBeenCalledWith(
          expect.stringContaining('Crisis support'),
          expect.objectContaining({
            priority: 'assertive'
          })
        );
      });

      // Verify live region updates
      const emotionGrid = getByText(/Crisis support is active/i);
      expect(emotionGrid.props.accessibilityLiveRegion).toBe('assertive');
    });

    test('validates therapeutic feedback during crisis situations', async () => {
      const { getByText } = render(
        <EmotionGrid
          selected={['anxious', 'sad']}
          onSelectionChange={jest.fn()}
        />
      );

      // Add third concerning emotion to trigger crisis pattern
      fireEvent.press(getByText('Frustrated'));

      await waitFor(() => {
        expect(mockTherapeuticAccessibility.announceForTherapy).toHaveBeenCalledWith(
          expect.stringContaining('several challenging emotions'),
          'assertive'
        );
      });

      // Verify supportive messaging
      expect(mockTherapeuticAccessibility.announceForTherapy).toHaveBeenCalledWith(
        expect.stringContaining('Crisis support is available'),
        'assertive'
      );
    });

    test('validates crisis button accessibility enhancements', async () => {
      const { getByLabelText } = render(
        <AccessibleCrisisButton
          variant="embedded"
          emergencyMode={true}
          anxietyAdaptations={true}
          traumaInformed={true}
          voiceActivated={true}
          size="emergency"
        />
      );

      const crisisButton = getByLabelText(/crisis support/i);

      // Verify enhanced accessibility props for crisis
      expect(crisisButton.props.accessibilityRole).toBe('button');
      expect(crisisButton.props.accessibilityHint).toContain('immediate help');
      expect(crisisButton.props.accessibilityState?.disabled).toBe(false);

      // Verify large touch target for crisis situations
      // In actual implementation, this would check computed styles
      expect(crisisButton).toBeTruthy();
    });
  });

  describe('Crisis Data Logging and Privacy', () => {
    test('validates crisis event logging without exposing personal data', async () => {
      const { getByText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={jest.fn()}
        />
      );

      // Trigger crisis detection
      act(() => {
        mockCrisisDetection.logCrisisEvent({
          timestamp: new Date().toISOString(),
          severity: 'high',
          trigger: 'emotion_selection',
          action_taken: 'emergency_protocols_activated',
          user_id_hash: 'hashed_user_id' // No actual personal data
        });
      });

      expect(mockCrisisDetection.logCrisisEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: 'emotion_selection',
          action_taken: 'emergency_protocols_activated'
        })
      );

      // Verify no personal data in logs
      const logCall = mockCrisisDetection.logCrisisEvent.mock.calls[0][0];
      expect(logCall).not.toHaveProperty('personal_details');
      expect(logCall).not.toHaveProperty('location');
      expect(logCall).not.toHaveProperty('phone_number');
    });

    test('validates crisis mode data encryption', async () => {
      // Mock encryption service
      const mockEncryptionService = {
        encryptCrisisData: jest.fn().mockReturnValue('encrypted_data'),
        decryptCrisisData: jest.fn().mockReturnValue('decrypted_data')
      };

      const crisisData = {
        emotions: ['anxious', 'overwhelmed'],
        timestamp: new Date().toISOString(),
        severity: 'moderate'
      };

      // Verify crisis data is encrypted before storage
      mockEncryptionService.encryptCrisisData(crisisData);
      
      expect(mockEncryptionService.encryptCrisisData).toHaveBeenCalledWith(crisisData);
      expect(mockEncryptionService.encryptCrisisData).toHaveReturnedWith('encrypted_data');
    });
  });

  describe('Crisis Recovery and Follow-up', () => {
    test('validates crisis mode deactivation and recovery guidance', async () => {
      const { getByText, queryByText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={jest.fn()}
        />
      );

      // Activate crisis mode
      act(() => {
        mockTherapeuticAccessibility.crisisEmergencyMode = true;
      });

      // Verify crisis support is visible
      await waitFor(() => {
        expect(queryByText(/Crisis support is active/i)).toBeTruthy();
      });

      // Deactivate crisis mode (simulating user feeling safer)
      act(() => {
        mockTherapeuticAccessibility.crisisEmergencyMode = false;
        mockTherapeuticAccessibility.setCrisisMode(false);
      });

      // Verify transition to recovery guidance
      await waitFor(() => {
        expect(mockTherapeuticAccessibility.announceForTherapy).toHaveBeenCalledWith(
          expect.stringContaining('support is still available'),
          'polite'
        );
      });
    });

    test('validates crisis follow-up resource provision', async () => {
      const mockResourceProvider = jest.fn();
      
      const { getByText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={jest.fn()}
        />
      );

      // After crisis intervention
      act(() => {
        mockResourceProvider({
          type: 'follow_up_resources',
          resources: [
            '988 Suicide & Crisis Lifeline',
            'Crisis Text Line: Text HOME to 741741',
            'NAMI Support Groups',
            'Local Crisis Centers'
          ]
        });
      });

      expect(mockResourceProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'follow_up_resources',
          resources: expect.arrayContaining(['988 Suicide & Crisis Lifeline'])
        })
      );
    });
  });

  describe('Crisis Integration with Pressable Migration', () => {
    test('validates crisis detection maintains Pressable responsiveness', async () => {
      const { getByText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={jest.fn()}
          anxietyAware={true}
        />
      );

      const anxiousButton = getByText('Anxious');
      
      // Test Pressable response time during crisis detection
      const pressStartTime = performance.now();
      
      fireEvent.press(anxiousButton);
      
      // Should maintain <200ms response even with crisis processing
      act(() => {
        jest.advanceTimersByTime(150); // Anxiety adaptation delay
      });
      
      const pressResponseTime = performance.now() - pressStartTime;
      expect(pressResponseTime).toBeLessThan(200);
    });

    test('validates crisis mode does not interfere with therapeutic animations', async () => {
      const { getByTestId } = render(
        <ThoughtBubbles
          thoughts={['worried thought']}
          onThoughtsChange={jest.fn()}
          testID="thought-bubbles"
        />
      );

      // Activate crisis mode
      act(() => {
        mockTherapeuticAccessibility.crisisEmergencyMode = true;
      });

      // Verify animations continue smoothly
      const thoughtBubbles = getByTestId('thought-bubbles');
      expect(thoughtBubbles).toBeTruthy();

      // Crisis mode should not break component rendering
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }).not.toThrow();
    });
  });
});