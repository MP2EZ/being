/**
 * DEBUG-679 — the PracticeTimer route: the one place a practice link becomes props.
 *
 * Extracted from CleanRootNavigator's Stack.Screen render so the exact code a link reaches
 * can be rendered in jest (the navigator itself cannot be mounted there).
 *
 * LOAD-BEARING: this reads `practiceId` and, on the fallback only, `duration` from params.
 * Never `title`, `visualMode`, `instructions` or `moduleId`, whatever linking.ts or
 * DeepLinkValidationService let through: React Navigation passes unparsed query keys to the
 * route raw, so a URL can supply any of them. In-app launches send the same values the
 * catalog holds (resolvePracticeRoute), so they render as before.
 */

import React from 'react';
import PracticeTimerScreen from '@/features/learn/practices/PracticeTimerScreen';
import { isModuleId } from '@/features/learn/types/education';
import type { RootStackParamList } from './CleanRootNavigator';
import { fallbackLinkDuration, resolveLinkedPracticeParams } from './linkedPracticeParams';

interface PracticeTimerRouteProps {
  params: RootStackParamList['PracticeTimer'];
  onDone: () => void;
}

export default function PracticeTimerRoute({ params, onDone }: PracticeTimerRouteProps) {
  const linked = resolveLinkedPracticeParams(params.practiceId);
  return (
    <PracticeTimerScreen
      practiceId={linked.practiceId}
      moduleId={isModuleId(linked.moduleId) ? linked.moduleId : undefined}
      // A resolved practice runs for its catalog duration. Only the fallback takes the
      // link's, which linking.ts clamps to 10..3600s (DEBUG-353), or 60s when it has none.
      duration={linked.duration ?? fallbackLinkDuration(params.duration)}
      title={linked.title}
      instructions={linked.instructions}
      visualMode={linked.visualMode}
      onComplete={onDone}
      onBack={onDone}
    />
  );
}
