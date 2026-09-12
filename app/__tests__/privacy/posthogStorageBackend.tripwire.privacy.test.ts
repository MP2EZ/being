/**
 * DEBUG-539 AC7 — pin the PostHog storage BACKEND BRANCH, not the version.
 *
 * `resetAnalyticsIdentity` deletes `.posthog-rn.json` / `.posthog-rn-logs.json`
 * from the document directory on the never-consented path. That is correct only
 * while `posthog-react-native` resolves its optimistic storage to the
 * `expo-file-system` FILE branch, where storage KEYS *are* filenames.
 *
 * `buildOptimisticAsyncStorage` is a THREE-TIER fallback:
 *   1. expo-file-system exporting BOTH `Paths` and `File`  -> file-backed  (today)
 *   2. expo-file-system legacy `readAsStringAsync`         -> legacy store
 *   3. @react-native-async-storage/async-storage           -> AsyncStorage
 *
 * If a future resolution loses `Paths`/`File`, the adapter silently drops to
 * tier 2 or 3. At that point the file-unlinking arm becomes dead code AND
 * `SECURE_STORAGE_CONFIG.SWEPT_EXACT_KEYS` becomes the correct fix — the exact
 * inversion this file exists to make loud.
 *
 * Pinning the VERSION would not catch it: the branch depends on what the module
 * EXPORTS, which can change within a semver-compatible bump. So assert the
 * export surface and the guard, and read them as TEXT — expo-file-system's entry
 * is untransformed TS (which is why jest.setup.js mocks it at all) and posthog's
 * dist is not reachable through the package `exports` map.
 */

import fs from 'fs';
import path from 'path';

import { POSTHOG_RN_STORAGE_FILES } from '@/core/analytics/analyticsIdentityReset';

const NODE_MODULES = path.resolve(__dirname, '../../node_modules');
const read = (rel: string): string => fs.readFileSync(path.join(NODE_MODULES, rel), 'utf8');

describe('DEBUG-539 AC7: the PostHog storage backend branch is pinned', () => {
  it('posthog-react-native still names the two storage files we delete', () => {
    const storage = read('posthog-react-native/dist/storage.js');

    // Matcher-fires control (DEBUG-390): a path typo or a moved dist file would
    // make every assertion below vacuous against an empty string.
    expect(storage.length).toBeGreaterThan(500);

    for (const file of POSTHOG_RN_STORAGE_FILES) {
      expect(storage).toContain(file);
    }
  });

  it('expo-file-system still exports BOTH Paths and File — tier 1 stays reachable', () => {
    const dts = read('expo-file-system/build/index.d.ts');
    expect(dts.length).toBeGreaterThan(200);
    expect(dts).toMatch(/\bPaths\b/);
    expect(dts).toMatch(/\bFile\b/);
  });

  it('the tier-1 guard is still the FIRST branch taken', () => {
    const deps = read('posthog-react-native/dist/native-deps.js');
    expect(deps.length).toBeGreaterThan(200);

    // The guard that selects file-backed storage. If this stops matching, the
    // adapter has moved and the reset primitive's unlink arm is no longer sound.
    expect(deps).toMatch(/Paths\s*&&[\s\S]{0,40}File/);

    // And the file-backed construction itself, which is what makes a storage KEY
    // a FILENAME rather than an AsyncStorage key.
    expect(deps).toMatch(/new\s+\w*\.?File\(/);
  });

  it('CONSEQUENCE, stated so a future reader does not have to re-derive it', () => {
    // Not an assertion about behaviour — a deliberate, executable note. If any
    // test above goes red, the fix is NOT to relax it: it is to move the residue
    // handling from file-unlinking to SWEPT_EXACT_KEYS and re-point this pin.
    expect(POSTHOG_RN_STORAGE_FILES).toEqual(['.posthog-rn.json', '.posthog-rn-logs.json']);
  });
});
