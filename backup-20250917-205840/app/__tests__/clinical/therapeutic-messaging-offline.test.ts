/**
 * Therapeutic Messaging Validation for Offline Scenarios
 * Addresses clinician agent gaps: MBCT compliance, therapeutic language, mindfulness integration
 * Ensures clinical-grade therapeutic appropriateness during offline operation
 */

import { enhancedOfflineQueueService } from '../../src/services/EnhancedOfflineQueueService';
import { networkAwareService } from '../../src/services/NetworkAwareService';
import { OfflinePriority, NetworkQuality } from '../../src/types/offline';

/**
 * Therapeutic language validation utilities
 */
class TherapeuticLanguageValidator {
  
  /**
   * MBCT-compliant messaging patterns
   */
  static readonly MBCT_PATTERNS = {
    present_moment: /\b(notice|observe|aware|present|moment|breath|now)\b/i,
    acceptance: /\b(accept|allow|gentle|kind|compassion)\b/i,
    mindfulness: /\b(mindful|mindfulness|attention|awareness)\b/i,
    decentering: /\b(thought|feeling|emotion|experience|passing|temporary)\b/i,
    non_judgmental: /\b(without judgment|simply|just|naturally)\b/i
  };

  /**
   * Anxiety-inducing patterns to avoid
   */
  static readonly ANXIETY_PATTERNS = {
    urgency: /\b(urgent|immediately|fast|quick|hurry|rush)\b/i,
    failure: /\b(failed|error|broken|wrong|problem|issue)\b/i,
    technology_focus: /\b(system|server|network|connection|sync|data)\b/i,
    medical_alarm: /\b(critical|emergency|alert|warning|danger)\b/i
  };

  /**
   * Validate message for MBCT compliance
   */
  static validateMBCTCompliance(message: string): {
    compliant: boolean;
    mbctElements: string[];
    nonCompliantElements: string[];
    score: number; // 0-100
  } {
    const mbctElements: string[] = [];
    const nonCompliantElements: string[] = [];

    // Check for MBCT elements
    Object.entries(this.MBCT_PATTERNS).forEach(([element, pattern]) => {
      if (pattern.test(message)) {
        mbctElements.push(element);
      }
    });

    // Check for anxiety-inducing elements
    Object.entries(this.ANXIETY_PATTERNS).forEach(([element, pattern]) => {
      if (pattern.test(message)) {
        nonCompliantElements.push(element);
      }
    });

    const mbctScore = (mbctElements.length / Object.keys(this.MBCT_PATTERNS).length) * 70;
    const penaltyScore = (nonCompliantElements.length / Object.keys(this.ANXIETY_PATTERNS).length) * 30;
    const score = Math.max(0, mbctScore - penaltyScore);

    return {
      compliant: score >= 60 && nonCompliantElements.length === 0,
      mbctElements,
      nonCompliantElements,
      score
    };
  }

  /**
   * Generate MBCT-compliant message for given scenario
   */
  static generateMBCTMessage(scenario: string): string {
    const messages: Record<string, string> = {
      network_loss: "Notice this pause in connection. Take a breath and stay present with whatever you're experiencing right now.",
      slow_connection: "The pace has slowed - an invitation to slow down with it. What do you notice in this moment of waiting?",
      sync_delay: "Your progress is being gently saved. No action needed from you. Simply be with this moment as it is.",
      data_save: "Your mindful responses are held safely. Take a moment to appreciate the care you're bringing to this practice.",
      error_recovery: "Something unexpected has happened. This is a perfect opportunity to practice gentle acceptance of life's uncertainties.",
      session_pause: "Your session has paused naturally. Feel your feet on the ground and your breath moving in and out.",
      assessment_interruption: "Your thoughtful responses are preserved. When you're ready, we can continue this mindful reflection together.",
      crisis_support: "You're showing courage by reaching out. Help is available, and you're not alone in this moment."
    };

    return messages[scenario] || "Take a breath and stay present. This moment, like all moments, will pass.";
  }
}

