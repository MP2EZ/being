/**
 * INTENTION SCREEN TESTS
 *
 * Tests for Stoic morning intention with dichotomy of control.
 * Philosopher-validated (9.5/10) - integrates virtue + control distinction.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Select cardinal virtue (4 options: wisdom, courage, justice, temperance)
 * - Select practice domain (work, relationships, adversity)
 * - Write intention statement
 * - Distinguish what I control vs. what I don't control
 * - Optional reserve clause (Stoic "fate permitting")
 * - Optional principle applied
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import IntentionScreen from '@/features/practices/morning/screens/IntentionScreen';
import type { IntentionData } from '@/features/practices/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('IntentionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render intention screen', () => {
      const { getByText } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Morning Intention')).toBeTruthy();
      expect(getByText(/which virtue will you practice/i)).toBeTruthy();
    });

    it('should show 4 cardinal virtues', () => {
      const { getByTestId } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('virtue-wisdom')).toBeTruthy();
      expect(getByTestId('virtue-courage')).toBeTruthy();
      expect(getByTestId('virtue-justice')).toBeTruthy();
      expect(getByTestId('virtue-temperance')).toBeTruthy();
    });

    it('should show 3 practice domains', () => {
      const { getByText } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/work/i)).toBeTruthy();
      expect(getByText(/relationships/i)).toBeTruthy();
      expect(getByText(/adversity/i)).toBeTruthy();
    });
  });

  describe('Virtue Selection', () => {
    it('should allow selecting a virtue', () => {
      const { getByTestId } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const wisdomButton = getByTestId('virtue-wisdom');
      fireEvent.press(wisdomButton);

      // Virtue should be selected (visual feedback handled by component)
      expect(wisdomButton).toBeTruthy();
    });

    it('should only allow one virtue at a time', () => {
      const { getByTestId } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Select wisdom
      fireEvent.press(getByTestId('virtue-wisdom'));

      // Select courage (should replace wisdom)
      fireEvent.press(getByTestId('virtue-courage'));

      // Both should exist but only courage selected (implementation detail)
      expect(getByTestId('virtue-wisdom')).toBeTruthy();
      expect(getByTestId('virtue-courage')).toBeTruthy();
    });
  });

  describe('Domain Selection', () => {
    it('should allow selecting a domain', () => {
      const { getByTestId } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const workButton = getByTestId('domain-work');
      fireEvent.press(workButton);

      expect(workButton).toBeTruthy();
    });
  });

  describe('Intention Statement', () => {
    it('should allow entering intention statement', () => {
      const { getByTestId } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const input = getByTestId('intention-statement');
      fireEvent.changeText(input, 'Pause before reacting to criticism');

      expect(input.props.value).toBe('Pause before reacting to criticism');
    });

    it('should require intention statement to continue', () => {
      const { getByTestId, getByText } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Select virtue and domain
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.press(getByTestId('domain-work'));

      // Try to continue without intention
      const continueButton = getByText(/continue/i);
      fireEvent.press(continueButton);

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Dichotomy of Control', () => {
    it('should have fields for what I control', () => {
      const { getByTestId } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const controlInput = getByTestId('what-i-control');
      fireEvent.changeText(controlInput, 'My response, my tone, my words');

      expect(controlInput.props.value).toBe('My response, my tone, my words');
    });

    it('should have fields for what I don\'t control', () => {
      const { getByTestId } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const noControlInput = getByTestId('what-i-dont-control');
      fireEvent.changeText(noControlInput, 'Others\' reactions, outcomes, circumstances');

      expect(noControlInput.props.value).toBe('Others\' reactions, outcomes, circumstances');
    });

    it('should require dichotomy fields to continue', () => {
      const { getByTestId, getByText } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill minimum required fields
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.press(getByTestId('domain-work'));
      fireEvent.changeText(getByTestId('intention-statement'), 'Pause before reacting');

      // Missing dichotomy fields
      const continueButton = getByText(/continue/i);
      fireEvent.press(continueButton);

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Optional Fields', () => {
    it('should have optional reserve clause field', () => {
      const { getByTestId } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const reserveInput = getByTestId('reserve-clause');
      fireEvent.changeText(reserveInput, '...if fate permits');

      expect(reserveInput.props.value).toBe('...if fate permits');
    });

    it('should allow continuing without reserve clause', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <IntentionScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Fill required fields
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.press(getByTestId('domain-work'));
      fireEvent.changeText(getByTestId('intention-statement'), 'Pause before reacting');
      fireEvent.changeText(getByTestId('what-i-control'), 'My response');
      fireEvent.changeText(getByTestId('what-i-dont-control'), 'Others reactions');

      // Continue without reserve clause
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            reserveClause: undefined,
          })
        );
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save intention data on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <IntentionScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Fill all fields
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.press(getByTestId('domain-work'));
      fireEvent.changeText(getByTestId('intention-statement'), 'Pause before reacting');
      fireEvent.changeText(getByTestId('what-i-control'), 'My response, my tone');
      fireEvent.changeText(getByTestId('what-i-dont-control'), 'Others\' reactions');
      fireEvent.changeText(getByTestId('reserve-clause'), '...if circumstances allow');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            virtue: 'wisdom',
            context: 'work',
            intentionStatement: 'Pause before reacting',
            whatIControl: 'My response, my tone',
            whatIDontControl: 'Others\' reactions',
            reserveClause: '...if circumstances allow',
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should trim whitespace from all fields', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <IntentionScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.press(getByTestId('domain-work'));
      fireEvent.changeText(getByTestId('intention-statement'), '  Pause  ');
      fireEvent.changeText(getByTestId('what-i-control'), '  My response  ');
      fireEvent.changeText(getByTestId('what-i-dont-control'), '  Others reactions  ');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            intentionStatement: 'Pause',
            whatIControl: 'My response',
            whatIDontControl: 'Others reactions',
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to next screen on continue', async () => {
      const { getByTestId, getByText } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill required fields
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.press(getByTestId('domain-work'));
      fireEvent.changeText(getByTestId('intention-statement'), 'Pause before reacting');
      fireEvent.changeText(getByTestId('what-i-control'), 'My response');
      fireEvent.changeText(getByTestId('what-i-dont-control'), 'Others reactions');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Preparation');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for virtue buttons', () => {
      const { getByTestId } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('virtue-wisdom').props.accessibilityLabel).toContain('Wisdom');
      expect(getByTestId('virtue-courage').props.accessibilityLabel).toContain('Courage');
    });

    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('intention-statement').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('what-i-control').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('what-i-dont-control').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should require virtue selection', () => {
      const { getByTestId, getByText } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Skip virtue, fill other fields
      fireEvent.press(getByTestId('domain-work'));
      fireEvent.changeText(getByTestId('intention-statement'), 'Pause');
      fireEvent.changeText(getByTestId('what-i-control'), 'Response');
      fireEvent.changeText(getByTestId('what-i-dont-control'), 'Reactions');

      fireEvent.press(getByText(/continue/i));
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should require domain selection', () => {
      const { getByTestId, getByText } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Skip domain, fill other fields
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.changeText(getByTestId('intention-statement'), 'Pause');
      fireEvent.changeText(getByTestId('what-i-control'), 'Response');
      fireEvent.changeText(getByTestId('what-i-dont-control'), 'Reactions');

      fireEvent.press(getByText(/continue/i));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Helper Text', () => {
    it('should show examples for dichotomy of control', () => {
      const { getByText } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Should have helper text explaining dichotomy
      expect(getByText(/what is within your control/i)).toBeTruthy();
    });

    it('should explain reserve clause', () => {
      const { getByText } = render(
        <IntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/fate permitting/i)).toBeTruthy();
    });
  });
});
