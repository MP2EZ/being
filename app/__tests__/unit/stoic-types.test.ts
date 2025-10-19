/**
 * STOIC TYPES UNIT TESTS
 *
 * Tests for core Stoic Mindfulness type definitions.
 * These types form the foundation of the Stoic practice architecture.
 *
 * TDD Approach: Tests written first, types implemented to pass tests.
 */

import {
  CardinalVirtue,
  DevelopmentalStage,
  PracticeDomain,
  VirtueInstance,
  VirtueChallenge,
  DomainProgress,
} from '../../src/types/stoic';

describe('Core Stoic Types', () => {
  describe('CardinalVirtue', () => {
    it('should accept all four classical virtues', () => {
      const virtues: CardinalVirtue[] = [
        'wisdom',
        'courage',
        'justice',
        'temperance',
      ];

      // TypeScript compilation validates these are valid CardinalVirtue values
      expect(virtues).toHaveLength(4);
      expect(virtues).toContain('wisdom');
      expect(virtues).toContain('courage');
      expect(virtues).toContain('justice');
      expect(virtues).toContain('temperance');
    });

    it('should only accept the four classical virtues (no modern additions)', () => {
      // This test documents the constraint (enforced by TypeScript)
      // Modern virtues like 'humility', 'compassion', 'gratitude' are NOT cardinal virtues
      const validVirtues: CardinalVirtue[] = [
        'wisdom',
        'courage',
        'justice',
        'temperance',
      ];

      expect(validVirtues).toHaveLength(4);

      // TypeScript would reject:
      // const invalid: CardinalVirtue = 'humility'; // ❌ Compilation error
      // const invalid: CardinalVirtue = 'compassion'; // ❌ Compilation error
    });
  });

  describe('DevelopmentalStage', () => {
    it('should accept all four developmental stages in order', () => {
      const stages: DevelopmentalStage[] = [
        'fragmented',
        'effortful',
        'fluid',
        'integrated',
      ];

      expect(stages).toHaveLength(4);
      expect(stages[0]).toBe('fragmented');  // 1-6 months
      expect(stages[1]).toBe('effortful');   // 6-18 months
      expect(stages[2]).toBe('fluid');       // 2-5 years
      expect(stages[3]).toBe('integrated');  // 5+ years
    });

    it('should represent progression from fragmented to integrated practice', () => {
      // Stages represent developmental progression (not completion levels)
      const beginnerStage: DevelopmentalStage = 'fragmented';
      const advancedStage: DevelopmentalStage = 'integrated';

      expect(beginnerStage).toBe('fragmented');
      expect(advancedStage).toBe('integrated');
    });
  });

  describe('PracticeDomain', () => {
    it('should accept all three practice domains', () => {
      const domains: PracticeDomain[] = [
        'work',
        'relationships',
        'adversity',
      ];

      expect(domains).toHaveLength(3);
      expect(domains).toContain('work');
      expect(domains).toContain('relationships');
      expect(domains).toContain('adversity');
    });

    it('should represent the three areas of Stoic practice application', () => {
      // These domains align with Stoic philosophy (Epictetus, Marcus Aurelius)
      const workDomain: PracticeDomain = 'work';
      const relationshipDomain: PracticeDomain = 'relationships';
      const adversityDomain: PracticeDomain = 'adversity';

      expect(workDomain).toBe('work');
      expect(relationshipDomain).toBe('relationships');
      expect(adversityDomain).toBe('adversity');
    });
  });

  describe('VirtueInstance', () => {
    it('should create a valid virtue instance with all required fields', () => {
      const instance: VirtueInstance = {
        id: 'virtue_instance_001',
        virtue: 'wisdom',
        context: 'Paused before reacting to criticism',
        domain: 'work',
        principleApplied: 'principle_2', // Dichotomy of Control
        timestamp: new Date('2025-10-19T10:30:00Z'),
      };

      expect(instance.id).toBe('virtue_instance_001');
      expect(instance.virtue).toBe('wisdom');
      expect(instance.context).toBe('Paused before reacting to criticism');
      expect(instance.domain).toBe('work');
      expect(instance.principleApplied).toBe('principle_2');
      expect(instance.timestamp).toBeInstanceOf(Date);
    });

    it('should allow null principleApplied (user may not identify specific principle)', () => {
      const instance: VirtueInstance = {
        id: 'virtue_instance_002',
        virtue: 'courage',
        context: 'Spoke up in meeting despite fear',
        domain: 'work',
        principleApplied: null, // User didn't identify principle
        timestamp: new Date(),
      };

      expect(instance.principleApplied).toBeNull();
    });

    it('should accept all four cardinal virtues', () => {
      const wisdomInstance: VirtueInstance = {
        id: '1',
        virtue: 'wisdom',
        context: 'Test',
        domain: 'work',
        principleApplied: null,
        timestamp: new Date(),
      };

      const courageInstance: VirtueInstance = {
        id: '2',
        virtue: 'courage',
        context: 'Test',
        domain: 'relationships',
        principleApplied: null,
        timestamp: new Date(),
      };

      const justiceInstance: VirtueInstance = {
        id: '3',
        virtue: 'justice',
        context: 'Test',
        domain: 'adversity',
        principleApplied: null,
        timestamp: new Date(),
      };

      const temperanceInstance: VirtueInstance = {
        id: '4',
        virtue: 'temperance',
        context: 'Test',
        domain: 'work',
        principleApplied: null,
        timestamp: new Date(),
      };

      expect(wisdomInstance.virtue).toBe('wisdom');
      expect(courageInstance.virtue).toBe('courage');
      expect(justiceInstance.virtue).toBe('justice');
      expect(temperanceInstance.virtue).toBe('temperance');
    });

    it('should accept all three practice domains', () => {
      const workInstance: VirtueInstance = {
        id: '1',
        virtue: 'wisdom',
        context: 'Test',
        domain: 'work',
        principleApplied: null,
        timestamp: new Date(),
      };

      const relationshipsInstance: VirtueInstance = {
        id: '2',
        virtue: 'wisdom',
        context: 'Test',
        domain: 'relationships',
        principleApplied: null,
        timestamp: new Date(),
      };

      const adversityInstance: VirtueInstance = {
        id: '3',
        virtue: 'wisdom',
        context: 'Test',
        domain: 'adversity',
        principleApplied: null,
        timestamp: new Date(),
      };

      expect(workInstance.domain).toBe('work');
      expect(relationshipsInstance.domain).toBe('relationships');
      expect(adversityInstance.domain).toBe('adversity');
    });
  });

  describe('VirtueChallenge', () => {
    it('should create a valid virtue challenge with all required fields', () => {
      const challenge: VirtueChallenge = {
        id: 'virtue_challenge_001',
        situation: 'Reacted defensively to feedback',
        virtueViolated: 'wisdom',
        whatICouldHaveDone: 'Paused, listened fully, asked clarifying questions',
        triggerIdentified: 'Felt criticized and judged',
        whatWillIPractice: 'Pause 3 seconds before responding to feedback',
        selfCompassion: 'I\'m learning. Receiving feedback is hard.',
        timestamp: new Date('2025-10-19T10:30:00Z'),
      };

      expect(challenge.id).toBe('virtue_challenge_001');
      expect(challenge.situation).toBe('Reacted defensively to feedback');
      expect(challenge.virtueViolated).toBe('wisdom');
      expect(challenge.whatICouldHaveDone).toBe('Paused, listened fully, asked clarifying questions');
      expect(challenge.triggerIdentified).toBe('Felt criticized and judged');
      expect(challenge.whatWillIPractice).toBe('Pause 3 seconds before responding to feedback');
      expect(challenge.selfCompassion).toBe('I\'m learning. Receiving feedback is hard.');
      expect(challenge.timestamp).toBeInstanceOf(Date);
    });

    it('should require self-compassion field (prevents harsh Stoicism)', () => {
      const challenge: VirtueChallenge = {
        id: 'virtue_challenge_002',
        situation: 'Lost patience with family member',
        virtueViolated: 'temperance',
        whatICouldHaveDone: 'Taken a breath, recognized I was tired',
        triggerIdentified: null, // May not always identify trigger
        whatWillIPractice: 'Notice when I\'m tired and need space',
        selfCompassion: 'This is a lifelong practice. I\'m doing my best.', // REQUIRED
        timestamp: new Date(),
      };

      // Self-compassion is required (TypeScript enforces this)
      expect(challenge.selfCompassion).toBeTruthy();
      expect(challenge.selfCompassion.length).toBeGreaterThan(0);
    });

    it('should allow null triggerIdentified (may not always identify trigger)', () => {
      const challenge: VirtueChallenge = {
        id: 'virtue_challenge_003',
        situation: 'Spoke harshly to colleague',
        virtueViolated: 'justice',
        whatICouldHaveDone: 'Used kinder tone, considered their perspective',
        triggerIdentified: null, // Trigger not identified
        whatWillIPractice: 'Speak with kindness even when frustrated',
        selfCompassion: 'I\'m learning to be more compassionate.',
        timestamp: new Date(),
      };

      expect(challenge.triggerIdentified).toBeNull();
    });

    it('should accept all four cardinal virtues as virtueViolated', () => {
      const wisdomChallenge: VirtueChallenge = {
        id: '1',
        situation: 'Test',
        virtueViolated: 'wisdom',
        whatICouldHaveDone: 'Test',
        triggerIdentified: null,
        whatWillIPractice: 'Test',
        selfCompassion: 'Test',
        timestamp: new Date(),
      };

      const courageChallenge: VirtueChallenge = {
        id: '2',
        situation: 'Test',
        virtueViolated: 'courage',
        whatICouldHaveDone: 'Test',
        triggerIdentified: null,
        whatWillIPractice: 'Test',
        selfCompassion: 'Test',
        timestamp: new Date(),
      };

      const justiceChallenge: VirtueChallenge = {
        id: '3',
        situation: 'Test',
        virtueViolated: 'justice',
        whatICouldHaveDone: 'Test',
        triggerIdentified: null,
        whatWillIPractice: 'Test',
        selfCompassion: 'Test',
        timestamp: new Date(),
      };

      const temperanceChallenge: VirtueChallenge = {
        id: '4',
        situation: 'Test',
        virtueViolated: 'temperance',
        whatICouldHaveDone: 'Test',
        triggerIdentified: null,
        whatWillIPractice: 'Test',
        selfCompassion: 'Test',
        timestamp: new Date(),
      };

      expect(wisdomChallenge.virtueViolated).toBe('wisdom');
      expect(courageChallenge.virtueViolated).toBe('courage');
      expect(justiceChallenge.virtueViolated).toBe('justice');
      expect(temperanceChallenge.virtueViolated).toBe('temperance');
    });
  });

  describe('DomainProgress', () => {
    it('should create a valid domain progress with all required fields', () => {
      const progress: DomainProgress = {
        domain: 'work',
        practiceInstances: 15,
        principlesApplied: ['principle_1', 'principle_2', 'principle_5'],
        lastPracticeDate: new Date('2025-10-19T10:30:00Z'),
      };

      expect(progress.domain).toBe('work');
      expect(progress.practiceInstances).toBe(15);
      expect(progress.principlesApplied).toHaveLength(3);
      expect(progress.principlesApplied).toContain('principle_1');
      expect(progress.principlesApplied).toContain('principle_2');
      expect(progress.principlesApplied).toContain('principle_5');
      expect(progress.lastPracticeDate).toBeInstanceOf(Date);
    });

    it('should allow null lastPracticeDate (domain not yet practiced)', () => {
      const progress: DomainProgress = {
        domain: 'adversity',
        practiceInstances: 0,
        principlesApplied: [],
        lastPracticeDate: null, // Never practiced in this domain yet
      };

      expect(progress.practiceInstances).toBe(0);
      expect(progress.principlesApplied).toHaveLength(0);
      expect(progress.lastPracticeDate).toBeNull();
    });

    it('should accept all three practice domains', () => {
      const workProgress: DomainProgress = {
        domain: 'work',
        practiceInstances: 10,
        principlesApplied: ['principle_1'],
        lastPracticeDate: new Date(),
      };

      const relationshipsProgress: DomainProgress = {
        domain: 'relationships',
        practiceInstances: 5,
        principlesApplied: ['principle_2'],
        lastPracticeDate: new Date(),
      };

      const adversityProgress: DomainProgress = {
        domain: 'adversity',
        practiceInstances: 3,
        principlesApplied: ['principle_3'],
        lastPracticeDate: new Date(),
      };

      expect(workProgress.domain).toBe('work');
      expect(relationshipsProgress.domain).toBe('relationships');
      expect(adversityProgress.domain).toBe('adversity');
    });

    it('should track multiple principles applied in a domain', () => {
      const progress: DomainProgress = {
        domain: 'work',
        practiceInstances: 25,
        principlesApplied: [
          'principle_1',  // Present Perception
          'principle_2',  // Dichotomy of Control
          'principle_5',  // Intention Over Outcome
          'principle_10', // Relational
        ],
        lastPracticeDate: new Date(),
      };

      expect(progress.principlesApplied).toHaveLength(4);
      expect(progress.principlesApplied).toContain('principle_1');
      expect(progress.principlesApplied).toContain('principle_2');
      expect(progress.principlesApplied).toContain('principle_5');
      expect(progress.principlesApplied).toContain('principle_10');
    });
  });

  describe('Type Integration', () => {
    it('should allow VirtueInstance and VirtueChallenge to use same CardinalVirtue', () => {
      const instance: VirtueInstance = {
        id: '1',
        virtue: 'wisdom',
        context: 'Practiced wisdom',
        domain: 'work',
        principleApplied: null,
        timestamp: new Date(),
      };

      const challenge: VirtueChallenge = {
        id: '2',
        situation: 'Failed to practice wisdom',
        virtueViolated: 'wisdom', // Same virtue as instance
        whatICouldHaveDone: 'Test',
        triggerIdentified: null,
        whatWillIPractice: 'Test',
        selfCompassion: 'Test',
        timestamp: new Date(),
      };

      expect(instance.virtue).toBe(challenge.virtueViolated);
    });

    it('should allow VirtueInstance and DomainProgress to use same PracticeDomain', () => {
      const instance: VirtueInstance = {
        id: '1',
        virtue: 'wisdom',
        context: 'Test',
        domain: 'work',
        principleApplied: null,
        timestamp: new Date(),
      };

      const progress: DomainProgress = {
        domain: 'work', // Same domain as instance
        practiceInstances: 1,
        principlesApplied: [],
        lastPracticeDate: new Date(),
      };

      expect(instance.domain).toBe(progress.domain);
    });
  });

  describe('Type Safety', () => {
    it('should enforce type constraints at compile time', () => {
      // These tests document TypeScript compile-time type safety
      // Invalid assignments would cause compilation errors

      // Valid assignments
      const validVirtue: CardinalVirtue = 'wisdom';
      const validStage: DevelopmentalStage = 'fragmented';
      const validDomain: PracticeDomain = 'work';

      expect(validVirtue).toBe('wisdom');
      expect(validStage).toBe('fragmented');
      expect(validDomain).toBe('work');

      // Invalid assignments (would fail TypeScript compilation):
      // const invalidVirtue: CardinalVirtue = 'humility'; // ❌
      // const invalidStage: DevelopmentalStage = 'mastered'; // ❌
      // const invalidDomain: PracticeDomain = 'health'; // ❌
    });
  });
});