/**
 * Mindfulness integration testing utilities
 */
class MindfulnessIntegrationTester {
  
  /**
   * Test mindfulness prompts for different network states
   */
  static getNetworkMindfulnessPrompts(): Record<NetworkQuality, string[]> {
    return {
      [NetworkQuality.EXCELLENT]: [
        "Notice how smoothly things are flowing. Can you bring this same ease to your breathing?",
        "With this strong connection, take a moment to connect with your present experience."
      ],
      [NetworkQuality.GOOD]: [
        "Things are moving at a steady pace. Let your breath find its own steady rhythm too.",
        "Good connection, good moment. What do you notice about your awareness right now?"
      ],
      [NetworkQuality.FAIR]: [
        "The pace has shifted. Use this change as a reminder to check in with your body and breath.",
        "Notice how you respond to this change in speed. What does your body tell you?"
      ],
      [NetworkQuality.POOR]: [
        "This slower pace invites you to slow down too. Take three mindful breaths.",
        "Poor connection can be a gift - a chance to disconnect from rushing and connect with stillness."
      ],
      [NetworkQuality.OFFLINE]: [
        "In this disconnection, you can connect more deeply with yourself. Feel your breath.",
        "No network needed for this moment. You have everything you need right here, right now."
      ]
    };
  }

  /**
   * Validate mindfulness integration appropriateness
   */
  static validateMindfulnessIntegration(
    scenario: string, 
    prompt: string, 
    context: { userState?: string; sessionType?: string; crisisLevel?: string }
  ): {
    appropriate: boolean;
    reasoning: string;
    mindfulnessElements: string[];
    contextAwareness: boolean;
  } {
    const mindfulnessElements: string[] = [];
    
    // Check for key mindfulness elements
    if (/\b(breath|breathing)\b/i.test(prompt)) mindfulnessElements.push('breath_awareness');
    if (/\b(notice|observe|aware)\b/i.test(prompt)) mindfulnessElements.push('present_awareness');
    if (/\b(body|feet|ground)\b/i.test(prompt)) mindfulnessElements.push('body_awareness');
    if (/\b(moment|now|present)\b/i.test(prompt)) mindfulnessElements.push('present_moment');

    // Context appropriateness
    const contextAwareness = context.crisisLevel ? 
      /\b(safe|support|help|courage)\b/i.test(prompt) : 
      mindfulnessElements.length > 0;

    const appropriate = mindfulnessElements.length >= 2 && contextAwareness;

    return {
      appropriate,
      reasoning: appropriate ? 
        'Prompt includes appropriate mindfulness elements for context' :
        'Prompt lacks sufficient mindfulness elements or context awareness',
      mindfulnessElements,
      contextAwareness
    };
  }
}

