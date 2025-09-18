/**
 * FullMind Clinical Consent Interface Component
 * 
 * MBCT-compliant consent interface with mindful decision-making support
 * for clinical data export operations. Provides step-by-step consent process
 * with reflection prompts and therapeutic guidance.
 * 
 * Features:
 * - Mindful consent process with reflection prompts
 * - Risk education with clear implications explanation
 * - Granular consent controls for different data sensitivity levels
 * - MBCT principles integrated into consent flow
 * - Therapeutic context throughout decision-making
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  DataCategory,
  UserConsentRecord,
  ConsentLevel,
  ExportIntendedUse,
  MBCTConsentGuidance
} from '@/types/clinical-export';
import type { BaseComponentProps } from '@/types/components';

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

export interface ConsentInterfaceProps extends BaseComponentProps {
  dataCategories: DataCategory[];
  intendedUse: ExportIntendedUse;
  onConsentUpdate: (consent: UserConsentRecord) => void;
  mbctGuidance: MBCTConsentGuidance;
  initialConsent?: Partial<UserConsentRecord>;
  disabled?: boolean;
  showReflectionPrompts?: boolean;
  enableMindfulPacing?: boolean;
  onConsentComplete?: () => void;
}

interface ConsentStepState {
  currentStep: 'introduction' | 'understanding' | 'reflection' | 'granular' | 'confirmation';
  hasReadIntroduction: boolean;
  hasCompletedReflection: boolean;
  reflectionResponses: Record<string, string>;
  understandingConfirmed: boolean;
  granularChoicesMade: boolean;
}

interface GranularConsentState {
  assessmentData: ConsentLevel;
  moodTrackingData: ConsentLevel;
  sessionData: ConsentLevel;
  clinicalNotes: ConsentLevel;
  riskAssessments: ConsentLevel;
  therapeuticPlans: ConsentLevel;
  identifiableInformation: ConsentLevel;
}

// ============================================================================
// CONSENT CONFIGURATION
// ============================================================================

const DATA_CATEGORY_CONFIGS = {
  'assessment-scores': {
    label: 'Assessment Scores',
    description: 'PHQ-9, GAD-7, and other mental health assessment results',
    sensitivity: 'high',
    clinicalImportance: 'critical',
    mbctContext: 'These scores reflect your therapeutic progress and are valuable for clinical care.',
    examples: ['Depression severity scores', 'Anxiety level assessments', 'Risk evaluation results'],
    defaultConsent: 'full-consent' as ConsentLevel,
    icon: '📊',
    riskFactors: [
      'May reveal current mental health status',
      'Could affect insurance or employment if misused',
      'Valuable for healthcare providers for treatment planning'
    ]
  },
  'mood-tracking': {
    label: 'Mood Tracking Data',
    description: 'Daily mood entries, emotional patterns, and check-in responses',
    sensitivity: 'medium',
    clinicalImportance: 'high',
    mbctContext: 'Your mood patterns show your mindfulness journey and emotional awareness growth.',
    examples: ['Daily mood ratings', 'Emotional check-ins', 'Mindfulness practice reflections'],
    defaultConsent: 'full-consent' as ConsentLevel,
    icon: '💭',
    riskFactors: [
      'Shows personal emotional patterns over time',
      'May reveal triggers or stressful periods',
      'Helpful for identifying progress in therapy'
    ]
  },
  'session-data': {
    label: 'Practice Session Data',
    description: 'MBCT exercises, meditation sessions, and engagement metrics',
    sensitivity: 'low',
    clinicalImportance: 'medium',
    mbctContext: 'Session data demonstrates your commitment to mindfulness practice and skill development.',
    examples: ['Breathing exercise completions', 'Meditation session lengths', 'Practice consistency'],
    defaultConsent: 'limited-consent' as ConsentLevel,
    icon: '🧘',
    riskFactors: [
      'Shows engagement with mental health treatment',
      'Indicates frequency of app usage',
      'Generally less sensitive personal information'
    ]
  },
  'clinical-notes': {
    label: 'Clinical Notes & Reports',
    description: 'Professional observations, treatment recommendations, and clinical summaries',
    sensitivity: 'high',
    clinicalImportance: 'critical',
    mbctContext: 'Clinical notes provide professional context for your therapeutic journey.',
    examples: ['Therapist observations', 'Treatment plan updates', 'Progress summaries'],
    defaultConsent: 'full-consent' as ConsentLevel,
    icon: '📋',
    riskFactors: [
      'Contains professional clinical opinions',
      'May include diagnostic information',
      'Essential for continuity of care with providers'
    ]
  },
  'risk-assessments': {
    label: 'Risk & Safety Data',
    description: 'Crisis assessments, safety plans, and intervention recommendations',
    sensitivity: 'critical',
    clinicalImportance: 'critical',
    mbctContext: 'Risk data helps ensure your safety and guides appropriate clinical responses.',
    examples: ['Crisis button usage', 'Safety plan activations', 'Emergency contact triggers'],
    defaultConsent: 'no-consent' as ConsentLevel,
    icon: '⚠️',
    riskFactors: [
      'Highly sensitive safety and crisis information',
      'Could affect emergency response decisions',
      'Requires careful consideration before sharing'
    ]
  },
  'treatment-plans': {
    label: 'Treatment Plans',
    description: 'Therapeutic goals, intervention strategies, and care coordination notes',
    sensitivity: 'high',
    clinicalImportance: 'high',
    mbctContext: 'Treatment plans guide your therapeutic progress and recovery journey.',
    examples: ['MBCT practice goals', 'Therapeutic milestones', 'Care coordination notes'],
    defaultConsent: 'limited-consent' as ConsentLevel,
    icon: '🎯',
    riskFactors: [
      'Reveals specific treatment approaches',
      'May contain future care plans',
      'Important for provider coordination'
    ]
  }
} as const;

const REFLECTION_PROMPTS = [
  {
    id: 'purpose',
    question: 'What is your primary purpose for exporting this data?',
    guidance: 'Take a moment to consider why you want to share your therapeutic data. What outcome are you hoping for?',
    mbctPrinciple: 'Present-moment awareness of your intentions helps ensure mindful decision-making.'
  },
  {
    id: 'recipient',
    question: 'Who will you be sharing this data with, and why do you trust them?',
    guidance: 'Consider the relationship you have with the recipient and their qualifications to handle your mental health information.',
    mbctPrinciple: 'Mindful consideration of relationships helps protect your wellbeing and privacy.'
  },
  {
    id: 'outcomes',
    question: 'How do you hope this data sharing will help your mental health journey?',
    guidance: 'Reflect on the potential benefits and how this aligns with your therapeutic goals.',
    mbctPrinciple: 'Awareness of your hopes and expectations supports informed consent decisions.'
  },
  {
    id: 'concerns',
    question: 'Are there any concerns or worries you have about sharing this information?',
    guidance: 'It\'s natural to have concerns. Acknowledging them helps you make a fully informed decision.',
    mbctPrinciple: 'Non-judgmental awareness of concerns is part of mindful decision-making.'
  }
] as const;

const INTENDED_USE_GUIDANCE = {
  'therapeutic-sharing': {
    title: 'Sharing with Healthcare Provider',
    description: 'You intend to share this data with a licensed mental health professional for therapeutic purposes.',
    guidance: 'This is generally a beneficial use of your data that can improve your care quality.',
    recommendations: [
      'Ensure your provider is licensed and qualified',
      'Consider discussing your export with them beforehand',
      'Ask about their data security practices'
    ],
    riskLevel: 'low'
  },
  'personal-records': {
    title: 'Personal Record Keeping',
    description: 'You want to keep your own copy of your therapeutic data for personal use.',
    guidance: 'Having your own records can be empowering and useful for tracking progress.',
    recommendations: [
      'Store your data securely with encryption',
      'Be mindful of who has access to your devices',
      'Consider the long-term value of keeping this information'
    ],
    riskLevel: 'medium'
  },
  'research-participation': {
    title: 'Contributing to Research',
    description: 'You want to contribute your data to mental health research studies.',
    guidance: 'Research participation can help advance mental health treatment for everyone.',
    recommendations: [
      'Verify the research institution is legitimate',
      'Understand how your data will be anonymized',
      'Review the research study goals and methods'
    ],
    riskLevel: 'medium'
  },
  'clinical-consultation': {
    title: 'Clinical Consultation',
    description: 'You need a second opinion or consultation from another healthcare provider.',
    guidance: 'Seeking additional clinical perspectives can be valuable for complex cases.',
    recommendations: [
      'Ensure the consulting provider is appropriately licensed',
      'Consider discussing with your primary provider first',
      'Understand the consultation scope and limitations'
    ],
    riskLevel: 'low'
  },
  'system-migration': {
    title: 'Moving to Another Platform',
    description: 'You are transitioning to a different mental health platform or system.',
    guidance: 'Data portability helps maintain continuity in your care.',
    recommendations: [
      'Verify the new platform\'s security and privacy practices',
      'Understand what data formats they accept',
      'Consider keeping a backup of your data'
    ],
    riskLevel: 'medium'
  }
} as const;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConsentInterface({
  dataCategories,
  intendedUse,
  onConsentUpdate,
  mbctGuidance,
  initialConsent,
  disabled = false,
  showReflectionPrompts = true,
  enableMindfulPacing = true,
  onConsentComplete,
  className,
  'data-testid': testId,
  ...props
}: ConsentInterfaceProps) {
  const { colors, isDark, themeColors } = useTheme();

  // Consent process state
  const [stepState, setStepState] = useState<ConsentStepState>({
    currentStep: 'introduction',
    hasReadIntroduction: false,
    hasCompletedReflection: false,
    reflectionResponses: {},
    understandingConfirmed: false,
    granularChoicesMade: false
  });

  // Granular consent state
  const [granularConsent, setGranularConsent] = useState<GranularConsentState>(() => {
    const defaultState: GranularConsentState = {
      assessmentData: 'no-consent',
      moodTrackingData: 'no-consent',
      sessionData: 'no-consent',
      clinicalNotes: 'no-consent',
      riskAssessments: 'no-consent',
      therapeuticPlans: 'no-consent',
      identifiableInformation: 'no-consent'
    };

    // Apply initial consent if provided
    if (initialConsent?.granularConsent) {
      Object.entries(initialConsent.granularConsent).forEach(([category, level]) => {
        if (category in defaultState) {
          (defaultState as any)[category] = level;
        }
      });
    }

    return defaultState;
  });

  // Reading time tracking for mindful pacing
  const [readingStartTime, setReadingStartTime] = useState<number | null>(null);
  const [minimumReadingTime, setMinimumReadingTime] = useState(15000); // 15 seconds minimum

  // Current intended use configuration
  const useConfig = INTENDED_USE_GUIDANCE[intendedUse] || INTENDED_USE_GUIDANCE['personal-records'];

  // Check if user has spent enough time reading
  const hasSpentEnoughTimeReading = useMemo(() => {
    if (!enableMindfulPacing || !readingStartTime) return true;
    return Date.now() - readingStartTime >= minimumReadingTime;
  }, [enableMindfulPacing, readingStartTime, minimumReadingTime]);

  // Start reading timer when component mounts
  useEffect(() => {
    if (enableMindfulPacing && stepState.currentStep === 'introduction') {
      setReadingStartTime(Date.now());
    }
  }, [enableMindfulPacing, stepState.currentStep]);

  // Build consent record
  const buildConsentRecord = useCallback((): UserConsentRecord => {
    return {
      consentId: crypto.randomUUID() as any, // ConsentID
      userId: 'current-user' as any, // UserID
      consentType: intendedUse === 'therapeutic-sharing' ? 'therapeutic-sharing' : 'personal-records',
      dataCategories: dataCategories,
      exportPurpose: intendedUse,
      recipientInformation: {
        type: intendedUse === 'therapeutic-sharing' ? 'therapist' : 'self',
        name: 'To be specified',
        purpose: useConfig.description
      },
      consentGiven: stepState.currentStep === 'confirmation',
      consentTimestamp: new Date().toISOString() as any, // ISO8601Timestamp
      withdrawalMechanism: {
        method: 'app-settings',
        instructions: 'Consent can be withdrawn at any time through app settings',
        effectiveImmediately: true
      },
      granularConsent: granularConsent
    };
  }, [intendedUse, dataCategories, useConfig.description, stepState.currentStep, granularConsent]);

  // Handle step navigation
  const handleStepChange = useCallback((newStep: ConsentStepState['currentStep']) => {
    setStepState(prev => ({ ...prev, currentStep: newStep }));
    
    // Update consent record
    const updatedConsent = buildConsentRecord();
    onConsentUpdate(updatedConsent);
  }, [buildConsentRecord, onConsentUpdate]);

  // Handle granular consent changes
  const handleGranularConsentChange = useCallback((category: keyof GranularConsentState, level: ConsentLevel) => {
    setGranularConsent(prev => {
      const updated = { ...prev, [category]: level };
      
      // Update consent record
      const consentRecord = buildConsentRecord();
      consentRecord.granularConsent = updated;
      onConsentUpdate(consentRecord);
      
      return updated;
    });
  }, [buildConsentRecord, onConsentUpdate]);

  // Handle reflection responses
  const handleReflectionResponse = useCallback((promptId: string, response: string) => {
    setStepState(prev => ({
      ...prev,
      reflectionResponses: {
        ...prev.reflectionResponses,
        [promptId]: response
      }
    }));
  }, []);

  // Validate current step completion
  const isCurrentStepComplete = useMemo(() => {
    switch (stepState.currentStep) {
      case 'introduction':
        return stepState.hasReadIntroduction && hasSpentEnoughTimeReading;
      case 'understanding':
        return stepState.understandingConfirmed;
      case 'reflection':
        if (!showReflectionPrompts) return true;
        return REFLECTION_PROMPTS.every(prompt => 
          stepState.reflectionResponses[prompt.id]?.trim().length > 0
        );
      case 'granular':
        return dataCategories.every(category => {
          const key = category.replace('-', '') as keyof GranularConsentState;
          return granularConsent[key] !== 'no-consent';
        });
      case 'confirmation':
        return true;
      default:
        return false;
    }
  }, [stepState, hasSpentEnoughTimeReading, showReflectionPrompts, dataCategories, granularConsent]);

  // Handle final consent completion
  const handleConsentComplete = useCallback(() => {
    const finalConsent = buildConsentRecord();
    finalConsent.consentGiven = true;
    onConsentUpdate(finalConsent);
    onConsentComplete?.();
  }, [buildConsentRecord, onConsentUpdate, onConsentComplete]);

  // Render step content
  const renderStepContent = () => {
    switch (stepState.currentStep) {
      case 'introduction':
        return (
          <IntroductionStep
            intendedUse={intendedUse}
            useConfig={useConfig}
            mbctGuidance={mbctGuidance}
            hasSpentEnoughTimeReading={hasSpentEnoughTimeReading}
            minimumReadingTime={minimumReadingTime}
            onReadingComplete={() => setStepState(prev => ({ ...prev, hasReadIntroduction: true }))}
          />
        );

      case 'understanding':
        return (
          <UnderstandingStep
            dataCategories={dataCategories}
            useConfig={useConfig}
            onUnderstandingConfirmed={() => setStepState(prev => ({ ...prev, understandingConfirmed: true }))}
          />
        );

      case 'reflection':
        return (
          <ReflectionStep
            prompts={REFLECTION_PROMPTS}
            responses={stepState.reflectionResponses}
            onResponseChange={handleReflectionResponse}
            showReflectionPrompts={showReflectionPrompts}
          />
        );

      case 'granular':
        return (
          <GranularConsentStep
            dataCategories={dataCategories}
            granularConsent={granularConsent}
            onConsentChange={handleGranularConsentChange}
          />
        );

      case 'confirmation':
        return (
          <ConfirmationStep
            dataCategories={dataCategories}
            intendedUse={intendedUse}
            granularConsent={granularConsent}
            reflectionResponses={stepState.reflectionResponses}
            onFinalConfirm={handleConsentComplete}
          />
        );

      default:
        return null;
    }
  };

  const steps = [
    { id: 'introduction', label: 'Introduction', description: 'Understanding your export' },
    { id: 'understanding', label: 'Understanding', description: 'Data implications' },
    ...(showReflectionPrompts ? [{ id: 'reflection', label: 'Reflection', description: 'Mindful consideration' }] : []),
    { id: 'granular', label: 'Permissions', description: 'Detailed consent' },
    { id: 'confirmation', label: 'Confirmation', description: 'Final review' }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === stepState.currentStep);

  return (
    <div
      className={cn(
        'consent-interface w-full max-w-4xl mx-auto',
        'bg-bg-primary rounded-xl border border-border-primary',
        'shadow-medium overflow-hidden',
        className
      )}
      data-testid={testId}
      {...props}
    >
      {/* Progress Steps */}
      <div className="border-b border-border-primary bg-clinical-bg/5 px-6 py-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-3 text-sm',
                index === currentStepIndex ? 'text-clinical-text font-medium' : 'text-text-secondary',
                index < currentStepIndex ? 'text-theme-success' : ''
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                  index === currentStepIndex
                    ? 'bg-clinical-safe text-white'
                    : index < currentStepIndex
                    ? 'bg-theme-success text-white'
                    : 'bg-surface-depressed text-text-tertiary border border-border-primary'
                )}
              >
                {index < currentStepIndex ? '✓' : index + 1}
              </div>
              <div className="hidden md:block">
                <div className="font-medium">{step.label}</div>
                <div className="text-xs text-text-tertiary">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="border-t border-border-primary bg-bg-secondary px-6 py-4 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => {
            const prevIndex = Math.max(0, currentStepIndex - 1);
            handleStepChange(steps[prevIndex].id as any);
          }}
          disabled={currentStepIndex === 0 || disabled}
          className="min-w-[100px]"
        >
          Previous
        </Button>

        <div className="text-sm text-text-tertiary">
          Step {currentStepIndex + 1} of {steps.length}
        </div>

        {stepState.currentStep !== 'confirmation' ? (
          <Button
            variant="clinical"
            onClick={() => {
              const nextIndex = Math.min(steps.length - 1, currentStepIndex + 1);
              handleStepChange(steps[nextIndex].id as any);
            }}
            disabled={!isCurrentStepComplete || disabled}
            className="min-w-[100px]"
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="clinical"
            onClick={handleConsentComplete}
            disabled={disabled}
            className="min-w-[140px]"
          >
            Provide Consent
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface IntroductionStepProps {
  intendedUse: ExportIntendedUse;
  useConfig: any;
  mbctGuidance: MBCTConsentGuidance;
  hasSpentEnoughTimeReading: boolean;
  minimumReadingTime: number;
  onReadingComplete: () => void;
}

function IntroductionStep({ 
  intendedUse, 
  useConfig, 
  mbctGuidance, 
  hasSpentEnoughTimeReading, 
  minimumReadingTime,
  onReadingComplete 
}: IntroductionStepProps) {
  useEffect(() => {
    if (hasSpentEnoughTimeReading) {
      onReadingComplete();
    }
  }, [hasSpentEnoughTimeReading, onReadingComplete]);

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h4" className="mb-2">
          Data Export Consent Process
        </Typography>
        <Typography variant="body1" className="text-text-secondary">
          We want to ensure you make a mindful, informed decision about sharing your therapeutic data.
        </Typography>
      </div>

      <div className="bg-clinical-bg/5 border border-clinical-border rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">🧘</span>
          <div>
            <Typography variant="h6" className="text-clinical-text font-medium mb-2">
              MBCT Principle: Mindful Decision-Making
            </Typography>
            <Typography variant="body2" className="text-text-secondary">
              Take your time to consider this decision mindfully. There's no rush, and it's important that you feel
              comfortable and informed about sharing your therapeutic data.
            </Typography>
          </div>
        </div>
      </div>

      <div className="border border-border-primary rounded-lg p-6">
        <Typography variant="h6" className="font-medium mb-3">
          Your Export Purpose: {useConfig.title}
        </Typography>
        <Typography variant="body2" className="text-text-secondary mb-4">
          {useConfig.description}
        </Typography>
        
        <div className="bg-bg-secondary rounded-md p-4">
          <Typography variant="caption" className="text-text-clinical font-medium">
            Our Guidance:
          </Typography>
          <Typography variant="body2" className="text-text-secondary mt-1">
            {useConfig.guidance}
          </Typography>
        </div>
      </div>

      <div className="border border-border-primary rounded-lg p-6">
        <Typography variant="h6" className="font-medium mb-3">
          What This Process Involves
        </Typography>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-lg">📚</span>
            <div>
              <Typography variant="body2" className="font-medium">Understanding Your Data</Typography>
              <Typography variant="caption" className="text-text-secondary">
                We'll explain what types of data you have and what sharing them means.
              </Typography>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">💭</span>
            <div>
              <Typography variant="body2" className="font-medium">Mindful Reflection</Typography>
              <Typography variant="caption" className="text-text-secondary">
                A few questions to help you consider your motivations and concerns.
              </Typography>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">⚙️</span>
            <div>
              <Typography variant="body2" className="font-medium">Granular Control</Typography>
              <Typography variant="caption" className="text-text-secondary">
                You'll choose exactly what data to share and what to keep private.
              </Typography>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">✅</span>
            <div>
              <Typography variant="body2" className="font-medium">Final Confirmation</Typography>
              <Typography variant="caption" className="text-text-secondary">
                Review your choices and provide informed consent.
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {!hasSpentEnoughTimeReading && (
        <div className="bg-clinical-bg/5 border border-clinical-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-clinical-text">⏱️</span>
            <Typography variant="caption" className="text-clinical-text font-medium">
              Take Your Time
            </Typography>
          </div>
          <Typography variant="body2" className="text-text-secondary">
            Please take a moment to read through this information carefully. You can continue in{' '}
            {Math.ceil((minimumReadingTime - (Date.now() - (Date.now() - minimumReadingTime))) / 1000)} seconds.
          </Typography>
        </div>
      )}
    </div>
  );
}

interface UnderstandingStepProps {
  dataCategories: DataCategory[];
  useConfig: any;
  onUnderstandingConfirmed: () => void;
}

function UnderstandingStep({ dataCategories, useConfig, onUnderstandingConfirmed }: UnderstandingStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h4" className="mb-2">
          Understanding Your Data
        </Typography>
        <Typography variant="body1" className="text-text-secondary">
          Let's review what types of therapeutic data you have and what sharing them could mean.
        </Typography>
      </div>

      <div className="space-y-4">
        {dataCategories.map((category) => {
          const config = DATA_CATEGORY_CONFIGS[category];
          if (!config) return null;

          return (
            <div key={category} className="border border-border-primary rounded-lg p-6">
              <div className="flex items-start gap-4">
                <span className="text-2xl" role="img" aria-hidden="true">
                  {config.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Typography variant="h6" className="font-medium">
                      {config.label}
                    </Typography>
                    <span
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        config.sensitivity === 'critical'
                          ? 'bg-crisis-bg/10 text-crisis-text border border-crisis-border'
                          : config.sensitivity === 'high'
                          ? 'bg-clinical-safe/10 text-clinical-text border border-clinical-border'
                          : 'bg-theme-primary/10 text-theme-primary'
                      )}
                    >
                      {config.sensitivity.toUpperCase()} SENSITIVITY
                    </span>
                  </div>
                  
                  <Typography variant="body2" className="text-text-secondary mb-3">
                    {config.description}
                  </Typography>
                  
                  <div className="bg-clinical-bg/5 rounded-md p-3 mb-3">
                    <Typography variant="caption" className="text-clinical-text font-medium">
                      MBCT Context:
                    </Typography>
                    <Typography variant="body2" className="text-text-secondary mt-1">
                      {config.mbctContext}
                    </Typography>
                  </div>
                  
                  <div className="mb-3">
                    <Typography variant="caption" className="text-text-primary font-medium">
                      Examples include:
                    </Typography>
                    <ul className="list-disc list-inside mt-1 text-sm text-text-secondary">
                      {config.examples.map((example, index) => (
                        <li key={index}>{example}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="border-l-4 border-clinical-border pl-4">
                    <Typography variant="caption" className="text-clinical-text font-medium">
                      Sharing Considerations:
                    </Typography>
                    <ul className="list-disc list-inside mt-1 text-sm text-text-secondary">
                      {config.riskFactors.map((risk, index) => (
                        <li key={index}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-clinical-bg/5 border border-clinical-border rounded-lg p-6">
        <Typography variant="h6" className="text-clinical-text font-medium mb-3">
          Risk Level for Your Intended Use: {useConfig.riskLevel.toUpperCase()}
        </Typography>
        <Typography variant="body2" className="text-text-secondary mb-3">
          Based on your intended use ({useConfig.title.toLowerCase()}), here are our recommendations:
        </Typography>
        <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
          {useConfig.recommendations.map((rec: string, index: number) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      </div>

      <div className="border border-border-primary rounded-lg p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            onChange={(e) => e.target.checked && onUnderstandingConfirmed()}
            className="mt-1 w-5 h-5 text-clinical-safe border-border-primary rounded focus:ring-clinical-safe/50"
          />
          <div>
            <Typography variant="body1" className="font-medium mb-1">
              I understand the types of data I have and the implications of sharing them
            </Typography>
            <Typography variant="body2" className="text-text-secondary">
              By checking this box, you confirm that you've read and understood the information about your therapeutic data
              and what sharing it means for your privacy and care.
            </Typography>
          </div>
        </label>
      </div>
    </div>
  );
}

interface ReflectionStepProps {
  prompts: typeof REFLECTION_PROMPTS;
  responses: Record<string, string>;
  onResponseChange: (promptId: string, response: string) => void;
  showReflectionPrompts: boolean;
}

function ReflectionStep({ prompts, responses, onResponseChange, showReflectionPrompts }: ReflectionStepProps) {
  if (!showReflectionPrompts) {
    return (
      <div className="text-center py-8">
        <Typography variant="body1" className="text-text-secondary">
          Reflection prompts are disabled. Continue to the next step.
        </Typography>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h4" className="mb-2">
          Mindful Reflection
        </Typography>
        <Typography variant="body1" className="text-text-secondary">
          Take a moment to reflect on your decision to share your therapeutic data. This practice of mindful consideration
          helps ensure your choices align with your values and goals.
        </Typography>
      </div>

      <div className="bg-clinical-bg/5 border border-clinical-border rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🧘</span>
          <div>
            <Typography variant="h6" className="text-clinical-text font-medium mb-2">
              Present-Moment Awareness
            </Typography>
            <Typography variant="body2" className="text-text-secondary">
              Before proceeding, take three deep breaths and notice how you're feeling about this decision.
              There's no right or wrong answer—just honest reflection.
            </Typography>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="border border-border-primary rounded-lg p-6">
            <Typography variant="h6" className="font-medium mb-2">
              {prompt.question}
            </Typography>
            
            <Typography variant="body2" className="text-text-secondary mb-3">
              {prompt.guidance}
            </Typography>
            
            <div className="bg-clinical-bg/5 rounded-md p-3 mb-4">
              <Typography variant="caption" className="text-clinical-text font-medium">
                MBCT Principle:
              </Typography>
              <Typography variant="body2" className="text-text-secondary mt-1">
                {prompt.mbctPrinciple}
              </Typography>
            </div>
            
            <textarea
              value={responses[prompt.id] || ''}
              onChange={(e) => onResponseChange(prompt.id, e.target.value)}
              placeholder="Take your time to reflect and write your thoughts here..."
              className="w-full h-32 px-3 py-2 border border-border-primary rounded-md bg-bg-primary text-text-primary placeholder-text-tertiary focus:ring-2 focus:ring-clinical-safe/50 focus:border-clinical-safe resize-vertical"
              rows={4}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface GranularConsentStepProps {
  dataCategories: DataCategory[];
  granularConsent: GranularConsentState;
  onConsentChange: (category: keyof GranularConsentState, level: ConsentLevel) => void;
}

function GranularConsentStep({ dataCategories, granularConsent, onConsentChange }: GranularConsentStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h4" className="mb-2">
          Detailed Consent Preferences
        </Typography>
        <Typography variant="body1" className="text-text-secondary">
          For each type of data, choose your comfort level for sharing. You have complete control over what you share.
        </Typography>
      </div>

      <div className="space-y-4">
        {dataCategories.map((category) => {
          const config = DATA_CATEGORY_CONFIGS[category];
          if (!config) return null;

          const consentKey = category.replace('-', '') as keyof GranularConsentState;
          const currentLevel = granularConsent[consentKey];

          return (
            <div key={category} className="border border-border-primary rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <span className="text-xl" role="img" aria-hidden="true">
                  {config.icon}
                </span>
                <div className="flex-1">
                  <Typography variant="h6" className="font-medium mb-1">
                    {config.label}
                  </Typography>
                  <Typography variant="body2" className="text-text-secondary">
                    {config.description}
                  </Typography>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`consent-${category}`}
                    value="full-consent"
                    checked={currentLevel === 'full-consent'}
                    onChange={() => onConsentChange(consentKey, 'full-consent')}
                    className="mt-1 w-4 h-4 text-theme-success border-border-primary focus:ring-theme-success/50"
                  />
                  <div>
                    <Typography variant="body2" className="font-medium text-theme-success">
                      Full Consent - Include this data
                    </Typography>
                    <Typography variant="caption" className="text-text-secondary">
                      Share this data type with full details and context
                    </Typography>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`consent-${category}`}
                    value="limited-consent"
                    checked={currentLevel === 'limited-consent'}
                    onChange={() => onConsentChange(consentKey, 'limited-consent')}
                    className="mt-1 w-4 h-4 text-theme-primary border-border-primary focus:ring-theme-primary/50"
                  />
                  <div>
                    <Typography variant="body2" className="font-medium text-theme-primary">
                      Limited Consent - Include with restrictions
                    </Typography>
                    <Typography variant="caption" className="text-text-secondary">
                      Share summarized or anonymized version of this data
                    </Typography>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`consent-${category}`}
                    value="no-consent"
                    checked={currentLevel === 'no-consent'}
                    onChange={() => onConsentChange(consentKey, 'no-consent')}
                    className="mt-1 w-4 h-4 text-text-secondary border-border-primary focus:ring-text-secondary/50"
                  />
                  <div>
                    <Typography variant="body2" className="font-medium text-text-secondary">
                      No Consent - Do not include this data
                    </Typography>
                    <Typography variant="caption" className="text-text-secondary">
                      Keep this data private and exclude it from export
                    </Typography>
                  </div>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ConfirmationStepProps {
  dataCategories: DataCategory[];
  intendedUse: ExportIntendedUse;
  granularConsent: GranularConsentState;
  reflectionResponses: Record<string, string>;
  onFinalConfirm: () => void;
}

function ConfirmationStep({ 
  dataCategories, 
  intendedUse, 
  granularConsent, 
  reflectionResponses, 
  onFinalConfirm 
}: ConfirmationStepProps) {
  const useConfig = INTENDED_USE_GUIDANCE[intendedUse];
  const includedDataTypes = Object.entries(granularConsent)
    .filter(([_, level]) => level !== 'no-consent')
    .map(([category]) => category);

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h4" className="mb-2">
          Final Consent Confirmation
        </Typography>
        <Typography variant="body1" className="text-text-secondary">
          Please review your choices one final time before providing consent for this data export.
        </Typography>
      </div>

      <div className="grid gap-6">
        {/* Export Purpose */}
        <div className="border border-border-primary rounded-lg p-6">
          <Typography variant="h6" className="font-medium mb-3">
            Export Purpose
          </Typography>
          <Typography variant="body2" className="text-text-secondary">
            {useConfig.title}: {useConfig.description}
          </Typography>
        </div>

        {/* Data to be Included */}
        <div className="border border-border-primary rounded-lg p-6">
          <Typography variant="h6" className="font-medium mb-3">
            Data to be Included ({includedDataTypes.length} categories)
          </Typography>
          <div className="space-y-2">
            {includedDataTypes.map((category) => {
              const level = granularConsent[category as keyof GranularConsentState];
              const config = DATA_CATEGORY_CONFIGS[category as DataCategory];
              
              return config ? (
                <div key={category} className="flex items-center gap-3">
                  <span className="text-sm" role="img" aria-hidden="true">
                    {config.icon}
                  </span>
                  <Typography variant="body2">{config.label}</Typography>
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      level === 'full-consent'
                        ? 'bg-theme-success/10 text-theme-success'
                        : 'bg-theme-primary/10 text-theme-primary'
                    )}
                  >
                    {level === 'full-consent' ? 'Full' : 'Limited'}
                  </span>
                </div>
              ) : null;
            })}
          </div>
        </div>

        {/* Reflection Summary */}
        {Object.keys(reflectionResponses).length > 0 && (
          <div className="border border-border-primary rounded-lg p-6">
            <Typography variant="h6" className="font-medium mb-3">
              Your Reflections
            </Typography>
            <Typography variant="body2" className="text-text-secondary">
              You've thoughtfully considered your motivations and concerns. Your reflections will help guide
              appropriate use of your therapeutic data.
            </Typography>
          </div>
        )}
      </div>

      {/* Final Legal Statement */}
      <div className="bg-clinical-bg/5 border border-clinical-border rounded-lg p-6">
        <Typography variant="h6" className="text-clinical-text font-medium mb-3">
          Your Rights and Protections
        </Typography>
        <div className="space-y-2 text-sm text-text-secondary">
          <p>• You can withdraw this consent at any time through your app settings</p>
          <p>• Your data will be processed according to our privacy policy and applicable data protection laws</p>
          <p>• You have the right to request deletion of your exported data from recipients when technically feasible</p>
          <p>• This consent applies only to this specific export and does not authorize future data sharing</p>
        </div>
      </div>
    </div>
  );
}