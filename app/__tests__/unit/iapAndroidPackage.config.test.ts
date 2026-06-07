/**
 * IAP Android package-name drift guard (INFRA-232)
 *
 * The Google Play receipt-verification Edge Function identifies the Play
 * Console app by `packageName`. IAPService hardcodes that value as
 * `ANDROID_PACKAGE_NAME`, which MUST stay in sync with `expo.android.package`
 * in app.json — if app.json's package changes (e.g. another bundle-ID
 * re-point like MAINT-161) and this constant doesn't, every Android receipt
 * verification silently fails.
 *
 * This test reads both sources directly (no module import, mirroring the
 * INFRA-184 lsApplicationQueriesSchemes pin) and fails on mismatch in either
 * direction. Runs in `npm run test:unit` / precommit on every commit.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const appJson = require('../../app.json');

describe('IAP Android package name drift guard (INFRA-232)', () => {
  const appJsonPackage: unknown = appJson?.expo?.android?.package;

  it('app.json declares a non-empty expo.android.package', () => {
    expect(typeof appJsonPackage).toBe('string');
    expect(appJsonPackage).toBeTruthy();
  });

  it('IAPService ANDROID_PACKAGE_NAME matches app.json expo.android.package', () => {
    const source = readFileSync(
      join(__dirname, '../../src/core/services/subscription/IAPService.ts'),
      'utf8'
    );
    const match = source.match(
      /const ANDROID_PACKAGE_NAME\s*=\s*['"]([^'"]+)['"]/
    );
    expect(match).not.toBeNull();
    const iapPackage = match?.[1];
    expect(iapPackage).toBe(appJsonPackage);
  });
});
