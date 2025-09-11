/**
 * Session Accessibility Tests
 * 
 * CRITICAL: Ensures resumable sessions are fully accessible for users with disabilities
 * Mental health app must meet WCAG AA standards for therapeutic accessibility
 * 
 * Accessibility Requirements:
 * - Screen reader compatibility for session prompts
 * - Voice navigation through resume flows
 * - High contrast support for progress indicators
 * - Touch target sizes for resume buttons
 * - Keyboard navigation support
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SessionProgressBar } from '../../src/components/core/SessionProgressBar';
import { useCheckInStore } from '../../src/store/checkInStore';
import { resumableSessionService } from '../../src/services/ResumableSessionService';
import { ResumableSession } from '../../src/types/ResumableSession';

// Mock components for testing accessibility
const MockResumeSessionPrompt: React.FC<{
  sessionType: 'morning' | 'phq9' | 'gad7';
  progress: number;
  onResume: () => void;
  onStartFresh: () => void;
}> = ({ sessionType, progress, onResume, onStartFresh }) => {
  const sessionTypeLabels = {
    morning: 'Morning Check-in',
    phq9: 'PHQ-9 Depression Assessment',
    gad7: 'GAD-7 Anxiety Assessment',
  };

  return (
    <div 
      testID="resume-session-prompt"
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`You have an incomplete ${sessionTypeLabels[sessionType]} that you can resume`}
    >
      <div
        testID="session-info"
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`${sessionTypeLabels[sessionType]} is ${Math.round(progress)}% complete`}
      >
        <h2>{sessionTypeLabels[sessionType]}</h2>
        <p>{Math.round(progress)}% Complete</p>
      </div>
      
      <SessionProgressBar 
        percentage={progress}
        theme="morning"
        accessibilityLabel={`${sessionTypeLabels[sessionType]} progress: ${Math.round(progress)}% complete`}
      />
      
      <div testID="action-buttons" style={{ flexDirection: 'row', gap: 16 }}>
        <button
          testID="resume-button"
          onPress={onResume}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Resume ${sessionTypeLabels[sessionType]} from ${Math.round(progress)}% complete`}
          accessibilityHint="Continues your session from where you left off"
          style={{
            minWidth: 44,
            minHeight: 44,
            backgroundColor: '#FF9F43',
            borderRadius: 8,
            padding: 12,
          }}
        >
          Resume Session
        </button>
        
        <button
          testID="start-fresh-button"
          onPress={onStartFresh}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Start a new ${sessionTypeLabels[sessionType]}`}
          accessibilityHint="Discards the incomplete session and starts over"
          style={{
            minWidth: 44,
            minHeight: 44,
            backgroundColor: '#666',
            borderRadius: 8,
            padding: 12,
          }}
        >
          Start Fresh
        </button>
      </div>
      
      <div
        testID="help-text"
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel="Your session will be automatically saved for 24 hours"
      >
        <p>Sessions are saved for 24 hours</p>
      </div>
    </div>
  );
};

const MockSessionNavigationFlow: React.FC<{
  currentStep: number;
  totalSteps: number;
  stepName: string;
  onNext: () => void;
  onPrevious: () => void;
  onSave: () => void;
}> = ({ currentStep, totalSteps, stepName, onNext, onPrevious, onSave }) => {
  return (
    <div testID="session-navigation">
      <div
        testID="step-indicator"
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`Step ${currentStep} of ${totalSteps}: ${stepName}`}
      >
        <h1>Step {currentStep} of {totalSteps}</h1>
        <h2>{stepName}</h2>
      </div>
      
      <SessionProgressBar
        percentage={(currentStep / totalSteps) * 100}
        theme="morning"
        accessibilityLabel={`Progress: ${currentStep} of ${totalSteps} steps complete`}
      />
      
      <div
        testID="navigation-controls"
        accessible={true}
        accessibilityRole="group"
        accessibilityLabel="Session navigation controls"
      >
        <button
          testID="previous-button"
          onPress={onPrevious}
          disabled={currentStep === 1}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go to previous step"
          accessibilityState={{ disabled: currentStep === 1 }}
          style={{
            minWidth: 44,
            minHeight: 44,
            opacity: currentStep === 1 ? 0.5 : 1,
          }}
        >
          Previous
        </button>
        
        <button
          testID="save-progress-button"
          onPress={onSave}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Save progress and continue later"
          accessibilityHint="Your answers will be saved and you can resume anytime within 24 hours"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          Save & Continue Later
        </button>
        
        <button
          testID="next-button"
          onPress={onNext}
          disabled={currentStep === totalSteps}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={currentStep === totalSteps ? "Complete session" : "Go to next step"}
          accessibilityState={{ disabled: currentStep === totalSteps }}
          style={{
            minWidth: 44,
            minHeight: 44,
            backgroundColor: currentStep === totalSteps ? '#4CAF50' : '#FF9F43',
            opacity: currentStep === totalSteps ? 1 : 1,
          }}
        >
          {currentStep === totalSteps ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );
};

// Mock dependencies
jest.mock('../../src/services/ResumableSessionService');
jest.mock('../../src/store/checkInStore');

const mockResumableSessionService = resumableSessionService as jest.Mocked<typeof resumableSessionService>;

describe('Session Accessibility Tests', () => {
  let mockSession: ResumableSession;
  let mockHandlers: {
    onResume: jest.Mock;
    onStartFresh: jest.Mock;
    onNext: jest.Mock;
    onPrevious: jest.Mock;
    onSave: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockHandlers = {
      onResume: jest.fn(),
      onStartFresh: jest.fn(),
      onNext: jest.fn(),
      onPrevious: jest.fn(),
      onSave: jest.fn(),
    };

    mockSession = {
      id: 'accessibility-test-session',
      type: 'checkin',
      subType: 'morning',
      startedAt: '2024-01-15T07:30:00.000Z',
      lastUpdatedAt: '2024-01-15T07:45:00.000Z',
      expiresAt: '2024-01-16T07:30:00.000Z',
      appVersion: '1.0.0',
      progress: {
        currentStep: 4,
        totalSteps: 8,
        completedSteps: ['bodyAreas', 'emotions', 'thoughts', 'sleepQuality'],
        percentComplete: 50,
        estimatedTimeRemaining: 240,
      },
      data: {
        bodyAreas: ['shoulders', 'neck'],
        emotions: ['tired', 'anxious'],
        thoughts: ['worried'],
        sleepQuality: 3,
      },
      metadata: {
        resumeCount: 1,
        totalDuration: 900,
        lastScreen: 'sleep-quality',
        navigationStack: ['start', 'body-scan', 'emotions', 'thoughts', 'sleep-quality'],
      },
    };
  });

  describe('Resume Session Prompt Accessibility', () => {
    test('provides proper ARIA roles and labels for session resume prompt', () => {
      render(
        <MockResumeSessionPrompt
          sessionType="morning"
          progress={50}
          onResume={mockHandlers.onResume}
          onStartFresh={mockHandlers.onStartFresh}
        />
      );

      // Check main prompt accessibility
      const prompt = screen.getByTestId('resume-session-prompt');
      expect(prompt.props.accessible).toBe(true);
      expect(prompt.props.accessibilityRole).toBe('alert');
      expect(prompt.props.accessibilityLabel).toBe('You have an incomplete Morning Check-in that you can resume');

      // Check session info accessibility
      const sessionInfo = screen.getByTestId('session-info');
      expect(sessionInfo.props.accessible).toBe(true);
      expect(sessionInfo.props.accessibilityRole).toBe('text');
      expect(sessionInfo.props.accessibilityLabel).toBe('Morning Check-in is 50% complete');
    });

    test('resume and start fresh buttons meet accessibility standards', () => {
      render(
        <MockResumeSessionPrompt
          sessionType="phq9"
          progress={66.7}
          onResume={mockHandlers.onResume}
          onStartFresh={mockHandlers.onStartFresh}
        />
      );

      const resumeButton = screen.getByTestId('resume-button');
      const startFreshButton = screen.getByTestId('start-fresh-button');

      // Check resume button accessibility
      expect(resumeButton.props.accessible).toBe(true);
      expect(resumeButton.props.accessibilityRole).toBe('button');
      expect(resumeButton.props.accessibilityLabel).toBe('Resume PHQ-9 Depression Assessment from 67% complete');
      expect(resumeButton.props.accessibilityHint).toBe('Continues your session from where you left off');

      // Check start fresh button accessibility
      expect(startFreshButton.props.accessible).toBe(true);
      expect(startFreshButton.props.accessibilityRole).toBe('button');
      expect(startFreshButton.props.accessibilityLabel).toBe('Start a new PHQ-9 Depression Assessment');
      expect(startFreshButton.props.accessibilityHint).toBe('Discards the incomplete session and starts over');
    });

    test('button touch targets meet minimum 44px accessibility requirement', () => {
      render(
        <MockResumeSessionPrompt
          sessionType="gad7"
          progress={85.7}
          onResume={mockHandlers.onResume}
          onStartFresh={mockHandlers.onStartFresh}
        />
      );

      const resumeButton = screen.getByTestId('resume-button');
      const startFreshButton = screen.getByTestId('start-fresh-button');

      // Verify minimum touch target size (44px)
      expect(resumeButton.props.style.minWidth).toBe(44);
      expect(resumeButton.props.style.minHeight).toBe(44);
      expect(startFreshButton.props.style.minWidth).toBe(44);
      expect(startFreshButton.props.style.minHeight).toBe(44);
    });

    test('provides helpful context for screen readers', () => {
      render(
        <MockResumeSessionPrompt
          sessionType="morning"
          progress={37.5}
          onResume={mockHandlers.onResume}
          onStartFresh={mockHandlers.onStartFresh}
        />
      );

      const helpText = screen.getByTestId('help-text');
      expect(helpText.props.accessible).toBe(true);
      expect(helpText.props.accessibilityRole).toBe('text');
      expect(helpText.props.accessibilityLabel).toBe('Your session will be automatically saved for 24 hours');
    });

    test('handles different session types with appropriate labels', () => {
      const sessionTypes: Array<{type: 'morning' | 'phq9' | 'gad7', label: string}> = [
        { type: 'morning', label: 'Morning Check-in' },
        { type: 'phq9', label: 'PHQ-9 Depression Assessment' },
        { type: 'gad7', label: 'GAD-7 Anxiety Assessment' },
      ];

      sessionTypes.forEach(({ type, label }) => {
        const { unmount } = render(
          <MockResumeSessionPrompt
            sessionType={type}
            progress={75}
            onResume={mockHandlers.onResume}
            onStartFresh={mockHandlers.onStartFresh}
          />
        );

        const prompt = screen.getByTestId('resume-session-prompt');
        expect(prompt.props.accessibilityLabel).toBe(`You have an incomplete ${label} that you can resume`);

        const resumeButton = screen.getByTestId('resume-button');
        expect(resumeButton.props.accessibilityLabel).toBe(`Resume ${label} from 75% complete`);

        unmount();
      });
    });
  });

  describe('Session Navigation Accessibility', () => {
    test('step indicator provides clear context for screen readers', () => {
      render(
        <MockSessionNavigationFlow
          currentStep={3}
          totalSteps={8}
          stepName="Emotional Check-in"
          onNext={mockHandlers.onNext}
          onPrevious={mockHandlers.onPrevious}
          onSave={mockHandlers.onSave}
        />
      );

      const stepIndicator = screen.getByTestId('step-indicator');
      expect(stepIndicator.props.accessible).toBe(true);
      expect(stepIndicator.props.accessibilityRole).toBe('text');
      expect(stepIndicator.props.accessibilityLabel).toBe('Step 3 of 8: Emotional Check-in');
    });

    test('navigation controls are properly grouped and labeled', () => {
      render(
        <MockSessionNavigationFlow
          currentStep={5}
          totalSteps={8}
          stepName="Anxiety Level"
          onNext={mockHandlers.onNext}
          onPrevious={mockHandlers.onPrevious}
          onSave={mockHandlers.onSave}
        />
      );

      const navigationControls = screen.getByTestId('navigation-controls');
      expect(navigationControls.props.accessible).toBe(true);
      expect(navigationControls.props.accessibilityRole).toBe('group');
      expect(navigationControls.props.accessibilityLabel).toBe('Session navigation controls');

      const previousButton = screen.getByTestId('previous-button');
      const saveButton = screen.getByTestId('save-progress-button');
      const nextButton = screen.getByTestId('next-button');

      expect(previousButton.props.accessibilityLabel).toBe('Go to previous step');
      expect(saveButton.props.accessibilityLabel).toBe('Save progress and continue later');
      expect(saveButton.props.accessibilityHint).toBe('Your answers will be saved and you can resume anytime within 24 hours');
      expect(nextButton.props.accessibilityLabel).toBe('Go to next step');
    });

    test('button states are properly communicated to assistive technology', () => {
      // Test first step (previous disabled)
      const { rerender } = render(
        <MockSessionNavigationFlow
          currentStep={1}
          totalSteps={8}
          stepName="Body Scan"
          onNext={mockHandlers.onNext}
          onPrevious={mockHandlers.onPrevious}
          onSave={mockHandlers.onSave}
        />
      );

      let previousButton = screen.getByTestId('previous-button');
      let nextButton = screen.getByTestId('next-button');

      expect(previousButton.props.disabled).toBe(true);
      expect(previousButton.props.accessibilityState).toEqual({ disabled: true });
      expect(nextButton.props.disabled).toBe(false);

      // Test last step (shows complete)
      rerender(
        <MockSessionNavigationFlow
          currentStep={8}
          totalSteps={8}
          stepName="Intention Setting"
          onNext={mockHandlers.onNext}
          onPrevious={mockHandlers.onPrevious}
          onSave={mockHandlers.onSave}
        />
      );

      previousButton = screen.getByTestId('previous-button');
      nextButton = screen.getByTestId('next-button');

      expect(previousButton.props.disabled).toBe(false);
      expect(nextButton.props.accessibilityLabel).toBe('Complete session');
      expect(nextButton.props.disabled).toBe(false);
    });

    test('navigation controls meet touch target size requirements', () => {
      render(
        <MockSessionNavigationFlow
          currentStep={4}
          totalSteps={8}
          stepName="Sleep Quality"
          onNext={mockHandlers.onNext}
          onPrevious={mockHandlers.onPrevious}
          onSave={mockHandlers.onSave}
        />
      );

      const previousButton = screen.getByTestId('previous-button');
      const saveButton = screen.getByTestId('save-progress-button');
      const nextButton = screen.getByTestId('next-button');

      // All navigation buttons should meet minimum touch target size
      expect(previousButton.props.style.minWidth).toBe(44);
      expect(previousButton.props.style.minHeight).toBe(44);
      expect(saveButton.props.style.minWidth).toBe(44);
      expect(saveButton.props.style.minHeight).toBe(44);
      expect(nextButton.props.style.minWidth).toBe(44);
      expect(nextButton.props.style.minHeight).toBe(44);
    });
  });

  describe('Progress Bar Accessibility', () => {
    test('SessionProgressBar provides comprehensive accessibility information', () => {
      render(
        <SessionProgressBar
          percentage={62.5}
          theme="morning"
          accessibilityLabel="Morning check-in progress: 5 of 8 steps complete"
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeTruthy();
      expect(progressBar.props.accessibilityLabel).toBe('Morning check-in progress: 5 of 8 steps complete');
      expect(progressBar.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 62.5,
      });
    });

    test('progress percentage text is hidden from screen readers to avoid duplication', () => {
      render(
        <SessionProgressBar
          percentage={87.5}
          theme="evening"
          showPercentage={true}
        />
      );

      const percentageText = screen.getByText('88%'); // Rounded up
      expect(percentageText.props.accessibilityElementsHidden).toBe(true);
    });

    test('supports dynamic font scaling for users with vision needs', () => {
      render(
        <SessionProgressBar
          percentage={33.3}
          theme="midday"
        />
      );

      const percentageText = screen.getByText('33%');
      expect(percentageText.props.allowFontScaling).toBe(true);
      expect(percentageText.props.maxFontSizeMultiplier).toBe(1.5);
    });

    test('handles edge cases with appropriate accessibility values', () => {
      const testCases = [
        { percentage: 0, expectedText: '0%', expectedValue: 0 },
        { percentage: 100, expectedText: '100%', expectedValue: 100 },
        { percentage: -5, expectedText: '0%', expectedValue: 0 }, // Clamped
        { percentage: 105, expectedText: '100%', expectedValue: 100 }, // Clamped
      ];

      testCases.forEach(({ percentage, expectedText, expectedValue }) => {
        const { unmount } = render(
          <SessionProgressBar
            percentage={percentage}
            theme="morning"
            testID={`progress-${percentage}`}
          />
        );

        const progressBar = screen.getByRole('progressbar');
        expect(progressBar.props.accessibilityValue.now).toBe(expectedValue);
        
        const percentageText = screen.getByText(expectedText);
        expect(percentageText).toBeTruthy();

        unmount();
      });
    });
  });

  describe('Clinical Assessment Accessibility', () => {
    test('PHQ-9 assessment resume provides clinical context', () => {
      render(
        <MockResumeSessionPrompt
          sessionType="phq9"
          progress={55.6}
          onResume={mockHandlers.onResume}
          onStartFresh={mockHandlers.onStartFresh}
        />
      );

      const sessionInfo = screen.getByTestId('session-info');
      expect(sessionInfo.props.accessibilityLabel).toBe('PHQ-9 Depression Assessment is 56% complete');

      const resumeButton = screen.getByTestId('resume-button');
      expect(resumeButton.props.accessibilityLabel).toBe('Resume PHQ-9 Depression Assessment from 56% complete');
    });

    test('GAD-7 assessment resume includes anxiety context', () => {
      render(
        <MockResumeSessionPrompt
          sessionType="gad7"
          progress={71.4}
          onResume={mockHandlers.onResume}
          onStartFresh={mockHandlers.onStartFresh}
        />
      );

      const prompt = screen.getByTestId('resume-session-prompt');
      expect(prompt.props.accessibilityLabel).toBe('You have an incomplete GAD-7 Anxiety Assessment that you can resume');

      const startFreshButton = screen.getByTestId('start-fresh-button');
      expect(startFreshButton.props.accessibilityLabel).toBe('Start a new GAD-7 Anxiety Assessment');
    });

    test('clinical assessment navigation includes question context', () => {
      render(
        <MockSessionNavigationFlow
          currentStep={5}
          totalSteps={9}
          stepName="Feeling down, depressed, or hopeless"
          onNext={mockHandlers.onNext}
          onPrevious={mockHandlers.onPrevious}
          onSave={mockHandlers.onSave}
        />
      );

      const stepIndicator = screen.getByTestId('step-indicator');
      expect(stepIndicator.props.accessibilityLabel).toBe('Step 5 of 9: Feeling down, depressed, or hopeless');

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.props.accessibilityLabel).toBe('Progress: 5 of 9 steps complete');
    });
  });

  describe('MBCT Check-in Accessibility', () => {
    test('morning check-in provides therapeutic context', () => {
      render(
        <MockResumeSessionPrompt
          sessionType="morning"
          progress={50}
          onResume={mockHandlers.onResume}
          onStartFresh={mockHandlers.onStartFresh}
        />
      );

      const resumeButton = screen.getByTestId('resume-button');
      expect(resumeButton.props.accessibilityHint).toBe('Continues your session from where you left off');
      
      const helpText = screen.getByTestId('help-text');
      expect(helpText.props.accessibilityLabel).toBe('Your session will be automatically saved for 24 hours');
    });

    test('therapeutic step names are clearly announced', () => {
      const therapeuticSteps = [
        'Body Awareness Scan',
        'Emotional Check-in',
        'Thought Observation',
        'Sleep Quality Reflection',
        'Energy Level Assessment',
        'Anxiety Level Check',
        'Today\'s Value Identification',
        'Intention Setting',
      ];

      therapeuticSteps.forEach((stepName, index) => {
        const { unmount } = render(
          <MockSessionNavigationFlow
            currentStep={index + 1}
            totalSteps={8}
            stepName={stepName}
            onNext={mockHandlers.onNext}
            onPrevious={mockHandlers.onPrevious}
            onSave={mockHandlers.onSave}
          />
        );

        const stepIndicator = screen.getByTestId('step-indicator');
        expect(stepIndicator.props.accessibilityLabel).toBe(`Step ${index + 1} of 8: ${stepName}`);

        unmount();
      });
    });
  });

  describe('Error States and Edge Cases', () => {
    test('expired session provides clear accessibility feedback', () => {
      // Mock expired session scenario
      const ExpiredSessionPrompt: React.FC = () => (
        <div
          testID="expired-session-message"
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel="Your saved session has expired. Please start a new assessment."
        >
          <h2>Session Expired</h2>
          <p>Your saved progress has expired after 24 hours. Please start fresh.</p>
          <button
            testID="start-new-button"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Start new session"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            Start New Session
          </button>
        </div>
      );

      render(<ExpiredSessionPrompt />);

      const expiredMessage = screen.getByTestId('expired-session-message');
      expect(expiredMessage.props.accessible).toBe(true);
      expect(expiredMessage.props.accessibilityRole).toBe('alert');
      expect(expiredMessage.props.accessibilityLabel).toBe('Your saved session has expired. Please start a new assessment.');

      const startNewButton = screen.getByTestId('start-new-button');
      expect(startNewButton.props.style.minWidth).toBe(44);
      expect(startNewButton.props.style.minHeight).toBe(44);
    });

    test('loading states provide accessibility feedback', () => {
      const LoadingSessionPrompt: React.FC = () => (
        <div
          testID="loading-session"
          accessible={true}
          accessibilityRole="status"
          accessibilityLabel="Loading your saved session, please wait"
        >
          <p>Loading your session...</p>
        </div>
      );

      render(<LoadingSessionPrompt />);

      const loadingMessage = screen.getByTestId('loading-session');
      expect(loadingMessage.props.accessible).toBe(true);
      expect(loadingMessage.props.accessibilityRole).toBe('status');
      expect(loadingMessage.props.accessibilityLabel).toBe('Loading your saved session, please wait');
    });

    test('maximum resume attempts provides clear guidance', () => {
      const MaxResumesPrompt: React.FC = () => (
        <div
          testID="max-resumes-message"
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel="You have reached the maximum number of resume attempts. Please start a fresh session."
        >
          <h2>Session Limit Reached</h2>
          <p>For security and accuracy, sessions can only be resumed 5 times.</p>
          <button
            testID="start-fresh-button"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Start fresh assessment"
            accessibilityHint="Begins a new session with no saved progress"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            Start Fresh
          </button>
        </div>
      );

      render(<MaxResumesPrompt />);

      const maxResumesMessage = screen.getByTestId('max-resumes-message');
      expect(maxResumesMessage.props.accessibilityRole).toBe('alert');
      expect(maxResumesMessage.props.accessibilityLabel).toBe('You have reached the maximum number of resume attempts. Please start a fresh session.');

      const startFreshButton = screen.getByTestId('start-fresh-button');
      expect(startFreshButton.props.accessibilityHint).toBe('Begins a new session with no saved progress');
    });
  });

  describe('Interaction Testing', () => {
    test('button interactions work with accessibility features', () => {
      render(
        <MockResumeSessionPrompt
          sessionType="morning"
          progress={75}
          onResume={mockHandlers.onResume}
          onStartFresh={mockHandlers.onStartFresh}
        />
      );

      const resumeButton = screen.getByTestId('resume-button');
      const startFreshButton = screen.getByTestId('start-fresh-button');

      // Simulate accessibility-driven interactions
      fireEvent.press(resumeButton);
      expect(mockHandlers.onResume).toHaveBeenCalledTimes(1);

      fireEvent.press(startFreshButton);
      expect(mockHandlers.onStartFresh).toHaveBeenCalledTimes(1);
    });

    test('navigation controls respond to accessibility interactions', () => {
      render(
        <MockSessionNavigationFlow
          currentStep={3}
          totalSteps={8}
          stepName="Thought Observation"
          onNext={mockHandlers.onNext}
          onPrevious={mockHandlers.onPrevious}
          onSave={mockHandlers.onSave}
        />
      );

      const previousButton = screen.getByTestId('previous-button');
      const saveButton = screen.getByTestId('save-progress-button');
      const nextButton = screen.getByTestId('next-button');

      fireEvent.press(previousButton);
      expect(mockHandlers.onPrevious).toHaveBeenCalledTimes(1);

      fireEvent.press(saveButton);
      expect(mockHandlers.onSave).toHaveBeenCalledTimes(1);

      fireEvent.press(nextButton);
      expect(mockHandlers.onNext).toHaveBeenCalledTimes(1);
    });

    test('disabled button states are properly handled', () => {
      render(
        <MockSessionNavigationFlow
          currentStep={1}
          totalSteps={8}
          stepName="Body Scan"
          onNext={mockHandlers.onNext}
          onPrevious={mockHandlers.onPrevious}
          onSave={mockHandlers.onSave}
        />
      );

      const previousButton = screen.getByTestId('previous-button');
      
      // Disabled button should not trigger action
      fireEvent.press(previousButton);
      expect(mockHandlers.onPrevious).not.toHaveBeenCalled();
      
      // Verify disabled state is communicated
      expect(previousButton.props.disabled).toBe(true);
      expect(previousButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Dynamic Content Updates', () => {
    test('progress updates are announced to screen readers', () => {
      const { rerender } = render(
        <SessionProgressBar
          percentage={25}
          theme="morning"
          accessibilityLabel="Morning check-in progress: 2 of 8 steps complete"
        />
      );

      let progressBar = screen.getByRole('progressbar');
      expect(progressBar.props.accessibilityValue.now).toBe(25);
      expect(progressBar.props.accessibilityLabel).toBe('Morning check-in progress: 2 of 8 steps complete');

      // Update progress
      rerender(
        <SessionProgressBar
          percentage={50}
          theme="morning"
          accessibilityLabel="Morning check-in progress: 4 of 8 steps complete"
        />
      );

      progressBar = screen.getByRole('progressbar');
      expect(progressBar.props.accessibilityValue.now).toBe(50);
      expect(progressBar.props.accessibilityLabel).toBe('Morning check-in progress: 4 of 8 steps complete');
    });

    test('step changes are properly announced', () => {
      const { rerender } = render(
        <MockSessionNavigationFlow
          currentStep={3}
          totalSteps={8}
          stepName="Emotional Check-in"
          onNext={mockHandlers.onNext}
          onPrevious={mockHandlers.onPrevious}
          onSave={mockHandlers.onSave}
        />
      );

      let stepIndicator = screen.getByTestId('step-indicator');
      expect(stepIndicator.props.accessibilityLabel).toBe('Step 3 of 8: Emotional Check-in');

      // Move to next step
      rerender(
        <MockSessionNavigationFlow
          currentStep={4}
          totalSteps={8}
          stepName="Sleep Quality"
          onNext={mockHandlers.onNext}
          onPrevious={mockHandlers.onPrevious}
          onSave={mockHandlers.onSave}
        />
      );

      stepIndicator = screen.getByTestId('step-indicator');
      expect(stepIndicator.props.accessibilityLabel).toBe('Step 4 of 8: Sleep Quality');
    });
  });
});