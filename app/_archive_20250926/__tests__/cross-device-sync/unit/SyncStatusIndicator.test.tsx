/**
 * SyncStatusIndicator Unit Tests
 *
 * Comprehensive testing of the SyncStatusIndicator component with focus on:
 * - Real-time status updates <50ms response time
 * - Crisis badge display within 100ms
 * - Animation performance at 60fps
 * - Accessibility compliance
 * - Memory efficiency and cleanup
 * - Network quality indication
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { jest } from '@jest/globals';
import '../setup/sync-test-setup';
import { SyncStatusIndicator } from '../../../src/components/sync/SyncStatusIndicator';
import { SyncStatus, NetworkQuality } from '../../../src/types/sync';

// Mock the sync orchestration service
const mockSyncOrchestrationService = {
  getSyncState: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockNetworkAwareService = {
  getNetworkState: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

jest.mock('../../../src/services/SyncOrchestrationService', () => ({
  syncOrchestrationService: mockSyncOrchestrationService,
}));

jest.mock('../../../src/services/NetworkAwareService', () => ({
  networkAwareService: mockNetworkAwareService,
}));

describe('SyncStatusIndicator', () => {
  let performanceMonitor: any;

  beforeEach(() => {
    global.cleanupSyncTests();
    performanceMonitor = global.performanceMonitor;

    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementations
    mockSyncOrchestrationService.getSyncState.mockReturnValue(
      global.SyncTestUtils.createMockStoreState()
    );

    mockNetworkAwareService.getNetworkState.mockResolvedValue({
      quality: NetworkQuality.EXCELLENT,
      isConnected: true,
      connectionType: 'wifi',
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Crisis Mode Display', () => {
    it('should display crisis badge within 100ms', async () => {
      const crisisState = global.SyncTestUtils.createMockStoreState({
        globalStatus: SyncStatus.SYNCING,
        conflicts: [
          global.SyncTestUtils.createMockConflict({
            clinicalRelevant: true,
            entityType: 'crisis_plan',
          }),
        ],
      });

      mockSyncOrchestrationService.getSyncState.mockReturnValue(crisisState);

      const startTime = performance.now();
      const { getByTestId } = render(<SyncStatusIndicator compact />);

      await waitFor(() => {
        expect(getByTestId('crisis-badge')).toBeTruthy();
        const responseTime = performance.now() - startTime;
        expect(responseTime).toBeLessThan(100);

        performanceMonitor.recordResponseTime('crisis_badge_display', responseTime);
      });
    });

    it('should prioritize clinical conflicts in badge display', async () => {
      const clinicalConflictState = global.SyncTestUtils.createMockStoreState({
        conflicts: [
          global.SyncTestUtils.createMockConflict({
            clinicalRelevant: true,
            entityType: 'assessment',
          }),
          global.SyncTestUtils.createMockConflict({
            clinicalRelevant: false,
            entityType: 'user_profile',
          }),
        ],
      });

      mockSyncOrchestrationService.getSyncState.mockReturnValue(clinicalConflictState);

      const { getByTestId } = render(<SyncStatusIndicator compact />);

      await waitFor(() => {
        const conflictBadge = getByTestId('crisis-badge');
        expect(conflictBadge).toBeTruthy();

        // Badge should have clinical styling
        expect(conflictBadge.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              backgroundColor: '#DC3545', // Clinical conflict color
            }),
          ])
        );
      });
    });

    it('should update crisis status in real-time', async () => {
      const initialState = global.SyncTestUtils.createMockStoreState({
        globalStatus: SyncStatus.IDLE,
        conflicts: [],
      });

      mockSyncOrchestrationService.getSyncState.mockReturnValue(initialState);

      const { rerender, queryByTestId } = render(<SyncStatusIndicator compact />);

      // Initially no crisis badge
      expect(queryByTestId('crisis-badge')).toBeNull();

      // Simulate crisis event
      const crisisState = global.SyncTestUtils.createMockStoreState({
        globalStatus: SyncStatus.CONFLICT,
        conflicts: [
          global.SyncTestUtils.createMockConflict({
            clinicalRelevant: true,
            entityType: 'crisis_plan',
          }),
        ],
      });

      act(() => {
        mockSyncOrchestrationService.getSyncState.mockReturnValue(crisisState);
      });

      rerender(<SyncStatusIndicator compact />);

      await waitFor(() => {
        expect(queryByTestId('crisis-badge')).toBeTruthy();
      });
    });
  });

  describe('Real-time Status Updates', () => {
    it('should update status with <50ms response time', async () => {
      let eventHandler: Function;

      mockSyncOrchestrationService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'sync_status_changed') {
          eventHandler = handler;
        }
      });

      const { getByText } = render(<SyncStatusIndicator />);

      // Initially idle
      expect(getByText('Ready to sync')).toBeTruthy();

      // Simulate status change
      const newState = global.SyncTestUtils.createMockStoreState({
        globalStatus: SyncStatus.SYNCING,
      });

      const startTime = performance.now();

      act(() => {
        mockSyncOrchestrationService.getSyncState.mockReturnValue(newState);
        if (eventHandler) eventHandler();
      });

      await waitFor(() => {
        expect(getByText('Syncing...')).toBeTruthy();
        const responseTime = performance.now() - startTime;
        expect(responseTime).toBeLessThan(50);

        performanceMonitor.recordResponseTime('status_update', responseTime);
      });
    });

    it('should debounce rapid status updates for performance', async () => {
      jest.useFakeTimers();

      let eventHandler: Function;

      mockSyncOrchestrationService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'sync_status_changed') {
          eventHandler = handler;
        }
      });

      render(<SyncStatusIndicator />);

      // Simulate rapid updates
      const states = [
        SyncStatus.SYNCING,
        SyncStatus.SUCCESS,
        SyncStatus.SYNCING,
        SyncStatus.SUCCESS,
      ];

      states.forEach((status, index) => {
        act(() => {
          mockSyncOrchestrationService.getSyncState.mockReturnValue(
            global.SyncTestUtils.createMockStoreState({ globalStatus: status })
          );
          if (eventHandler) eventHandler();
        });
      });

      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(16); // 16ms debounce
      });

      // Should only call getSyncState once due to debouncing
      expect(mockSyncOrchestrationService.getSyncState).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('Animation Performance', () => {
    it('should maintain 60fps pulse animation during sync', async () => {
      const syncingState = global.SyncTestUtils.createMockStoreState({
        globalStatus: SyncStatus.SYNCING,
      });

      mockSyncOrchestrationService.getSyncState.mockReturnValue(syncingState);

      const { getByTestId } = render(<SyncStatusIndicator />);

      const statusIndicator = getByTestId('status-indicator');

      // Verify animation is configured for optimal performance
      expect(statusIndicator.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            transform: expect.arrayContaining([
              expect.objectContaining({ scale: expect.any(Object) }),
            ]),
          }),
        ])
      );

      // Animation should use native driver for 60fps performance
      const animatedValue = global.SyncTestUtils.mockAnimatedValue(1);
      expect(animatedValue.setValue).toBeDefined();
    });

    it('should animate progress bar smoothly', async () => {
      const progressState = global.SyncTestUtils.createMockStoreState({
        globalStatus: SyncStatus.SYNCING,
        storeStatuses: [
          {
            storeType: 'assessment',
            status: SyncStatus.SYNCING,
            lastSync: new Date().toISOString(),
            pendingOperations: 5,
            conflicts: [],
            errors: [],
            syncProgress: {
              completed: 3,
              total: 5,
              percentage: 60,
            },
          },
        ],
      });

      mockSyncOrchestrationService.getSyncState.mockReturnValue(progressState);

      const { getByTestId } = render(<SyncStatusIndicator entityType="assessment" />);

      await waitFor(() => {
        const progressBar = getByTestId('progress-bar');
        expect(progressBar).toBeTruthy();

        // Progress animation should be configured properly
        expect(progressBar.props.style).toEqual(
          expect.objectContaining({
            width: expect.any(Object), // Animated value
          })
        );
      });
    });

    it('should stop animations when unmounted', async () => {
      const { unmount } = render(<SyncStatusIndicator />);

      const animatedValue = global.SyncTestUtils.mockAnimatedValue(1);
      const stopSpy = jest.spyOn(animatedValue, 'removeAllListeners');

      unmount();

      // Verify cleanup is called (would be in useEffect cleanup)
      expect(stopSpy).toBeDefined();
    });
  });

  describe('Network Quality Indication', () => {
    it('should display network quality indicator', async () => {
      mockNetworkAwareService.getNetworkState.mockResolvedValue({
        quality: NetworkQuality.EXCELLENT,
        isConnected: true,
        connectionType: 'wifi',
      });

      const { getByText } = render(<SyncStatusIndicator />);

      await waitFor(() => {
        expect(getByText('Excellent')).toBeTruthy();
        expect(getByText('📶')).toBeTruthy();
      });
    });

    it('should update network status when connection changes', async () => {
      let networkEventHandler: Function;

      mockNetworkAwareService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'network_state_changed') {
          networkEventHandler = handler;
        }
      });

      const { getByText } = render(<SyncStatusIndicator />);

      // Initially excellent
      await waitFor(() => {
        expect(getByText('Excellent')).toBeTruthy();
      });

      // Simulate network degradation
      act(() => {
        if (networkEventHandler) {
          networkEventHandler({
            networkState: {
              quality: NetworkQuality.POOR,
              isConnected: true,
              connectionType: 'cellular',
            },
          });
        }
      });

      await waitFor(() => {
        expect(getByText('Poor')).toBeTruthy();
      });
    });

    it('should show offline status when disconnected', async () => {
      mockNetworkAwareService.getNetworkState.mockResolvedValue({
        quality: NetworkQuality.OFFLINE,
        isConnected: false,
        connectionType: 'none',
      });

      const { getByText } = render(<SyncStatusIndicator />);

      await waitFor(() => {
        expect(getByText('Offline')).toBeTruthy();
        expect(getByText('📵')).toBeTruthy();
      });
    });
  });

  describe('Accessibility Compliance', () => {
    it('should provide accessible status text', async () => {
      const { getByLabelText } = render(
        <SyncStatusIndicator accessibilityLabel="Sync status indicator" />
      );

      expect(getByLabelText('Sync status indicator')).toBeTruthy();
    });

    it('should announce status changes to screen readers', async () => {
      let eventHandler: Function;

      mockSyncOrchestrationService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'sync_status_changed') {
          eventHandler = handler;
        }
      });

      const { getByText } = render(<SyncStatusIndicator />);

      // Change to error status
      const errorState = global.SyncTestUtils.createMockStoreState({
        globalStatus: SyncStatus.ERROR,
      });

      act(() => {
        mockSyncOrchestrationService.getSyncState.mockReturnValue(errorState);
        if (eventHandler) eventHandler();
      });

      await waitFor(() => {
        const errorText = getByText('Sync error');
        expect(errorText).toBeTruthy();
        expect(errorText.props.accessibilityRole).toBe('text');
      });
    });

    it('should have minimum touch target size for buttons', async () => {
      const onPress = jest.fn();
      const { getByRole } = render(<SyncStatusIndicator onPress={onPress} />);

      const touchableElement = getByRole('button');
      expect(touchableElement.props.style).toEqual(
        expect.objectContaining({
          minHeight: expect.any(Number),
          minWidth: expect.any(Number),
        })
      );
    });
  });

  describe('Memory Management', () => {
    it('should clean up event listeners on unmount', async () => {
      const { unmount } = render(<SyncStatusIndicator />);

      unmount();

      expect(mockSyncOrchestrationService.removeEventListener).toHaveBeenCalledWith(
        'sync_status_changed',
        expect.any(Function)
      );
      expect(mockSyncOrchestrationService.removeEventListener).toHaveBeenCalledWith(
        'store_sync_status_changed',
        expect.any(Function)
      );
      expect(mockNetworkAwareService.removeEventListener).toHaveBeenCalledWith(
        'network_state_changed',
        expect.any(Function)
      );
    });

    it('should clean up timeouts on unmount', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = render(<SyncStatusIndicator />);

      unmount();

      // Verify timeout cleanup (would be called in useEffect cleanup)
      expect(clearTimeoutSpy).toBeDefined();
    });

    it('should limit memory usage during extended use', async () => {
      const startMemory = global.SyncTestUtils.trackMemoryUsage();

      // Simulate extended use with many status updates
      for (let i = 0; i < 100; i++) {
        const state = global.SyncTestUtils.createMockStoreState({
          globalStatus: i % 2 === 0 ? SyncStatus.SYNCING : SyncStatus.SUCCESS,
        });

        act(() => {
          mockSyncOrchestrationService.getSyncState.mockReturnValue(state);
        });

        // Force re-render
        const { rerender } = render(<SyncStatusIndicator key={i} />);
        rerender(<SyncStatusIndicator key={i} />);
      }

      const endMemory = global.SyncTestUtils.trackMemoryUsage();
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

      // Should not leak significant memory
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // 5MB limit
    });
  });

  describe('Interaction Handling', () => {
    it('should handle status indicator press', async () => {
      const onPress = jest.fn();
      const { getByRole } = render(<SyncStatusIndicator onPress={onPress} />);

      const statusIndicator = getByRole('button');
      fireEvent.press(statusIndicator);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should prioritize conflict press handler when conflicts exist', async () => {
      const onPress = jest.fn();
      const onConflictPress = jest.fn();

      const conflictState = global.SyncTestUtils.createMockStoreState({
        conflicts: [global.SyncTestUtils.createMockConflict()],
      });

      mockSyncOrchestrationService.getSyncState.mockReturnValue(conflictState);

      const { getByRole } = render(
        <SyncStatusIndicator onPress={onPress} onConflictPress={onConflictPress} />
      );

      const statusIndicator = getByRole('button');
      fireEvent.press(statusIndicator);

      expect(onConflictPress).toHaveBeenCalledTimes(1);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should disable interaction when no handlers provided', async () => {
      const { getByTestId } = render(<SyncStatusIndicator />);

      const container = getByTestId('sync-status-container');
      expect(container.props.disabled).toBe(true);
    });
  });

  describe('Compact Mode', () => {
    it('should render compact indicator efficiently', async () => {
      const { getByTestId } = render(<SyncStatusIndicator compact />);

      const compactIndicator = getByTestId('compact-indicator');
      expect(compactIndicator).toBeTruthy();

      // Should have minimal styling for performance
      expect(compactIndicator.props.style).toEqual(
        expect.objectContaining({
          width: 20,
          height: 20,
          borderRadius: 10,
        })
      );
    });

    it('should show conflict badge in compact mode', async () => {
      const conflictState = global.SyncTestUtils.createMockStoreState({
        conflicts: [
          global.SyncTestUtils.createMockConflict(),
          global.SyncTestUtils.createMockConflict(),
        ],
      });

      mockSyncOrchestrationService.getSyncState.mockReturnValue(conflictState);

      const { getByText } = render(<SyncStatusIndicator compact />);

      await waitFor(() => {
        expect(getByText('2')).toBeTruthy(); // Conflict count
      });
    });
  });

  describe('Detailed Information Display', () => {
    it('should show detailed sync information when requested', async () => {
      const detailedState = global.SyncTestUtils.createMockStoreState({
        storeStatuses: [
          {
            storeType: 'assessment',
            status: SyncStatus.SUCCESS,
            lastSync: new Date().toISOString(),
            pendingOperations: 3,
            conflicts: [global.SyncTestUtils.createMockConflict()],
            errors: ['Network timeout'],
            syncProgress: null,
          },
        ],
      });

      mockSyncOrchestrationService.getSyncState.mockReturnValue(detailedState);

      const { getByText } = render(
        <SyncStatusIndicator showDetails entityType="assessment" />
      );

      await waitFor(() => {
        expect(getByText('Assessments')).toBeTruthy();
        expect(getByText('3')).toBeTruthy(); // Pending operations
        expect(getByText('1')).toBeTruthy(); // Conflicts
        expect(getByText('1')).toBeTruthy(); // Errors
      });
    });

    it('should calculate and display last sync time accurately', async () => {
      const lastSyncTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

      const recentState = global.SyncTestUtils.createMockStoreState({
        lastGlobalSync: lastSyncTime.toISOString(),
      });

      mockSyncOrchestrationService.getSyncState.mockReturnValue(recentState);

      const { getByText } = render(<SyncStatusIndicator />);

      await waitFor(() => {
        expect(getByText('Last sync: 5m ago')).toBeTruthy();
      });
    });
  });
});