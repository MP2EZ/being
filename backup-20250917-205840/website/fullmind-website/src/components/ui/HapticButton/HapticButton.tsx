/**
 * FullMind Haptic Button Component
 * Accessibility-enhanced button with therapeutic haptic feedback
 * WCAG AA compliant with mental health safety considerations
 */

'use client';

import React, { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { useHapticAccessibilityContext } from '@/hooks/useHapticAccessibility';
import type { 
  TherapeuticHapticPattern,
  HapticAccessibleProps 
} from '@/types/haptic-accessibility';

// ============================================================================
// HAPTIC BUTTON COMPONENT INTERFACE
// ============================================================================

interface HapticButtonProps extends Omit<ButtonProps, 'onClick'>, HapticAccessibleProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  hapticOnPress?: boolean;
  hapticOnSuccess?: boolean;
  hapticOnError?: boolean;
  customHapticPatterns?: {
    onPress?: TherapeuticHapticPattern;
    onSuccess?: TherapeuticHapticPattern;
    onError?: TherapeuticHapticPattern;
  };
  therapeuticContext?: 'breathing' | 'grounding' | 'crisis' | 'assessment' | 'general';
  disabled?: boolean;
  loading?: boolean;
  'aria-describedby'?: string;
}

// ============================================================================
// DEFAULT HAPTIC PATTERNS FOR BUTTON INTERACTIONS
// ============================================================================

const DEFAULT_HAPTIC_PATTERNS = {
  onPress: {
    id: 'button-press',
    name: 'Button Press Confirmation',
    mbctPurpose: 'focus-anchor' as const,
    pattern: [
      { type: 'tap' as const, delay: 0, duration: 50, intensity: 0.6, location: 'device' as const }
    ],
    duration: 50,
    intensity: 0.6,
    accessibilityMetadata: {
      description: 'Brief confirmation tap on button press',
      screenReaderAnnouncement: 'Button activated',
      visualAlternative: 'Button press animation with scale feedback',
    },
    traumaInformed: true,
    anxietyFriendly: true,
  },

  onSuccess: {
    id: 'success-confirmation',
    name: 'Success Confirmation',
    mbctPurpose: 'focus-anchor' as const,
    pattern: [
      { type: 'pulse' as const, delay: 0, duration: 100, intensity: 0.4, location: 'device' as const },
      { type: 'tap' as const, delay: 150, duration: 50, intensity: 0.3, location: 'device' as const }
    ],
    duration: 200,
    intensity: 0.4,
    accessibilityMetadata: {
      description: 'Gentle success pattern with pulse and tap',
      screenReaderAnnouncement: 'Action completed successfully',
      visualAlternative: 'Success checkmark animation with green highlight',
    },
    traumaInformed: true,
    anxietyFriendly: true,
  },

  onError: {
    id: 'error-alert',
    name: 'Error Alert',
    mbctPurpose: 'focus-anchor' as const,
    pattern: [
      { type: 'buzz' as const, delay: 0, duration: 200, intensity: 0.5, location: 'device' as const }
    ],
    duration: 200,
    intensity: 0.5,
    accessibilityMetadata: {
      description: 'Attention-grabbing buzz for errors',
      screenReaderAnnouncement: 'Error occurred, please check your input',
      visualAlternative: 'Error shake animation with red highlight',
    },
    traumaInformed: true,
    anxietyFriendly: false, // Errors need attention even for anxiety-friendly users
  },

  crisis: {
    id: 'crisis-confirmation',
    name: 'Crisis Action Confirmation',
    mbctPurpose: 'focus-anchor' as const,
    pattern: [
      { type: 'pulse' as const, delay: 0, duration: 300, intensity: 0.8, location: 'device' as const },
      { type: 'tap' as const, delay: 350, duration: 100, intensity: 0.7, location: 'device' as const },
      { type: 'tap' as const, delay: 500, duration: 100, intensity: 0.7, location: 'device' as const }
    ],
    duration: 600,
    intensity: 0.8,
    accessibilityMetadata: {
      description: 'Strong confirmation pattern for crisis actions',
      screenReaderAnnouncement: 'Crisis support action activated. Help is being accessed.',
      visualAlternative: 'Strong visual feedback with crisis button highlighting',
    },
    traumaInformed: false, // Crisis patterns override trauma preferences for safety
    anxietyFriendly: false, // Crisis patterns prioritize attention over anxiety comfort
  },

  breathing: {
    id: 'breathing-start',
    name: 'Breathing Exercise Start',
    mbctPurpose: 'breathing-guide' as const,
    pattern: [
      { type: 'pulse' as const, delay: 0, duration: 1000, intensity: 0.3, location: 'device' as const }
    ],
    duration: 1000,
    intensity: 0.3,
    accessibilityMetadata: {
      description: 'Gentle pulse to begin breathing exercise',
      screenReaderAnnouncement: 'Beginning mindful breathing exercise. Follow the gentle rhythm.',
      visualAlternative: 'Breathing circle begins expanding animation',
      audioAlternative: 'Soft chime indicating breathing start',
    },
    traumaInformed: true,
    anxietyFriendly: true,
  },

  assessment: {
    id: 'assessment-submit',
    name: 'Assessment Submission',
    mbctPurpose: 'focus-anchor' as const,
    pattern: [
      { type: 'tap' as const, delay: 0, duration: 75, intensity: 0.5, location: 'device' as const },
      { type: 'tap' as const, delay: 150, duration: 75, intensity: 0.4, location: 'device' as const }
    ],
    duration: 225,
    intensity: 0.5,
    accessibilityMetadata: {
      description: 'Double-tap confirmation for assessment submission',
      screenReaderAnnouncement: 'Assessment response recorded. Thank you for sharing.',
      visualAlternative: 'Progress indicator with completion animation',
    },
    traumaInformed: true,
    anxietyFriendly: true,
  },
} as const;

