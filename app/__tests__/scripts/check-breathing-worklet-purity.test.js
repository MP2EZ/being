/**
 * Tests for the breathing-worklet purity guard (INFRA-306, Layer A).
 *
 * The whole point of this work item is that a control which cannot FAIL is not
 * a control. So the guard's detection logic is tested against fixtures that
 * reproduce the PERF-01/PERF-02 regression shape (commit ff591f3a), and against
 * the real current source, which must stay clean.
 *
 * Note the negative cases matter as much as the positive ones: BreathingCircle
 * legitimately calls `runOnJS` inside `withTiming` COMPLETION callbacks (once
 * per cycle leg) and legitimately calls `setInterval(..., 1000)` for the
 * hold-pattern countdown. A guard that flagged those would ban the very fix it
 * exists to protect, and would be loosened the first time it fired.
 */

const fs = require('fs');
const path = require('path');

const {
  analyzeSource,
  ANIMATION_PATH_FILES,
} = require('../../scripts/check-breathing-worklet-purity');

const APP_ROOT = path.resolve(__dirname, '../..');

describe('analyzeSource — per-frame JS hops (the PERF-02 regression shape)', () => {
  test('flags runOnJS inside a useAnimatedStyle body', () => {
    const src = `
      const animatedStyle = useAnimatedStyle(() => {
        'worklet';
        runOnJS(setPhase)('inhale');
        return { transform: [{ scale: scale.value }] };
      }, [scale]);
    `;
    const found = analyzeSource(src, 'SharedBreathingScreen.tsx');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/runOnJS/);
    expect(found[0]).toMatch(/useAnimatedStyle/);
  });

  test('flags runOnJS inside a useDerivedValue body', () => {
    const src = `
      const d = useDerivedValue(() => {
        'worklet';
        runOnJS(report)(scale.value);
        return scale.value;
      });
    `;
    expect(analyzeSource(src, 'SharedBreathingScreen.tsx')).toHaveLength(1);
  });

  test('flags runOnJS inside a useAnimatedReaction body', () => {
    const src = `
      useAnimatedReaction(
        () => scale.value,
        (curr) => {
          'worklet';
          runOnJS(handleCycleComplete)();
        }
      );
    `;
    expect(analyzeSource(src, 'SharedBreathingScreen.tsx')).toHaveLength(1);
  });

  test('flags a React state setter inside a worklet hook body', () => {
    const src = `
      const animatedStyle = useAnimatedStyle(() => {
        'worklet';
        setCycleCount(cycleCount + 1);
        return { opacity: opacity.value };
      });
    `;
    const found = analyzeSource(src, 'SharedBreathingScreen.tsx');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/state setter/i);
  });

  test('does NOT flag runOnJS in a withTiming completion callback (per-cycle, the correct pattern)', () => {
    const src = `
      const animatedStyle = useAnimatedStyle(() => {
        'worklet';
        return { transform: [{ scale: scale.value }] };
      }, [scale]);

      scale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 4000 }, (finished) => {
            'worklet';
            if (finished) { runOnJS(announcePhase)('out'); }
          }),
          withTiming(1, { duration: 4000 }, (finished) => {
            'worklet';
            if (finished) { runOnJS(handleCycleComplete)(); }
          })
        ),
        -1,
        false
      );
    `;
    expect(analyzeSource(src, 'SharedBreathingScreen.tsx')).toEqual([]);
  });

  test('does NOT flag a plain worklet body with no JS hop', () => {
    const src = `
      const animatedStyle = useAnimatedStyle(() => {
        'worklet';
        return { transform: [{ scale: scale.value }], opacity: opacity.value };
      }, [scale, opacity]);
    `;
    expect(analyzeSource(src, 'SharedBreathingScreen.tsx')).toEqual([]);
  });
});

/**
 * INFRA-309. `useFrameCallback` was missing from WORKLET_HOOKS, so the guard was
 * blind in the one hook a frame probe must use — it would have passed a per-frame
 * runOnJS in exactly the file INFRA-373 adds. These cases pin the hook into the
 * guarded set, and pin the boundary that keeps the guard usable: accumulating on
 * the UI thread and crossing once at window close is the intended design, and
 * must stay clean, or INFRA-373 ships with a skip-directive on day one.
 */
