import { Platform, type PlatformOSType } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

/**
 * DEBUG-621 — which safe-area edges a MODAL practice host claims.
 *
 * Every host using this (PracticeTimer, BodyScan, ReflectionTimer via
 * PracticeScreenLayout, plus GuidedBodyScan) is a root-stack `presentation: 'modal'`
 * card with `headerShown: false`, rendered by the JS @react-navigation/stack.
 *
 * iOS: the stack resolves `modal` to ModalPresentationIOS, whose card interpolator
 * sets `marginTop: insets.top` on any card that is not first in the stack
 * (CardStyleInterpolators.tsx `forModalPresentationIOS`). That margin already clears
 * the status bar. react-native-safe-area-context's SafeAreaView reads the WINDOW's
 * insets from the root provider, not the view's on-screen position, so also claiming
 * `top` added a second full inset — a 47pt band on 390x844, 62pt on 402x874.
 *
 * Android (and any other platform): `modal` resolves to BottomSheetAndroid, a
 * full-height card with no margin, so it needs both edges.
 *
 * The iOS rule rests on two facts, both pinned by
 * practiceSafeAreaEdges.accessibility.test.tsx: each host stays a `modal` card, and a
 * practice route is never the first card (linking's `initialRouteName` is never one,
 * and CardStack gives the card beneath the next card's interpolator). A first card
 * gets `marginTop: 0` and would need `top` again.
 *
 * Compares `Platform.OS` rather than calling `Platform.select`: the jest RN mock's
 * `select` always returns the iOS branch, which would hide the Android value from tests.
 * Returns module-scope arrays so a default `edges` prop keeps a stable identity.
 * Portrait-locked, so left/right are never listed.
 */
export const IOS_MODAL_CARD_EDGES: readonly Edge[] = ['bottom'];
export const FULL_HEIGHT_EDGES: readonly Edge[] = ['top', 'bottom'];

export function getModalPracticeEdges(os: PlatformOSType = Platform.OS): readonly Edge[] {
  return os === 'ios' ? IOS_MODAL_CARD_EDGES : FULL_HEIGHT_EDGES;
}
