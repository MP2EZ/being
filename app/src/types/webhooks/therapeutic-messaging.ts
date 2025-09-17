/**
 * Therapeutic Messaging Type System for FullMind MBCT App
 *
 * MBCT-compliant communication types ensuring:
 * - Anxiety-reducing language patterns
 * - Mindful communication principles
 * - Crisis-sensitive messaging
 * - Therapeutic effectiveness preservation
 * - Non-judgmental, compassionate tone
 */

import { z } from 'zod';
import { CrisisLevel } from './crisis-safety-types';

/**
 * MBCT Language Principles
 */
export const MBCTLanguagePrinciplesSchema = z.object({
  mindful: z.boolean().default(true),         // Present-moment awareness
  nonJudgmental: z.boolean().default(true),   // No judgment or criticism
  compassionate: z.boolean().default(true),   // Self-compassion focus
  anxietyReducing: z.boolean().default(true), // Reduces anxiety/stress
  empowering: z.boolean().default(true),      // Promotes self-efficacy
  therapeutic: z.boolean().default(true),     // Therapeutically appropriate
});

export type MBCTLanguagePrinciples = z.infer<typeof MBCTLanguagePrinciplesSchema>;

/**
 * Message Context for Therapeutic Appropriateness
 */
export const MessageContextSchema = z.object({
  userState: z.enum([
    'stable',
    'monitoring',
    'concerning',
    'at_risk',
    'crisis',
    'emergency'
  ]),
  sessionContext: z.enum([
    'none',
    'meditation',
    'breathing',
    'body_scan',
    'mindful_movement',
    'assessment',
    'check_in',
    'crisis_intervention'
  ]).optional(),
  emotionalState: z.enum([
    'neutral',
    'positive',
    'anxious',
    'depressed',
    'overwhelmed',
    'distressed',
    'panicked'
  ]).optional(),
  urgency: z.enum(['low', 'moderate', 'high', 'urgent', 'emergency']),
  therapeuticPhase: z.enum([
    'onboarding',
    'engagement',
    'skill_building',
    'practice',
    'integration',
    'maintenance',
    'crisis_support'
  ]).optional(),
});

export type MessageContext = z.infer<typeof MessageContextSchema>;

/**
 * Therapeutic Message Categories
 */
export const TherapeuticMessageTypeSchema = z.enum([
  // Informational
  'guidance',           // General guidance and direction
  'education',          // Educational content
  'reminder',           // Gentle reminders

  // Emotional Support
  'encouragement',      // Positive reinforcement
  'validation',         // Emotional validation
  'compassion',         // Self-compassion messaging
  'reassurance',        // Calming reassurance

  // Crisis Support
  'crisis_support',     // Crisis intervention messaging
  'safety_planning',    // Safety planning guidance
  'emergency_guidance', // Emergency situation guidance
  'grounding',          // Grounding techniques

  // Technical
  'system_notification', // System updates
  'error_recovery',     // Error handling
  'payment_guidance',   // Payment-related messaging
  'access_notification', // Access changes

  // Therapeutic Practice
  'mindfulness_cue',    // Mindfulness practice cues
  'breathing_guidance', // Breathing exercise guidance
  'meditation_support', // Meditation support
  'progress_celebration', // Celebrating progress
]);

export type TherapeuticMessageType = z.infer<typeof TherapeuticMessageTypeSchema>;

/**
 * Crisis-Sensitive Messaging
 */
export const CrisisSensitiveMessageSchema = z.object({
  crisisLevel: z.nativeEnum({
    none: 'none',
    watch: 'watch',
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'critical',
    emergency: 'emergency'
  } as const),
  immediateSupport: z.boolean(),
  emergencyResources: z.boolean(),
  professionalReferral: z.boolean(),
  safetyPriority: z.boolean(),
  gentleLanguage: z.boolean().default(true),
  hopefulTone: z.boolean().default(true),
  actionOriented: z.boolean(),
});

export type CrisisSensitiveMessage = z.infer<typeof CrisisSensitiveMessageSchema>;

/**
 * Payment-Related Therapeutic Messaging
 */
