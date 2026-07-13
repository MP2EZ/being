import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Configuration options for the timer practice hook
 */
interface UseTimerPracticeOptions {
  /** Duration of the practice in seconds */
  duration: number;
  /** Callback invoked when the timer completes */
  onComplete: () => void;
  /** Optional callback invoked on each timer tick with elapsed and remaining time in milliseconds */
  onTick?: (elapsedMs: number, remainingMs: number) => void;
}

/**
 * Return type for the timer practice hook
 */
interface UseTimerPracticeReturn {
  /** Whether the timer is currently active */
  isTimerActive: boolean;
  /** Elapsed time in milliseconds */
  elapsedTime: number;
  /** Update timer active state */
  setIsTimerActive: (active: boolean) => void;
  /** Handle timer tick events */
  handleTimerTick: (remainingMs: number) => void;
  /** Handle timer completion */
  handleTimerComplete: () => void;
}

/**
 * Custom hook for managing timer-based practice sessions
 *
 * Consolidates timer state management used across timer-based practice screens
 * (PracticeTimerScreen, ReflectionTimerScreen, BodyScanScreen).
 *
 * @param options - Configuration options for the timer
 * @returns Timer state and control methods
 *
 * @example
 * ```typescript
 * const {
 *   isTimerActive,
 *   elapsedTime,
 *   setIsTimerActive,
 *   handleTimerTick,
 *   handleTimerComplete,
 * } = useTimerPractice({
 *   duration: 180, // 3 minutes
 *   onComplete: markComplete,
 *   onTick: (elapsedMs, remainingMs) => {
 *     // Custom logic for BodyScanScreen area advancement
 *     const elapsedSeconds = Math.floor(elapsedMs / 1000);
 *     const targetAreaIndex = Math.min(
 *       Math.floor(elapsedSeconds / durationPerArea),
 *       areaCount - 1
 *     );
 *   },
 * });
 * ```
 */
export function useTimerPractice({
  duration,
  onComplete,
  onTick,
}: UseTimerPracticeOptions): UseTimerPracticeReturn {
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Hold the latest options in refs so the returned handlers can be
  // referentially stable without going stale. This is required for timer
  // correctness, not just perf: Timer's internal `startTimer` is memoized on
  // the identity of `onTick`/`onComplete`, and its lifecycle effect depends on
  // `startTimer` — an unstable handler would tear down and restart the interval
  // on every parent render. Screens pass inline `onComplete` (e.g.
  // `() => markComplete()`), so refs are what make the handlers stable.
  const durationRef = useRef(duration);
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    durationRef.current = duration;
    onTickRef.current = onTick;
    onCompleteRef.current = onComplete;
  });

  /**
   * Handle timer tick event
   * Calculates elapsed time from remaining time and invokes optional tick callback
   *
   * @param remainingMs - Remaining time in milliseconds
   */
  const handleTimerTick = useCallback((remainingMs: number): void => {
    const durationMs = durationRef.current * 1000;
    const elapsed = durationMs - remainingMs;

    setElapsedTime(elapsed);

    // Invoke optional tick callback for custom logic (e.g., BodyScan area advancement)
    onTickRef.current?.(elapsed, remainingMs);
  }, []);

  /**
   * Handle timer completion
   * Stops the timer and invokes the completion callback
   */
  const handleTimerComplete = useCallback((): void => {
    setIsTimerActive(false);
    onCompleteRef.current();
  }, []);

  return {
    isTimerActive,
    elapsedTime,
    setIsTimerActive,
    handleTimerTick,
    handleTimerComplete,
  };
}
