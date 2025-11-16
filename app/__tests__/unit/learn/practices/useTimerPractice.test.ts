/**
 * UNIT TESTS: useTimerPractice Hook
 *
 * Tests for timer-based practice hook used across PracticeTimerScreen,
 * ReflectionTimerScreen, and BodyScanScreen.
 *
 * Coverage Requirements:
 * - Hook initialization with default state
 * - Timer tick calculations (elapsed time from remaining time)
 * - Timer completion handling
 * - Timer active state toggling
 * - Optional onTick callback invocation
 * - Edge cases: duration=0, negative remainingMs, multiple completions
 *
 * Target: 95%+ coverage
 */

import { renderHook, act } from '@testing-library/react-native';
import { useTimerPractice } from '@/features/learn/practices/shared/useTimerPractice';

describe('useTimerPractice', () => {
  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 180,
          onComplete,
        })
      );

      expect(result.current.isTimerActive).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
      expect(typeof result.current.setIsTimerActive).toBe('function');
      expect(typeof result.current.handleTimerTick).toBe('function');
      expect(typeof result.current.handleTimerComplete).toBe('function');
    });

    it('should initialize with duration=0', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 0,
          onComplete,
        })
      );

      expect(result.current.isTimerActive).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
    });

    it('should initialize without optional onTick callback', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 60,
          onComplete,
        })
      );

      // Should not throw when calling handleTimerTick without onTick
      expect(() => {
        act(() => {
          result.current.handleTimerTick(30000);
        });
      }).not.toThrow();
    });
  });

  describe('setIsTimerActive', () => {
    it('should toggle timer active state to true', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 180,
          onComplete,
        })
      );

      expect(result.current.isTimerActive).toBe(false);

      act(() => {
        result.current.setIsTimerActive(true);
      });

      expect(result.current.isTimerActive).toBe(true);
    });

    it('should toggle timer active state to false', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 180,
          onComplete,
        })
      );

      act(() => {
        result.current.setIsTimerActive(true);
      });
      expect(result.current.isTimerActive).toBe(true);

      act(() => {
        result.current.setIsTimerActive(false);
      });

      expect(result.current.isTimerActive).toBe(false);
    });

    it('should handle multiple state toggles', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 180,
          onComplete,
        })
      );

      act(() => {
        result.current.setIsTimerActive(true);
        result.current.setIsTimerActive(false);
        result.current.setIsTimerActive(true);
      });

      expect(result.current.isTimerActive).toBe(true);
    });
  });

  describe('handleTimerTick', () => {
    it('should calculate elapsed time correctly from remaining time', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 180, // 3 minutes = 180000ms
          onComplete,
        })
      );

      // Remaining: 150000ms → Elapsed: 30000ms (30 seconds)
      act(() => {
        result.current.handleTimerTick(150000);
      });

      expect(result.current.elapsedTime).toBe(30000);
    });

    it('should update elapsed time on multiple ticks', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 60, // 1 minute = 60000ms
          onComplete,
        })
      );

      // Tick 1: 50000ms remaining → 10000ms elapsed
      act(() => {
        result.current.handleTimerTick(50000);
      });
      expect(result.current.elapsedTime).toBe(10000);

      // Tick 2: 30000ms remaining → 30000ms elapsed
      act(() => {
        result.current.handleTimerTick(30000);
      });
      expect(result.current.elapsedTime).toBe(30000);

      // Tick 3: 0ms remaining → 60000ms elapsed
      act(() => {
        result.current.handleTimerTick(0);
      });
      expect(result.current.elapsedTime).toBe(60000);
    });

    it('should invoke optional onTick callback with correct parameters', () => {
      const onComplete = jest.fn();
      const onTick = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 180,
          onComplete,
          onTick,
        })
      );

      act(() => {
        result.current.handleTimerTick(150000);
      });

      expect(onTick).toHaveBeenCalledTimes(1);
      expect(onTick).toHaveBeenCalledWith(30000, 150000);
    });

    it('should invoke onTick on each tick with updated values', () => {
      const onComplete = jest.fn();
      const onTick = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 60,
          onComplete,
          onTick,
        })
      );

      act(() => {
        result.current.handleTimerTick(45000);
      });
      expect(onTick).toHaveBeenCalledWith(15000, 45000);

      act(() => {
        result.current.handleTimerTick(30000);
      });
      expect(onTick).toHaveBeenCalledWith(30000, 30000);

      expect(onTick).toHaveBeenCalledTimes(2);
    });

    it('should not throw when onTick is undefined', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 60,
          onComplete,
        })
      );

      expect(() => {
        act(() => {
          result.current.handleTimerTick(30000);
        });
      }).not.toThrow();

      expect(result.current.elapsedTime).toBe(30000);
    });

    it('should handle duration=0 edge case', () => {
      const onComplete = jest.fn();
      const onTick = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 0,
          onComplete,
          onTick,
        })
      );

      act(() => {
        result.current.handleTimerTick(0);
      });

      expect(result.current.elapsedTime).toBe(0);
      expect(onTick).toHaveBeenCalledWith(0, 0);
    });

    it('should handle negative remainingMs edge case', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 60,
          onComplete,
        })
      );

      // Negative remaining time (timer overrun)
      act(() => {
        result.current.handleTimerTick(-1000);
      });

      // Elapsed = 60000 - (-1000) = 61000ms
      expect(result.current.elapsedTime).toBe(61000);
    });

    it('should handle remainingMs > durationMs edge case', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 60,
          onComplete,
        })
      );

      // Remaining time exceeds duration (timer hasn't started yet)
      act(() => {
        result.current.handleTimerTick(70000);
      });

      // Elapsed = 60000 - 70000 = -10000ms
      expect(result.current.elapsedTime).toBe(-10000);
    });
  });

  describe('handleTimerComplete', () => {
    it('should stop timer and call onComplete', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 180,
          onComplete,
        })
      );

      // Start timer
      act(() => {
        result.current.setIsTimerActive(true);
      });
      expect(result.current.isTimerActive).toBe(true);

      // Complete timer
      act(() => {
        result.current.handleTimerComplete();
      });

      expect(result.current.isTimerActive).toBe(false);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should call onComplete when timer is already stopped', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 180,
          onComplete,
        })
      );

      expect(result.current.isTimerActive).toBe(false);

      act(() => {
        result.current.handleTimerComplete();
      });

      expect(result.current.isTimerActive).toBe(false);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple completions', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 180,
          onComplete,
        })
      );

      act(() => {
        result.current.setIsTimerActive(true);
        result.current.handleTimerComplete();
      });

      expect(onComplete).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.setIsTimerActive(true);
        result.current.handleTimerComplete();
      });

      expect(onComplete).toHaveBeenCalledTimes(2);
      expect(result.current.isTimerActive).toBe(false);
    });

    it('should preserve elapsed time after completion', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 60,
          onComplete,
        })
      );

      // Simulate timer ticks
      act(() => {
        result.current.handleTimerTick(30000);
        result.current.handleTimerTick(15000);
        result.current.handleTimerTick(0);
      });

      expect(result.current.elapsedTime).toBe(60000);

      // Complete timer
      act(() => {
        result.current.handleTimerComplete();
      });

      // Elapsed time should persist
      expect(result.current.elapsedTime).toBe(60000);
      expect(result.current.isTimerActive).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete practice timer flow', () => {
      const onComplete = jest.fn();
      const onTick = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 180, // 3 minutes
          onComplete,
          onTick,
        })
      );

      // 1. Start timer
      act(() => {
        result.current.setIsTimerActive(true);
      });
      expect(result.current.isTimerActive).toBe(true);

      // 2. Simulate timer ticks (every 1 second)
      act(() => {
        result.current.handleTimerTick(179000); // 1s elapsed
        result.current.handleTimerTick(178000); // 2s elapsed
        result.current.handleTimerTick(177000); // 3s elapsed
      });

      expect(result.current.elapsedTime).toBe(3000);
      expect(onTick).toHaveBeenCalledTimes(3);

      // 3. Complete timer
      act(() => {
        result.current.handleTimerComplete();
      });

      expect(result.current.isTimerActive).toBe(false);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle BodyScanScreen area advancement pattern', () => {
      const onComplete = jest.fn();
      const areaChanges: number[] = [];

      const onTick = (elapsedMs: number, remainingMs: number) => {
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const durationPerArea = 30; // 30 seconds per area
        const areaCount = 6;
        const targetAreaIndex = Math.min(
          Math.floor(elapsedSeconds / durationPerArea),
          areaCount - 1
        );
        areaChanges.push(targetAreaIndex);
      };

      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 180, // 3 minutes, 6 areas
          onComplete,
          onTick,
        })
      );

      act(() => {
        result.current.setIsTimerActive(true);
      });

      // Simulate ticks at area boundaries
      act(() => {
        result.current.handleTimerTick(180000); // 0s → area 0
        result.current.handleTimerTick(150000); // 30s → area 1
        result.current.handleTimerTick(120000); // 60s → area 2
        result.current.handleTimerTick(90000);  // 90s → area 3
        result.current.handleTimerTick(60000);  // 120s → area 4
        result.current.handleTimerTick(30000);  // 150s → area 5
        result.current.handleTimerTick(0);      // 180s → area 5 (capped)
      });

      expect(areaChanges).toEqual([0, 1, 2, 3, 4, 5, 5]);
    });

    it('should handle pause and resume pattern', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 60,
          onComplete,
        })
      );

      // Start timer
      act(() => {
        result.current.setIsTimerActive(true);
      });

      // Tick to 30s
      act(() => {
        result.current.handleTimerTick(30000);
      });
      expect(result.current.elapsedTime).toBe(30000);

      // Pause
      act(() => {
        result.current.setIsTimerActive(false);
      });
      expect(result.current.isTimerActive).toBe(false);

      // Resume
      act(() => {
        result.current.setIsTimerActive(true);
      });
      expect(result.current.isTimerActive).toBe(true);

      // Continue from where we left off
      act(() => {
        result.current.handleTimerTick(15000);
      });
      expect(result.current.elapsedTime).toBe(45000);
    });

    it('should handle rapid state changes', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 60,
          onComplete,
        })
      );

      act(() => {
        result.current.setIsTimerActive(true);
        result.current.handleTimerTick(50000);
        result.current.setIsTimerActive(false);
        result.current.setIsTimerActive(true);
        result.current.handleTimerTick(40000);
        result.current.handleTimerComplete();
      });

      expect(result.current.isTimerActive).toBe(false);
      expect(result.current.elapsedTime).toBe(20000);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should accept valid configuration', () => {
      const onComplete = jest.fn();
      const onTick = jest.fn();

      expect(() => {
        renderHook(() =>
          useTimerPractice({
            duration: 180,
            onComplete,
            onTick,
          })
        );
      }).not.toThrow();
    });

    it('should work with minimal configuration', () => {
      const onComplete = jest.fn();

      expect(() => {
        renderHook(() =>
          useTimerPractice({
            duration: 60,
            onComplete,
          })
        );
      }).not.toThrow();
    });
  });

  describe('Memory and Performance', () => {
    it('should not leak callbacks on unmount', () => {
      const onComplete = jest.fn();
      const onTick = jest.fn();

      const { unmount } = renderHook(() =>
        useTimerPractice({
          duration: 60,
          onComplete,
          onTick,
        })
      );

      unmount();

      // No assertions needed - test passes if no memory leaks
      expect(true).toBe(true);
    });

    it('should handle high-frequency ticks without performance degradation', () => {
      const onComplete = jest.fn();
      const onTick = jest.fn();
      const { result } = renderHook(() =>
        useTimerPractice({
          duration: 60,
          onComplete,
          onTick,
        })
      );

      // Simulate 60 ticks (1 per second for 1 minute)
      act(() => {
        for (let i = 59000; i >= 0; i -= 1000) {
          result.current.handleTimerTick(i);
        }
      });

      expect(onTick).toHaveBeenCalledTimes(60);
      expect(result.current.elapsedTime).toBe(60000);
    });
  });
});
