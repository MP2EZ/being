# Changelog

All notable infrastructure and tooling changes that affect contributors. App-store-facing release notes live elsewhere (see `/b-release` flow). Keep entries Keep-a-Changelog style.

## [Unreleased]

### Changed (INFRA-158 — Expo SDK 54 → 56)

- **Expo SDK** 54 → 56 (carries **React Native** 0.81.4 → 0.85.3, **React** 19.1.0 → 19.2.3)
- **iOS minimum deployment target** 15.1 → 16.4 (drops iPhone 7/7+, 6s/6s+, SE 1st gen, iPad mini 4, iPad Air 2)
- **Hermes V1** is now the default JS engine
- **Reanimated** 4.3.x with new animation backend (`react-native-worklets` is now a required peer dep — added)
- **Vector icons** migrated from `@expo/vector-icons` to scoped `@react-native-vector-icons/*` packages. `MaterialCommunityIcons` → `MaterialDesignIcons` (same glyphs, new component name).

### Removed

- `newArchEnabled` config field (removed by SDK 55; New Architecture is mandatory)
- `edgeToEdgeEnabled` and `expo.edgeToEdgeEnabled` Android config (removed by SDK 55; edge-to-edge is mandatory)
- Top-level `splash` config (replaced by the `expo-splash-screen` config plugin)
- `ios.jsEngine` / `android.jsEngine` config (Hermes is the only option)
- `expo-build-properties`'s `ios.entitlements` field (removed in SDK 56). App Groups entitlement now injected via the local config plugin at `app/plugins/withAppGroupsEntitlement.js`.

### Added

- `expo-splash-screen` (formerly bundled into the `splash` top-level field)
- `expo-system-ui` (required to honor `userInterfaceStyle: "automatic"`)
- `react-native-worklets` (required peer dep of Reanimated 4.x)
- `@react-native-vector-icons/material-design-icons`, `@react-native-vector-icons/ionicons`
- `app/plugins/withAppGroupsEntitlement.js` — local Expo config plugin for App Groups

### Opted out (follow-up work items)

- **TypeScript 6.0.3** as the default. Kept on TS 5.9.x via `expo.install.exclude: ["typescript"]` in `package.json`. Migrate in a follow-up.
- **`expo/fetch` as `globalThis.fetch`**. Kept on RN's native fetch via `EXPO_PUBLIC_USE_RN_FETCH=1` in both env files. Migrate in a follow-up after Supabase/Stripe/Sentry/PostHog clients are explicitly validated against `expo/fetch`.
