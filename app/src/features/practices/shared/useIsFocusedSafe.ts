/**
 * useIsFocusedSafe — navigation focus, WITHOUT requiring a navigation container.
 *
 * `useIsFocused` throws outright when there is no navigator above it. That would
 * make every consumer unrenderable outside a NavigationContainer — which is how
 * most practice-screen tests mount them, and would be a hard crash rather than a
 * degraded experience anywhere a practice is embedded directly.
 *
 * Reading the context instead lets a consumer degrade honestly: inside a
 * navigator it tracks focus and blur properly; outside one it reports focused,
 * because there is no navigation state that could say otherwise.
 *
 * WHY IT LIVES HERE RATHER THAN IN THE HOOK THAT FIRST NEEDED IT (DEBUG-587).
 * Two practice surfaces emit while the practitioner may have navigated away, and
 * they are independent: `usePracticeHaptics` routes the tactile and paired-speech
 * channels, and `BreathingCircle` speaks every breath phase through
 * `AccessibilityInfo.announceForAccessibility` on a path that touches no haptics
 * code at all. Both must fall silent on the same signal, so they read one
 * implementation of it. A second copy would be a second thing to get wrong, on a
 * gate whose whole purpose is that nothing from a practice reaches a crisis
 * surface.
 *
 * Deliberately NOT in `core/hooks/`: that directory is a Protected Path, so
 * putting it there would arm the simulator safety gate on every future edit to a
 * helper whose consumers are all inside `features/practices/`.
 */

import { useContext, useEffect, useState } from 'react';
import { NavigationContext } from '@react-navigation/native';

export function useIsFocusedSafe(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    if (!navigation) return undefined;

    setFocused(navigation.isFocused());
    const unsubscribeFocus = navigation.addListener('focus', () => setFocused(true));
    const unsubscribeBlur = navigation.addListener('blur', () => setFocused(false));

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  return focused;
}
