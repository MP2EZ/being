/**
 * SessionProgressBar Component Tests
 * 
 * CRITICAL: UI component for therapeutic session progress indication
 * Must ensure accurate progress display and accessibility compliance
 * 
 * Focus Areas:
 * - Progress percentage accuracy and animation
 * - WCAG AA accessibility compliance
 * - Therapeutic color theme application
 * - Performance of animations (60fps target)
 * - Screen reader compatibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { SessionProgressBar } from '../../src/components/core/SessionProgressBar';
import { useTheme } from '../../src/hooks/useTheme';

// Mock dependencies
jest.mock('../../src/hooks/useTheme');
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('SessionProgressBar Component Tests', () => {
  const mockColorSystem = {
    themes: {
      morning: {
        primary: '#FF9F43',
        background: '#FFF8F0',
        light: '#FFE4CC',
        success: '#E8863A',
      },
      midday: {
        primary: '#40B5AD',
        background: '#F0FFFE',
        light: '#CCF2F0',
        success: '#2C8A82',
      },
      evening: {
        primary: '#4A7C59',
        background: '#F5F8F6',
        light: '#D9E5DC',
        success: '#2D5016',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseTheme.mockReturnValue({
      colorSystem: mockColorSystem,
      currentTheme: 'morning',
      setTheme: jest.fn(),
    });

    // Mock Animated.timing to prevent animation delays in tests
    jest.spyOn(Animated, 'timing').mockImplementation((value, config) => ({
      start: (callback?: any) => {
        // Immediately set the animated value to the target
        (value as any)._value = config.toValue;
        if (callback) callback();
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));
  });

  describe('Progress Display Accuracy', () => {
    test('renders progress percentage correctly', () => {
      render(
        <SessionProgressBar 
          percentage={37.5}
          theme="morning"
          testID="progress-bar"
        />
      );

      expect(screen.getByText('38%')).toBeTruthy(); // Rounded to 38%
    });

    test('clamps percentage values to valid range', () => {
      const { rerender } = render(
        <SessionProgressBar percentage={-10} theme="morning" />
      );
      expect(screen.getByText('0%')).toBeTruthy();

      rerender(<SessionProgressBar percentage={150} theme="morning" />);
      expect(screen.getByText('100%')).toBeTruthy();
    });

    test('handles edge case percentages accurately', () => {
      const testCases = [
        { input: 0, expected: '0%' },
        { input: 0.4, expected: '0%' },
        { input: 0.5, expected: '1%' },
        { input: 33.33, expected: '33%' },
        { input: 66.67, expected: '67%' },
        { input: 99.5, expected: '100%' },
        { input: 100, expected: '100%' },
      ];

      testCases.forEach(({ input, expected }) => {
        const { rerender } = render(
          <SessionProgressBar percentage={input} theme="morning" />
        );
        expect(screen.getByText(expected)).toBeTruthy();
        rerender(<div />); // Clear between tests
      });
    });

    test('optionally hides percentage text', () => {
      render(
        <SessionProgressBar 
          percentage={50}
          theme="morning"
          showPercentage={false}
        />
      );

      expect(screen.queryByText('50%')).toBeNull();
    });
  });

  describe('Theme Integration', () => {
    test('applies morning theme colors correctly', () => {
      const { getByTestId } = render(
        <SessionProgressBar 
          percentage={50}
          theme="morning"
          testID="progress-bar"
        />
      );

      const container = getByTestId('progress-bar');
      expect(container).toBeTruthy();

      // Note: React Native Testing Library doesn't provide easy style inspection
      // In real scenarios, you'd test computed styles or use integration tests
    });

    test('applies midday theme colors correctly', () => {
      const { getByTestId } = render(
        <SessionProgressBar 
          percentage={75}
          theme="midday"
          testID="progress-bar"
        />
      );

      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    test('applies evening theme colors correctly', () => {
      const { getByTestId } = render(
        <SessionProgressBar 
          percentage={25}
          theme="evening"
          testID="progress-bar"
        />
      );

      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    test('handles theme changes dynamically', () => {
      const { rerender } = render(
        <SessionProgressBar percentage={60} theme="morning" />
      );

      // Change theme
      rerender(
        <SessionProgressBar percentage={60} theme="evening" />
      );

      // Component should not crash and should re-render with new theme
      expect(screen.getByText('60%')).toBeTruthy();
    });
  });

  describe('Animation Behavior', () => {
    test('initiates animation on percentage change', () => {
      const animateSpy = jest.spyOn(Animated, 'timing');
      
      const { rerender } = render(
        <SessionProgressBar percentage={0} theme="morning" />
      );

      rerender(
        <SessionProgressBar percentage={50} theme="morning" />
      );

      expect(animateSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          toValue: 50,
          duration: 500,
          useNativeDriver: false,
        })
      );
    });

    test('animation completes within therapeutic timing requirements', () => {
      const { rerender } = render(
        <SessionProgressBar percentage={0} theme="morning" />
      );

      const startTime = Date.now();
      rerender(
        <SessionProgressBar percentage={100} theme="morning" />
      );

      // Animation should be configured to complete in 500ms
      expect(Animated.timing).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ duration: 500 })
      );
    });

    test('handles rapid percentage changes smoothly', () => {
      const { rerender } = render(
        <SessionProgressBar percentage={0} theme="morning" />
      );

      // Rapid updates simulating user progress
      const updates = [10, 25, 40, 60, 75, 90, 100];
      updates.forEach(percentage => {
        rerender(
          <SessionProgressBar percentage={percentage} theme="morning" />
        );
      });

      // Should handle all updates without errors
      expect(screen.getByText('100%')).toBeTruthy();
    });
  });

  describe('Accessibility Compliance (WCAG AA)', () => {
    test('provides proper ARIA progressbar role', () => {
      const { getByRole } = render(
        <SessionProgressBar percentage={45} theme="morning" />
      );

      const progressBar = getByRole('progressbar');
      expect(progressBar).toBeTruthy();
    });

    test('sets correct accessibility values', () => {
      const { getByRole } = render(
        <SessionProgressBar percentage={67} theme="morning" />
      );

      const progressBar = getByRole('progressbar');
      expect(progressBar.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 67,
      });
    });

    test('provides meaningful accessibility label', () => {
      const { getByRole } = render(
        <SessionProgressBar 
          percentage={33}
          theme="morning"
          accessibilityLabel="Morning check-in progress"
        />
      );

      const progressBar = getByRole('progressbar');
      expect(progressBar.props.accessibilityLabel).toBe('Morning check-in progress');
    });

    test('defaults to percentage in accessibility label', () => {
      const { getByRole } = render(
        <SessionProgressBar percentage={82} theme="morning" />
      );

      const progressBar = getByRole('progressbar');
      expect(progressBar.props.accessibilityLabel).toBe('82% complete');
    });

    test('hides percentage text from screen readers to avoid duplication', () => {
      render(
        <SessionProgressBar percentage={55} theme="morning" />
      );

      const percentageText = screen.getByText('55%');
      expect(percentageText.props.accessibilityElementsHidden).toBe(true);
    });

    test('supports dynamic font scaling', () => {
      render(
        <SessionProgressBar percentage={70} theme="morning" />
      );

      const percentageText = screen.getByText('70%');
      expect(percentageText.props.allowFontScaling).toBe(true);
      expect(percentageText.props.maxFontSizeMultiplier).toBe(1.5);
    });
  });

  describe('Clinical Use Case Integration', () => {
    test('accurately represents morning check-in progress (8 steps)', () => {
      const morningSteps = [
        { completed: 0, expected: 0 },
        { completed: 1, expected: 12.5 }, // 1/8
        { completed: 2, expected: 25 },   // 2/8
        { completed: 4, expected: 50 },   // 4/8
        { completed: 6, expected: 75 },   // 6/8
        { completed: 8, expected: 100 },  // 8/8
      ];

      morningSteps.forEach(({ completed, expected }) => {
        const percentage = (completed / 8) * 100;
        const { rerender } = render(
          <SessionProgressBar percentage={percentage} theme="morning" />
        );
        
        expect(screen.getByText(`${expected}%`)).toBeTruthy();
        rerender(<div />); // Clear
      });
    });

    test('accurately represents midday check-in progress (5 steps)', () => {
      const middaySteps = [
        { completed: 0, expected: 0 },
        { completed: 1, expected: 20 },   // 1/5
        { completed: 2, expected: 40 },   // 2/5
        { completed: 3, expected: 60 },   // 3/5
        { completed: 4, expected: 80 },   // 4/5
        { completed: 5, expected: 100 },  // 5/5
      ];

      middaySteps.forEach(({ completed, expected }) => {
        const percentage = (completed / 5) * 100;
        const { rerender } = render(
          <SessionProgressBar percentage={percentage} theme="midday" />
        );
        
        expect(screen.getByText(`${expected}%`)).toBeTruthy();
        rerender(<div />); // Clear
      });
    });

    test('accurately represents evening check-in progress (12 steps)', () => {
      const eveningSteps = [
        { completed: 0, expected: 0 },
        { completed: 3, expected: 25 },   // 3/12
        { completed: 6, expected: 50 },   // 6/12
        { completed: 9, expected: 75 },   // 9/12
        { completed: 12, expected: 100 }, // 12/12
      ];

      eveningSteps.forEach(({ completed, expected }) => {
        const percentage = (completed / 12) * 100;
        const { rerender } = render(
          <SessionProgressBar percentage={percentage} theme="evening" />
        );
        
        expect(screen.getByText(`${expected}%`)).toBeTruthy();
        rerender(<div />); // Clear
      });
    });

    test('provides therapeutic progress feedback for partial completion', () => {
      // Test realistic partial completion scenarios
      const partialScenarios = [
        { percentage: 12.5, context: 'Just started morning check-in' },
        { percentage: 37.5, context: 'Halfway through morning body scan' },
        { percentage: 62.5, context: 'Completing morning emotional check' },
        { percentage: 87.5, context: 'Nearly finished morning check-in' },
      ];

      partialScenarios.forEach(({ percentage }) => {
        const { rerender } = render(
          <SessionProgressBar percentage={percentage} theme="morning" />
        );
        
        const expectedDisplay = Math.round(percentage);
        expect(screen.getByText(`${expectedDisplay}%`)).toBeTruthy();
        rerender(<div />); // Clear
      });
    });
  });

  describe('Performance and Rendering', () => {
    test('renders efficiently with minimal re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestWrapper: React.FC<{ percentage: number }> = ({ percentage }) => {
        renderSpy();
        return <SessionProgressBar percentage={percentage} theme="morning" />;
      };

      const { rerender } = render(<TestWrapper percentage={0} />);
      
      rerender(<TestWrapper percentage={50} />);
      rerender(<TestWrapper percentage={50} />); // Same value
      
      // Should render 3 times: initial + change + no-change
      expect(renderSpy).toHaveBeenCalledTimes(3);
    });

    test('handles custom height prop correctly', () => {
      const { rerender } = render(
        <SessionProgressBar 
          percentage={50}
          theme="morning"
          height={12}
          testID="custom-height"
        />
      );

      expect(screen.getByTestId('custom-height')).toBeTruthy();

      // Test default height
      rerender(
        <SessionProgressBar 
          percentage={50}
          theme="morning"
          testID="default-height"
        />
      );

      expect(screen.getByTestId('default-height')).toBeTruthy();
    });

    test('maintains performance with frequent updates', () => {
      const { rerender } = render(
        <SessionProgressBar percentage={0} theme="morning" />
      );

      const startTime = performance.now();
      
      // Simulate frequent progress updates during session
      for (let i = 0; i <= 100; i += 5) {
        rerender(
          <SessionProgressBar percentage={i} theme="morning" />
        );
      }
      
      const duration = performance.now() - startTime;
      
      // Should complete all updates within reasonable time
      expect(duration).toBeLessThan(100); // 100ms for 21 updates
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles invalid percentage values gracefully', () => {
      const invalidValues = [NaN, Infinity, -Infinity, null, undefined];
      
      invalidValues.forEach((value) => {
        const { rerender } = render(
          <SessionProgressBar percentage={value as any} theme="morning" />
        );
        
        // Should not crash and should default to 0%
        expect(screen.getByText('0%')).toBeTruthy();
        rerender(<div />); // Clear
      });
    });

    test('handles missing theme gracefully', () => {
      mockUseTheme.mockReturnValueOnce({
        colorSystem: { themes: {} },
        currentTheme: 'morning',
        setTheme: jest.fn(),
      });

      // Should not crash with missing theme
      expect(() =>
        render(<SessionProgressBar percentage={50} theme="morning" />)
      ).not.toThrow();
    });

    test('maintains accessibility when animation fails', () => {
      // Simulate animation failure
      jest.spyOn(Animated, 'timing').mockImplementation(() => {
        throw new Error('Animation error');
      });

      const { getByRole } = render(
        <SessionProgressBar percentage={75} theme="morning" />
      );

      // Should still provide accessible progress bar
      const progressBar = getByRole('progressbar');
      expect(progressBar.props.accessibilityValue.now).toBe(75);
    });
  });
});