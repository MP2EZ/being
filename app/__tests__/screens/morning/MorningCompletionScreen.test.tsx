/**
 * MORNING COMPLETION SCREEN TESTS
 *
 * Tests for morning flow completion summary screen.
 * Displays summary of completed practices and saves flow data.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Show summary of completed practices
 * - Display gratitude items (3)
 * - Display virtue intention
 * - Display principle focus
 * - Display obstacles contemplated (if any)
 * - Show physical metrics summary
 * - Save complete morning flow data
 * - Navigate to home on completion
 * - Optional: Share/export summary
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MorningCompletionScreen from '@/features/practices/morning/screens/MorningCompletionScreen';
import type { StoicMorningFlowData } from '@/features/practices/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Sample complete morning flow data
const sampleFlowData: Partial<StoicMorningFlowData> = {
  gratitude: {
    items: [
      {
        what: 'Morning coffee with partner',
        impermanenceReflection: {
          acknowledged: true,
          awareness: 'This moment is temporary',
          appreciationShift: 'I savor it fully',
          presentAction: 'Be fully present',
        },
      },
      { what: 'Good health' },
      { what: 'Meaningful work' },
    ],
    timestamp: new Date(),
  },
  intention: {
    virtue: 'wisdom',
    context: 'work',
    intentionStatement: 'Pause before reacting to feedback',
    whatIControl: 'My response, my tone',
    whatIDontControl: 'Others reactions',
    reserveClause: '...if circumstances allow',
    timestamp: new Date(),
  },
  preparation: {
    obstacles: [
      {
        obstacle: 'Difficult meeting',
        howICanRespond: 'Listen fully, pause before speaking',
        whatIControl: 'My listening, my response',
        whatIDontControl: 'Others opinions',
      },
    ],
    readinessRating: 7,
    selfCompassionNote: "I'm prepared. I'm learning.",
    timeSpentSeconds: 90,
    optedOut: false,
    timestamp: new Date(),
  },
  principleFocus: {
    principleKey: 'dichotomy_of_control',
    personalInterpretation: 'Focus on my effort, not outcomes',
    reminderTime: '12:00',
    timestamp: new Date(),
  },
  physicalMetrics: {
    sleepHours: 7,
    exerciseMinutes: 30,
    mealsCount: 3,
    timestamp: new Date(),
  },
};

describe('MorningCompletionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render completion screen', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(getByText(/morning practice complete/i)).toBeTruthy();
      expect(getByText(/well done/i)).toBeTruthy();
    });

    it('should show completion message', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(
        getByText(/You've completed your morning Stoic Mindfulness practice/i)
      ).toBeTruthy();
    });
  });

  describe('Gratitude Summary', () => {
    it('should display gratitude items count', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(getByText(/3 gratitude/i)).toBeTruthy();
    });

    it('should show gratitude items', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(getByText(/Morning coffee with partner/i)).toBeTruthy();
      expect(getByText(/Good health/i)).toBeTruthy();
      expect(getByText(/Meaningful work/i)).toBeTruthy();
    });
  });

  describe('Intention Summary', () => {
    it('should display virtue intention', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(getByText(/Wisdom/i)).toBeTruthy();
      expect(getByText(/Pause before reacting to feedback/i)).toBeTruthy();
    });

    it('should show dichotomy of control', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(getByText(/My response, my tone/i)).toBeTruthy();
      expect(getByText(/Others reactions/i)).toBeTruthy();
    });
  });

  describe('Principle Summary', () => {
    it('should display selected principle', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(getByText(/Dichotomy of Control/i)).toBeTruthy();
    });

    it('should show personal interpretation if provided', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(getByText(/Focus on my effort, not outcomes/i)).toBeTruthy();
    });
  });

  describe('Preparation Summary', () => {
    it('should show obstacles count', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(getByText(/1 obstacle/i)).toBeTruthy();
    });

    it('should show readiness rating', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(getByText(/Readiness: 7\/10/i)).toBeTruthy();
    });

    it('should handle no obstacles', () => {
      const noObstaclesData = {
        ...sampleFlowData,
        preparation: {
          ...sampleFlowData.preparation!,
          obstacles: [],
        },
      };

      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: noObstaclesData } } as any}
        />
      );

      expect(getByText(/No obstacles contemplated/i)).toBeTruthy();
    });
  });

  describe('Physical Metrics Summary', () => {
    it('should display sleep hours', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(getByText(/7 hours sleep/i)).toBeTruthy();
    });

    it('should display exercise minutes', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(getByText(/30 min exercise/i)).toBeTruthy();
    });
  });

  describe('Data Persistence', () => {
    it('should save complete flow data on finish', async () => {
      const onSave = jest.fn();
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByText(/finish/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            gratitude: expect.any(Object),
            intention: expect.any(Object),
            preparation: expect.any(Object),
            principleFocus: expect.any(Object),
            physicalMetrics: expect.any(Object),
            completedAt: expect.any(Date),
            flowVersion: 'stoic_v1',
          })
        );
      });
    });

    it('should include timeSpentSeconds in saved data', async () => {
      const onSave = jest.fn();
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData, startTime: new Date(Date.now() - 300000) } } as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByText(/finish/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            timeSpentSeconds: expect.any(Number),
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to home on finish', async () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      fireEvent.press(getByText(/finish/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Home');
      });
    });

    it('should have review button to go back', () => {
      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      fireEvent.press(getByText(/review/i));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all sections', () => {
      const { getByTestId } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: sampleFlowData } } as any}
        />
      );

      expect(getByTestId('gratitude-summary').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('intention-summary').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('principle-summary').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional data gracefully', () => {
      const minimalData = {
        gratitude: sampleFlowData.gratitude,
        intention: sampleFlowData.intention,
        physicalMetrics: sampleFlowData.physicalMetrics,
      };

      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: minimalData } } as any}
        />
      );

      expect(getByText(/morning practice complete/i)).toBeTruthy();
    });

    it('should handle empty gratitude items', () => {
      const emptyGratitudeData = {
        ...sampleFlowData,
        gratitude: {
          items: [],
          timestamp: new Date(),
        },
      };

      const { getByText } = render(
        <MorningCompletionScreen
          navigation={mockNavigation as any}
          route={{ params: { flowData: emptyGratitudeData } } as any}
        />
      );

      expect(getByText(/morning practice complete/i)).toBeTruthy();
    });
  });
});
