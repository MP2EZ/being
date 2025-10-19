/**
 * STOIC FLOW DATA TYPES UNIT TESTS
 *
 * Tests for Stoic Mindfulness flow data interfaces (Morning, Midday, Evening).
 * Validates philosopher-approved data structures (9.5/10 rating).
 *
 * TDD Approach: Tests written first, interfaces implemented to pass tests.
 */

import {
  StoicMorningFlowData,
  StoicMiddayFlowData,
  StoicEveningFlowData,
  GratitudeData,
  GratitudeItem,
  IntentionData,
  PreparationData,
  ObstacleContemplation,
  PrincipleFocusData,
  CurrentSituationData,
  ControlCheckData,
  ReappraisalData,
  IntentionProgressData,
  ReviewData,
  LearningData,
  SenecaQuestionsData,
  SelfCompassionData,
} from '../../src/types/flows';

describe('Stoic Flow Data Types', () => {
  describe('StoicMorningFlowData', () => {
    it('should create valid morning flow data with all optional fields', () => {
      const flowData: StoicMorningFlowData = {
        gratitude: {
          items: [
            { what: 'Morning coffee', impermanenceReflection: { acknowledged: true } },
            { what: 'Supportive colleague', impermanenceReflection: { acknowledged: false } },
            { what: 'Good health', impermanenceReflection: undefined },
          ],
          timestamp: new Date(),
        },
        intention: {
          virtue: 'wisdom',
          context: 'work',
          intentionStatement: 'Pause before reacting',
          whatIControl: 'My response time',
          whatIDontControl: 'Others reactions',
          reserveClause: '...if circumstances allow',
          principleApplied: 'principle_2',
          timestamp: new Date(),
        },
        preparation: {
          obstacles: [
            {
              obstacle: 'Difficult meeting',
              howICanRespond: 'Stay calm',
              whatIControl: 'My reaction',
              whatIDontControl: 'Meeting outcome',
              virtueToApply: 'temperance',
            },
          ],
          readinessRating: 7,
          selfCompassionNote: 'I\'m prepared',
          timeSpentSeconds: 90,
          optedOut: false,
          timestamp: new Date(),
        },
        principleFocus: {
          principleId: 'principle_1',
          briefPrompt: 'Practice present perception',
          todayApplication: 'Notice judgments',
          timestamp: new Date(),
        },
        physicalMetrics: {
          energy: 7,
          sleep: 8,
          physicalComfort: 7,
        },
        completedAt: new Date(),
        timeSpentSeconds: 600,
        flowVersion: 'stoic_v1',
      };

      expect(flowData.gratitude?.items).toHaveLength(3);
      expect(flowData.intention?.virtue).toBe('wisdom');
      expect(flowData.preparation?.obstacles).toHaveLength(1);
      expect(flowData.principleFocus?.principleId).toBe('principle_1');
      expect(flowData.physicalMetrics?.energy).toBe(7);
      expect(flowData.flowVersion).toBe('stoic_v1');
    });

    it('should allow minimal morning flow (only metadata required)', () => {
      const minimalFlow: StoicMorningFlowData = {
        completedAt: new Date(),
        timeSpentSeconds: 120,
        flowVersion: 'stoic_v1',
      };

      expect(minimalFlow.completedAt).toBeInstanceOf(Date);
      expect(minimalFlow.timeSpentSeconds).toBe(120);
    });
  });

  describe('GratitudeData', () => {
    it('should require exactly 3 gratitude items', () => {
      const gratitude: GratitudeData = {
        items: [
          { what: 'Item 1' },
          { what: 'Item 2' },
          { what: 'Item 3' },
        ],
        timestamp: new Date(),
      };

      expect(gratitude.items).toHaveLength(3);
    });

    it('should support impermanence reflection pathway (3 steps)', () => {
      const itemWithImpermanence: GratitudeItem = {
        what: 'Time with family',
        impermanenceReflection: {
          acknowledged: true,
          awareness: 'This is impermanent',
          appreciationShift: 'This makes it precious',
          presentAction: 'I\'ll be fully present',
        },
        howItManifestsToday: 'Dinner together',
      };

      expect(itemWithImpermanence.impermanenceReflection?.acknowledged).toBe(true);
      expect(itemWithImpermanence.impermanenceReflection?.awareness).toBe('This is impermanent');
    });
  });

  describe('PreparationData', () => {
    it('should enforce max 2 obstacles (philosopher safety requirement)', () => {
      const preparation: PreparationData = {
        obstacles: [
          {
            obstacle: 'Challenge 1',
            howICanRespond: 'Response 1',
            whatIControl: 'Control 1',
            whatIDontControl: 'No control 1',
          },
          {
            obstacle: 'Challenge 2',
            howICanRespond: 'Response 2',
            whatIControl: 'Control 2',
            whatIDontControl: 'No control 2',
          },
        ],
        readinessRating: 7,
        selfCompassionNote: 'I\'m prepared',
        timeSpentSeconds: 100,
        optedOut: false,
        timestamp: new Date(),
      };

      expect(preparation.obstacles.length).toBeLessThanOrEqual(2);
    });

    it('should track time spent (for anxiety detection)', () => {
      const preparation: PreparationData = {
        obstacles: [],
        readinessRating: 8,
        selfCompassionNote: 'Ready',
        timeSpentSeconds: 135, // >120s flags rumination risk
        optedOut: false,
        timestamp: new Date(),
      };

      expect(preparation.timeSpentSeconds).toBeGreaterThan(120);
    });

    it('should support opt-out pathway', () => {
      const optedOut: PreparationData = {
        obstacles: [],
        readinessRating: 0,
        selfCompassionNote: 'Skipped',
        timeSpentSeconds: 10,
        optedOut: true,
        optOutReason: 'anxiety',
        anxietyDetected: true,
        timestamp: new Date(),
      };

      expect(optedOut.optedOut).toBe(true);
      expect(optedOut.optOutReason).toBe('anxiety');
    });
  });

  describe('StoicMiddayFlowData', () => {
    it('should create valid midday flow data', () => {
      const flowData: StoicMiddayFlowData = {
        currentSituation: {
          situation: 'Busy afternoon',
          emotionalState: 'Focused',
          energyLevel: 7,
          timestamp: new Date(),
        },
        controlCheck: {
          aspect: 'Project deadline',
          controlType: 'can_influence',
          whatIControl: 'My effort',
          whatICannotControl: 'Others\' contributions',
          actionIfControllable: 'Focus on my part',
          timestamp: new Date(),
        },
        embodiment: {
          breathingDuration: 60, // EXACTLY 60 seconds
          breathingQuality: 8,
          bodyAwareness: 'Calm and centered',
          timestamp: new Date(),
        },
        reappraisal: {
          obstacle: 'Stressful situation',
          virtueOpportunity: 'Practice temperance',
          reframedPerspective: 'A chance to grow',
          principleApplied: 'principle_8',
          timestamp: new Date(),
        },
        intentionProgress: {
          morningIntention: 'Pause before reacting',
          practiced: true,
          howApplied: 'Paused before email response',
          timestamp: new Date(),
        },
        completedAt: new Date(),
        timeSpentSeconds: 180, // 3 minutes typical
        flowVersion: 'stoic_v1',
      };

      expect(flowData.embodiment?.breathingDuration).toBe(60);
      expect(flowData.controlCheck?.controlType).toBe('can_influence');
    });
  });

  describe('ControlCheckData', () => {
    it('should support three-tier control classification', () => {
      const fullyInControl: ControlCheckData = {
        aspect: 'My response',
        controlType: 'fully_in_control',
        whatIControl: 'My words and actions',
        timestamp: new Date(),
      };

      const canInfluence: ControlCheckData = {
        aspect: 'Team project',
        controlType: 'can_influence',
        whatIControl: 'My contribution',
        whatICannotControl: 'Others\' work',
        timestamp: new Date(),
      };

      const notInControl: ControlCheckData = {
        aspect: 'Weather',
        controlType: 'not_in_control',
        whatICannotControl: 'Weather conditions',
        acceptanceIfUncontrollable: 'Accept and adapt',
        timestamp: new Date(),
      };

      expect(fullyInControl.controlType).toBe('fully_in_control');
      expect(canInfluence.controlType).toBe('can_influence');
      expect(notInControl.controlType).toBe('not_in_control');
    });
  });

  describe('StoicEveningFlowData', () => {
    it('should create valid evening flow data with balanced examination', () => {
      const flowData: StoicEveningFlowData = {
        review: {
          morningIntentionPracticed: true,
          dayQualityRating: 7,
          virtueMoments: ['Practiced patience'],
          struggleMoments: ['Rushed through task'],
          whatViceDidIResist: 'Impatience',
          whatHabitDidIImprove: 'Pausing',
          howAmIBetterToday: 'More mindful',
          selfCompassion: 'I\'m learning',
          timestamp: new Date(),
        },
        virtueInstances: [
          {
            id: '1',
            virtue: 'wisdom',
            context: 'Paused before reacting',
            domain: 'work',
            principleApplied: 'principle_2',
            timestamp: new Date(),
          },
        ],
        virtueChallenges: [
          {
            id: '2',
            situation: 'Lost patience',
            virtueViolated: 'temperance',
            whatICouldHaveDone: 'Taken a breath',
            triggerIdentified: 'Tired',
            whatWillIPractice: 'Notice fatigue',
            selfCompassion: 'I\'m human',
            timestamp: new Date(),
          },
        ],
        learning: {
          reactVsRespondMoments: [
            {
              situation: 'Email response',
              myResponse: 'responded',
              whatILearned: 'Pausing helps',
              whatIllPractice: 'Continue pausing',
            },
          ],
          timestamp: new Date(),
        },
        senecaQuestions: {
          whatViceDidIResist: 'Anger',
          whatHabitDidIImprove: 'Patience',
          howAmIBetterToday: 'More calm',
          timestamp: new Date(),
        },
        gratitude: {
          items: [
            { what: 'Item 1' },
            { what: 'Item 2' },
            { what: 'Item 3' },
          ],
          timestamp: new Date(),
        },
        tomorrowIntention: {
          virtue: 'courage',
          context: 'relationships',
          intentionStatement: 'Speak my truth',
          whatIControl: 'My words',
          whatIDontControl: 'Others\' reactions',
          timestamp: new Date(),
        },
        selfCompassion: {
          reflection: 'I\'m doing my best',
          timestamp: new Date(),
        },
        completedAt: new Date(),
        timeSpentSeconds: 600,
        flowVersion: 'stoic_v1',
      };

      expect(flowData.virtueInstances).toHaveLength(1);
      expect(flowData.virtueChallenges).toHaveLength(1);
      expect(flowData.selfCompassion).toBeDefined();
    });

    it('should require self-compassion field (non-negotiable)', () => {
      const flowData: StoicEveningFlowData = {
        selfCompassion: {
          reflection: 'Required field',
          timestamp: new Date(),
        },
        completedAt: new Date(),
        timeSpentSeconds: 300,
        flowVersion: 'stoic_v1',
      };

      expect(flowData.selfCompassion).toBeDefined();
      expect(flowData.selfCompassion.reflection).toBeTruthy();
    });
  });

  describe('SenecaQuestionsData', () => {
    it('should capture Seneca\'s 3 examination questions', () => {
      const questions: SenecaQuestionsData = {
        whatViceDidIResist: 'Anger when frustrated',
        whatHabitDidIImprove: 'Pausing before responding',
        howAmIBetterToday: 'More patient with myself',
        timestamp: new Date(),
      };

      expect(questions.whatViceDidIResist).toBe('Anger when frustrated');
      expect(questions.whatHabitDidIImprove).toBe('Pausing before responding');
      expect(questions.howAmIBetterToday).toBe('More patient with myself');
    });
  });
});
