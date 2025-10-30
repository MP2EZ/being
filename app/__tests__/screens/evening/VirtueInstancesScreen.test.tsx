/**
 * VIRTUE INSTANCES SCREEN TESTS
 *
 * Tests for recording successful virtue practice moments.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Allow adding multiple virtue instances (0-5 recommended)
 * - Each instance captures:
 *   - Virtue practiced (wisdom, courage, justice, temperance)
 *   - Context/situation description
 *   - Practice domain (work, relationships, adversity)
 *   - Optional: Stoic principle applied
 * - Display list of added instances with edit/delete
 * - Navigate to VirtueChallenges screen
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "When you wake up in the morning... at evening, examine
 *   your day. How did I fail in duty toward myself? What did I do? What duty
 *   did I leave undone?" (Meditations 5:1) - But also celebrate progress
 * - Seneca: "Let us balance life's ledger each day" (Letters 18:1) - Balance
 *   requires noting both successes AND struggles
 * - Epictetus: "If you didn't learn something good today, then what did you
 *   do?" (Discourses 3:23) - Focus on growth, not perfection
 *
 * CRITICAL: This screen records SUCCESSES. Next screen (VirtueChallenges)
 * records struggles. Together they form Seneca's balanced examination.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import VirtueInstancesScreen from '../../../src/flows/evening/screens/VirtueInstancesScreen';
import type { VirtueInstance } from '../../../src/types/stoic';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('VirtueInstancesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render virtue instances screen', () => {
      const { queryAllByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Check for virtue-related text (multiple matches expected)
      const virtueMatches = queryAllByText(/virtue/i);
      const successMatches = queryAllByText(/success/i);
      const instanceMatches = queryAllByText(/instances/i);

      expect(
        virtueMatches.length > 0 || successMatches.length > 0 || instanceMatches.length > 0
      ).toBe(true);
    });

    it('should show add instance button', () => {
      const { getByTestId } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('add-instance-button')).toBeTruthy();
    });

    it('should show empty state initially', () => {
      const { getByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(
        getByText(/no instances yet/i) ||
        getByText(/add your first/i) ||
        getByText(/0 instances/i)
      ).toBeTruthy();
    });
  });

  describe('Adding Virtue Instances', () => {
    it('should show add form when add button pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Form elements should not be visible initially
      expect(queryByTestId('virtue-wisdom')).toBeNull();

      fireEvent.press(getByTestId('add-instance-button'));

      // Form elements should now be visible
      expect(queryByTestId('virtue-wisdom')).toBeTruthy();
    });

    it('should show four virtue options', () => {
      const { getByTestId } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-instance-button'));

      expect(getByTestId('virtue-wisdom')).toBeTruthy();
      expect(getByTestId('virtue-courage')).toBeTruthy();
      expect(getByTestId('virtue-justice')).toBeTruthy();
      expect(getByTestId('virtue-temperance')).toBeTruthy();
    });

    it('should allow selecting a virtue', () => {
      const { getByTestId } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-instance-button'));

      const wisdomButton = getByTestId('virtue-wisdom');
      fireEvent.press(wisdomButton);

      expect(wisdomButton.props.accessibilityState.selected).toBe(true);
    });

    it('should show context input', () => {
      const { getByTestId } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-instance-button'));

      expect(getByTestId('context-input')).toBeTruthy();
    });

    it('should allow entering context', () => {
      const { getByTestId } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-instance-button'));

      const input = getByTestId('context-input');
      fireEvent.changeText(input, 'Stayed calm during difficult meeting');

      expect(input.props.value).toBe('Stayed calm during difficult meeting');
    });

    it('should show three domain options', () => {
      const { getByTestId } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-instance-button'));

      expect(getByTestId('domain-work')).toBeTruthy();
      expect(getByTestId('domain-relationships')).toBeTruthy();
      expect(getByTestId('domain-adversity')).toBeTruthy();
    });

    it('should allow selecting a domain', () => {
      const { getByTestId } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-instance-button'));

      const workButton = getByTestId('domain-work');
      fireEvent.press(workButton);

      expect(workButton.props.accessibilityState.selected).toBe(true);
    });

    it('should show optional principle input', () => {
      const { getByTestId } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-instance-button'));

      expect(getByTestId('principle-input')).toBeTruthy();
    });

    it('should allow saving instance', async () => {
      const { getByTestId, getByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-instance-button'));

      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.changeText(getByTestId('context-input'), 'Made wise decision');
      fireEvent.press(getByTestId('domain-work'));

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('Made wise decision')).toBeTruthy();
      });
    });

    it('should require virtue selection', () => {
      const { getByTestId, getByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-instance-button'));

      // Don't select virtue
      fireEvent.changeText(getByTestId('context-input'), 'Context');
      fireEvent.press(getByTestId('domain-work'));

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      // Should not save without virtue
      expect(getByTestId('context-input')).toBeTruthy(); // Form still visible
    });

    it('should require context', () => {
      const { getByTestId, getByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-instance-button'));

      fireEvent.press(getByTestId('virtue-wisdom'));
      // Don't enter context
      fireEvent.press(getByTestId('domain-work'));

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      // Should not save without context
      expect(getByTestId('context-input')).toBeTruthy(); // Form still visible
    });

    it('should require domain selection', () => {
      const { getByTestId, getByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-instance-button'));

      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.changeText(getByTestId('context-input'), 'Context');
      // Don't select domain

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      // Should not save without domain
      expect(getByTestId('context-input')).toBeTruthy(); // Form still visible
    });
  });

  describe('Instance List Management', () => {
    it('should display added instances', async () => {
      const { getByTestId, getByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add first instance
      fireEvent.press(getByTestId('add-instance-button'));
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.changeText(getByTestId('context-input'), 'First instance');
      fireEvent.press(getByTestId('domain-work'));
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('First instance')).toBeTruthy();
        expect(getByText(/wisdom/i)).toBeTruthy();
      });
    });

    it('should allow adding multiple instances', async () => {
      const { getByTestId, getByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add first instance
      fireEvent.press(getByTestId('add-instance-button'));
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.changeText(getByTestId('context-input'), 'First');
      fireEvent.press(getByTestId('domain-work'));
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('First')).toBeTruthy();
      });

      // Add second instance
      fireEvent.press(getByTestId('add-instance-button'));
      fireEvent.press(getByTestId('virtue-courage'));
      fireEvent.changeText(getByTestId('context-input'), 'Second');
      fireEvent.press(getByTestId('domain-relationships'));
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('First')).toBeTruthy();
        expect(getByText('Second')).toBeTruthy();
      });
    });

    it('should allow deleting instance', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add instance
      fireEvent.press(getByTestId('add-instance-button'));
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.changeText(getByTestId('context-input'), 'To delete');
      fireEvent.press(getByTestId('domain-work'));
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('To delete')).toBeTruthy();
      });

      // Delete instance
      const deleteButton = getByTestId('delete-instance-0');
      fireEvent.press(deleteButton);

      await waitFor(() => {
        expect(queryByText('To delete')).toBeNull();
      });
    });

    it('should show instance count', async () => {
      const { getByTestId, getByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add instance
      fireEvent.press(getByTestId('add-instance-button'));
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.changeText(getByTestId('context-input'), 'Instance');
      fireEvent.press(getByTestId('domain-work'));
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText(/1 instance/i) || getByText(/1 success/i)).toBeTruthy();
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save instances on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <VirtueInstancesScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Add instance
      fireEvent.press(getByTestId('add-instance-button'));
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.changeText(getByTestId('context-input'), 'Test instance');
      fireEvent.press(getByTestId('domain-work'));
      fireEvent.changeText(getByTestId('principle-input'), 'Test principle');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('Test instance')).toBeTruthy();
      });

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              virtue: 'wisdom',
              context: 'Test instance',
              domain: 'work',
              principleApplied: 'Test principle',
              timestamp: expect.any(Date),
            }),
          ])
        );
      });
    });

    it('should trim whitespace from context', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <VirtueInstancesScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('add-instance-button'));
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.changeText(getByTestId('context-input'), '  Test  ');
      fireEvent.press(getByTestId('domain-work'));
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('Test')).toBeTruthy();
      });

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              context: 'Test',
            }),
          ])
        );
      });
    });

    it('should save empty array if no instances added', async () => {
      const onSave = jest.fn();
      const { getByText } = render(
        <VirtueInstancesScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith([]);
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to virtue challenges on continue', async () => {
      const { getByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('VirtueChallenges');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-instance-button'));

      expect(getByTestId('virtue-wisdom').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('context-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('domain-work').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Stoic Guidance', () => {
    it('should show Stoic wisdom about celebrating progress', () => {
      const { getByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Should show quote about balanced examination
      expect(
        getByText(/Seneca/i) ||
        getByText(/Marcus Aurelius/i) ||
        getByText(/balance/i) ||
        getByText(/ledger/i)
      ).toBeTruthy();
    });
  });
});
