/**
 * MAINT-241 (SEC-W3 / BLOAT): the network-quality probe must NOT beacon to an
 * unaffiliated third-party host. The previous implementation fetched
 * `https://httpbin.org/get` on every assessNetworkQuality() call, leaking the
 * device IP to a service outside Being's control and outside any privacy-policy
 * disclosure.
 *
 * This is a static-source pin (mirrors the established
 * `__tests__/safety/lsApplicationQueriesSchemes.config.test.ts` pattern):
 * standing up the full NetInfo + Supabase-client harness to drive the private
 * assessNetworkQuality() throttle is disproportionate, and the contract we care
 * about — "no third-party beacon in the sync path" — is durably and cheaply
 * pinned by asserting the source carries no known external probe host.
 */
import * as fs from 'fs';
import * as path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'SyncCoordinator.ts'),
  'utf-8'
);

describe('SyncCoordinator network probe — no third-party beacon (MAINT-241)', () => {
  const FORBIDDEN_HOSTS = ['httpbin.org', 'example.com', 'google.com', 'cloudflare.com'];

  it.each(FORBIDDEN_HOSTS)('does not probe third-party host %s', (host) => {
    expect(SOURCE).not.toContain(host);
  });

  it('derives network quality from NetInfo rather than an outbound fetch probe', () => {
    // NetInfo is the in-process signal source; the probe must read its details
    // (or ping the app's own Supabase host) instead of an external beacon.
    expect(SOURCE).toContain('NetInfo');
  });
});
