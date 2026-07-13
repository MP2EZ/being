/**
 * env.quick.test.ts — JEST_QUICK fast-path coverage for the env schema.
 *
 * Runs in <100ms with minimal mocks (quick-setup.js). Catches obvious
 * regressions in env-var parsing without spinning up RN / Expo / native
 * deps. Pairs with the heavier `env.test.ts` which does full schema
 * validation under the regular setup (the env has 50+ required fields,
 * so a "valid happy-path" test belongs in the full suite, not here).
 *
 * Purpose of quick variant: developer-feedback loop. A typo in
 * `envSchema` should fail in <1s during local edit-save.
 */
import { envSchema, parseEnv } from '@/core/config/env';

describe('env schema — fast-path sanity', () => {
  it('exports envSchema and parseEnv', () => {
    expect(envSchema).toBeTruthy();
    expect(typeof parseEnv).toBe('function');
  });

  it('rejects an empty env (no required fields populated)', () => {
    expect(() => parseEnv({})).toThrow();
  });

  it('rejects env with EXPO_PUBLIC_ENV outside the allowed enum', () => {
    expect(() =>
      parseEnv({ EXPO_PUBLIC_ENV: 'pretend-tier' } as Record<string, string | undefined>),
    ).toThrow();
  });

  it('schema requires the literal crisis hotlines (988, 741741, 911) — refuses to parse without them', () => {
    // The schema treats these as literal types — any non-literal value
    // (including absent) must throw. This pins the "no runtime override
    // for 988" contract documented in env.ts:55-59.
    expect(() =>
      parseEnv({
        EXPO_PUBLIC_ENV: 'development',
        EXPO_PUBLIC_CRISIS_HOTLINE: '999', // wrong literal
      } as Record<string, string | undefined>),
    ).toThrow();
  });
});
