import React from 'react';
import { View, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { sharedPracticeStyles } from './sharedPracticeStyles';
import PracticeScreenHeader from './PracticeScreenHeader';
import { getModalPracticeEdges } from './practiceSafeAreaEdges';
import { colorSystem } from '@/core/theme';

interface PracticeScreenLayoutProps {
  title: string;
  onBack: () => void;
  progress?: { current: number; total: number };
  children: React.ReactNode;
  scrollable?: boolean;
  /**
   * A screen-covering modal layer, rendered as a SIBLING of the scroll/content
   * container rather than inside it (FEAT-385).
   *
   * The distinction is load-bearing, not stylistic. `children` are nested inside the
   * ScrollView whenever `scrollable` is true — which is the case for all three
   * practice screens since DEBUG-618 — and an `position:'absolute'` inset-0 backdrop placed there
   * sizes to the SCROLL CONTENT box and scrolls away with it. Rendering here instead
   * puts the layer inside the `flex:1` SafeAreaView, where inset-0 means the screen.
   *
   * Passing an overlay also hides the content subtree from TalkBack, which has no
   * equivalent of iOS's `accessibilityViewIsModal`. The hiding is scoped to the
   * header + content wrapper and deliberately NOT applied to the SafeAreaView: that
   * is the overlay's own ancestor, so hiding it would hide the overlay too.
   */
  overlay?: React.ReactNode;
  testID?: string;
  /**
   * MAINT-437, corrected DEBUG-621. Which insets this layout claims. All three hosts
   * (PracticeTimer, ReflectionTimer, BodyScan) are modal-presented root-stack cards
   * with headerShown:false. The bottom edge is always claimed. The top edge is
   * platform-dependent: on iOS the modal card's own `marginTop: insets.top` already
   * supplies it, so claiming it here doubled the inset; Android's full-height
   * BottomSheetAndroid still needs it. See `getModalPracticeEdges` for the premise.
   * Portrait-locked, so left/right are never listed.
   *
   * A prop rather than a hardcoded value because this one component hosts three
   * screens: the deferred Android/iOS device pass (MAINT-437 ACs 5-6) can tune one
   * host without touching the other two.
   */
  edges?: readonly Edge[];
}

const PracticeScreenLayout: React.FC<PracticeScreenLayoutProps> = ({
  title,
  onBack,
  progress,
  children,
  scrollable = true,
  overlay,
  testID = 'practice-screen',
  edges = getModalPracticeEdges(),
}) => {
  const hasOverlay = overlay !== undefined && overlay !== null && overlay !== false;

  return (
    <SafeAreaView edges={edges} style={sharedPracticeStyles.container} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={colorSystem.base.white} />

      <View
        style={sharedPracticeStyles.container}
        importantForAccessibility={hasOverlay ? 'no-hide-descendants' : 'auto'}
        testID={`${testID}-content`}
      >
        <PracticeScreenHeader
          title={title}
          onBack={onBack}
          {...(progress && { progress })}
          testID={`${testID}-header`}
        />

        {scrollable ? (
          <ScrollView
            style={sharedPracticeStyles.scrollView}
            contentContainerStyle={sharedPracticeStyles.content}
            showsVerticalScrollIndicator={false}
            testID={`${testID}-scroll`}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={sharedPracticeStyles.content}>
            {children}
          </View>
        )}
      </View>

      {overlay}
    </SafeAreaView>
  );
};

export default PracticeScreenLayout;
