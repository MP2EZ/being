/**
 * Therapeutic Messaging Hook for FullMind MBCT App
 *
 * MBCT-compliant communication with:
 * - Anxiety-reducing language patterns
 * - Crisis-sensitive messaging
 * - Mindful communication principles
 * - Real-time message delivery
 * - Accessibility-optimized messaging
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  TherapeuticMessage,
  TherapeuticMessageTemplate,
  MessageContext,
  buildTherapeuticMessage,
  THERAPEUTIC_MESSAGE_TEMPLATES,
  selectCrisisAppropriateTemplate,
  validateTherapeuticMessage,
} from '../../types/webhooks/therapeutic-messaging';
import { CrisisLevel } from '../../types/webhooks/crisis-safety-types';
import { PerformanceMetric } from '../../types/webhooks/performance-monitoring';

export interface TherapeuticMessagingState {
  messagingEnabled: boolean;
  crisisModeActive: boolean;
  lastMessageSent: Date | null;
  totalMessagesSent: number;
  crisisMessagesSent: number;
  messageQueue: TherapeuticMessage[];
  activeNotifications: TherapeuticMessage[];
  messageDeliveryRate: number;
  therapeuticEffectiveness: number;
  accessibilityCompliance: number;
}

export interface MessageDeliveryConfig {
  enableRealTimeDelivery: boolean;
  enableQueuedDelivery: boolean;
  crisisPriorityDelivery: boolean;
  maxQueueSize: number;
  deliveryTimeoutMs: number;
  retryAttempts: number;
  accessibilityOptimizations: boolean;
  therapeuticTimingRespected: boolean;
}

export interface MessageDeliveryResult {
  delivered: boolean;
  deliveryTime: number;
  messageId: string;
  therapeuticEffectiveness: 'high' | 'medium' | 'low';
  accessibilityCompliant: boolean;
  userEngagement: 'positive' | 'neutral' | 'negative' | 'unknown';
  crisisAppropriate: boolean;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface TherapeuticMessagingAPI {
  // Message Creation & Validation
  createTherapeuticMessage: (
    templateId: string,
    variables: Record<string, string>,
    context: MessageContext,
    crisisLevel?: CrisisLevel
  ) => Promise<TherapeuticMessage>;
  validateMessage: (message: TherapeuticMessage) => boolean;
  adaptMessageForCrisis: (message: TherapeuticMessage, crisisLevel: CrisisLevel) => TherapeuticMessage;

  // Message Delivery
  sendMessage: (message: TherapeuticMessage, priority?: 'low' | 'normal' | 'high' | 'crisis') => Promise<MessageDeliveryResult>;
  sendCrisisMessage: (templateId: string, context: MessageContext, crisisLevel: CrisisLevel) => Promise<MessageDeliveryResult>;
  queueMessage: (message: TherapeuticMessage, deliveryTime?: Date) => string; // Returns queue ID
  processMessageQueue: () => Promise<number>; // Returns number of messages processed

  // Crisis Messaging
  activateCrisisMessaging: (level: CrisisLevel) => Promise<void>;
  deactivateCrisisMessaging: () => Promise<void>;
  sendEmergencyMessage: (urgentMessage: string, therapeuticContext?: string) => Promise<MessageDeliveryResult>;

  // Template Management
  getAvailableTemplates: (context: MessageContext, crisisLevel?: CrisisLevel) => TherapeuticMessageTemplate[];
  selectBestTemplate: (
    category: string,
    context: MessageContext,
    crisisLevel: CrisisLevel
  ) => string | null;
  createCustomTemplate: (template: Omit<TherapeuticMessageTemplate, 'id'>) => string; // Returns template ID

  // Message Context Awareness
  updateMessageContext: (userId: string, context: Partial<MessageContext>) => void;
  getMessageContext: (userId: string) => MessageContext | null;
  assessContextSensitivity: (message: TherapeuticMessage, context: MessageContext) => {
    appropriate: boolean;
    concerns: string[];
    recommendations: string[];
  };

  // Therapeutic Effectiveness
  trackMessageEffectiveness: (messageId: string, userFeedback: any) => void;
  getTherapeuticMetrics: () => {
    totalSent: number;
    effectivenessRate: number;
    crisisAppropriateRate: number;
    accessibilityScore: number;
  };
  optimizeMessagingStrategy: () => Promise<{
    recommendations: string[];
    templateOptimizations: string[];
    timingAdjustments: string[];
  }>;

  // Accessibility & Inclusion
  optimizeForAccessibility: (message: TherapeuticMessage) => TherapeuticMessage;
  validateAccessibility: (message: TherapeuticMessage) => {
    screenReaderCompatible: boolean;
    contrastCompliant: boolean;
    cognitiveLoadAppropriate: boolean;
    languageSimplicity: 'simple' | 'moderate' | 'complex';
  };

  // State Management
  getMessagingState: () => TherapeuticMessagingState;
  updateMessagingConfig: (config: Partial<MessageDeliveryConfig>) => void;
  getMessagingConfig: () => MessageDeliveryConfig;

  // Monitoring & Analytics
  getMessagingMetrics: () => PerformanceMetric[];
  getMessageHistory: (userId?: string, timeWindow?: number) => TherapeuticMessage[];
  generateMessagingReport: () => Promise<any>;

  // Message Cleanup & Management
  clearMessageQueue: () => number; // Returns number of cleared messages
  removeExpiredMessages: () => number;
  archiveOldMessages: (retentionDays: number) => number;
}

const DEFAULT_DELIVERY_CONFIG: MessageDeliveryConfig = {
  enableRealTimeDelivery: true,
  enableQueuedDelivery: true,
  crisisPriorityDelivery: true,
  maxQueueSize: 100,
  deliveryTimeoutMs: 5000,
  retryAttempts: 3,
  accessibilityOptimizations: true,
  therapeuticTimingRespected: true,
};

/**
 * Therapeutic Messaging Hook
 */
