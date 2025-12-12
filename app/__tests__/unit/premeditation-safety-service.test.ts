/**
 * PREMEDITATION SAFETY SERVICE UNIT TESTS
 *
 * Tests for premeditatio malorum (negative visualization) with safety safeguards.
 * Philosopher-validated (9.5/10) with crisis integration.
 *
 * TDD Approach: Tests written first, service implemented to pass tests.
 *
 * Key Safety Requirements (NON-NEGOTIABLE):
 * - Max 2 obstacles (prevents rumination spiral)
 * - Time-boxing (flag if >120s, suggest opt-out)
 * - Opt-out pathway (anxiety detection)
 * - Self-compassion REQUIRED if obstacles present
 * - Crisis integration (detect anxiety patterns, offer support)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md (Philosopher validation)
 */

import {
  PremeditationSafetyService,
  ObstacleInput,
  PremeditationSession,
  SafetyFlags,
} from '../../src/services/premeditationSafetyService';

describe('PremeditationSafetyService', () => {
  let service: PremeditationSafetyService;

  beforeEach(() => {
    service = new PremeditationSafetyService();
  });

  describe('Session Initialization', () => {
    it('should start a premeditation session', () => {
      const session = service.startSession();

      expect(session.sessionId).toBeTruthy();
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.obstacles).toEqual([]);
      expect(session.optedOut).toBe(false);
      expect(session.safetyFlags).toEqual({
        timeExceeded: false,
        maxObstaclesReached: false,
        anxietyDetected: false,
        shouldSuggestOptOut: false,
      });
    });

    it('should track session duration', () => {
      const session = service.startSession();

      // Simulate 30 seconds passing
      jest.useFakeTimers();
      jest.advanceTimersByTime(30 * 1000);

      const duration = service.getSessionDuration(session.sessionId);
      expect(duration).toBeGreaterThanOrEqual(30);

      jest.useRealTimers();
    });
  });

  describe('Obstacle Addition', () => {
    it('should add first obstacle without safety concerns', () => {
      const session = service.startSession();

      const obstacle: ObstacleInput = {
        obstacle: 'Difficult meeting',
        howICanRespond: 'Stay calm',
        whatIControl: 'My reaction',
        whatIDontControl: 'Meeting outcome',
        virtueToApply: 'temperance',
      };

      const updated = service.addObstacle(session.sessionId, obstacle);

      expect(updated.obstacles).toHaveLength(1);
      expect(updated.obstacles[0].obstacle).toBe('Difficult meeting');
      expect(updated.safetyFlags.maxObstaclesReached).toBe(false);
    });

    it('should add second obstacle and flag max reached', () => {
      const session = service.startSession();

      const obstacle1: ObstacleInput = {
        obstacle: 'Challenge 1',
        howICanRespond: 'Response 1',
        whatIControl: 'Control 1',
        whatIDontControl: 'No control 1',
      };

      const obstacle2: ObstacleInput = {
        obstacle: 'Challenge 2',
        howICanRespond: 'Response 2',
        whatIControl: 'Control 2',
        whatIDontControl: 'No control 2',
      };

      service.addObstacle(session.sessionId, obstacle1);
      const updated = service.addObstacle(session.sessionId, obstacle2);

      expect(updated.obstacles).toHaveLength(2);
      expect(updated.safetyFlags.maxObstaclesReached).toBe(true);
    });

    it('should prevent adding more than 2 obstacles (philosopher safety requirement)', () => {
      const session = service.startSession();

      const obstacle1: ObstacleInput = {
        obstacle: 'Challenge 1',
        howICanRespond: 'Response 1',
        whatIControl: 'Control 1',
        whatIDontControl: 'No control 1',
      };

      const obstacle2: ObstacleInput = {
        obstacle: 'Challenge 2',
        howICanRespond: 'Response 2',
        whatIControl: 'Control 2',
        whatIDontControl: 'No control 2',
      };

      const obstacle3: ObstacleInput = {
        obstacle: 'Challenge 3', // Should be rejected
        howICanRespond: 'Response 3',
        whatIControl: 'Control 3',
        whatIDontControl: 'No control 3',
      };

      service.addObstacle(session.sessionId, obstacle1);
      service.addObstacle(session.sessionId, obstacle2);

      expect(() => {
        service.addObstacle(session.sessionId, obstacle3);
      }).toThrow('Maximum 2 obstacles allowed');
    });
  });

  describe('Time-Boxing Safety', () => {
    it('should flag time exceeded after 120 seconds', () => {
      const session = service.startSession();

      jest.useFakeTimers();
      jest.advanceTimersByTime(121 * 1000); // 121 seconds

      const flags = service.checkSafetyFlags(session.sessionId);
      expect(flags.timeExceeded).toBe(true);
      expect(flags.shouldSuggestOptOut).toBe(true);

      jest.useRealTimers();
    });

    it('should not flag time before 120 seconds', () => {
      const session = service.startSession();

      jest.useFakeTimers();
      jest.advanceTimersByTime(119 * 1000); // 119 seconds

      const flags = service.checkSafetyFlags(session.sessionId);
      expect(flags.timeExceeded).toBe(false);
      expect(flags.shouldSuggestOptOut).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('Anxiety Detection', () => {
    it('should detect anxiety from rumination keywords', () => {
      const session = service.startSession();

      const obstacle: ObstacleInput = {
        obstacle: 'I am so worried and anxious about this meeting',
        howICanRespond: 'Try to stay calm',
        whatIControl: 'Not much',
        whatIDontControl: 'Everything',
      };

      const updated = service.addObstacle(session.sessionId, obstacle);

      expect(updated.safetyFlags.anxietyDetected).toBe(true);
      expect(updated.safetyFlags.shouldSuggestOptOut).toBe(true);
    });

    it('should detect anxiety from multiple worry indicators', () => {
      const anxietyKeywords = [
        'What if it goes wrong',
        'I cannot stop thinking about',
        'Terrible things might happen',
        'Scared that',
        'Panicked about',
      ];

      anxietyKeywords.forEach((keyword) => {
        const session = service.startSession();

        const obstacle: ObstacleInput = {
          obstacle: keyword,
          howICanRespond: 'Response',
          whatIControl: 'Control',
          whatIDontControl: 'No control',
        };

        const updated = service.addObstacle(session.sessionId, obstacle);

        expect(updated.safetyFlags.anxietyDetected).toBe(true);
      });
    });

    it('should not flag normal obstacle descriptions', () => {
      const session = service.startSession();

      const obstacle: ObstacleInput = {
        obstacle: 'Difficult meeting with stakeholders',
        howICanRespond: 'Stay focused, listen actively',
        whatIControl: 'My preparation and response',
        whatIDontControl: 'Their reactions',
      };

      const updated = service.addObstacle(session.sessionId, obstacle);

      expect(updated.safetyFlags.anxietyDetected).toBe(false);
    });
  });

  describe('Opt-Out Pathway', () => {
    it('should allow user to opt out of premeditation', () => {
      const session = service.startSession();

      const updated = service.optOut(session.sessionId, 'anxiety');

      expect(updated.optedOut).toBe(true);
      expect(updated.optOutReason).toBe('anxiety');
      expect(updated.obstacles).toEqual([]);
    });

    it('should support multiple opt-out reasons', () => {
      const reasons: Array<'anxiety' | 'not_needed_today' | 'prefer_gratitude'> = [
        'anxiety',
        'not_needed_today',
        'prefer_gratitude',
      ];

      reasons.forEach((reason) => {
        const session = service.startSession();
        const updated = service.optOut(session.sessionId, reason);

        expect(updated.optOutReason).toBe(reason);
      });
    });
  });

  describe('Self-Compassion Validation', () => {
    it('should require self-compassion note if obstacles present', () => {
      const session = service.startSession();

      service.addObstacle(session.sessionId, {
        obstacle: 'Challenge',
        howICanRespond: 'Response',
        whatIControl: 'Control',
        whatIDontControl: 'No control',
      });

      expect(() => {
        service.completeSession(session.sessionId, ''); // Empty self-compassion
      }).toThrow('Self-compassion note required');
    });

    it('should allow empty self-compassion if no obstacles', () => {
      const session = service.startSession();

      const completed = service.completeSession(session.sessionId, '');

      expect(completed.isComplete).toBe(true);
      expect(completed.selfCompassionNote).toBe('');
    });

    it('should accept valid self-compassion note', () => {
      const session = service.startSession();

      service.addObstacle(session.sessionId, {
        obstacle: 'Challenge',
        howICanRespond: 'Response',
        whatIControl: 'Control',
        whatIDontControl: 'No control',
      });

      const completed = service.completeSession(
        session.sessionId,
        'I\'m doing my best'
      );

      expect(completed.isComplete).toBe(true);
      expect(completed.selfCompassionNote).toBe('I\'m doing my best');
    });
  });

  describe('Session Completion', () => {
    it('should complete session with obstacles and self-compassion', () => {
      const session = service.startSession();

      service.addObstacle(session.sessionId, {
        obstacle: 'Difficult meeting',
        howICanRespond: 'Stay calm',
        whatIControl: 'My reaction',
        whatIDontControl: 'Meeting outcome',
      });

      const completed = service.completeSession(
        session.sessionId,
        'I\'m prepared and learning'
      );

      expect(completed.isComplete).toBe(true);
      expect(completed.endTime).toBeInstanceOf(Date);
      expect(completed.timeSpentSeconds).toBeGreaterThanOrEqual(0); // Can be 0 if instant
    });

    it('should complete session without obstacles (skipped)', () => {
      const session = service.startSession();

      const completed = service.completeSession(session.sessionId, '');

      expect(completed.isComplete).toBe(true);
      expect(completed.obstacles).toHaveLength(0);
    });

    it('should complete session after opt-out', () => {
      const session = service.startSession();

      service.optOut(session.sessionId, 'anxiety');
      const completed = service.completeSession(session.sessionId, '');

      expect(completed.isComplete).toBe(true);
      expect(completed.optedOut).toBe(true);
    });
  });

  describe('Crisis Integration', () => {
    it('should provide crisis resources if severe anxiety detected', () => {
      const session = service.startSession();

      service.addObstacle(session.sessionId, {
        obstacle: 'I cannot stop panicking and feel suicidal',
        howICanRespond: 'I don\'t know',
        whatIControl: 'Nothing',
        whatIDontControl: 'Everything',
      });

      const resources = service.getCrisisResourcesIfNeeded(session.sessionId);

      expect(resources).toBeTruthy();
      expect(resources?.showCrisisButton).toBe(true);
      expect(resources?.supportMessage).toContain('support');
    });

    it('should not provide crisis resources for normal obstacles', () => {
      const session = service.startSession();

      service.addObstacle(session.sessionId, {
        obstacle: 'Difficult meeting',
        howICanRespond: 'Stay calm',
        whatIControl: 'My reaction',
        whatIDontControl: 'Meeting outcome',
      });

      const resources = service.getCrisisResourcesIfNeeded(session.sessionId);

      expect(resources).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should retrieve active session by ID', () => {
      const session1 = service.startSession();
      const session2 = service.startSession();

      const retrieved = service.getSession(session1.sessionId);

      expect(retrieved.sessionId).toBe(session1.sessionId);
      expect(retrieved.sessionId).not.toBe(session2.sessionId);
    });

    it('should throw error if session not found', () => {
      expect(() => {
        service.getSession('nonexistent-session-id');
      }).toThrow('Session not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle removing obstacles (user changes mind)', () => {
      const session = service.startSession();

      service.addObstacle(session.sessionId, {
        obstacle: 'Challenge 1',
        howICanRespond: 'Response 1',
        whatIControl: 'Control 1',
        whatIDontControl: 'No control 1',
      });

      service.addObstacle(session.sessionId, {
        obstacle: 'Challenge 2',
        howICanRespond: 'Response 2',
        whatIControl: 'Control 2',
        whatIDontControl: 'No control 2',
      });

      const updated = service.removeObstacle(session.sessionId, 0);

      expect(updated.obstacles).toHaveLength(1);
      expect(updated.obstacles[0].obstacle).toBe('Challenge 2');
      expect(updated.safetyFlags.maxObstaclesReached).toBe(false);
    });

    it('should handle session timeout gracefully', () => {
      const session = service.startSession();

      jest.useFakeTimers();
      jest.advanceTimersByTime(300 * 1000); // 5 minutes

      const flags = service.checkSafetyFlags(session.sessionId);
      expect(flags.timeExceeded).toBe(true);

      // Should still allow completion even after timeout
      const completed = service.completeSession(session.sessionId, '');
      expect(completed.isComplete).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('Safety Flag Combinations', () => {
    it('should suggest opt-out when both time exceeded and anxiety detected', () => {
      const session = service.startSession();

      jest.useFakeTimers();
      jest.advanceTimersByTime(121 * 1000);

      service.addObstacle(session.sessionId, {
        obstacle: 'I am so worried about this',
        howICanRespond: 'Try to cope',
        whatIControl: 'Not much',
        whatIDontControl: 'Most things',
      });

      const flags = service.checkSafetyFlags(session.sessionId);

      expect(flags.timeExceeded).toBe(true);
      expect(flags.anxietyDetected).toBe(true);
      expect(flags.shouldSuggestOptOut).toBe(true);

      jest.useRealTimers();
    });
  });
});