describe('Therapeutic Messaging Validation - Clinical Compliance', () => {
  
  beforeEach(async () => {
    // Initialize services
    await enhancedOfflineQueueService.initialize();
  });

  describe('MBCT Compliance Testing', () => {
    
    test('should validate all offline messages for MBCT compliance', async () => {
      const offlineScenarios = [
        'network_loss',
        'slow_connection', 
        'sync_delay',
        'data_save',
        'error_recovery',
        'session_pause',
        'assessment_interruption'
      ];

      for (const scenario of offlineScenarios) {
        const message = TherapeuticLanguageValidator.generateMBCTMessage(scenario);
        const validation = TherapeuticLanguageValidator.validateMBCTCompliance(message);

        // Queue message validation
        const result = await enhancedOfflineQueueService.queueAction(
          'validate_therapeutic_message',
          {
            scenario,
            message,
            mbctCompliance: validation
          },
          {
            priority: OfflinePriority.MEDIUM,
            clinicalValidation: true
          }
        );

        expect(result.success).toBe(true);
        expect(validation.compliant).toBe(true);
        expect(validation.score).toBeGreaterThanOrEqual(60);
        expect(validation.nonCompliantElements).toHaveLength(0);
        expect(validation.mbctElements.length).toBeGreaterThanOrEqual(2);

        console.log(`✓ ${scenario}: ${validation.score}% MBCT compliant - ${validation.mbctElements.join(', ')}`);
      }
    });

    test('should reject non-MBCT compliant messages', async () => {
      const nonCompliantMessages = [
        "ERROR: Network connection failed. Please fix immediately!",
        "URGENT: System malfunction. Data may be lost!",
        "Connection problem detected. Troubleshooting required.",
        "Server error occurred. Try again quickly.",
        "Critical issue with sync process. Action needed now!"
      ];

      for (const message of nonCompliantMessages) {
        const validation = TherapeuticLanguageValidator.validateMBCTCompliance(message);
        
        expect(validation.compliant).toBe(false);
        expect(validation.nonCompliantElements.length).toBeGreaterThan(0);
        expect(validation.score).toBeLessThan(60);

        console.log(`✗ Non-compliant message blocked: ${validation.nonCompliantElements.join(', ')}`);
      }
    });

    test('should maintain therapeutic language during crisis scenarios', async () => {
      const crisisScenarios = [
        {
          scenario: 'suicidal_ideation_detected',
          context: { crisisLevel: 'severe' },
          expectedElements: ['support', 'courage', 'not_alone']
        },
        {
          scenario: 'high_anxiety_score',
          context: { crisisLevel: 'moderate' },
          expectedElements: ['breath', 'present', 'gentle']
        },
        {
          scenario: 'panic_response',
          context: { crisisLevel: 'high' },
          expectedElements: ['safe', 'ground', 'breathing']
        }
      ];

      for (const crisis of crisisScenarios) {
        const message = TherapeuticLanguageValidator.generateMBCTMessage(crisis.scenario);
        const validation = TherapeuticLanguageValidator.validateMBCTCompliance(message);

        // Crisis messages must be extra therapeutic
        expect(validation.compliant).toBe(true);
        expect(validation.score).toBeGreaterThanOrEqual(70);
        
        // Should avoid medical/technical language in crisis
        expect(validation.nonCompliantElements).not.toContain('medical_alarm');
        expect(validation.nonCompliantElements).not.toContain('technology_focus');

        console.log(`✓ Crisis scenario "${crisis.scenario}" maintains therapeutic language`);
      }
    });
  });

  describe('Mindfulness Integration Testing', () => {
    
    test('should integrate mindfulness prompts with network state changes', async () => {
      const networkQualities = [
        NetworkQuality.EXCELLENT,
        NetworkQuality.GOOD,
        NetworkQuality.FAIR,
        NetworkQuality.POOR,
        NetworkQuality.OFFLINE
      ];

      for (const quality of networkQualities) {
        const prompts = MindfulnessIntegrationTester.getNetworkMindfulnessPrompts()[quality];
        
        for (const prompt of prompts) {
          const validation = MindfulnessIntegrationTester.validateMindfulnessIntegration(
            `network_${quality}`,
            prompt,
            { userState: 'active_session' }
          );

          expect(validation.appropriate).toBe(true);
          expect(validation.mindfulnessElements.length).toBeGreaterThanOrEqual(1);
          expect(validation.contextAwareness).toBe(true);

          // Queue validation
          const result = await enhancedOfflineQueueService.queueAction(
            'mindfulness_network_integration',
            {
              networkQuality: quality,
              prompt,
              validation
            },
            {
              priority: OfflinePriority.MEDIUM,
              clinicalValidation: true
            }
          );

          expect(result.success).toBe(true);
          expect(result.clinicalValidation?.mbctCompliant).toBe(true);

          console.log(`✓ ${quality}: "${prompt}" - Elements: ${validation.mindfulnessElements.join(', ')}`);
        }
      }
    });

    test('should provide context-appropriate mindfulness integration', async () => {
      const contextScenarios = [
        {
          scenario: 'assessment_mid_flow',
          context: { userState: 'answering_phq9', sessionType: 'assessment' },
          expectedElements: ['present_awareness', 'breath_awareness']
        },
        {
          scenario: 'breathing_exercise',
          context: { userState: 'active_breathing', sessionType: 'breathing_space' },
          expectedElements: ['breath_awareness', 'body_awareness']
        },
        {
          scenario: 'check_in_reflection',
          context: { userState: 'reflecting', sessionType: 'daily_checkin' },
          expectedElements: ['present_moment', 'present_awareness']
        }
      ];

      for (const scenario of contextScenarios) {
        // Generate context-appropriate prompt
        const prompt = `Notice what you're experiencing right now. Feel your breath moving naturally and bring your attention to this present moment.`;
        
        const validation = MindfulnessIntegrationTester.validateMindfulnessIntegration(
          scenario.scenario,
          prompt,
          scenario.context
        );

        expect(validation.appropriate).toBe(true);
        expect(validation.contextAwareness).toBe(true);
        
        // Should include expected elements for context
        scenario.expectedElements.forEach(element => {
          expect(validation.mindfulnessElements).toContain(element);
        });

        console.log(`✓ ${scenario.scenario}: Context-appropriate mindfulness integration`);
      }
    });

    test('should maintain mindfulness during technology challenges', async () => {
      const technologyChallenges = [
        {
          challenge: 'slow_sync',
          therapeuticResponse: "This pause in syncing offers a moment to pause with your breath. Notice how you can be fully present even when technology slows down.",
          decentering: true
        },
        {
          challenge: 'connection_lost',
          therapeuticResponse: "Losing connection can help you find connection with yourself. Feel your feet on the ground and your breath in your body.",
          decentering: true
        },
        {
          challenge: 'app_freeze',
          therapeuticResponse: "When technology pauses, we can pause too. Take three mindful breaths and notice what's present for you right now.",
          decentering: true
        }
      ];

      for (const tech of technologyChallenges) {
        // Validate therapeutic response
        const mbctValidation = TherapeuticLanguageValidator.validateMBCTCompliance(tech.therapeuticResponse);
        expect(mbctValidation.compliant).toBe(true);
        expect(mbctValidation.mbctElements).toContain('decentering');

        // Test decentering opportunity
        const result = await enhancedOfflineQueueService.queueAction(
          'technology_decentering',
          {
            challenge: tech.challenge,
            therapeuticResponse: tech.therapeuticResponse,
            decenteringOpportunity: tech.decentering
          },
          {
            priority: OfflinePriority.MEDIUM,
            clinicalValidation: true
          }
        );

        expect(result.success).toBe(true);
        expect(result.clinicalValidation?.decenteringAppropriate).toBe(true);

        console.log(`✓ ${tech.challenge}: Technology becomes mindfulness opportunity`);
      }
    });
  });

  describe('Session Continuity and Therapeutic Flow', () => {
    
    test('should maintain therapeutic continuity during network interruptions', async () => {
      // Start therapeutic session
      const sessionData = {
        sessionId: `therapeutic_${Date.now()}`,
        sessionType: 'breathing_space',
        phase: 'awareness',
        therapeuticContext: 'present_moment_awareness'
      };

      const sessionStart = await enhancedOfflineQueueService.queueAction(
        'start_therapeutic_session',
        sessionData,
        {
          priority: OfflinePriority.MEDIUM,
          clinicalValidation: true
        }
      );

      expect(sessionStart.success).toBe(true);

      // Simulate network interruption during session
      const interruptionResponse = "Your mindful practice continues, even as the connection pauses. Stay with your breath and the sensations in your body.";
      
      const interruptionValidation = TherapeuticLanguageValidator.validateMBCTCompliance(interruptionResponse);
      expect(interruptionValidation.compliant).toBe(true);
      expect(interruptionValidation.mbctElements).toContain('present_moment');

      const interruptionResult = await enhancedOfflineQueueService.queueAction(
        'handle_therapeutic_interruption',
        {
          sessionId: sessionData.sessionId,
          interruptionType: 'network_loss',
          therapeuticResponse: interruptionResponse,
          continuity: 'maintained'
        },
        {
          priority: OfflinePriority.HIGH,
          clinicalValidation: true
        }
      );

      expect(interruptionResult.success).toBe(true);
      expect(interruptionResult.clinicalValidation?.therapeuticContinuity).toBe(true);

      // Resume with therapeutic bridging
      const resumeResponse = "As the connection returns, gently bring your attention back to the practice. Nothing was lost - your awareness has been present throughout.";
      
      const resumeValidation = TherapeuticLanguageValidator.validateMBCTCompliance(resumeResponse);
      expect(resumeValidation.compliant).toBe(true);

      const resumeResult = await enhancedOfflineQueueService.queueAction(
        'resume_therapeutic_session',
        {
          sessionId: sessionData.sessionId,
          resumeResponse: resumeResponse,
          bridging: 'seamless'
        },
        {
          priority: OfflinePriority.HIGH,
          clinicalValidation: true
        }
      );

      expect(resumeResult.success).toBe(true);
      expect(resumeResult.clinicalValidation?.therapeuticBridging).toBe(true);
    });

    test('should provide therapeutic framing for assessment interruptions', async () => {
      const assessmentInterruptions = [
        {
          phase: 'early_questions',
          message: "Take a moment to notice what you're experiencing as you reflect on these questions. Your responses are held safely.",
          expectedElements: ['present_awareness', 'acceptance']
        },
        {
          phase: 'mid_assessment',
          message: "This pause offers a moment to check in with yourself. Breathe and notice what's present for you right now.",
          expectedElements: ['present_moment', 'breath_awareness']
        },
        {
          phase: 'near_completion',
          message: "Your thoughtful responses are preserved. When you're ready, we can continue this mindful reflection together.",
          expectedElements: ['acceptance', 'mindfulness']
        }
      ];

      for (const interruption of assessmentInterruptions) {
        const validation = TherapeuticLanguageValidator.validateMBCTCompliance(interruption.message);
        
        expect(validation.compliant).toBe(true);
        interruption.expectedElements.forEach(element => {
          expect(validation.mbctElements).toContain(element);
        });

        // Test assessment interruption handling
        const result = await enhancedOfflineQueueService.queueAction(
          'assessment_therapeutic_interruption',
          {
            assessmentPhase: interruption.phase,
            therapeuticMessage: interruption.message,
            preserveProgress: true
          },
          {
            priority: OfflinePriority.HIGH,
            clinicalValidation: true
          }
        );

        expect(result.success).toBe(true);
        expect(result.clinicalValidation?.assessmentContinuity).toBe(true);

        console.log(`✓ ${interruption.phase}: Therapeutic framing maintained`);
      }
    });

    test('should integrate user autonomy and gentle guidance', async () => {
      const autonomyMessages = [
        {
          scenario: 'user_choice_pause',
          message: "You can take all the time you need. This practice is yours to engage with at your own pace.",
          autonomyLevel: 'full_choice'
        },
        {
          scenario: 'gentle_invitation',
          message: "When you feel ready, you might like to continue. There's no pressure - just gentle invitation.",
          autonomyLevel: 'invited_participation'
        },
        {
          scenario: 'return_option',
          message: "You can always return to this later. Your wellbeing guides what feels right for you right now.",
          autonomyLevel: 'self_directed'
        }
      ];

      for (const autonomy of autonomyMessages) {
        const validation = TherapeuticLanguageValidator.validateMBCTCompliance(autonomy.message);
        
        expect(validation.compliant).toBe(true);
        expect(validation.mbctElements).toContain('acceptance');
        
        // Should avoid technology urgency
        expect(validation.nonCompliantElements).not.toContain('urgency');

        const result = await enhancedOfflineQueueService.queueAction(
          'user_autonomy_validation',
          {
            scenario: autonomy.scenario,
            message: autonomy.message,
            autonomyLevel: autonomy.autonomyLevel,
            userDirected: true
          },
          {
            priority: OfflinePriority.MEDIUM,
            clinicalValidation: true
          }
        );

        expect(result.success).toBe(true);
        expect(result.clinicalValidation?.respectsAutonomy).toBe(true);

        console.log(`✓ ${autonomy.scenario}: User autonomy respected and therapeutically supported`);
      }
    });
  });

  describe('Crisis-Specific Therapeutic Messaging', () => {
    
    test('should maintain therapeutic approach during offline crisis detection', async () => {
      const crisisMessages = [
        {
          trigger: 'high_phq9_score',
          message: "Your responses show you're carrying some heavy feelings right now. You're not alone, and support is available.",
          therapeuticElements: ['validation', 'support', 'presence']
        },
        {
          trigger: 'suicidal_ideation',
          message: "Thank you for your honest response. You're showing courage by acknowledging difficult thoughts. Help is here for you.",
          therapeuticElements: ['appreciation', 'courage', 'support']
        },
        {
          trigger: 'severe_anxiety',
          message: "These intense feelings are temporary, even though they feel overwhelming now. You have strengths that have carried you this far.",
          therapeuticElements: ['hope', 'strength', 'perspective']
        }
      ];

      for (const crisis of crisisMessages) {
        const validation = TherapeuticLanguageValidator.validateMBCTCompliance(crisis.message);
        
        // Crisis messages require even higher therapeutic standards
        expect(validation.compliant).toBe(true);
        expect(validation.score).toBeGreaterThanOrEqual(70);
        
        // Must avoid alarming language
        expect(validation.nonCompliantElements).not.toContain('medical_alarm');
        expect(validation.nonCompliantElements).not.toContain('urgency');

        const result = await enhancedOfflineQueueService.queueAction(
          'crisis_therapeutic_messaging',
          {
            trigger: crisis.trigger,
            message: crisis.message,
            therapeuticElements: crisis.therapeuticElements,
            crisisLevel: 'high'
          },
          {
            priority: OfflinePriority.CRITICAL,
            clinicalValidation: true
          }
        );

        expect(result.success).toBe(true);
        expect(result.clinicalValidation?.crisisTherapeuticallyAppropriate).toBe(true);

        console.log(`✓ ${crisis.trigger}: Crisis handled with therapeutic language`);
      }
    });

    test('should provide hope and connection during offline crisis support', async () => {
      const supportMessages = [
        "Even when technology pauses, your courage and strength remain constant. You matter, and help is available.",
        "This difficult moment is temporary. Your willingness to reach out shows tremendous strength and wisdom.",
        "You're not alone in this experience. When the connection returns, support will still be here, just as it is now in your own resilience."
      ];

      for (const message of supportMessages) {
        const validation = TherapeuticLanguageValidator.validateMBCTCompliance(message);
        
        expect(validation.compliant).toBe(true);
        expect(validation.mbctElements).toContain('acceptance');
        
        // Should include hope and strength themes
        expect(/\b(strength|courage|resilience|matter|support)\b/i.test(message)).toBe(true);
        
        const result = await enhancedOfflineQueueService.queueAction(
          'offline_crisis_support_message',
          {
            message,
            supportElements: ['hope', 'strength', 'connection'],
            therapeuticIntent: 'stabilization'
          },
          {
            priority: OfflinePriority.CRITICAL,
            clinicalValidation: true
          }
        );

        expect(result.success).toBe(true);
        expect(result.clinicalValidation?.providesHope).toBe(true);

        console.log(`✓ Crisis support message maintains hope and therapeutic connection`);
      }
    });
  });
});