// ============================================================================
// HAPTIC BUTTON COMPONENT
// ============================================================================

export const HapticButton = React.forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({
    children,
    onClick,
    hapticPattern,
    hapticOnPress = true,
    hapticOnSuccess = false,
    hapticOnError = false,
    customHapticPatterns,
    therapeuticContext = 'general',
    requiresBodyConsent = true,
    traumaInformed = true,
    providesAlternatives,
    emergencyOverride = false,
    onHapticConsent,
    onHapticStart,
    onHapticComplete,
    ariaHapticDescription,
    disabled = false,
    loading = false,
    className,
    'aria-describedby': ariaDescribedBy,
    ...props
  }, ref) => {
    const {
      playAccessibleHaptic,
      announceHapticToScreenReader,
      hapticPreferences,
      hapticCapabilities,
    } = useHapticAccessibilityContext();
    
    const lastClickTime = useRef<number>(0);

    // Generate unique ID for haptic description
    const hapticDescriptionId = React.useId();
    const combinedAriaDescribedBy = [ariaDescribedBy, hapticDescriptionId].filter(Boolean).join(' ');

    // Select appropriate haptic pattern based on context
    const getHapticPattern = useCallback((
      action: 'press' | 'success' | 'error'
    ): TherapeuticHapticPattern => {
      // Use custom patterns if provided
      if (customHapticPatterns?.[`on${action.charAt(0).toUpperCase()}${action.slice(1)}` as keyof typeof customHapticPatterns]) {
        return customHapticPatterns[`on${action.charAt(0).toUpperCase()}${action.slice(1)}` as keyof typeof customHapticPatterns]!;
      }

      // Use context-specific patterns
      if (therapeuticContext === 'crisis' && action === 'press') {
        return DEFAULT_HAPTIC_PATTERNS.crisis;
      }
      
      if (therapeuticContext === 'breathing' && action === 'press') {
        return DEFAULT_HAPTIC_PATTERNS.breathing;
      }
      
      if (therapeuticContext === 'assessment' && action === 'press') {
        return DEFAULT_HAPTIC_PATTERNS.assessment;
      }

      // Default patterns
      return DEFAULT_HAPTIC_PATTERNS[`on${action.charAt(0).toUpperCase()}${action.slice(1)}` as keyof typeof DEFAULT_HAPTIC_PATTERNS];
    }, [customHapticPatterns, therapeuticContext]);

    // Handle button click with haptic feedback
    const handleClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent double-clicks within 300ms (accessibility best practice)
      const now = Date.now();
      if (now - lastClickTime.current < 300) {
        return;
      }
      lastClickTime.current = now;

      // Play press haptic if enabled
      if (hapticOnPress && !disabled && !loading) {
        const pattern = hapticPattern || getHapticPattern('press');
        
        try {
          onHapticStart?.();
          
          await playAccessibleHaptic(pattern, {
            respectConsent: requiresBodyConsent && !emergencyOverride,
            emergencyOverride: emergencyOverride && (therapeuticContext === 'crisis'),
            announceToScreenReader: false, // We'll handle announcement separately
          });
          
          // Announce haptic feedback to screen reader users
          if (hapticCapabilities.supportsHaptics && hapticPreferences.hapticEnabled) {
            announceHapticToScreenReader(pattern);
          }
          
          onHapticComplete?.();
          
        } catch (error) {
          console.warn('Haptic feedback failed:', error);
        }
      }

      // Call original onClick handler
      onClick?.(event);
    }, [
      hapticOnPress,
      disabled,
      loading,
      hapticPattern,
      getHapticPattern,
      requiresBodyConsent,
      emergencyOverride,
      therapeuticContext,
      playAccessibleHaptic,
      hapticCapabilities,
      hapticPreferences,
      announceHapticToScreenReader,
      onHapticStart,
      onHapticComplete,
      onClick,
    ]);

    // Public methods for external success/error haptic triggers
    const triggerSuccessHaptic = useCallback(async () => {
      if (hapticOnSuccess) {
        const pattern = getHapticPattern('success');
        await playAccessibleHaptic(pattern);
        announceHapticToScreenReader(pattern);
      }
    }, [hapticOnSuccess, getHapticPattern, playAccessibleHaptic, announceHapticToScreenReader]);

    const triggerErrorHaptic = useCallback(async () => {
      if (hapticOnError) {
        const pattern = getHapticPattern('error');
        await playAccessibleHaptic(pattern, {
          emergencyOverride: true, // Error feedback is important for accessibility
        });
        announceHapticToScreenReader(pattern);
      }
    }, [hapticOnError, getHapticPattern, playAccessibleHaptic, announceHapticToScreenReader]);

    // Expose methods to parent components via ref
    React.useImperativeHandle(ref, () => ({
      ...document.createElement('button'),
      triggerSuccessHaptic,
      triggerErrorHaptic,
      focus: () => {
        // Enhanced focus management
        if (ref && 'current' in ref && ref.current) {
          ref.current.focus();
        }
      },
    }));

    return (
      <>
        <Button
          ref={ref as React.Ref<HTMLButtonElement>}
          onClick={handleClick}
          disabled={disabled}
          loading={loading}
          className={cn(
            // Base haptic button styling
            'haptic-button transition-all duration-200',
            
            // Therapeutic context styling
            therapeuticContext === 'crisis' && 'focus:ring-crisis-bg/50 hover:shadow-crisis',
            therapeuticContext === 'breathing' && 'focus:ring-clinical-safe/50',
            therapeuticContext === 'assessment' && 'focus:ring-theme-primary/50',
            
            // Enhanced focus for haptic buttons (accessibility)
            'focus:ring-4 focus:ring-offset-2',
            
            // Visual feedback enhancement for haptic buttons
            'active:scale-95 hover:shadow-medium',
            
            className
          )}
          aria-describedby={combinedAriaDescribedBy}
          data-haptic-enabled={hapticPreferences.hapticEnabled}
          data-therapeutic-context={therapeuticContext}
          data-testid={props['data-testid'] || 'haptic-button'}
          {...props}
        >
          {children}
        </Button>

        {/* Hidden haptic description for screen readers */}
        <div id={hapticDescriptionId} className="sr-only">
          {ariaHapticDescription}
          {hapticPreferences.hapticEnabled && hapticCapabilities.supportsHaptics
            ? ` This button provides haptic feedback when activated.`
            : ` Haptic feedback alternatives are available through visual and audio cues.`
          }
          {requiresBodyConsent && !hapticPreferences.bodyConsentGiven
            ? ` You will be asked for consent before any haptic feedback is provided.`
            : ``
          }
          {traumaInformed 
            ? ` This interaction is designed to be trauma-informed and respectful of your boundaries.`
            : ``
          }
        </div>

        {/* Alternative feedback indicators (always present for accessibility) */}
        {providesAlternatives && (
          <div className="sr-only" aria-live="polite" id={`${hapticDescriptionId}-alternatives`}>
            Visual alternative: {typeof providesAlternatives.visual === 'string' 
              ? providesAlternatives.visual 
              : 'Interactive visual feedback'
            }
            {providesAlternatives.audio && (
              <>. Audio alternative: {typeof providesAlternatives.audio === 'string'
                ? providesAlternatives.audio
                : 'Audio feedback available'
              }</>
            )}
            . Text description: {providesAlternatives.textual}
          </div>
        )}
      </>
    );
  }
);

