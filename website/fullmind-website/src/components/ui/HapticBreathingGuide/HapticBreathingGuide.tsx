/**
 * FullMind Haptic Breathing Guide Component
 * Accessibility-enhanced MBCT breathing exercise with haptic feedback
 * WCAG AA compliant with comprehensive alternatives and trauma-informed design
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { HapticButton } from '@/components/ui/HapticButton';
import { useMBCTBreathingHaptics, useHapticAccessibilityContext } from '@/hooks/useHapticAccessibility';
import type { BaseComponentProps } from '@/types/components';

// ============================================================================
// HAPTIC BREATHING GUIDE INTERFACES
// ============================================================================

interface HapticBreathingGuideProps extends BaseComponentProps {
  duration?: 60 | 180 | 300; // seconds (1, 3, or 5 minutes)
  breathingRhythm?: '4-4-6' | '4-7-8' | '6-2-6';
  autoStart?: boolean;
  showVisualGuide?: boolean;
  showTextInstructions?: boolean;
  enableAudioGuide?: boolean;
  onSessionStart?: () => void;
  onSessionComplete?: (stats: BreathingSessionStats) => void;
  onSessionPause?: () => void;
  reducedMotion?: boolean;
  highContrast?: boolean;
  largeText?: boolean;
  cognitiveAccessibility?: boolean;
}

interface BreathingSessionStats {
  sessionDuration: number; // actual duration in seconds
  cyclesCompleted: number;
  averageCycleTime: number;
  completionRate: number; // percentage
  pauseCount: number;
  prematureEnd: boolean;
}

// ============================================================================
// BREATHING PHASE VISUAL COMPONENT
// ============================================================================

const BreathingVisualGuide: React.FC<{
  phase: 'inhale' | 'hold' | 'exhale' | 'pause';
  progress: number; // 0-100
  reducedMotion?: boolean;
  highContrast?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ 
  phase, 
  progress, 
  reducedMotion = false, 
  highContrast = false,
  size = 'md',
  className 
}) => {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-48 h-48'
  };

  const getPhaseColor = () => {
    if (highContrast) {
      switch (phase) {
        case 'inhale': return 'border-clinical-safe bg-clinical-safe/20';
        case 'hold': return 'border-clinical-primary bg-clinical-primary/20';
        case 'exhale': return 'border-clinical-secondary bg-clinical-secondary/20';
        default: return 'border-border-primary bg-bg-secondary';
      }
    } else {
      switch (phase) {
        case 'inhale': return 'border-clinical-safe/60 bg-clinical-safe/10';
        case 'hold': return 'border-clinical-primary/60 bg-clinical-primary/10';
        case 'exhale': return 'border-clinical-secondary/60 bg-clinical-secondary/10';
        default: return 'border-border-primary bg-bg-secondary';
      }
    }
  };

  const getScaleClass = () => {
    if (reducedMotion) return 'transform-none';
    
    switch (phase) {
      case 'inhale': return `scale-110 transition-transform duration-[4000ms] ease-out`;
      case 'hold': return `scale-110 transition-none`;
      case 'exhale': return `scale-90 transition-transform duration-[6000ms] ease-in`;
      default: return `scale-100 transition-transform duration-500 ease-in-out`;
    }
  };

  const circumference = 2 * Math.PI * 45; // radius of 45 for progress circle
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div 
      className={cn('relative flex items-center justify-center', sizeClasses[size], className)}
      role="img"
      aria-label={`Breathing guide: ${phase} phase, ${Math.round(progress)}% complete`}
      aria-live="polite"
    >
      {/* Main breathing circle */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-4 transition-colors duration-500',
          getPhaseColor(),
          getScaleClass()
        )}
        aria-hidden="true"
      />
      
      {/* Progress ring */}
      <svg 
        className="absolute inset-0 -rotate-90" 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            'transition-all duration-300',
            highContrast ? 'text-clinical-text opacity-80' : 'text-theme-primary opacity-60'
          )}
        />
      </svg>
      
      {/* Center phase indicator */}
      <div className="relative z-10 text-center">
        <div className={cn(
          'text-2xl mb-1',
          highContrast ? 'text-clinical-text font-bold' : 'text-theme-primary font-semibold'
        )}>
          {phase === 'inhale' && '↑'}
          {phase === 'hold' && '⏸'}
          {phase === 'exhale' && '↓'}
          {phase === 'pause' && '○'}
        </div>
        
        {/* Progress percentage for screen readers */}
        <div className="sr-only">
          {Math.round(progress)}% complete
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// BREATHING TEXT INSTRUCTIONS COMPONENT
// ============================================================================

