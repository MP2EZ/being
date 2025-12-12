/**
 * GRATITUDE SCREEN TESTS
 *
 * Tests for Stoic gratitude practice screen with impermanence reflection.
 * Philosopher-validated (9.5/10) - integrates memento mori with gratitude.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Exactly 3 gratitude items (no more, no less)
 * - Optional impermanence reflection (3-step pathway per item)
 * - Validation before proceeding
 * - Save to StoicMorningFlowData
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import GratitudeScreen from '@/features/practices/morning/screens/GratitudeScreen';
import type { GratitudeData, GratitudeItem } from '@/features/practices/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('GratitudeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render gratitude input screen', () => {
      const { getByText, getAllByPlaceholderText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/gratitude/i)).toBeTruthy();
      expect(getAllByPlaceholderText(/what are you grateful for/i).length).toBe(3);
    });

    it('should show instructions for 3 items', () => {
      const { getByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/3 things/i)).toBeTruthy();
    });
  });

  describe('Gratitude Item Entry', () => {
    it('should allow entering first gratitude item', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const input = getByTestId('gratitude-input-0');
      fireEvent.changeText(input, 'Morning coffee');

      expect(input.props.value).toBe('Morning coffee');
    });

    it('should show 3 input fields for 3 items', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('gratitude-input-0')).toBeTruthy();
      expect(getByTestId('gratitude-input-1')).toBeTruthy();
      expect(getByTestId('gratitude-input-2')).toBeTruthy();
    });

    it('should require all 3 items before proceeding', () => {
      const { getByTestId, getByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const continueButton = getByText(/continue/i);

      // Initially can't proceed (button click won't navigate)
      fireEvent.press(continueButton);
      expect(mockNavigate).not.toHaveBeenCalled();

      // Fill only 2 items
      fireEvent.changeText(getByTestId('gratitude-input-0'), 'Item 1');
      fireEvent.changeText(getByTestId('gratitude-input-1'), 'Item 2');

      // Still can't proceed
      fireEvent.press(continueButton);
      expect(mockNavigate).not.toHaveBeenCalled();

      // Fill all 3 items
      fireEvent.changeText(getByTestId('gratitude-input-2'), 'Item 3');

      // Now can proceed
      fireEvent.press(continueButton);
      expect(mockNavigate).toHaveBeenCalledWith('Intention');
    });
  });

  describe('Impermanence Reflection Pathway', () => {
    it('should offer optional impermanence reflection per item', () => {
      const { getByTestId, getByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill first item
      fireEvent.changeText(getByTestId('gratitude-input-0'), 'Morning coffee');

      // Should show impermanence option
      expect(getByText(/reflect on impermanence/i)).toBeTruthy();
    });

    it('should show 3-step impermanence pathway when opted in', () => {
      const { getByTestId, getByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill first item
      fireEvent.changeText(getByTestId('gratitude-input-0'), 'Morning coffee');

      // Opt into impermanence reflection
      const reflectButton = getByTestId('impermanence-reflect-0');
      fireEvent.press(reflectButton);

      // Should show 3 steps
      expect(getByText(/this is impermanent/i)).toBeTruthy();
      expect(getByText(/this makes it precious/i)).toBeTruthy();
      expect(getByText(/i'll engage fully/i)).toBeTruthy();
    });

    it('should allow skipping impermanence reflection', () => {
      const { getByTestId, queryByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill first item
      fireEvent.changeText(getByTestId('gratitude-input-0'), 'Morning coffee');

      // Don't opt into impermanence reflection
      const skipButton = getByTestId('impermanence-skip-0');
      fireEvent.press(skipButton);

      // Should not show 3-step pathway
      expect(queryByText(/this is impermanent/i)).toBeNull();
    });

    it('should track impermanence acknowledgment', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill first item
      fireEvent.changeText(getByTestId('gratitude-input-0'), 'Morning coffee');

      // Opt into impermanence reflection
      fireEvent.press(getByTestId('impermanence-reflect-0'));

      // Acknowledge impermanence
      const acknowledgeCheckbox = getByTestId('impermanence-acknowledge-0');
      fireEvent.press(acknowledgeCheckbox);

      expect(acknowledgeCheckbox.props.accessibilityState?.checked).toBe(true);
    });
  });

  describe('Data Persistence', () => {
    it('should save gratitude data on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <GratitudeScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Fill all 3 items
      fireEvent.changeText(getByTestId('gratitude-input-0'), 'Item 1');
      fireEvent.changeText(getByTestId('gratitude-input-1'), 'Item 2');
      fireEvent.changeText(getByTestId('gratitude-input-2'), 'Item 3');

      // Press continue
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({ what: 'Item 1' }),
              expect.objectContaining({ what: 'Item 2' }),
              expect.objectContaining({ what: 'Item 3' }),
            ]),
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should save gratitude with impermanence reflection', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <GratitudeScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Fill first item
      fireEvent.changeText(getByTestId('gratitude-input-0'), 'Morning coffee');

      // Opt into impermanence reflection
      fireEvent.press(getByTestId('impermanence-reflect-0'));

      // Acknowledge impermanence
      fireEvent.press(getByTestId('impermanence-acknowledge-0'));

      // Fill awareness
      fireEvent.changeText(
        getByTestId('impermanence-awareness-0'),
        'Coffee beans are fleeting'
      );

      // Fill appreciation shift
      fireEvent.changeText(
        getByTestId('impermanence-appreciation-0'),
        'This makes morning sacred'
      );

      // Fill present action
      fireEvent.changeText(
        getByTestId('impermanence-action-0'),
        'I will savor each sip'
      );

      // Fill remaining items
      fireEvent.changeText(getByTestId('gratitude-input-1'), 'Item 2');
      fireEvent.changeText(getByTestId('gratitude-input-2'), 'Item 3');

      // Press continue
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({
                what: 'Morning coffee',
                impermanenceReflection: expect.objectContaining({
                  acknowledged: true,
                  awareness: 'Coffee beans are fleeting',
                  appreciationShift: 'This makes morning sacred',
                  presentAction: 'I will savor each sip',
                }),
              }),
            ]),
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to next screen on continue', async () => {
      const { getByTestId, getByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill all 3 items
      fireEvent.changeText(getByTestId('gratitude-input-0'), 'Item 1');
      fireEvent.changeText(getByTestId('gratitude-input-1'), 'Item 2');
      fireEvent.changeText(getByTestId('gratitude-input-2'), 'Item 3');

      // Press continue
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Intention');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const backButton = getByTestId('back-button');
      fireEvent.press(backButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const input0 = getByTestId('gratitude-input-0');
      const input1 = getByTestId('gratitude-input-1');
      const input2 = getByTestId('gratitude-input-2');

      expect(input0.props.accessibilityLabel).toBeTruthy();
      expect(input1.props.accessibilityLabel).toBeTruthy();
      expect(input2.props.accessibilityLabel).toBeTruthy();
    });

    it('should announce when all items are filled', () => {
      const { getByTestId, getByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill all 3 items
      fireEvent.changeText(getByTestId('gratitude-input-0'), 'Item 1');
      fireEvent.changeText(getByTestId('gratitude-input-1'), 'Item 2');
      fireEvent.changeText(getByTestId('gratitude-input-2'), 'Item 3');

      // After filling all items, button should be pressable
      const continueButton = getByText(/continue/i);
      fireEvent.press(continueButton);
      expect(mockNavigate).toHaveBeenCalledWith('Intention');
    });
  });

  describe('Validation', () => {
    it('should trim whitespace from gratitude items', () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <GratitudeScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Fill with whitespace
      fireEvent.changeText(getByTestId('gratitude-input-0'), '  Item 1  ');
      fireEvent.changeText(getByTestId('gratitude-input-1'), 'Item 2');
      fireEvent.changeText(getByTestId('gratitude-input-2'), 'Item 3');

      fireEvent.press(getByText(/continue/i));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ what: 'Item 1' }), // Trimmed
          ]),
        })
      );
    });

    it('should not allow empty gratitude items', () => {
      const { getByTestId, getByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill with empty strings
      fireEvent.changeText(getByTestId('gratitude-input-0'), '   ');
      fireEvent.changeText(getByTestId('gratitude-input-1'), 'Item 2');
      fireEvent.changeText(getByTestId('gratitude-input-2'), 'Item 3');

      // Button should not navigate (disabled)
      const continueButton = getByText(/continue/i);
      fireEvent.press(continueButton);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