HapticButton.displayName = 'HapticButton';

// ============================================================================
// SPECIALIZED HAPTIC BUTTON VARIANTS
// ============================================================================

export const CrisisHapticButton = React.forwardRef<HTMLButtonElement, Omit<HapticButtonProps, 'therapeuticContext' | 'emergencyOverride'>>(
  (props, ref) => (
    <HapticButton
      {...props}
      ref={ref}
      therapeuticContext="crisis"
      emergencyOverride={true}
      requiresBodyConsent={false} // Crisis situations override consent requirements
      traumaInformed={false} // Crisis safety takes precedence
      ariaHapticDescription="Crisis support button with immediate haptic confirmation for emergency situations"
      providesAlternatives={{
        visual: 'Strong visual feedback with crisis styling and color changes',
        audio: 'Emergency confirmation sound',
        textual: 'Immediate visual confirmation of crisis support activation',
      }}
    />
  )
);

CrisisHapticButton.displayName = 'CrisisHapticButton';

export const BreathingHapticButton = React.forwardRef<HTMLButtonElement, Omit<HapticButtonProps, 'therapeuticContext'>>(
  (props, ref) => (
    <HapticButton
      {...props}
      ref={ref}
      therapeuticContext="breathing"
      traumaInformed={true}
      requiresBodyConsent={true}
      ariaHapticDescription="Breathing exercise button with gentle haptic guidance for mindfulness practice"
      providesAlternatives={{
        visual: 'Breathing circle animation with smooth expansion and contraction',
        audio: 'Gentle breathing guidance chimes',
        textual: 'Visual breathing guide with timing indicators',
      }}
    />
  )
);

BreathingHapticButton.displayName = 'BreathingHapticButton';

export const AssessmentHapticButton = React.forwardRef<HTMLButtonElement, Omit<HapticButtonProps, 'therapeuticContext'>>(
  (props, ref) => (
    <HapticButton
      {...props}
      ref={ref}
      therapeuticContext="assessment"
      traumaInformed={true}
      requiresBodyConsent={true}
      ariaHapticDescription="Assessment response button with gentle confirmation haptic feedback"
      providesAlternatives={{
        visual: 'Response confirmation animation with progress indication',
        textual: 'Assessment response recorded with progress feedback',
      }}
    />
  )
);

AssessmentHapticButton.displayName = 'AssessmentHapticButton';

// ============================================================================
// EXPORT ALL COMPONENTS
// ============================================================================

export default HapticButton;