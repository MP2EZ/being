/**
 * SORTING PRACTICE ROUTE — scenario-resolving wrapper (FEAT-293)
 *
 * `SortingPracticeScreen` requires a fully-loaded `scenarios` array and throws
 * if one is missing at the current index. That was fine while Learn was the only
 * entry point, because ModuleDetail has already loaded module content by the
 * time it launches a practice. It is NOT fine for the standalone Practice
 * Library (or for the `/sorting` deep link in linking.ts, which has always been
 * broken for exactly this reason — a URL cannot carry a scenarios array).
 *
 * This wrapper resolves scenarios before rendering: it passes them straight
 * through when the caller already has them (Learn — unchanged behaviour, no
 * extra load, no flash of a spinner), and otherwise loads module content itself.
 * Keeping the resolution OUT of SortingPracticeScreen leaves that screen's
 * philosopher-signed feedback copy and hook order untouched.
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colorSystem, spacing, typography } from '@/core/theme';
import SortingPracticeScreen from '@/features/learn/practices/SortingPracticeScreen';
import { loadModuleContent } from '@/core/services/moduleContent';
import type { ModuleId, SortingScenario } from '@/features/learn/types/education';

interface SortingPracticeRouteProps {
  practiceId: string;
  moduleId: ModuleId;
  /** Supplied by Learn; omitted by the Practice Library and by deep links. */
  scenarios?: SortingScenario[] | undefined;
  onComplete?: (() => void) | undefined;
  onBack?: (() => void) | undefined;
}

const SortingPracticeRoute: React.FC<SortingPracticeRouteProps> = ({
  practiceId,
  moduleId,
  scenarios,
  onComplete,
  onBack,
}) => {
  const alreadyResolved = Boolean(scenarios?.length);
  const [resolved, setResolved] = useState<SortingScenario[] | null>(
    alreadyResolved ? (scenarios as SortingScenario[]) : null
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (alreadyResolved) return;

    let cancelled = false;
    (async () => {
      try {
        const content = await loadModuleContent(moduleId);
        const practice = content.practices.find((p) => p.id === practiceId);
        const loaded = practice?.scenarios ?? [];
        if (cancelled) return;
        if (loaded.length === 0) {
          setFailed(true);
          return;
        }
        setResolved(loaded);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [alreadyResolved, moduleId, practiceId]);

  if (failed) {
    return (
      <View style={styles.centered} testID="sorting-practice-unavailable">
        <Text style={styles.message}>
          This practice couldn’t be loaded right now.
        </Text>
      </View>
    );
  }

  if (!resolved) {
    return (
      <View style={styles.centered} testID="sorting-practice-loading">
        <ActivityIndicator color={colorSystem.navigation.learn} />
      </View>
    );
  }

  return (
    <SortingPracticeScreen
      practiceId={practiceId}
      moduleId={moduleId}
      scenarios={resolved}
      {...(onComplete ? { onComplete } : {})}
      {...(onBack ? { onBack } : {})}
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorSystem.base.white,
    padding: spacing[24],
  },
  message: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
  },
});

export default SortingPracticeRoute;
