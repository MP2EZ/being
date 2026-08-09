/**
 * DEBUG-341 — the root error boundary the app did not have.
 *
 * BEFORE THIS, A RENDER THROW ANYWHERE UNDER CleanRootNavigator UNMOUNTED THE WHOLE TREE.
 * `Sentry.wrap(App)` is not a boundary — in @sentry/react-native it composes
 * TouchEventBoundary > ReactNativeProfiler > FeedbackWidgetProvider, and `componentDidCatch`
 * appears nowhere in its tree. `CrisisErrorBoundary` was mounted only by
 * EnhancedAssessmentFlow, i.e. on AssessmentFlow — the one route where the root crisis
 * overlay is already suppressed. So the app's only boundary sat below the only place it
 * could not help, and everything else white-screened with no 988 affordance at all.
 *
 * WHY IT IS MOUNTED HIGH, NOT AROUND THE CRISIS SUBTREE.
 * A boundary that wraps only the crisis overlay cannot catch the failure it exists for: a
 * screen render throw unmounts CleanRootNavigator, which unmounts that boundary AND the
 * button it was protecting, together. A boundary BELOW the thing that crashes is
 * decoration. This one is the immediate parent of <CleanRootNavigator /> — inside
 * SafeAreaProvider so the fallback can respect insets, inside GestureHandlerRootView
 * because that must stay the outermost native host view.
 *
 * The "but it blanks the whole app" objection is answered by what the fallback IS: a
 * working 988 screen. In this scenario the app is already dead; the choice is between a
 * white screen and a dial control. React's nearest-boundary semantics also keep the blast
 * radius honest — CrisisErrorBoundary still catches assessment crashes first and this one
 * never fires for them. That two-tier arrangement is deliberate.
 *
 * DELIBERATELY NOT REUSING CrisisErrorBoundary FOR THIS.
 * It imports CollapsibleCrisisButton (reanimated + gesture-handler), runs AppState and
 * timer-driven auto-retry, and pulls in the theme. Every one of those is a plausible cause
 * of the crash being displayed. The root fallback must not depend on the subsystems most
 * likely to have broken.
 *
 * NO AUTO-RETRY, DELIBERATELY. CrisisErrorBoundary retries on a 5s timer and on AppState
 * 'active'. This one inherits neither: a retry that re-crashes thrashes the fallback and
 * can unmount the 988 control from under a user's finger mid-tap. Recovery is
 * user-initiated only.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Static988Button from './Static988Button';
import { semantic, spacing } from '@/core/theme';

export const ROOT_CRISIS_BOUNDARY_FALLBACK_TEST_ID = 'root-crisis-boundary-fallback';

interface RootCrisisBoundaryProps {
  children: React.ReactNode;
  /** Injected in tests to assert reporting happens without a live Sentry. */
  onError?: (error: Error, componentStack: string) => void;
}

interface RootCrisisBoundaryState {
  hasError: boolean;
}

export class RootCrisisBoundary extends React.Component<
  RootCrisisBoundaryProps,
  RootCrisisBoundaryState
> {
  override state: RootCrisisBoundaryState = { hasError: false };

  /**
   * Synchronous and pre-commit. ONLY sets the flag — no logging, no Sentry, no async.
   * Anything slower belongs in componentDidCatch, which runs AFTER the fallback has
   * committed. Nothing may delay the 988 control's first paint.
   */
  static getDerivedStateFromError(): RootCrisisBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Wrapped because a throw HERE has no boundary above it — it would escape to the
    // React root and take out the fallback we are in the middle of showing.
    try {
      this.props.onError?.(error, info.componentStack ?? '');
    } catch {
      // Intentionally swallowed. Losing the report is survivable; losing the 988
      // control is not.
    }
  }

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.fallback} testID={ROOT_CRISIS_BOUNDARY_FALLBACK_TEST_ID}>
        {/*
          The control comes FIRST — visually and in the accessibility reading order —
          and the explanation second. Rendering null, a spinner, or copy that points at
          a control which is not on screen is prohibited: INFRA-297 had to correct
          exactly that mistake in CrisisErrorBoundary once already.
        */}
        <Static988Button message="Something went wrong in the app. Support is still one tap away, and you can always dial directly." />
        <Text style={styles.hint}>Reopening the app should restore it.</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: semantic.background.primary,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing[16],
    color: semantic.text.secondary,
  },
});

export default RootCrisisBoundary;
