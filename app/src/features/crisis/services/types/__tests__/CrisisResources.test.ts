/**
 * CrisisResources helper tests (TEST-11)
 *
 * Locks the public-API contract of the crisis-resource registry that
 * `CrisisResourcesScreen` reads at line 301 (`getPriorityCrisisResources()`).
 * The screen renders these resources as the primary 988 / Crisis Text Line
 * / 911 dial CTAs — if this helper silently returns an empty array (or
 * drops one of the headline three), the screen renders with no resources
 * and there's no current test that catches it.
 *
 * Companion coverage exists in `__tests__/safety/offline-crisis-management.
 * test.ts` (PR 1, TEST-17) which also asserts these resources are present.
 * This file isolates the helper itself for fast, dependency-free
 * regression detection — no NetInfo mock, no component render.
 */
import {
  getPriorityCrisisResources,
  getCrisisResource,
  NATIONAL_CRISIS_RESOURCES,
} from '../CrisisResources';

describe('getPriorityCrisisResources — public-API contract', () => {
  test('returns a non-empty CrisisResource[]', () => {
    const resources = getPriorityCrisisResources();
    expect(Array.isArray(resources)).toBe(true);
    expect(resources.length).toBeGreaterThan(0);
  });

  test('includes the 988 Suicide & Crisis Lifeline', () => {
    const ids = getPriorityCrisisResources().map(r => r.id);
    expect(ids).toContain('988_lifeline');
  });

  test('includes the Crisis Text Line', () => {
    const ids = getPriorityCrisisResources().map(r => r.id);
    expect(ids).toContain('crisis_text_line');
  });

  test('includes Emergency 911', () => {
    const ids = getPriorityCrisisResources().map(r => r.id);
    expect(ids).toContain('emergency_911');
  });

  test('every priority resource has a working contact channel (phone, textNumber, or website)', () => {
    for (const r of getPriorityCrisisResources()) {
      const hasContact = Boolean(r.phone || r.textNumber || r.website);
      expect(hasContact).toBe(true);
    }
  });

  test('988 lifeline resource has the exact phone number "988"', () => {
    // Pin the phone number — a regression that mis-typed "988" as "998" or
    // truncated it would silently break the dial path. The
    // `check:crisis-hotline` prepush script verifies env-file presence;
    // this assertion verifies the runtime registry.
    const lifeline = getCrisisResource('988_lifeline');
    expect(lifeline).toBeTruthy();
    expect(lifeline!.phone).toBe('988');
  });

  test('Emergency 911 resource has the exact phone number "911"', () => {
    const emergency = getCrisisResource('emergency_911');
    expect(emergency).toBeTruthy();
    expect(emergency!.phone).toBe('911');
  });

  test('priority resources are a subset of NATIONAL_CRISIS_RESOURCES', () => {
    const priorityIds = new Set(getPriorityCrisisResources().map(r => r.id));
    const allIds = new Set(NATIONAL_CRISIS_RESOURCES.map(r => r.id));
    for (const id of priorityIds) {
      expect(allIds.has(id)).toBe(true);
    }
  });
});

describe('getCrisisResource — lookup by id', () => {
  test('returns undefined for unknown id (does NOT throw)', () => {
    expect(getCrisisResource('nonexistent_id')).toBeUndefined();
  });

  test('returns the matching resource for a known id', () => {
    const r = getCrisisResource('988_lifeline');
    expect(r).toBeTruthy();
    expect(r!.id).toBe('988_lifeline');
  });
});
