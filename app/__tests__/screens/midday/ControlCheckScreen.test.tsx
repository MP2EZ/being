/**
 * CONTROL CHECK SCREEN TESTS
 *
 * Tests for three-tier dichotomy of control screen.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Aspect description (what to analyze)
 * - Three-tier selection: fully_in_control | can_influence | not_in_control
 * - Conditional fields based on selection:
 *   - If fully_in_control: whatIControl + actionIfControllable
 *   - If can_influence: whatIControl + whatICannotControl + actionIfControllable
 *   - If not_in_control: whatICannotControl + acceptanceIfUncontrollable
 * - Save to ControlCheckData
 * - Navigate to Reappraisal screen
 *
 * Classical Stoic Practice:
 * - Epictetus: "Some things are in our power, others not." (Enchiridion 1)
 * - Marcus Aurelius: "You have power over your mind, not outside events." (Meditations 12:8)
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ControlCheckScreen from '@/features/practices/midday/screens/ControlCheckScreen';
import type { ControlCheckData } from '@/features/practices/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('ControlCheckScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render control check screen', () => {
      const { getByText } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/control check/i)).toBeTruthy();
      expect(getByText(/dichotomy of control/i)).toBeTruthy();
    });

    it('should show aspect input', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('aspect-input')).toBeTruthy();
    });

    it('should show three control type options', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('control-fully')).toBeTruthy();
      expect(getByTestId('control-influence')).toBeTruthy();
      expect(getByTestId('control-not')).toBeTruthy();
    });
  });

  describe('Aspect Input', () => {
    it('should allow entering aspect to analyze', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const aspectInput = getByTestId('aspect-input');
      fireEvent.changeText(aspectInput, 'Project deadline');

      expect(aspectInput.props.value).toBe('Project deadline');
    });

    it('should require aspect description', () => {
      const { getByTestId, getByText } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Select control type but no aspect
      fireEvent.press(getByTestId('control-fully'));

      fireEvent.press(getByText(/continue/i));

      // Should not navigate without aspect
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Control Type Selection', () => {
    it('should allow selecting fully in control', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('control-fully'));

      // Should show appropriate fields for fully in control
      expect(getByTestId('what-i-control-input')).toBeTruthy();
      expect(getByTestId('action-input')).toBeTruthy();
    });

    it('should allow selecting can influence', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('control-influence'));

      // Should show fields for can influence
      expect(getByTestId('what-i-control-input')).toBeTruthy();
      expect(getByTestId('what-i-cannot-control-input')).toBeTruthy();
      expect(getByTestId('action-input')).toBeTruthy();
    });

    it('should allow selecting not in control', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('control-not'));

      // Should show fields for not in control
      expect(getByTestId('what-i-cannot-control-input')).toBeTruthy();
      expect(getByTestId('acceptance-input')).toBeTruthy();
    });

    it('should update fields when changing control type', () => {
      const { getByTestId, queryByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Select fully in control
      fireEvent.press(getByTestId('control-fully'));
      expect(getByTestId('action-input')).toBeTruthy();
      expect(queryByTestId('acceptance-input')).toBeNull();

      // Change to not in control
      fireEvent.press(getByTestId('control-not'));
      expect(queryByTestId('action-input')).toBeNull();
      expect(getByTestId('acceptance-input')).toBeTruthy();
    });
  });

  describe('Conditional Fields - Fully in Control', () => {
    it('should show what I control field', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('control-fully'));

      const controlInput = getByTestId('what-i-control-input');
      expect(controlInput).toBeTruthy();
    });

    it('should show action field', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('control-fully'));

      const actionInput = getByTestId('action-input');
      expect(actionInput).toBeTruthy();
    });

    it('should NOT show what I cannot control field', () => {
      const { getByTestId, queryByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('control-fully'));

      expect(queryByTestId('what-i-cannot-control-input')).toBeNull();
    });
  });

  describe('Conditional Fields - Can Influence', () => {
    it('should show all relevant fields', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('control-influence'));

      expect(getByTestId('what-i-control-input')).toBeTruthy();
      expect(getByTestId('what-i-cannot-control-input')).toBeTruthy();
      expect(getByTestId('action-input')).toBeTruthy();
    });

    it('should NOT show acceptance field', () => {
      const { getByTestId, queryByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('control-influence'));

      expect(queryByTestId('acceptance-input')).toBeNull();
    });
  });

  describe('Conditional Fields - Not in Control', () => {
    it('should show what I cannot control field', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('control-not'));

      expect(getByTestId('what-i-cannot-control-input')).toBeTruthy();
    });

    it('should show acceptance field', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('control-not'));

      expect(getByTestId('acceptance-input')).toBeTruthy();
    });

    it('should NOT show action field', () => {
      const { getByTestId, queryByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('control-not'));

      expect(queryByTestId('action-input')).toBeNull();
    });
  });

  describe('Data Persistence', () => {
    it('should save fully in control data', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <ControlCheckScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('aspect-input'), 'My effort on task');
      fireEvent.press(getByTestId('control-fully'));
      fireEvent.changeText(getByTestId('what-i-control-input'), 'My focus and effort');
      fireEvent.changeText(getByTestId('action-input'), 'Work for 2 hours uninterrupted');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            aspect: 'My effort on task',
            controlType: 'fully_in_control',
            whatIControl: 'My focus and effort',
            actionIfControllable: 'Work for 2 hours uninterrupted',
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should save can influence data', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <ControlCheckScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('aspect-input'), 'Project outcome');
      fireEvent.press(getByTestId('control-influence'));
      fireEvent.changeText(getByTestId('what-i-control-input'), 'My effort and communication');
      fireEvent.changeText(getByTestId('what-i-cannot-control-input'), 'Others\' decisions');
      fireEvent.changeText(getByTestId('action-input'), 'Present clear proposal');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            aspect: 'Project outcome',
            controlType: 'can_influence',
            whatIControl: 'My effort and communication',
            whatICannotControl: 'Others\' decisions',
            actionIfControllable: 'Present clear proposal',
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should save not in control data', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <ControlCheckScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('aspect-input'), 'Others\' opinions');
      fireEvent.press(getByTestId('control-not'));
      fireEvent.changeText(getByTestId('what-i-cannot-control-input'), 'What others think');
      fireEvent.changeText(getByTestId('acceptance-input'), 'I accept this is beyond me');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            aspect: 'Others\' opinions',
            controlType: 'not_in_control',
            whatICannotControl: 'What others think',
            acceptanceIfUncontrollable: 'I accept this is beyond me',
            timestamp: expect.any(Date),
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to reappraisal on continue', async () => {
      const { getByTestId, getByText } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.changeText(getByTestId('aspect-input'), 'Test aspect');
      fireEvent.press(getByTestId('control-fully'));
      fireEvent.changeText(getByTestId('what-i-control-input'), 'My actions');
      fireEvent.changeText(getByTestId('action-input'), 'Take action');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Reappraisal');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('aspect-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('control-fully').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('control-influence').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('control-not').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should require aspect and control type', () => {
      const { getByText } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByText(/continue/i));

      // Should not navigate with empty fields
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should require conditional fields based on control type', () => {
      const { getByTestId, getByText } = render(
        <ControlCheckScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.changeText(getByTestId('aspect-input'), 'Test');
      fireEvent.press(getByTestId('control-fully'));

      // Don't fill conditional fields
      fireEvent.press(getByText(/continue/i));

      // Should not navigate without required conditional fields
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