const BreathingInstructions: React.FC<{
  phase: 'inhale' | 'hold' | 'exhale' | 'pause';
  timeRemaining: number;
  largeText?: boolean;
  cognitiveAccessibility?: boolean;
}> = ({ phase, timeRemaining, largeText = false, cognitiveAccessibility = false }) => {
  const getInstructionText = () => {
    const simpleInstructions = {
      inhale: 'Breathe In',
      hold: 'Hold',
      exhale: 'Breathe Out',
      pause: 'Rest',
    };

    const detailedInstructions = {
      inhale: 'Slowly breathe in through your nose',
      hold: 'Hold your breath gently, without strain',
      exhale: 'Slowly breathe out through your mouth',
      pause: 'Natural pause between breaths',
    };

    return cognitiveAccessibility ? simpleInstructions[phase] : detailedInstructions[phase];
  };

  const getGuidanceText = () => {
    if (cognitiveAccessibility) return '';
    
    switch (phase) {
      case 'inhale': return 'Feel your chest and belly expand naturally';
      case 'hold': return 'Notice the moment of stillness and calm';
      case 'exhale': return 'Release tension as you breathe out slowly';
      case 'pause': return 'Simply notice this quiet moment';
    }
  };

  return (
    <div className="text-center space-y-2">
      <Typography 
        variant={largeText ? "h3" : "h4"} 
        className={cn(
          'font-semibold text-clinical-text',
          largeText && 'text-2xl'
        )}
        aria-live="polite"
      >
        {getInstructionText()}
      </Typography>
      
      <div className={cn(
        'font-mono text-3xl font-bold text-theme-primary',
        largeText && 'text-4xl'
      )} aria-live="polite">
        {Math.ceil(timeRemaining)}s
      </div>
      
      {!cognitiveAccessibility && (
        <Typography 
          variant="body2" 
          className={cn(
            'text-text-secondary max-w-xs mx-auto',
            largeText && 'text-lg'
          )}
        >
          {getGuidanceText()}
        </Typography>
      )}
    </div>
  );
};

// ============================================================================
// SESSION PROGRESS COMPONENT
// ============================================================================

