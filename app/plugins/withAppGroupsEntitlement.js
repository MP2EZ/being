const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Adds the App Groups entitlement to the iOS app target so the home-screen
 * widget can share SharedPreferences with the main app.
 *
 * Previously injected via expo-build-properties' `ios.entitlements` field,
 * which was removed in SDK 56. See INFRA-158.
 */
const withAppGroupsEntitlement = (config, { groups }) => {
  return withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.security.application-groups'] = groups;
    return mod;
  });
};

module.exports = withAppGroupsEntitlement;