export const useTherapeuticMessaging = (
  initialConfig: Partial<MessageDeliveryConfig> = {}
): TherapeuticMessagingAPI => {
  // Configuration
  const [config, setConfig] = useState<MessageDeliveryConfig>({
    ...DEFAULT_DELIVERY_CONFIG,
    ...initialConfig,
  });

  // State management
  const [state, setState] = useState<TherapeuticMessagingState>({
    messagingEnabled: true,
    crisisModeActive: false,
    lastMessageSent: null,
    totalMessagesSent: 0,
    crisisMessagesSent: 0,
    messageQueue: [],
    activeNotifications: [],
    messageDeliveryRate: 100,
    therapeuticEffectiveness: 85,
    accessibilityCompliance: 95,
  });

  // Data storage
  const messagingMetrics = useRef<PerformanceMetric[]>([]);
  const messageHistory = useRef<Map<string, TherapeuticMessage[]>>(new Map()); // userId -> messages
  const customTemplates = useRef<Map<string, TherapeuticMessageTemplate>>(new Map());
  const userContexts = useRef<Map<string, MessageContext>>(new Map());
  const deliveryAttempts = useRef<Map<string, number>>(new Map());

  // Timers
  const queueProcessingTimer = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Message Creation & Validation
   */
  const createTherapeuticMessage = useCallback(async (
    templateId: string,
    variables: Record<string, string>,
    context: MessageContext,
    crisisLevel: CrisisLevel = 'none'
  ): Promise<TherapeuticMessage> => {
    const startTime = Date.now();

    try {
      // Check if template exists (built-in or custom)
      let template = THERAPEUTIC_MESSAGE_TEMPLATES[templateId];
      if (!template) {
        template = customTemplates.current.get(templateId);
        if (!template) {
          throw new Error(`Template '${templateId}' not found`);
        }
      }

      // Build the message
      const message = buildTherapeuticMessage(templateId, variables, context, crisisLevel);

      // Validate the message
      if (!validateMessage(message)) {
        throw new Error('Generated message failed therapeutic validation');
      }

      // Optimize for accessibility if enabled
      const finalMessage = config.accessibilityOptimizations
        ? optimizeForAccessibility(message)
        : message;

      // Record performance metric
      messagingMetrics.current.push({
        timestamp: startTime,
        category: 'therapeutic_content',
        operation: 'create_message',
        duration: Date.now() - startTime,
        success: true,
        crisisMode: crisisLevel !== 'none',
        therapeuticImpact: true,
      });

      console.log(`Therapeutic message created: ${templateId} for context ${context.userState}`);
      return finalMessage;

    } catch (error) {
      console.error('Error creating therapeutic message:', error);
      throw error;
    }
  }, [config.accessibilityOptimizations, validateMessage, optimizeForAccessibility]);

  const validateMessage = useCallback((message: TherapeuticMessage): boolean => {
    return validateTherapeuticMessage(message);
  }, []);

  const adaptMessageForCrisis = useCallback((
    message: TherapeuticMessage,
    crisisLevel: CrisisLevel
  ): TherapeuticMessage => {
    if (crisisLevel === 'none') return message;

    const adaptedMessage: TherapeuticMessage = {
      ...message,
      crisis: {
        crisisLevel,
        immediateSupport: ['critical', 'emergency'].includes(crisisLevel),
        emergencyResources: ['high', 'critical', 'emergency'].includes(crisisLevel),
        professionalReferral: ['critical', 'emergency'].includes(crisisLevel),
        safetyPriority: ['critical', 'emergency'].includes(crisisLevel),
        gentleLanguage: true,
        hopefulTone: !['emergency'].includes(crisisLevel),
        actionOriented: ['high', 'critical', 'emergency'].includes(crisisLevel),
      },
      content: {
        ...message.content,
        tone: crisisLevel === 'emergency' ? 'urgent_gentle' : 'supportive',
      },
      timing: {
        ...message.timing,
        immediate: ['critical', 'emergency'].includes(crisisLevel),
        crisisOverride: ['critical', 'emergency'].includes(crisisLevel),
      },
    };

    // Add crisis-specific therapeutic elements
    if (crisisLevel === 'emergency' || crisisLevel === 'critical') {
      adaptedMessage.therapeutic = {
        ...message.therapeutic,
        groundingElement: 'You are here, you are present, you are safe in this moment.',
        breathingCue: 'Breathe slowly: in through nose, out through mouth.',
      };
    }

    return adaptedMessage;
  }, []);

  /**
   * Message Delivery
   */
  const sendMessage = useCallback(async (
    message: TherapeuticMessage,
    priority: 'low' | 'normal' | 'high' | 'crisis' = 'normal'
  ): Promise<MessageDeliveryResult> => {
    const startTime = Date.now();
    const messageId = message.id;

    try {
      // Check if messaging is enabled
      if (!state.messagingEnabled && priority !== 'crisis') {
        return {
          delivered: false,
          deliveryTime: 0,
          messageId,
          therapeuticEffectiveness: 'low',
          accessibilityCompliant: false,
          userEngagement: 'unknown',
          crisisAppropriate: false,
          error: {
            code: 'MESSAGING_DISABLED',
            message: 'Messaging is currently disabled',
            retryable: true,
          },
        };
      }

      // Crisis priority delivery
      if (priority === 'crisis' || message.timing.crisisOverride) {
        // Skip queue for crisis messages
        await deliverMessageImmediately(message);
      } else if (config.enableRealTimeDelivery) {
        await deliverMessageImmediately(message);
      } else {
        // Queue for later delivery
        queueMessage(message);
        return {
          delivered: true,
          deliveryTime: 0,
          messageId,
          therapeuticEffectiveness: 'medium',
          accessibilityCompliant: true,
          userEngagement: 'unknown',
          crisisAppropriate: message.crisis !== undefined,
        };
      }

      // Update state
      setState(prev => ({
        ...prev,
        lastMessageSent: new Date(),
        totalMessagesSent: prev.totalMessagesSent + 1,
        crisisMessagesSent: priority === 'crisis' ? prev.crisisMessagesSent + 1 : prev.crisisMessagesSent,
      }));

      // Store in history
      const userId = 'current_user'; // Would be determined from context
      const userMessages = messageHistory.current.get(userId) || [];
      userMessages.push(message);
      messageHistory.current.set(userId, userMessages);

      const deliveryTime = Date.now() - startTime;

      // Assess therapeutic effectiveness
      const effectiveness = assessTherapeuticEffectiveness(message, deliveryTime);

      // Validate accessibility
      const accessibility = validateAccessibility(message);

      const result: MessageDeliveryResult = {
        delivered: true,
        deliveryTime,
        messageId,
        therapeuticEffectiveness: effectiveness,
        accessibilityCompliant: accessibility.screenReaderCompatible && accessibility.contrastCompliant,
        userEngagement: 'unknown', // Would be determined from user interaction
        crisisAppropriate: message.crisis !== undefined,
      };

      console.log(`Message delivered: ${messageId} in ${deliveryTime}ms (effectiveness: ${effectiveness})`);
      return result;

    } catch (error) {
      return {
        delivered: false,
        deliveryTime: Date.now() - startTime,
        messageId,
        therapeuticEffectiveness: 'low',
        accessibilityCompliant: false,
        userEngagement: 'negative',
        crisisAppropriate: false,
        error: {
          code: 'DELIVERY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown delivery error',
          retryable: true,
        },
      };
    }
  }, [state.messagingEnabled, config.enableRealTimeDelivery, queueMessage, validateAccessibility]);

  const sendCrisisMessage = useCallback(async (
    templateId: string,
    context: MessageContext,
    crisisLevel: CrisisLevel
  ): Promise<MessageDeliveryResult> => {
    try {
      // Create crisis-appropriate message
      const message = await createTherapeuticMessage(templateId, {}, context, crisisLevel);

      // Adapt for crisis if needed
      const crisisMessage = adaptMessageForCrisis(message, crisisLevel);

      // Send with crisis priority
      return await sendMessage(crisisMessage, 'crisis');

    } catch (error) {
      console.error('Error sending crisis message:', error);
      throw error;
    }
  }, [createTherapeuticMessage, adaptMessageForCrisis, sendMessage]);

  const queueMessage = useCallback((message: TherapeuticMessage, deliveryTime?: Date): string => {
    if (state.messageQueue.length >= config.maxQueueSize) {
      // Remove oldest non-crisis message
      const nonCrisisIndex = state.messageQueue.findIndex(m => !m.timing.crisisOverride);
      if (nonCrisisIndex > -1) {
        state.messageQueue.splice(nonCrisisIndex, 1);
      }
    }

    setState(prev => ({
      ...prev,
      messageQueue: [...prev.messageQueue, message],
    }));

    const queueId = `queue_${message.id}_${Date.now()}`;
    console.log(`Message queued: ${message.id} (queue size: ${state.messageQueue.length + 1})`);
    return queueId;
  }, [state.messageQueue, config.maxQueueSize]);

  const processMessageQueue = useCallback(async (): Promise<number> => {
    if (!config.enableQueuedDelivery || state.messageQueue.length === 0) {
      return 0;
    }

    let processedCount = 0;
    const messagesToProcess = [...state.messageQueue];

    // Sort by priority (crisis first, then by timestamp)
    messagesToProcess.sort((a, b) => {
      if (a.timing.crisisOverride && !b.timing.crisisOverride) return -1;
      if (!a.timing.crisisOverride && b.timing.crisisOverride) return 1;
      return parseInt(a.id.split('_').pop() || '0') - parseInt(b.id.split('_').pop() || '0');
    });

    for (const message of messagesToProcess) {
      try {
        const result = await sendMessage(message, message.timing.crisisOverride ? 'crisis' : 'normal');
        if (result.delivered) {
          processedCount++;
          // Remove from queue
          setState(prev => ({
            ...prev,
            messageQueue: prev.messageQueue.filter(m => m.id !== message.id),
          }));
        }
      } catch (error) {
        console.error('Error processing queued message:', error);
      }
    }

    console.log(`Processed ${processedCount} messages from queue`);
    return processedCount;
  }, [config.enableQueuedDelivery, state.messageQueue, sendMessage]);

  /**
   * Crisis Messaging
   */
  const activateCrisisMessaging = useCallback(async (level: CrisisLevel): Promise<void> => {
    setState(prev => ({
      ...prev,
      crisisModeActive: true,
      messagingEnabled: true, // Ensure messaging is enabled in crisis
    }));

    // Process any queued crisis messages immediately
    await processMessageQueue();

    console.log(`Crisis messaging activated at level ${level}`);
  }, [processMessageQueue]);

  const deactivateCrisisMessaging = useCallback(async (): Promise<void> => {
    setState(prev => ({
      ...prev,
      crisisModeActive: false,
    }));

    console.log('Crisis messaging deactivated');
  }, []);

  const sendEmergencyMessage = useCallback(async (
    urgentMessage: string,
    therapeuticContext?: string
  ): Promise<MessageDeliveryResult> => {
    const emergencyMessage: TherapeuticMessage = {
      id: `emergency_${Date.now()}`,
      type: 'emergency_guidance',
      context: {
        userState: 'emergency',
        urgency: 'emergency',
        therapeuticPhase: 'crisis_support',
      },
      language: {
        mindful: true,
        nonJudgmental: true,
        compassionate: true,
        anxietyReducing: true,
        empowering: true,
        therapeutic: true,
      },
      crisis: {
        crisisLevel: 'emergency',
        immediateSupport: true,
        emergencyResources: true,
        professionalReferral: true,
        safetyPriority: true,
        gentleLanguage: true,
        hopefulTone: false,
        actionOriented: true,
      },
      content: {
        title: 'Immediate Support Available',
        message: urgentMessage,
        tone: 'urgent_gentle',
        length: 'brief',
      },
      therapeutic: {
        groundingElement: therapeuticContext || 'You are safe in this moment',
        breathingCue: 'Breathe with me: in for 4, hold for 4, out for 6',
      },
      timing: {
        immediate: true,
        crisisOverride: true,
        contextDependent: false,
      },
      accessibility: {
        screenReader: true,
        highContrast: true,
        largeText: true,
        voiceOver: true,
      },
    };

    return await sendMessage(emergencyMessage, 'crisis');
  }, [sendMessage]);

  /**
   * Template Management
   */
  const getAvailableTemplates = useCallback((
    context: MessageContext,
    crisisLevel: CrisisLevel = 'none'
  ): TherapeuticMessageTemplate[] => {
    const allTemplates = {
      ...THERAPEUTIC_MESSAGE_TEMPLATES,
      ...Object.fromEntries(customTemplates.current),
    };

    return Object.values(allTemplates).filter(template =>
      template.contexts.includes(context.userState) &&
      template.crisisLevels.includes(crisisLevel)
    );
  }, []);

  const selectBestTemplate = useCallback((
    category: string,
    context: MessageContext,
    crisisLevel: CrisisLevel
  ): string | null => {
    return selectCrisisAppropriateTemplate(category as any, context, crisisLevel);
  }, []);

  const createCustomTemplate = useCallback((
    template: Omit<TherapeuticMessageTemplate, 'id'>
  ): string => {
    const templateId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullTemplate: TherapeuticMessageTemplate = {
      id: templateId,
      ...template,
    };

    customTemplates.current.set(templateId, fullTemplate);
    console.log(`Custom template created: ${templateId}`);
    return templateId;
  }, []);

  /**
   * Message Context Awareness
   */
  const updateMessageContext = useCallback((userId: string, context: Partial<MessageContext>): void => {
    const existingContext = userContexts.current.get(userId) || {
      userState: 'stable',
      urgency: 'low',
    };

    userContexts.current.set(userId, { ...existingContext, ...context });
  }, []);

  const getMessageContext = useCallback((userId: string): MessageContext | null => {
    return userContexts.current.get(userId) || null;
  }, []);

  const assessContextSensitivity = useCallback((
    message: TherapeuticMessage,
    context: MessageContext
  ): {
    appropriate: boolean;
    concerns: string[];
    recommendations: string[];
  } => {
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Check user state appropriateness
    if (context.userState === 'emergency' && !message.crisis?.immediateSupport) {
      concerns.push('Message lacks immediate support for emergency state');
      recommendations.push('Add emergency support elements');
    }

    if (context.userState === 'crisis' && !message.crisis?.safetyPriority) {
      concerns.push('Message does not prioritize safety for crisis state');
      recommendations.push('Enhance safety prioritization');
    }

    // Check urgency alignment
    if (context.urgency === 'emergency' && !message.timing.immediate) {
      concerns.push('Message timing does not match emergency urgency');
      recommendations.push('Enable immediate delivery');
    }

    // Check therapeutic phase alignment
    if (context.therapeuticPhase === 'crisis_support' && !message.therapeutic?.groundingElement) {
      concerns.push('Missing grounding elements for crisis support phase');
      recommendations.push('Add grounding and calming elements');
    }

    const appropriate = concerns.length === 0;

    return {
      appropriate,
      concerns,
      recommendations,
    };
  }, []);

  /**
   * Therapeutic Effectiveness
   */
  const trackMessageEffectiveness = useCallback((messageId: string, userFeedback: any): void => {
    // In a real implementation, this would track user engagement and outcomes
    console.log(`Tracking effectiveness for message ${messageId}:`, userFeedback);
  }, []);

  const getTherapeuticMetrics = useCallback(() => {
    return {
      totalSent: state.totalMessagesSent,
      effectivenessRate: state.therapeuticEffectiveness,
      crisisAppropriateRate: state.crisisMessagesSent > 0
        ? (state.crisisMessagesSent / state.totalMessagesSent) * 100
        : 100,
      accessibilityScore: state.accessibilityCompliance,
    };
  }, [state]);

  const optimizeMessagingStrategy = useCallback(async (): Promise<{
    recommendations: string[];
    templateOptimizations: string[];
    timingAdjustments: string[];
  }> => {
    const recommendations: string[] = [];
    const templateOptimizations: string[] = [];
    const timingAdjustments: string[] = [];

    // Analyze recent performance
    if (state.therapeuticEffectiveness < 80) {
      recommendations.push('Review message content for therapeutic effectiveness');
      templateOptimizations.push('Enhance MBCT compliance in templates');
    }

    if (state.accessibilityCompliance < 90) {
      recommendations.push('Improve accessibility compliance');
      templateOptimizations.push('Optimize templates for screen readers');
    }

    if (state.messageDeliveryRate < 95) {
      recommendations.push('Investigate delivery failures');
      timingAdjustments.push('Optimize delivery timing for user availability');
    }

    return {
      recommendations,
      templateOptimizations,
      timingAdjustments,
    };
  }, [state]);

  /**
   * Accessibility & Inclusion
   */
  const optimizeForAccessibility = useCallback((message: TherapeuticMessage): TherapeuticMessage => {
    return {
      ...message,
      content: {
        ...message.content,
        // Simplify language for cognitive accessibility
        message: message.content.message
          .replace(/\b\w{12,}\b/g, match => {
            // Replace very long words with simpler alternatives
            const simplifications: Record<string, string> = {
              'therapeutic': 'healing',
              'mindfulness': 'awareness',
              'psychological': 'mental',
            };
            return simplifications[match.toLowerCase()] || match;
          }),
      },
      accessibility: {
        screenReader: true,
        highContrast: true,
        largeText: true,
        voiceOver: true,
      },
    };
  }, []);

  const validateAccessibility = useCallback((message: TherapeuticMessage): {
    screenReaderCompatible: boolean;
    contrastCompliant: boolean;
    cognitiveLoadAppropriate: boolean;
    languageSimplicity: 'simple' | 'moderate' | 'complex';
  } => {
    const wordCount = message.content.message.split(' ').length;
    const averageWordLength = message.content.message.split(' ')
      .reduce((acc, word) => acc + word.length, 0) / wordCount;

    let languageSimplicity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (averageWordLength > 6) languageSimplicity = 'complex';
    else if (averageWordLength > 4) languageSimplicity = 'moderate';

    return {
      screenReaderCompatible: message.accessibility.screenReader,
      contrastCompliant: message.accessibility.highContrast,
      cognitiveLoadAppropriate: wordCount <= 50 && languageSimplicity !== 'complex',
      languageSimplicity,
    };
  }, []);

  /**
   * Utility Functions
   */
  const deliverMessageImmediately = async (message: TherapeuticMessage): Promise<void> => {
    // Simulate message delivery
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log(`Message delivered immediately: ${message.id}`);
  };

  const assessTherapeuticEffectiveness = (
    message: TherapeuticMessage,
    deliveryTime: number
  ): 'high' | 'medium' | 'low' => {
    let score = 0;

    // MBCT compliance
    if (message.language.mindful && message.language.compassionate && message.language.nonJudgmental) {
      score += 30;
    }

    // Crisis appropriateness
    if (message.crisis && message.crisis.therapeuticMessage) {
      score += 25;
    }

    // Delivery timing
    if (deliveryTime < 1000) score += 20; // Fast delivery
    else if (deliveryTime < 3000) score += 10;

    // Accessibility
    if (message.accessibility.screenReader && message.accessibility.voiceOver) {
      score += 25;
    }

    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  };

  /**
   * State Management
   */
  const getMessagingState = useCallback((): TherapeuticMessagingState => state, [state]);
  const getMessagingConfig = useCallback((): MessageDeliveryConfig => config, [config]);

  const updateMessagingConfig = useCallback((newConfig: Partial<MessageDeliveryConfig>): void => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  /**
   * Monitoring & Analytics
   */
  const getMessagingMetrics = useCallback((): PerformanceMetric[] => {
    return [...messagingMetrics.current];
  }, []);

  const getMessageHistory = useCallback((userId?: string, timeWindow?: number): TherapeuticMessage[] => {
    if (userId) {
      const userMessages = messageHistory.current.get(userId) || [];
      if (timeWindow) {
        const cutoff = Date.now() - timeWindow;
        return userMessages.filter(m => parseInt(m.id.split('_').pop() || '0') > cutoff);
      }
      return userMessages;
    }

    // Return all messages
    const allMessages: TherapeuticMessage[] = [];
    for (const messages of messageHistory.current.values()) {
      allMessages.push(...messages);
    }

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      return allMessages.filter(m => parseInt(m.id.split('_').pop() || '0') > cutoff);
    }

    return allMessages;
  }, []);

  const generateMessagingReport = useCallback(async (): Promise<any> => {
    const metrics = getTherapeuticMetrics();
    const last24Hours = 24 * 60 * 60 * 1000;
    const recentMessages = getMessageHistory(undefined, last24Hours);

    return {
      timeframe: '24_hours',
      summary: metrics,
      recentActivity: {
        totalMessagesSent: recentMessages.length,
        crisisMessages: recentMessages.filter(m => m.crisis !== undefined).length,
        queuedMessages: state.messageQueue.length,
        deliverySuccessRate: state.messageDeliveryRate,
      },
      effectiveness: {
        therapeuticCompliance: recentMessages.filter(m =>
          m.language.mindful && m.language.compassionate && m.language.nonJudgmental
        ).length,
        accessibilityScore: state.accessibilityCompliance,
        crisisAppropriateRate: metrics.crisisAppropriateRate,
      },
    };
  }, [getTherapeuticMetrics, getMessageHistory, state]);

  /**
   * Message Cleanup & Management
   */
  const clearMessageQueue = useCallback((): number => {
    const clearedCount = state.messageQueue.length;
    setState(prev => ({ ...prev, messageQueue: [] }));
    console.log(`Cleared ${clearedCount} messages from queue`);
    return clearedCount;
  }, [state.messageQueue]);

  const removeExpiredMessages = useCallback((): number => {
    // Remove messages older than 24 hours from queue
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const initialCount = state.messageQueue.length;

    setState(prev => ({
      ...prev,
      messageQueue: prev.messageQueue.filter(m => {
        const messageTime = parseInt(m.id.split('_').pop() || '0');
        return messageTime > cutoff;
      }),
    }));

    const removedCount = initialCount - state.messageQueue.length;
    console.log(`Removed ${removedCount} expired messages`);
    return removedCount;
  }, [state.messageQueue]);

  const archiveOldMessages = useCallback((retentionDays: number): number => {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let archivedCount = 0;

    for (const [userId, messages] of messageHistory.current) {
      const filteredMessages = messages.filter(m => {
        const messageTime = parseInt(m.id.split('_').pop() || '0');
        if (messageTime < cutoff) {
          archivedCount++;
          return false;
        }
        return true;
      });
      messageHistory.current.set(userId, filteredMessages);
    }

    console.log(`Archived ${archivedCount} old messages`);
    return archivedCount;
  }, []);

  // Set up timers
  useEffect(() => {
    // Queue processing timer
    if (config.enableQueuedDelivery) {
      queueProcessingTimer.current = setInterval(async () => {
        await processMessageQueue();
      }, 30000); // Process queue every 30 seconds
    }

    // Cleanup timer
    cleanupTimer.current = setInterval(() => {
      removeExpiredMessages();
      archiveOldMessages(30); // Archive messages older than 30 days
    }, 60 * 60 * 1000); // Run cleanup every hour

    return () => {
      if (queueProcessingTimer.current) clearInterval(queueProcessingTimer.current);
      if (cleanupTimer.current) clearInterval(cleanupTimer.current);
    };
  }, [config.enableQueuedDelivery, processMessageQueue, removeExpiredMessages, archiveOldMessages]);

  return {
    // Message Creation & Validation
    createTherapeuticMessage,
    validateMessage,
    adaptMessageForCrisis,

    // Message Delivery
    sendMessage,
    sendCrisisMessage,
    queueMessage,
    processMessageQueue,

    // Crisis Messaging
    activateCrisisMessaging,
    deactivateCrisisMessaging,
    sendEmergencyMessage,

    // Template Management
    getAvailableTemplates,
    selectBestTemplate,
    createCustomTemplate,

    // Message Context Awareness
    updateMessageContext,
    getMessageContext,
    assessContextSensitivity,

    // Therapeutic Effectiveness
    trackMessageEffectiveness,
    getTherapeuticMetrics,
    optimizeMessagingStrategy,

    // Accessibility & Inclusion
    optimizeForAccessibility,
    validateAccessibility,

    // State Management
    getMessagingState,
    updateMessagingConfig,
    getMessagingConfig,

    // Monitoring & Analytics
    getMessagingMetrics,
    getMessageHistory,
    generateMessagingReport,

    // Message Cleanup & Management
    clearMessageQueue,
    removeExpiredMessages,
    archiveOldMessages,
  };
};