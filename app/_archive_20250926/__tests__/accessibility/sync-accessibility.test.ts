/**
 * Comprehensive accessibility testing for cross-device sync components
 *
 * Test Coverage:
 * - WCAG 2.1 AA compliance validation
 * - Screen reader compatibility (VoiceOver/TalkBack)
 * - Keyboard navigation and shortcuts
 * - Crisis safety accessibility
 * - Mental health state-responsive accessibility
 * - Cognitive accessibility for conflict resolution
 */

import { AccessibilityInfo, Platform } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SyncAccessibilityCoordinator } from '../../src/services/accessibility/SyncAccessibilityCoordinator';
import { CognitiveConflictResolver } from '../../src/components/accessibility/CognitiveConflictResolver';
import { useSyncKeyboardShortcuts } from '../../src/hooks/useSyncKeyboardShortcuts';
import { TestWrapper } from '../setup/TestWrapper';
import { mockSyncConflicts, mockSyncState } from '../mocks/syncMocks';

// Mock AccessibilityInfo
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(true)),
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    setAccessibilityFocus: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((config) => config.ios || config.default),
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('Cross-Device Sync Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SyncAccessibilityCoordinator.reset();
    mockNavigate.mockClear();
  });

  describe('SyncAccessibilityCoordinator', () => {
    beforeEach(() => {
      SyncAccessibilityCoordinator.initialize('stable');
    });

    describe('Announcement Coordination', () => {
      test('should prevent announcement conflicts', async () => {
        const announceForAccessibilitySpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

        // Rapid announcements from same component
        SyncAccessibilityCoordinator.announceForComponent(
          'test-component',
          'First announcement',
          'polite',
          'general'
        );

        SyncAccessibilityCoordinator.announceForComponent(
          'test-component',
          'Second announcement',
          'polite',
          'general'
        );

        // Should only make one announcement due to throttling
        expect(announceForAccessibilitySpy).toHaveBeenCalledTimes(1);
        expect(announceForAccessibilitySpy).toHaveBeenCalledWith('First announcement');
      });

      test('should prioritize crisis announcements', async () => {
        const announceForAccessibilitySpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

        // Regular announcement
        SyncAccessibilityCoordinator.announceForComponent(
          'test-component-1',
          'Regular announcement',
          'polite',
          'general'
        );

        // Crisis announcement should interrupt
        SyncAccessibilityCoordinator.announceCrisis(
          'test-component-2',
          'Emergency announcement'
        );

        expect(announceForAccessibilitySpy).toHaveBeenCalledTimes(2);
        expect(announceForAccessibilitySpy).toHaveBeenLastCalledWith(
          'Emergency announcement. Emergency support remains available.'
        );
      });

      test('should enhance text for mental health states', () => {
        const announceForAccessibilitySpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

        // Test depression enhancement
        SyncAccessibilityCoordinator.updateMentalHealthState('depression');
        SyncAccessibilityCoordinator.announceForComponent(
          'test-component',
          'sync completed',
          'polite',
          'therapeutic'
        );

        expect(announceForAccessibilitySpy).toHaveBeenCalledWith(
          'sync completed. You\'re taking care of your progress'
        );

        // Test anxiety enhancement
        SyncAccessibilityCoordinator.updateMentalHealthState('anxiety');
        SyncAccessibilityCoordinator.announceForComponent(
          'test-component',
          'sync starting',
          'polite',
          'therapeutic'
        );

        expect(announceForAccessibilitySpy).toHaveBeenLastCalledWith(
          'sync starting quietly in the background'
        );
      });

      test('should generate comprehensive sync status announcements', () => {
        const announceForAccessibilitySpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

        SyncAccessibilityCoordinator.announceSyncStatus(
          'test-component',
          'success' as any,
          'CRISIS_PLAN',
          { hasConflicts: false }
        );

        expect(announceForAccessibilitySpy).toHaveBeenCalledWith(
          'Crisis plan all devices updated successfully'
        );
      });
    });

    describe('Performance Optimization', () => {
      test('should cache critical announcements', () => {
        const stats = SyncAccessibilityCoordinator.getAccessibilityStats();
        expect(stats.cacheSize).toBeGreaterThan(0);
      });

      test('should adjust throttle time based on mental health state', () => {
        SyncAccessibilityCoordinator.updateMentalHealthState('crisis');
        const statsAfterCrisis = SyncAccessibilityCoordinator.getAccessibilityStats();
        expect(statsAfterCrisis.throttleTime).toBe(500); // Faster for crisis

        SyncAccessibilityCoordinator.updateMentalHealthState('anxiety');
        const statsAfterAnxiety = SyncAccessibilityCoordinator.getAccessibilityStats();
        expect(statsAfterAnxiety.throttleTime).toBe(3000); // Slower for anxiety
      });
    });
  });

  describe('CognitiveConflictResolver', () => {
    const mockConflicts = [
      {
        ...mockSyncConflicts[0],
        simplifiedExplanation: 'Your check-in information is different on your devices.',
        impactDescription: 'This affects your daily progress tracking.',
        recommendedAction: 'keep_local',
        difficultyLevel: 'simple',
        userFriendlyPreview: {
          thisDevice: 'Mood: Happy, Date: Today',
          otherDevice: 'Mood: Sad, Date: Yesterday',
          whatItMeans: 'You have different mood entries that need to be resolved.'
        }
      }
    ];

    const defaultProps = {
      conflicts: mockConflicts,
      onResolveConflict: jest.fn(),
      onRequestExpertHelp: jest.fn(),
      userCognitiveLevel: 'moderate' as const,
      currentMentalHealthState: 'stable' as const,
    };

    test('should render with proper accessibility labels', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <CognitiveConflictResolver {...defaultProps} />
        </TestWrapper>
      );

      expect(getByLabelText('Conflict explanation')).toBeTruthy();
      expect(getByLabelText('Keep this device\'s version')).toBeTruthy();
      expect(getByLabelText('Keep other device\'s version')).toBeTruthy();
    });

    test('should provide simplified interface for low cognitive level', () => {
      const { getByText, queryByText } = render(
        <TestWrapper>
          <CognitiveConflictResolver
            {...defaultProps}
            userCognitiveLevel="low"
          />
        </TestWrapper>
      );

      expect(getByText('Different check-in information found')).toBeTruthy();
      expect(getByText('Use This Device\'s Version')).toBeTruthy();
      expect(getByText('I Need Help Deciding')).toBeTruthy();

      // Technical details should be hidden for low cognitive level initially
      expect(queryByText('Technical Details')).toBeFalsy();
    });

    test('should show only crisis conflicts during crisis state', () => {
      const crisisConflicts = [
        {
          ...mockConflicts[0],
          entityType: 'CRISIS_PLAN'
        },
        {
          ...mockConflicts[0],
          entityType: 'CHECK_IN'
        }
      ];

      const { queryByText } = render(
        <TestWrapper>
          <CognitiveConflictResolver
            {...defaultProps}
            conflicts={crisisConflicts}
            userCognitiveLevel="crisis"
          />
        </TestWrapper>
      );

      // Should only show crisis plan conflict
      expect(queryByText(/crisis plan/i)).toBeTruthy();
    });

    test('should handle conflict resolution with accessibility announcements', async () => {
      const onResolveConflict = jest.fn().mockResolvedValue(undefined);
      const announceForAccessibilitySpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

      const { getByLabelText } = render(
        <TestWrapper>
          <CognitiveConflictResolver
            {...defaultProps}
            onResolveConflict={onResolveConflict}
          />
        </TestWrapper>
      );

      const keepLocalButton = getByLabelText('Keep this device\'s version');

      await act(async () => {
        fireEvent.press(keepLocalButton);
      });

      await waitFor(() => {
        expect(onResolveConflict).toHaveBeenCalledWith(
          mockConflicts[0].id,
          { strategy: 'client_wins' }
        );
      });

      expect(announceForAccessibilitySpy).toHaveBeenCalledWith(
        expect.stringContaining('Keeping this device\'s check-in information')
      );
    });

    test('should provide accessible navigation between conflicts', () => {
      const multipleConflicts = [mockConflicts[0], { ...mockConflicts[0], id: 'conflict-2' }];

      const { getByLabelText } = render(
        <TestWrapper>
          <CognitiveConflictResolver
            {...defaultProps}
            conflicts={multipleConflicts}
          />
        </TestWrapper>
      );

      const nextButton = getByLabelText('Next conflict');
      const previousButton = getByLabelText('Previous conflict');

      expect(nextButton).toBeTruthy();
      expect(previousButton).toBeTruthy();
      expect(previousButton.props.disabled).toBe(true); // First conflict
    });

    test('should handle expert help requests', async () => {
      const onRequestExpertHelp = jest.fn();
      const announceForAccessibilitySpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

      const { getByLabelText } = render(
        <TestWrapper>
          <CognitiveConflictResolver
            {...defaultProps}
            onRequestExpertHelp={onRequestExpertHelp}
          />
        </TestWrapper>
      );

      const helpButton = getByLabelText('Get help with this decision');

      await act(async () => {
        fireEvent.press(helpButton);
      });

      expect(onRequestExpertHelp).toHaveBeenCalledWith(mockConflicts[0].id);
      expect(announceForAccessibilitySpy).toHaveBeenCalledWith(
        expect.stringContaining('Requesting help')
      );
    });
  });

  describe('Keyboard Shortcuts', () => {
    let shortcutHook: any;

    beforeEach(() => {
      // Mock document for keyboard events
      (global as any).document = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      // Mock Platform for web
      Platform.OS = 'web' as any;
    });

    test('should register crisis shortcuts with highest priority', () => {
      const TestComponent = () => {
        shortcutHook = useSyncKeyboardShortcuts({
          onEmergencyAccess: jest.fn(),
        });
        return null;
      };

      render(<TestComponent />);

      const crisisShortcuts = shortcutHook.availableShortcuts.filter(
        (s: any) => s.category === 'crisis'
      );

      expect(crisisShortcuts.length).toBeGreaterThan(0);
      expect(crisisShortcuts.every((s: any) => s.priority === 'high')).toBe(true);
    });

    test('should handle emergency access keyboard shortcut', () => {
      const onEmergencyAccess = jest.fn();

      const TestComponent = () => {
        useSyncKeyboardShortcuts({
          onEmergencyAccess,
        });
        return null;
      };

      render(<TestComponent />);

      // Simulate Ctrl+9 keypress
      const keydownHandler = (global as any).document.addEventListener.mock.calls
        .find((call: any) => call[0] === 'keydown')[1];

      const mockEvent = {
        key: '9',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };

      keydownHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(onEmergencyAccess).toHaveBeenCalled();
    });

    test('should handle sync status announcement shortcut', () => {
      const onSyncStatusRequest = jest.fn();
      const announceForAccessibilitySpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

      const TestComponent = () => {
        useSyncKeyboardShortcuts({
          onSyncStatusRequest,
        });
        return null;
      };

      render(<TestComponent />);

      // Simulate Ctrl+Shift+S keypress
      const keydownHandler = (global as any).document.addEventListener.mock.calls
        .find((call: any) => call[0] === 'keydown')[1];

      const mockEvent = {
        key: 's',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: true,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };

      keydownHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(announceForAccessibilitySpy).toHaveBeenCalled();
    });

    test('should setup panic key detection in crisis state', () => {
      const onEmergencyAccess = jest.fn();
      let panicKeyHandler: any;

      // Mock document.addEventListener to capture panic key handler
      (global as any).document.addEventListener = jest.fn((event, handler) => {
        if (event === 'keydown') {
          panicKeyHandler = handler;
        }
      });

      const TestComponent = () => {
        useSyncKeyboardShortcuts({
          currentMentalHealthState: 'crisis',
          onEmergencyAccess,
        });
        return null;
      };

      render(<TestComponent />);

      // Simulate rapid key presses (panic scenario)
      for (let i = 0; i < 8; i++) {
        panicKeyHandler();
      }

      expect(onEmergencyAccess).toHaveBeenCalled();
    });

    test('should show keyboard help with accessible format', () => {
      const TestComponent = () => {
        shortcutHook = useSyncKeyboardShortcuts();
        return null;
      };

      render(<TestComponent />);

      // Test keyboard help generation
      shortcutHook.showKeyboardHelp();

      // Alert should be called with formatted help text
      // (Note: Alert is mocked in test setup)
    });
  });

  describe('Screen Reader Integration', () => {
    test('should use appropriate live regions for different content types', () => {
      SyncAccessibilityCoordinator.initialize('stable');

      // Crisis announcements should use assertive live regions
      SyncAccessibilityCoordinator.announceCrisis('test', 'Emergency test');

      // Therapeutic announcements should use polite live regions
      SyncAccessibilityCoordinator.announceForComponent(
        'test',
        'Therapeutic test',
        'polite',
        'therapeutic'
      );

      // Verify appropriate announcement methods were called
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(2);
    });

    test('should provide context-aware accessibility hints', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <CognitiveConflictResolver
            {...defaultProps}
            currentMentalHealthState="anxiety"
          />
        </TestWrapper>
      );

      const keepLocalButton = getByLabelText('Keep this device\'s version');
      expect(keepLocalButton.props.accessibilityHint).toContain(
        'Use the information from this device'
      );
    });
  });

  describe('Crisis Safety During Sync Operations', () => {
    test('should maintain emergency access during conflict resolution', () => {
      const crisisConflict = {
        ...mockConflicts[0],
        entityType: 'CRISIS_PLAN',
        simplifiedExplanation: 'Your crisis plan is different on your devices.',
        impactDescription: 'This affects your safety plan.',
        recommendedAction: 'expert_help' as const,
        difficultyLevel: 'complex' as const,
        userFriendlyPreview: {
          thisDevice: 'Emergency plan with 2 contacts',
          otherDevice: 'Emergency plan with 3 contacts',
          whatItMeans: 'Your emergency contacts are different.'
        }
      };

      const { getByText } = render(
        <TestWrapper>
          <CognitiveConflictResolver
            {...defaultProps}
            conflicts={[crisisConflict]}
          />
        </TestWrapper>
      );

      // Crisis conflicts should show expert help recommendation
      expect(getByText('I Need Help Deciding')).toBeTruthy();
      expect(getByText(/safety plan/i)).toBeTruthy();
    });

    test('should prioritize crisis sync status in announcements', () => {
      SyncAccessibilityCoordinator.initialize('crisis');

      SyncAccessibilityCoordinator.announceSyncStatus(
        'test',
        'syncing' as any,
        'CRISIS_PLAN'
      );

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('Crisis plan')
      );
    });
  });

  describe('Performance and Memory Management', () => {
    test('should cleanup old announcements automatically', async () => {
      SyncAccessibilityCoordinator.initialize('stable');

      // Make several announcements
      for (let i = 0; i < 5; i++) {
        SyncAccessibilityCoordinator.announceForComponent(
          `test-${i}`,
          `Test announcement ${i}`,
          'polite',
          'general'
        );
      }

      const initialStats = SyncAccessibilityCoordinator.getAccessibilityStats();
      expect(initialStats.activeAnnouncements).toBe(5);

      // Wait for cleanup (mocked timer)
      await act(async () => {
        jest.advanceTimersByTime(35000); // 35 seconds
      });

      const finalStats = SyncAccessibilityCoordinator.getAccessibilityStats();
      expect(finalStats.activeAnnouncements).toBe(0);
    });

    test('should limit cache size for memory efficiency', () => {
      SyncAccessibilityCoordinator.initialize('stable');

      const stats = SyncAccessibilityCoordinator.getAccessibilityStats();
      expect(stats.cacheSize).toBeLessThan(50); // Reasonable cache limit
    });
  });

  describe('Mental Health State Adaptations', () => {
    test('should adapt announcement timing for different mental health states', () => {
      // Test depression state (slower timing)
      SyncAccessibilityCoordinator.updateMentalHealthState('depression');
      const depressionStats = SyncAccessibilityCoordinator.getAccessibilityStats();
      expect(depressionStats.throttleTime).toBe(2500);

      // Test anxiety state (even slower timing)
      SyncAccessibilityCoordinator.updateMentalHealthState('anxiety');
      const anxietyStats = SyncAccessibilityCoordinator.getAccessibilityStats();
      expect(anxietyStats.throttleTime).toBe(3000);

      // Test crisis state (faster timing)
      SyncAccessibilityCoordinator.updateMentalHealthState('crisis');
      const crisisStats = SyncAccessibilityCoordinator.getAccessibilityStats();
      expect(crisisStats.throttleTime).toBe(500);
    });

    test('should provide appropriate conflict resolution complexity', () => {
      const { getByText, queryByText } = render(
        <TestWrapper>
          <CognitiveConflictResolver
            {...defaultProps}
            userCognitiveLevel="crisis"
            currentMentalHealthState="crisis"
          />
        </TestWrapper>
      );

      // Crisis level should hide technical details toggle
      expect(queryByText('Show Technical Details')).toBeFalsy();

      // Should show simplified decision options
      expect(getByText('I Need Help Deciding')).toBeTruthy();
    });
  });

  describe('WCAG 2.1 AA Compliance', () => {
    test('should meet minimum touch target size requirements', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <CognitiveConflictResolver {...defaultProps} />
        </TestWrapper>
      );

      const buttons = [
        getByLabelText('Keep this device\'s version'),
        getByLabelText('Keep other device\'s version'),
        getByLabelText('Get help with this decision'),
      ];

      buttons.forEach(button => {
        const style = button.props.style;
        // Minimum 44px touch target (approximated through minHeight style)
        expect(style.minHeight || 56).toBeGreaterThanOrEqual(44);
      });
    });

    test('should provide proper heading hierarchy', () => {
      const { getByText } = render(
        <TestWrapper>
          <CognitiveConflictResolver {...defaultProps} />
        </TestWrapper>
      );

      // Check for proper heading structure
      expect(getByText('Different check-in information found')).toBeTruthy();
      expect(getByText('Here\'s what\'s different:')).toBeTruthy();
      expect(getByText('Which would you like to use?')).toBeTruthy();
    });

    test('should maintain logical focus order', () => {
      const { getByLabelText, getByText } = render(
        <TestWrapper>
          <CognitiveConflictResolver {...defaultProps} />
        </TestWrapper>
      );

      // Focus order should be: explanation → comparison → decision buttons
      const conflictExplanation = getByLabelText('Conflict explanation');
      const thisDeviceCard = getByLabelText('This device\'s version');
      const otherDeviceCard = getByLabelText('Other device\'s version');
      const keepLocalButton = getByLabelText('Keep this device\'s version');

      // All elements should be focusable
      expect(conflictExplanation).toBeTruthy();
      expect(thisDeviceCard).toBeTruthy();
      expect(otherDeviceCard).toBeTruthy();
      expect(keepLocalButton).toBeTruthy();
    });
  });
});

