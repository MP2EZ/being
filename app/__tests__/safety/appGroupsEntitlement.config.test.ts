/**
 * App Groups entitlement pin (MAINT-749 / TEST-64).
 *
 * iOS is CNG (INFRA-280): app/ios/ is generated per build, so what
 * plugins/withAppGroupsEntitlement.js writes into the entitlements plist never
 * shows in a diff. This runs the REAL plugin through the REAL expo/config-plugins
 * (no mock of withEntitlementsPlist), invokes the registered
 * `mods.ios.entitlements` callback against a modResults that already holds other
 * entitlements, and feeds it the props app.json actually declares.
 *
 * The widget itself is gone (MAINT-213 removed its flag); this pins the plugin's
 * contract and app.json's wiring as they ship today.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withAppGroupsEntitlement = require('../../plugins/withAppGroupsEntitlement') as (
  config: Record<string, unknown>,
  props: { groups: string[] },
) => { mods: { ios: { entitlements: (cfg: unknown) => Promise<{ modResults: Record<string, unknown> }> } } };

const APP_GROUPS_KEY = 'com.apple.security.application-groups';
const PLUGIN_PATH = './plugins/withAppGroupsEntitlement';

const appJson = JSON.parse(readFileSync(join(__dirname, '../../app.json'), 'utf8')) as {
  expo: { plugins: unknown[] };
};

/** app.json's declaration of the plugin: the [path, props] tuple. */
const declared = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === PLUGIN_PATH) as
  | [string, { groups: string[] }]
  | undefined;

/** Run the plugin and invoke the mod callback it registered, as prebuild would. */
async function runEntitlementsMod(props: { groups: string[] }, existing: Record<string, unknown>) {
  const config = withAppGroupsEntitlement({ name: 'Being', slug: 'being' }, props);
  const mod = config.mods?.ios?.entitlements;
  expect(typeof mod).toBe('function'); // liveness: the plugin registered an iOS entitlements mod
  const result = await mod({
    modRequest: { projectRoot: '/tmp/none', platformProjectRoot: '/tmp/none/ios', modName: 'entitlements', platform: 'ios', introspect: false },
    modResults: { ...existing },
    name: 'Being',
    slug: 'being',
  });
  return result.modResults;
}

describe('app.json -> withAppGroupsEntitlement wiring (CNG: invisible in any diff)', () => {
  it('declares the plugin with the widgets App Group', () => {
    expect(declared).toBeDefined();
    expect(declared![1].groups).toEqual(['group.fyi.being.app.widgets']);
  });

  it('writes the app.json groups into the entitlements plist, keeping other entitlements', async () => {
    const existing = {
      'aps-environment': 'production',
      'com.apple.developer.associated-domains': ['applinks:being.fyi'],
    };

    const out = await runEntitlementsMod(declared![1], existing);

    expect(out[APP_GROUPS_KEY]).toEqual(['group.fyi.being.app.widgets']);
    expect(out['aps-environment']).toBe('production');
    expect(out['com.apple.developer.associated-domains']).toEqual(['applinks:being.fyi']);
  });
});

describe('withAppGroupsEntitlement plugin contract', () => {
  it('writes whatever groups the config passes (not a hardcoded value)', async () => {
    const out = await runEntitlementsMod({ groups: ['group.test.one', 'group.test.two'] }, {});

    expect(out[APP_GROUPS_KEY]).toEqual(['group.test.one', 'group.test.two']);
  });

  it('overwrites a stale application-groups value rather than appending to it', async () => {
    const out = await runEntitlementsMod({ groups: ['group.new'] }, { [APP_GROUPS_KEY]: ['group.stale'] });

    expect(out[APP_GROUPS_KEY]).toEqual(['group.new']);
  });

  it('self-check: the key is absent before the mod runs, so its presence afterwards is the plugin\'s doing', async () => {
    const existing = { 'aps-environment': 'production' };
    expect(Object.keys(existing)).not.toContain(APP_GROUPS_KEY);

    const out = await runEntitlementsMod({ groups: ['group.fyi.being.app.widgets'] }, existing);

    expect(Object.keys(out)).toContain(APP_GROUPS_KEY);
  });
});