export const PaymentTherapeuticMessageSchema = z.object({
  type: z.enum([
    'payment_success',
    'payment_failure',
    'subscription_renewal',
    'trial_ending',
    'grace_period_start',
    'grace_period_ending',
    'access_restoration',
    'crisis_bypass'
  ]),
  reassurance: z.object({
    accessContinuity: z.boolean(),
    therapeuticSupport: z.boolean(),
    crisisProtection: z.boolean(),
    noJudgment: z.boolean(),
  }),
  actionGuidance: z.object({
    immediate: z.array(z.string()),
    optional: z.array(z.string()),
    supportResources: z.array(z.string()),
  }),
  emotionalSupport: z.object({
    validation: z.string(),
    encouragement: z.string(),
    perspective: z.string(),
  }),
});

export type PaymentTherapeuticMessage = z.infer<typeof PaymentTherapeuticMessageSchema>;

/**
 * Therapeutic Message Structure
 */
export const TherapeuticMessageSchema = z.object({
  id: z.string(),
  type: TherapeuticMessageTypeSchema,
  context: MessageContextSchema,
  language: MBCTLanguagePrinciplesSchema,
  crisis: CrisisSensitiveMessageSchema.optional(),

  content: z.object({
    title: z.string(),
    message: z.string(),
    tone: z.enum(['gentle', 'supportive', 'encouraging', 'calming', 'urgent_gentle']),
    length: z.enum(['brief', 'concise', 'detailed', 'comprehensive']),
  }),

  therapeutic: z.object({
    mindfulnessElement: z.string().optional(),
    breathingCue: z.string().optional(),
    groundingElement: z.string().optional(),
    selfCompassionCue: z.string().optional(),
  }),

  actions: z.array(z.object({
    label: z.string(),
    action: z.string(),
    therapeutic: z.boolean(),
    priority: z.enum(['primary', 'secondary', 'tertiary']),
    crisisAppropriate: z.boolean(),
  })).optional(),

  timing: z.object({
    immediate: z.boolean(),
    delayMs: z.number().optional(),
    contextDependent: z.boolean(),
    crisisOverride: z.boolean(),
  }),

  accessibility: z.object({
    screenReader: z.boolean().default(true),
    highContrast: z.boolean().default(true),
    largeText: z.boolean().default(true),
    voiceOver: z.boolean().default(true),
  }),
});

export type TherapeuticMessage = z.infer<typeof TherapeuticMessageSchema>;

/**
 * Message Template System
 */
export interface TherapeuticMessageTemplate {
  id: string;
  category: TherapeuticMessageType;
  variables: string[];
  template: {
    title: string;
    message: string;
    therapeutic?: {
      mindfulnessElement?: string;
      breathingCue?: string;
      groundingElement?: string;
      selfCompassionCue?: string;
    };
  };
  contexts: MessageContext['userState'][];
  crisisLevels: CrisisLevel[];
  mbctPrinciples: MBCTLanguagePrinciples;
}

/**
 * Pre-defined MBCT-Compliant Message Templates
 */
