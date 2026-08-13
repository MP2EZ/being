/**
 * Being. App Entry Point
 * Evidence-based mindfulness and cognitive therapy for mental wellness
 */

import React, { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import CleanRootNavigator from './src/core/navigation/CleanRootNavigator';
// DEBUG-341: eager import, never lazy. CLAUDE.md's crisis-path rule — a fallback that
// has to resolve a chunk before it can render is not a fallback.
import RootCrisisBoundary from './src/features/crisis/components/RootCrisisBoundary';
import { logCrisis } from './src/core/services/logging';
import { IAPService } from './src/core/services/subscription/IAPService';
import { useSubscriptionStore } from './src/core/stores/subscriptionStore';
import EncryptionService from './src/core/services/security/EncryptionService';
import { useSettingsStore } from './src/core/stores/settingsStore';
import { initializeExternalReporting, logSystem, logError, LogCategory } from './src/core/services/logging';
import { sweepStaleAudioArtifacts } from './src/core/services/speech/audioArtifactSweeper';
import { sweepLegacyPlaintextRecords } from './src/core/services/security/legacyPlaintextRecordSweeper';
import { initializeCrisisMonitoring } from './src/core/services/monitoring';
import { DataRetentionService } from './src/core/services/data-retention';
import { PostHogProvider } from './src/core/analytics';
import { closeMenu as closeDevMenu } from 'expo-dev-menu';
import { maybeSeedE2EOnboardedState } from './src/core/config/e2eSeed';
// DEBUG-409: imported DIRECTLY, not via the `services/supabase` barrel — the barrel's
// module-scope eager init is the consent-gated path this fix routes around, and pulling
// it in here would drag CloudBackupService onto the boot graph.
import supabaseService from './src/core/services/supabase/SupabaseService';
import { useBugReportShake } from './src/core/hooks/useBugReportShake';

// INFRA-181: hide RN LogBox during Maestro runs. The dev warning toast (e.g.
// posthog-react-native's "usePostHog was called without a client" notice when
// the dev env has no API key) renders an overlay that monopolizes iOS'
// accessibility tree, hiding underlying onboarding buttons from Maestro's
// view-hierarchy queries. Console logs still print; only the on-screen UI is
// suppressed. Gated by the same E2E flag so normal dev iteration keeps LogBox.
if (__DEV__ && process.env['EXPO_PUBLIC_E2E_SUPPRESS_DEV_MENU'] === '1') {
  LogBox.ignoreAllLogs(true);
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const appState = useRef(AppState.currentState);

  // FEAT-284: shake-to-report (internal builds only; no-ops when the
  // bug_reporting flag is off or Sentry has no DSN).
  useBugReportShake();

  useEffect(() => {
    async function initializeApp() {
      try {
        logSystem('App initialization started');

        // Sentry first so subsequent spans (encryption health, crisis button
        // latency) reach the dashboard. Wrapped in try/catch: a Sentry init
        // failure must not block encryption init.
        try {
          await initializeExternalReporting();
        } catch (err) {
          logError(LogCategory.SYSTEM, 'Sentry init failed (non-blocking)', err as Error);
        }

        // FEAT-283 AC #3: remove raw audio stranded by a crash, kill, or
        // backgrounding mid-recording. The app cache is invisible to
        // `clearAllWellnessData` (which enumerates AsyncStorage keys), so a
        // stranded recording would otherwise survive even account deletion.
        // Name-scoped and self-contained; it never throws.
        try {
          const sweptAudio = sweepStaleAudioArtifacts();
          if (sweptAudio > 0) {
            logSystem(`Swept ${sweptAudio} stranded audio artifact(s) at launch`);
          }
        } catch (err) {
          logError(LogCategory.SYSTEM, 'Audio artifact sweep failed (non-blocking)', err as Error);
        }

        // DEBUG-305: purge plaintext crisis-intervention records written by
        // shipped builds. Removing the write helps only new installs — these
        // records are already on the devices of existing users, unencrypted and
        // invisible to account erasure. Runs before render; never throws.
        try {
          const sweptRecords = await sweepLegacyPlaintextRecords();
          if (sweptRecords > 0) {
            logSystem(`Swept ${sweptRecords} legacy plaintext wellness record(s) at launch`);
          }
        } catch (err) {
          logError(LogCategory.SYSTEM, 'Legacy record sweep failed (non-blocking)', err as Error);
        }

        // EncryptionService must initialize before downstream secure-storage
        // services (wellness data) depend on its keys. Sentry span captures
        // launch-time duration against the <2s app-launch budget.
        await Sentry.startSpan(
          { name: 'encryption.init', op: 'app.launch.encryption' },
          async () => {
            await EncryptionService.initialize();
          }
        );
        logSystem('Encryption service initialized');

        // INFRA-217: seed post-onboarding state for the e2e-sim safety gate.
        // No-op unless EXPO_PUBLIC_E2E_SEED_ONBOARDED==='true' (e2e-sim profile
        // only). Runs after EncryptionService.initialize() because the seeded
        // consent record persists to SecureStore. Self-contained try/catch, so
        // it never blocks init; gate the navigator render on its completion.
        // INFRA-217: seed post-onboarding state for the e2e-sim safety gate.
        // No-op unless EXPO_PUBLIC_E2E_SEED_ONBOARDED==='true' (e2e-sim profile
        // only). Runs after EncryptionService.initialize() because the seeded
        // consent record persists to SecureStore. Releases the seed gate that
        // CleanRootNavigator awaits before resolving its initial route.
        await maybeSeedE2EOnboardedState();

        // DEBUG-409: provision the crisis-telemetry lane so a queued `crisis_detected`
        // event can actually reach Supabase. Before this, the only client-construction
        // path was gated on `cloud_sync` consent evaluated at module-load time — always
        // false — so the off-device crisis audit trail did not exist for any user who
        // had not opened Profile → Cloud Backup.
        //
        // 🔴 FIRED UNAWAITED AND DELIBERATELY OUTSIDE the allSettled array below. That
        // array is AWAITED before setIsInitialized(true), so anything added to it delays
        // first render — and therefore delays crisis-button availability. Telemetry must
        // never sit in front of the 988 affordance. It no-ops when the durable queue is
        // empty, so the common boot pays nothing and opens no backend session.
        void supabaseService.initializeCrisisTelemetry();

        // Remaining init tasks are independent. allSettled (not all) so one
        // best-effort failure doesn't abort the others. IAP init only runs
        // when the platform supports it.
        const results = await Promise.allSettled([
          initializeCrisisMonitoring(),
          useSubscriptionStore.getState().loadSubscription(),
          IAPService.isAvailable()
            ? IAPService.initialize()
            : Promise.resolve(),
          DataRetentionService.runRetentionCleanup(),
        ]);

        results.forEach((result, idx) => {
          if (result.status === 'rejected') {
            const task = ['crisisMonitoring', 'loadSubscription', 'IAPService', 'dataRetention'][idx];
            logError(
              LogCategory.SYSTEM,
              `Init task '${task}' failed (non-blocking)`,
              result.reason as Error
            );
          }
        });

        setIsInitialized(true);
        logSystem('App initialization complete');
      } catch (error) {
        logError(LogCategory.SYSTEM, 'App initialization error', error as Error);
        setIsInitialized(true); // allow app to continue even if init fails
      }
    }

    initializeApp();
  }, []);

  // INFRA-181: dismiss Expo's first-launch dev-menu tutorial when Maestro
  // safety-e2e is running. `launchApp { clearState: true }` wipes the
  // "tutorial shown" flag every run, and the resurfaced tutorial covers
  // LegalGate so Maestro's accessibility-tree check treats it as hidden.
  // Gated by env flag so normal dev iteration still gets the tutorial on
  // first install (devs can summon the menu via Cmd+D anytime).
  useEffect(() => {
    if (!__DEV__) return;
    if (process.env['EXPO_PUBLIC_E2E_SUPPRESS_DEV_MENU'] !== '1') return;
    closeDevMenu();
    const t = setTimeout(closeDevMenu, 1000);
    return () => clearTimeout(t);
  }, []);

  // Track app state changes to update lastActiveTimestamp for intro animation
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app goes to background or becomes inactive, record timestamp
      if (
        appState.current === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        logSystem('App backgrounded, recording lastActive timestamp');
        useSettingsStore.getState().setLastActiveTimestamp(Date.now());
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  // Render app immediately - migration runs in background
  return (
    // GestureHandlerRootView MUST be the top-most wrapper. The single root crisis
    // button (MAINT-290: RootCrisisButton → CollapsibleCrisisButton) uses
    // GestureDetector at the navigation root, OUTSIDE any stack's gesture context, so
    // without this it throws "GestureDetector must be used as a descendant of
    // GestureHandlerRootView" (redbox in dev; swipe-to-expand silently dead in
    // release). Do not remove — the crisis button's swipe affordance depends on it.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          {/*
            DEBUG-341: the app had NO error boundary above CleanRootNavigator, so any
            render throw under it unmounted the whole tree to a white screen with no 988
            affordance. Sentry.wrap is a profiler/touch wrapper, not a boundary —
            componentDidCatch appears nowhere in its tree.

            Placement is deliberate: INSIDE SafeAreaProvider so the fallback can respect
            insets, and INSIDE GestureHandlerRootView, which must stay the outermost
            native host view. A boundary wrapping only the crisis subtree would be
            useless — a screen crash unmounts the navigator, taking that boundary and the
            button it protects down together.
          */}
          <RootCrisisBoundary
            onError={(error, componentStack) => {
              // Runs in componentDidCatch, i.e. AFTER the 988 fallback has committed —
              // never on the path to first paint.
              //
              // NOTE this is an ON-DEVICE record only, and the reason is narrower
              // than this comment used to claim (corrected DEBUG-338).
              //
              // It used to say a stack originating under features/crisis/ "contains
              // 'crisis' in every frame", so the filter drops it. That was true of
              // the SOURCE TREE and false of the transmitted event: Sentry's default
              // `createReactNativeRewriteFrames()` rewrites every frame's `filename`
              // to `app:///main.jsbundle` under Expo and deletes `abs_path`, before
              // `beforeSend` ever runs. `containsCrisisContent` never saw those paths,
              // and since DEBUG-338 it does not scan `stacktrace.frames[]` at all.
              //
              // What actually keeps this on-device: `RootCrisisBoundary` is not wired
              // to the external reporter in the first place (CrisisErrorBoundary's
              // `reportError` call is commented out), and any event whose MESSAGE or
              // other content-bearing field carries crisis prose is still dropped
              // wholesale — which this one's would be. The local log is the
              // accountability record here.
              // logCrisis's context is a fixed shape (detectionTime / interventionType
              // / severity) and deliberately does NOT take free-form fields, so the
              // detail rides in the message and the structured part stays schema-clean.
              logCrisis(
                `Root render error — degraded to static 988 fallback: ${error.message}`,
                { severity: 'critical', interventionType: 'display' },
              );
              void componentStack;
            }}
          >
            <CleanRootNavigator />
          </RootCrisisBoundary>
        </SafeAreaProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}

// FEAT-284: Sentry.wrap is REQUIRED for the in-app feedback widget
// (showFeedbackWidget) to present; it also enables Sentry's touch/gesture
// context. Harmless when Sentry has no DSN (dev/sim).
export default Sentry.wrap(App);