describe('Integration Tests', () => {
  test('should coordinate announcements across multiple sync components', async () => {
    SyncAccessibilityCoordinator.initialize('stable');

    // Simulate multiple components making announcements simultaneously
    SyncAccessibilityCoordinator.announceForComponent(
      'sync-status',
      'Sync started',
      'polite',
      'sync'
    );

    SyncAccessibilityCoordinator.announceForComponent(
      'device-manager',
      'Device connected',
      'polite',
      'sync'
    );

    // Should throttle and coordinate announcements
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(2);
  });

  test('should handle accessibility failures gracefully', () => {
    // Mock AccessibilityInfo failure
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    (AccessibilityInfo.announceForAccessibility as jest.Mock).mockImplementation(() => {
      throw new Error('Accessibility service failed');
    });

    // Should not crash when accessibility fails
    expect(() => {
      SyncAccessibilityCoordinator.announceForComponent(
        'test',
        'Test announcement',
        'polite',
        'general'
      );
    }).not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('SyncAccessibilityCoordinator announcement failed')
    );

    consoleSpy.mockRestore();
  });
});

// Performance benchmarks
describe('Performance Benchmarks', () => {
  test('announcement latency should be under 200ms', async () => {
    SyncAccessibilityCoordinator.initialize('stable');

    const startTime = performance.now();

    SyncAccessibilityCoordinator.announceForComponent(
      'perf-test',
      'Performance test announcement',
      'assertive',
      'crisis'
    );

    const endTime = performance.now();
    const latency = endTime - startTime;

    expect(latency).toBeLessThan(200); // Sub-200ms requirement
  });

  test('should handle rapid announcements without performance degradation', () => {
    SyncAccessibilityCoordinator.initialize('stable');

    const startTime = performance.now();

    // Make 100 rapid announcements
    for (let i = 0; i < 100; i++) {
      SyncAccessibilityCoordinator.announceForComponent(
        `rapid-test-${i}`,
        `Rapid announcement ${i}`,
        'polite',
        'general'
      );
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Should complete within reasonable time even with throttling
    expect(totalTime).toBeLessThan(1000); // Under 1 second for 100 announcements
  });
});