export const THERAPEUTIC_MESSAGE_TEMPLATES: Record<string, TherapeuticMessageTemplate> = {
  // Payment-related templates
  PAYMENT_FAILURE_GENTLE: {
    id: 'payment_failure_gentle',
    category: 'payment_guidance',
    variables: ['gracePeriodDays'],
    template: {
      title: 'Your journey continues',
      message: 'Your payment couldn\'t be processed right now, and that\'s okay. Your therapeutic journey and crisis support remain fully available for the next {gracePeriodDays} days. Take a mindful breath - you have time and support.',
      therapeutic: {
        breathingCue: 'Take three deep breaths. You are supported.',
        selfCompassionCue: 'Financial challenges are part of life. Be kind to yourself.',
      },
    },
    contexts: ['stable', 'monitoring', 'concerning'],
    crisisLevels: ['none', 'watch', 'low'],
    mbctPrinciples: {
      mindful: true,
      nonJudgmental: true,
      compassionate: true,
      anxietyReducing: true,
      empowering: true,
      therapeutic: true,
    },
  },

  PAYMENT_FAILURE_CRISIS: {
    id: 'payment_failure_crisis',
    category: 'crisis_support',
    variables: [],
    template: {
      title: 'You are safe and supported',
      message: 'Your support continues without interruption. Financial stress can feel overwhelming, but your therapeutic tools and crisis resources remain fully available. You matter, and help is here.',
      therapeutic: {
        groundingElement: 'Notice five things you can see, four you can hear, three you can touch.',
        breathingCue: 'Breathe with me: in for 4, hold for 4, out for 6.',
        selfCompassionCue: 'Place your hand on your heart. You deserve care and support.',
      },
    },
    contexts: ['at_risk', 'crisis', 'emergency'],
    crisisLevels: ['medium', 'high', 'critical', 'emergency'],
    mbctPrinciples: {
      mindful: true,
      nonJudgmental: true,
      compassionate: true,
      anxietyReducing: true,
      empowering: true,
      therapeutic: true,
    },
  },

  GRACE_PERIOD_START: {
    id: 'grace_period_start',
    category: 'guidance',
    variables: ['gracePeriodDays'],
    template: {
      title: 'Continuing your mindful journey',
      message: 'Your therapeutic access continues seamlessly for {gracePeriodDays} days. This mindful pause gives you time to resolve any payment concerns while maintaining your wellbeing practices.',
      therapeutic: {
        mindfulnessElement: 'This moment of transition is part of your journey.',
        selfCompassionCue: 'Treat yourself with the same kindness you would offer a good friend.',
      },
    },
    contexts: ['stable', 'monitoring', 'concerning'],
    crisisLevels: ['none', 'watch', 'low', 'medium'],
    mbctPrinciples: {
      mindful: true,
      nonJudgmental: true,
      compassionate: true,
      anxietyReducing: true,
      empowering: true,
      therapeutic: true,
    },
  },

  CRISIS_EMERGENCY_ACCESS: {
    id: 'crisis_emergency_access',
    category: 'emergency_guidance',
    variables: [],
    template: {
      title: 'Immediate support activated',
      message: 'All your therapeutic tools and crisis resources are immediately available. You are not alone. Professional support: 988 (Crisis Lifeline). Your safety and wellbeing are the priority.',
      therapeutic: {
        groundingElement: 'You are here, you are present, you are safe in this moment.',
        breathingCue: 'Breathe slowly: in through nose, out through mouth.',
      },
    },
    contexts: ['crisis', 'emergency'],
    crisisLevels: ['critical', 'emergency'],
    mbctPrinciples: {
      mindful: true,
      nonJudgmental: true,
      compassionate: true,
      anxietyReducing: true,
      empowering: true,
      therapeutic: true,
    },
  },

  SUBSCRIPTION_RENEWAL_SUCCESS: {
    id: 'subscription_renewal_success',
    category: 'progress_celebration',
    variables: [],
    template: {
      title: 'Your commitment continues',
      message: 'Your subscription has renewed successfully. This commitment to your wellbeing is an act of self-care and mindful intention. Your journey of growth continues.',
      therapeutic: {
        mindfulnessElement: 'Take a moment to appreciate your dedication to healing.',
        selfCompassionCue: 'Acknowledge this investment in yourself with kindness.',
      },
    },
    contexts: ['stable', 'monitoring'],
    crisisLevels: ['none', 'watch'],
    mbctPrinciples: {
      mindful: true,
      nonJudgmental: true,
      compassionate: true,
      anxietyReducing: true,
      empowering: true,
      therapeutic: true,
    },
  },

  TRIAL_ENDING_GENTLE: {
    id: 'trial_ending_gentle',
    category: 'guidance',
    variables: ['trialDaysRemaining'],
    template: {
      title: 'Your trial journey concludes soon',
      message: 'Your trial has {trialDaysRemaining} days remaining. Whatever you choose next, the mindfulness skills you\'ve practiced are yours to keep. Consider how this journey has supported your wellbeing.',
      therapeutic: {
        mindfulnessElement: 'Reflect mindfully on your experience without judgment.',
        selfCompassionCue: 'Honor the courage it took to begin this journey.',
      },
    },
    contexts: ['stable', 'monitoring'],
    crisisLevels: ['none', 'watch', 'low'],
    mbctPrinciples: {
      mindful: true,
      nonJudgmental: true,
      compassionate: true,
      anxietyReducing: true,
      empowering: true,
      therapeutic: true,
    },
  },
};