const SessionProgress: React.FC<{
  currentCycle: number;
  totalCycles: number;
  timeRemaining: number;
  totalTime: number;
  highContrast?: boolean;
  largeText?: boolean;
}> = ({ 
  currentCycle, 
  totalCycles, 
  timeRemaining, 
  totalTime, 
  highContrast = false,
  largeText = false 
}) => {
  const progressPercentage = ((totalTime - timeRemaining) / totalTime) * 100;

  return (
    <div className="w-full space-y-3">
      {/* Progress bar */}
      <div className="w-full bg-surface-depressed rounded-full h-2 overflow-hidden">
        <div 
          className={cn(
            'h-full rounded-full transition-all duration-1000 ease-out',
            highContrast ? 'bg-clinical-primary' : 'bg-theme-primary'
          )}
          style={{ width: `${Math.max(0, Math.min(100, progressPercentage))}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progressPercentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Session progress: ${Math.round(progressPercentage)}% complete`}
        />
      </div>
      
      {/* Progress text */}
      <div className={cn(
        'flex justify-between text-sm text-text-secondary',
        largeText && 'text-base'
      )}>
        <span>
          Cycle {currentCycle} of {totalCycles}
        </span>
        <span>
          {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} remaining
        </span>
      </div>
      
      {/* Screen reader progress announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {currentCycle > 0 && currentCycle % 5 === 0 && (
          `Progress update: Completed ${currentCycle} breathing cycles. ${Math.round(progressPercentage)}% of session complete.`
        )}
      </div>
    </div>
  );
};

// ============================================================================
// ACCESSIBILITY SETTINGS PANEL
// ============================================================================

const BreathingAccessibilityPanel: React.FC<{
  hapticEnabled: boolean;
  visualEnabled: boolean;
  audioEnabled: boolean;
  onHapticToggle: (enabled: boolean) => void;
  onVisualToggle: (enabled: boolean) => void;
  onAudioToggle: (enabled: boolean) => void;
  cognitiveAccessibility: boolean;
  onCognitiveToggle: (enabled: boolean) => void;
}> = ({
  hapticEnabled,
  visualEnabled,
  audioEnabled,
  onHapticToggle,
  onVisualToggle,
  onAudioToggle,
  cognitiveAccessibility,
  onCognitiveToggle,
}) => {
  return (
    <div className="p-4 bg-bg-secondary border border-border-primary rounded-lg">
      <Typography variant="h6" className="font-semibold mb-3">
        Breathing Guide Options
      </Typography>
      
      <div className="space-y-3">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hapticEnabled}
            onChange={(e) => onHapticToggle(e.target.checked)}
            className="h-4 w-4 text-clinical-safe focus:ring-2 focus:ring-clinical-safe/50 rounded"
            aria-describedby="haptic-description"
          />
          <div>
            <span className="text-sm font-medium text-text-primary">
              Haptic feedback
            </span>
            <p id="haptic-description" className="text-xs text-text-secondary">
              Gentle device vibration to guide breathing rhythm
            </p>
          </div>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={visualEnabled}
            onChange={(e) => onVisualToggle(e.target.checked)}
            className="h-4 w-4 text-clinical-safe focus:ring-2 focus:ring-clinical-safe/50 rounded"
            aria-describedby="visual-description"
          />
          <div>
            <span className="text-sm font-medium text-text-primary">
              Visual guide
            </span>
            <p id="visual-description" className="text-xs text-text-secondary">
              Animated breathing circle with phase indicators
            </p>
          </div>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={audioEnabled}
            onChange={(e) => onAudioToggle(e.target.checked)}
            className="h-4 w-4 text-clinical-safe focus:ring-2 focus:ring-clinical-safe/50 rounded"
            aria-describedby="audio-description"
          />
          <div>
            <span className="text-sm font-medium text-text-primary">
              Audio cues
            </span>
            <p id="audio-description" className="text-xs text-text-secondary">
              Gentle chimes to mark breathing phase transitions
            </p>
          </div>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={cognitiveAccessibility}
            onChange={(e) => onCognitiveToggle(e.target.checked)}
            className="h-4 w-4 text-clinical-safe focus:ring-2 focus:ring-clinical-safe/50 rounded"
            aria-describedby="cognitive-description"
          />
          <div>
            <span className="text-sm font-medium text-text-primary">
              Simplified instructions
            </span>
            <p id="cognitive-description" className="text-xs text-text-secondary">
              Shorter, clearer instructions for easier focus
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN HAPTIC BREATHING GUIDE COMPONENT
// ============================================================================

export const HapticBreathingGuide: React.FC<HapticBreathingGuideProps> = ({
  duration = 180, // Default 3 minutes
  breathingRhythm = '4-4-6',
  autoStart = false,
  showVisualGuide = true,
  showTextInstructions = true,
  enableAudioGuide = false,
  onSessionStart,
  onSessionComplete,
  onSessionPause,
  reducedMotion = false,
  highContrast = false,
  largeText = false,
  cognitiveAccessibility = false,
  className,
  'data-testid': testId,
  ...props
}) => {
  const {
    isActive,
    currentPhase,
    cycleCount,
    startBreathingSession,
    stopBreathingSession,
    sessionProgress,
  } = useMBCTBreathingHaptics();
  
  const { announceToScreenReader } = useHapticAccessibilityContext();

  // Local state for session management
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [pauseCount, setPauseCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [phaseTimeRemaining, setPhaseTimeRemaining] = useState(4); // Default inhale time
  
  // Accessibility settings state
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [visualEnabled, setVisualEnabled] = useState(showVisualGuide);
  const [audioEnabled, setAudioEnabled] = useState(enableAudioGuide);
  const [simplifiedMode, setSimplifiedMode] = useState(cognitiveAccessibility);

  // Calculate total cycles for the session
  const totalCycles = Math.floor(duration / 14); // 14 seconds per cycle
  
  // Phase timing based on breathing rhythm
  const phaseDurations = {
    '4-4-6': { inhale: 4, hold: 4, exhale: 6, pause: 0 },
    '4-7-8': { inhale: 4, hold: 7, exhale: 8, pause: 0 },
    '6-2-6': { inhale: 6, hold: 2, exhale: 6, pause: 0 },
  };

  const currentPhaseDuration = phaseDurations[breathingRhythm][currentPhase];

  // Start session handler
  const handleStartSession = useCallback(() => {
    setSessionStartTime(Date.now());
    setTimeRemaining(duration);
    setPauseCount(0);
    startBreathingSession();
    onSessionStart?.();
    
    announceToScreenReader(
      `Starting ${duration / 60} minute breathing session with ${breathingRhythm} rhythm. ${
        hapticEnabled ? 'Haptic guidance enabled.' : ''
      } ${visualEnabled ? 'Visual guide enabled.' : ''} Focus on your breath and follow the gentle guidance.`,
      'assertive'
    );
  }, [
    duration,
    breathingRhythm,
    hapticEnabled,
    visualEnabled,
    startBreathingSession,
    onSessionStart,
    announceToScreenReader,
  ]);

  // Stop session handler
  const handleStopSession = useCallback(() => {
    const sessionEndTime = Date.now();
    const actualDuration = sessionStartTime ? (sessionEndTime - sessionStartTime) / 1000 : 0;
    const completionRate = (actualDuration / duration) * 100;
    
    const stats: BreathingSessionStats = {
      sessionDuration: actualDuration,
      cyclesCompleted: cycleCount,
      averageCycleTime: cycleCount > 0 ? actualDuration / cycleCount : 0,
      completionRate: Math.min(100, completionRate),
      pauseCount,
      prematureEnd: completionRate < 95,
    };
    
    stopBreathingSession();
    setSessionStartTime(null);
    onSessionComplete?.(stats);
    
    announceToScreenReader(
      `Breathing session completed. You completed ${cycleCount} breathing cycles with ${Math.round(completionRate)}% session completion. Well done on taking time for mindful breathing.`,
      'polite'
    );
  }, [
    sessionStartTime,
    duration,
    cycleCount,
    pauseCount,
    stopBreathingSession,
    onSessionComplete,
    announceToScreenReader,
  ]);

  // Pause session handler
  const handlePauseSession = useCallback(() => {
    stopBreathingSession();
    setPauseCount(prev => prev + 1);
    onSessionPause?.();
    
    announceToScreenReader(
      'Breathing session paused. Take your time, and resume when you\'re ready.',
      'polite'
    );
  }, [stopBreathingSession, onSessionPause, announceToScreenReader]);

  // Auto-start effect
  useEffect(() => {
    if (autoStart && !isActive) {
      handleStartSession();
    }
  }, [autoStart, isActive, handleStartSession]);

  // Update phase timing
  useEffect(() => {
    if (isActive) {
      setPhaseTimeRemaining(currentPhaseDuration);
      setPhaseProgress(0);
      
      const interval = setInterval(() => {
        setPhaseTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 0.1);
          setPhaseProgress(((currentPhaseDuration - newTime) / currentPhaseDuration) * 100);
          return newTime;
        });
        
        setTimeRemaining(prev => Math.max(0, prev - 0.1));
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [isActive, currentPhase, currentPhaseDuration]);

  // Auto-complete when time is up
  useEffect(() => {
    if (timeRemaining <= 0 && isActive) {
      handleStopSession();
    }
  }, [timeRemaining, isActive, handleStopSession]);

  return (
    <div
      className={cn(
        'haptic-breathing-guide w-full max-w-2xl mx-auto',
        'bg-bg-primary rounded-xl border border-border-primary',
        'shadow-medium overflow-hidden',
        className
      )}
      data-testid={testId}
      role="application"
      aria-label="MBCT Breathing Exercise with Haptic Guidance"
      aria-describedby="breathing-guide-description"
      {...props}
    >
      {/* Screen reader description */}
      <div id="breathing-guide-description" className="sr-only">
        This is a mindful breathing guide that can provide haptic, visual, and audio cues 
        to help you with breathing exercises. Use the controls to start, pause, or customize 
        your breathing session. All features can be enabled or disabled based on your preferences.
      </div>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <Typography variant="h3" className="font-bold text-clinical-text mb-2">
            🫁 Mindful Breathing
          </Typography>
          <Typography variant="body1" className="text-text-secondary">
            {isActive 
              ? `${breathingRhythm} breathing rhythm • ${duration / 60} minute session`
              : `Ready for a ${duration / 60} minute mindfulness practice?`
            }
          </Typography>
        </div>

        {/* Session progress */}
        {isActive && (
          <SessionProgress
            currentCycle={cycleCount}
            totalCycles={totalCycles}
            timeRemaining={timeRemaining}
            totalTime={duration}
            highContrast={highContrast}
            largeText={largeText}
          />
        )}

        {/* Breathing guide area */}
        <div className="flex flex-col items-center space-y-6">
          {/* Visual breathing guide */}
          {visualEnabled && isActive && (
            <BreathingVisualGuide
              phase={currentPhase}
              progress={phaseProgress}
              reducedMotion={reducedMotion}
              highContrast={highContrast}
              size={largeText ? 'lg' : 'md'}
            />
          )}

          {/* Text instructions */}
          {showTextInstructions && isActive && (
            <BreathingInstructions
              phase={currentPhase}
              timeRemaining={phaseTimeRemaining}
              largeText={largeText}
              cognitiveAccessibility={simplifiedMode}
            />
          )}

          {/* Session controls */}
          <div className="flex gap-3">
            {!isActive ? (
              <HapticButton
                variant="clinical"
                size="lg"
                onClick={handleStartSession}
                hapticEnabled={hapticEnabled}
                therapeuticContext="breathing"
                ariaHapticDescription="Start breathing exercise with optional haptic guidance"
                providesAlternatives={{
                  visual: 'Button press animation with breathing circle initialization',
                  textual: 'Breathing session begins with chosen guidance options',
                  audio: enableAudioGuide ? 'Gentle start chime' : undefined,
                }}
                className="px-8 py-3"
              >
                🌿 Begin Breathing
              </HapticButton>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handlePauseSession}
                  className="px-6 py-3"
                >
                  ⏸️ Pause
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleStopSession}
                  className="px-6 py-3 border-clinical-warning text-clinical-warning hover:bg-clinical-warning/10"
                >
                  ⏹️ Complete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Accessibility settings */}
        {!isActive && (
          <BreathingAccessibilityPanel
            hapticEnabled={hapticEnabled}
            visualEnabled={visualEnabled}
            audioEnabled={audioEnabled}
            onHapticToggle={setHapticEnabled}
            onVisualToggle={setVisualEnabled}
            onAudioToggle={setAudioEnabled}
            cognitiveAccessibility={simplifiedMode}
            onCognitiveToggle={setSimplifiedMode}
          />
        )}

        {/* Benefits reminder */}
        {!isActive && (
          <div className="p-4 bg-clinical-bg/5 border border-clinical-border rounded-lg">
            <Typography variant="body2" className="text-clinical-text text-center">
              💚 Regular breathing practice can help reduce anxiety, improve focus, 
              and support emotional regulation. Take your time and be kind to yourself.
            </Typography>
          </div>
        )}
      </div>

      {/* Live region for screen reader updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="false" id="breathing-live-updates">
        {isActive && cycleCount > 0 && cycleCount % 3 === 0 && (
          `Breathing update: You've completed ${cycleCount} mindful breathing cycles. Keep following the gentle rhythm.`
        )}
      </div>
    </div>
  );
};

export default HapticBreathingGuide;