describe('analyzeSource — useFrameCallback (INFRA-309)', () => {
  test('flags runOnJS inside a useFrameCallback body', () => {
    const src = `
      useFrameCallback((frameInfo) => {
        'worklet';
        runOnJS(reportFrame)(frameInfo.timeSincePreviousFrame);
      });
    `;
    const found = analyzeSource(src, 'SharedBreathingScreen.tsx');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/runOnJS/);
    expect(found[0]).toMatch(/useFrameCallback/);
  });

  test('the remedy names shared-value accumulation, not a withTiming completion', () => {
    // A frame probe has no cycle leg to hang a completion callback on. Naming
    // the wrong remedy is how a guard earns a skip-directive instead of a fix.
    const src = `
      useFrameCallback(({ timeSincePreviousFrame }) => {
        'worklet';
        runOnJS(setDroppedRatio)(timeSincePreviousFrame);
      });
    `;
    const [runOnJsViolation] = analyzeSource(src, 'SharedBreathingScreen.tsx').filter((v) =>
      /runOnJS/.test(v)
    );
    expect(runOnJsViolation).toMatch(/shared values/i);
    expect(runOnJsViolation).toMatch(/window closes/i);
    expect(runOnJsViolation).not.toMatch(/withTiming/);
  });

  test('flags a React state setter inside a useFrameCallback body', () => {
    const src = `
      useFrameCallback((frameInfo) => {
        'worklet';
        setFps(1000 / frameInfo.timeSincePreviousFrame);
      });
    `;
    const found = analyzeSource(src, 'SharedBreathingScreen.tsx');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/state setter/i);
  });

  test('does NOT flag accumulate-in-shared-values with a single cross at window close', () => {
    // This is INFRA-373's intended shape. The frame callback only mutates shared
    // values; the one runOnJS lives in the window-close effect, outside the
    // callback body. If this ever starts failing, the guard has become
    // unsatisfiable and the probe cannot be written without an escape hatch.
    const src = `
      useFrameCallback(({ timeSincePreviousFrame }) => {
        'worklet';
        if (timeSincePreviousFrame === null) return;
        frameCount.value += 1;
        minInterval.value = Math.min(minInterval.value, timeSincePreviousFrame);
      });

      useEffect(() => {
        return () => {
          runOnJS(onWindowClose)({
            frames: frameCount.value,
            minInterval: minInterval.value,
          });
        };
      }, []);
    `;
    expect(analyzeSource(src, 'SharedBreathingScreen.tsx')).toEqual([]);
  });
});

describe('analyzeSource — JS-thread frame sampling', () => {
  test('flags requestAnimationFrame on the animation path', () => {
    const src = `
      const tick = () => {
        requestAnimationFrame(tick);
      };
    `;
    const found = analyzeSource(src, 'SharedBreathingScreen.tsx');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/requestAnimationFrame/);
  });

  test('does NOT flag cancelAnimationFrame (teardown, not sampling)', () => {
    const src = `cancelAnimationFrame(this.animationFrameId);`;
    expect(analyzeSource(src, 'SharedBreathingScreen.tsx')).toEqual([]);
  });

  test('does NOT flag a 1s countdown setInterval (per-second, not per-frame)', () => {
    const src = `
      countdownIntervalRef.current = setInterval(() => {
        countdown.value = Math.max(0, countdown.value - 1);
      }, 1000);
    `;
    expect(analyzeSource(src, 'SharedBreathingScreen.tsx')).toEqual([]);
  });
});

describe('analyzeSource — memoization contract (BreathingCircle only)', () => {
  const memoized = `
    const DEFAULT_PATTERN = { inhale: 4000, exhale: 4000 };
    const DEFAULT_PHASE_TEXT = { inhale: 'Breathe in', hold: 'Hold', exhale: 'Breathe out' };
    export default React.memo(BreathingCircle);
  `;

  test('accepts the current shape', () => {
    expect(analyzeSource(memoized, 'BreathingCircle.tsx')).toEqual([]);
  });

  test('flags a bare default export (React.memo dropped)', () => {
    const src = `
      const DEFAULT_PATTERN = { inhale: 4000, exhale: 4000 };
      const DEFAULT_PHASE_TEXT = { inhale: 'Breathe in' };
      export default BreathingCircle;
    `;
    const found = analyzeSource(src, 'BreathingCircle.tsx');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/React\.memo/);
  });

  test('flags a missing module-scope DEFAULT_PATTERN constant', () => {
    const src = `
      const DEFAULT_PHASE_TEXT = { inhale: 'Breathe in' };
      export default React.memo(BreathingCircle);
    `;
    const found = analyzeSource(src, 'BreathingCircle.tsx');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/DEFAULT_PATTERN/);
  });

  test('flags a missing module-scope DEFAULT_PHASE_TEXT constant', () => {
    const src = `
      const DEFAULT_PATTERN = { inhale: 4000, exhale: 4000 };
      export default React.memo(BreathingCircle);
    `;
    const found = analyzeSource(src, 'BreathingCircle.tsx');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/DEFAULT_PHASE_TEXT/);
  });

  test('memoization rules do not apply to other animation-path files', () => {
    const src = `export default SharedBreathingScreen;`;
    expect(analyzeSource(src, 'SharedBreathingScreen.tsx')).toEqual([]);
  });
});

describe('the real source is clean', () => {
  test.each(ANIMATION_PATH_FILES)('%s has no violations', (relPath) => {
    const abs = path.join(APP_ROOT, relPath);
    expect(fs.existsSync(abs)).toBe(true);
    const src = fs.readFileSync(abs, 'utf-8');
    expect(analyzeSource(src, path.basename(relPath))).toEqual([]);
  });
});