/**
 * Message Builder Functions
 */
export const buildTherapeuticMessage = (
  templateId: string,
  variables: Record<string, string | number> = {},
  context: MessageContext,
  crisisLevel: CrisisLevel = 'none'
): TherapeuticMessage => {
  const template = THERAPEUTIC_MESSAGE_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Therapeutic message template '${templateId}' not found`);
  }

  // Validate context appropriateness
  if (!template.contexts.includes(context.userState)) {
    throw new Error(`Template '${templateId}' not appropriate for user state '${context.userState}'`);
  }

  if (!template.crisisLevels.includes(crisisLevel)) {
    throw new Error(`Template '${templateId}' not appropriate for crisis level '${crisisLevel}'`);
  }

  // Replace variables in template
  let title = template.template.title;
  let message = template.template.message;

  Object.entries(variables).forEach(([key, value]) => {
    title = title.replace(new RegExp(`{${key}}`, 'g'), String(value));
    message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });

  return {
    id: `${templateId}_${Date.now()}`,
    type: template.category,
    context,
    language: template.mbctPrinciples,
    crisis: crisisLevel !== 'none' ? {
      crisisLevel,
      immediateSupport: ['critical', 'emergency'].includes(crisisLevel),
      emergencyResources: ['high', 'critical', 'emergency'].includes(crisisLevel),
      professionalReferral: ['critical', 'emergency'].includes(crisisLevel),
      safetyPriority: ['critical', 'emergency'].includes(crisisLevel),
      gentleLanguage: true,
      hopefulTone: !['emergency'].includes(crisisLevel),
      actionOriented: ['high', 'critical', 'emergency'].includes(crisisLevel),
    } : undefined,
    content: {
      title,
      message,
      tone: crisisLevel === 'emergency' ? 'urgent_gentle' : 'supportive',
      length: 'concise',
    },
    therapeutic: template.template.therapeutic || {},
    timing: {
      immediate: ['critical', 'emergency'].includes(crisisLevel),
      contextDependent: true,
      crisisOverride: ['critical', 'emergency'].includes(crisisLevel),
    },
    accessibility: {
      screenReader: true,
      highContrast: true,
      largeText: true,
      voiceOver: true,
    },
  };
};

/**
 * Crisis-Appropriate Message Selection
 */
export const selectCrisisAppropriateTemplate = (
  category: TherapeuticMessageType,
  context: MessageContext,
  crisisLevel: CrisisLevel
): string | null => {
  const appropriateTemplates = Object.entries(THERAPEUTIC_MESSAGE_TEMPLATES)
    .filter(([_, template]) =>
      template.category === category &&
      template.contexts.includes(context.userState) &&
      template.crisisLevels.includes(crisisLevel)
    );

  if (appropriateTemplates.length === 0) {
    return null;
  }

  // Prefer more crisis-specific templates
  const sortedTemplates = appropriateTemplates.sort(([_, a], [__, b]) => {
    const aCrisisSpecific = a.crisisLevels.filter(level => level !== 'none').length;
    const bCrisisSpecific = b.crisisLevels.filter(level => level !== 'none').length;
    return bCrisisSpecific - aCrisisSpecific;
  });

  return sortedTemplates[0][0];
};

/**
 * Message Validation
 */
export const validateTherapeuticMessage = (message: TherapeuticMessage): boolean => {
  // Validate MBCT principles are followed
  if (!message.language.mindful || !message.language.compassionate || !message.language.nonJudgmental) {
    return false;
  }

  // Validate crisis appropriateness
  if (message.crisis && message.context.userState === 'emergency') {
    if (!message.crisis.immediateSupport || !message.crisis.safetyPriority) {
      return false;
    }
  }

  // Validate accessibility
  if (!message.accessibility.screenReader || !message.accessibility.voiceOver) {
    return false;
  }

  return true;
};