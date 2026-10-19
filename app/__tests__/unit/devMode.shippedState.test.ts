/**
 * RECORDING CURRENT SHIPPED STATE of core/constants/devMode.ts (MAINT-749 / TEST-44).
 *
 * IS_DEV_MODE is a hardcoded `true` literal: there is no __DEV__ gate, so it is
 * `true` in a Release build too, and every getter returns its dev constant
 * (dev-user-001 / dev-user@being.local / 2025-01-01). This pins that fact, NOT
 * an endorsement of it: FEAT-16 (real auth) owns flipping the flag, and that
 * change should update this file in the same commit.
 *
 * The getters' `throw` branch is deliberately not asserted: while the flag is a
 * literal `true` it is unreachable in any build, Release included, and flipping
 * a module constant would mean mocking the module under test.
 *
 * The real module is used (never mocked here); six other suites mock it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  IS_DEV_MODE,
  DEV_USER_ID,
  DEV_USER_EMAIL,
  DEV_USER_CREATED_AT,
  getCurrentUserId,
  getCurrentUserEmail,
  getUserCreatedAt,
  isDevMode,
} from '../../src/core/constants/devMode';

describe('devMode.ts: current shipped state (recording, not endorsing)', () => {
  it('IS_DEV_MODE is true', () => {
    expect(IS_DEV_MODE).toBe(true);
    expect(isDevMode()).toBe(true);
  });

  it('each getter returns its dev constant', () => {
    expect(getCurrentUserId()).toBe(DEV_USER_ID);
    expect(getCurrentUserEmail()).toBe(DEV_USER_EMAIL);
    expect(getUserCreatedAt()).toBe(DEV_USER_CREATED_AT);
  });

  it('the dev constants have the recorded values', () => {
    expect(DEV_USER_ID).toBe('dev-user-001');
    expect(DEV_USER_EMAIL).toBe('dev-user@being.local');
    expect(DEV_USER_CREATED_AT.toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  it('the flag is a bare literal with no __DEV__ gate (why it ships in Release)', () => {
    const source = readFileSync(join(__dirname, '../../src/core/constants/devMode.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const declaration = source.match(/export const IS_DEV_MODE\s*=\s*([^;]+);/);

    expect(declaration).not.toBeNull(); // liveness: the declaration was found after stripping comments
    expect(declaration![1]!.trim()).toBe('true');
    expect(source).not.toMatch(/__DEV__/);
  });
});
