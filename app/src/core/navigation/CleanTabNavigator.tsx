/**
 * Clean Tab Navigator - Fresh start approach
 * Minimal bottom tabs without crypto dependencies
 * DRD-compliant therapeutic design
 *
 * Design Library Compliance:
 * - Navigation colors from colorSystem.navigation
 * - NavShape components: triangle (home), book (learn), circle (insights)
 * - BrainIcon with 60% fill for profile
 * - Inactive state: semantic.text.muted (was gray[500] until DEBUG-342 — that
 *   value is 1.98:1 on white and is now banned outright by ESLint)
 * - Active state: the brand hue on an ActiveTabIndicator container (DEBUG-356)
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Rect, ClipPath, Defs, G } from 'react-native-svg';
import { semantic, colorSystem, spacing, typography } from '@/core/theme';
import { ActiveTabIndicator } from './ActiveTabIndicator';
import CleanHomeScreen from '@/features/home/screens/CleanHomeScreen';
import ProfileStackNavigator from '@/features/profile/ProfileStackNavigator';
import InsightsScreen from '@/features/insights/screens/InsightsScreen';
import LearnScreen from '@/features/learn/screens/LearnScreen';
import BrainIcon from '@/core/components/shared/BrainIcon';

const Tab = createBottomTabNavigator();

// Design library navigation shapes - optimized for React Native
const TriangleIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2 L22 20 L2 20 Z" fill={color} />
  </Svg>
);

const SquareIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="3" width="18" height="18" rx="3" fill={color} />
  </Svg>
);

const CircleIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" fill={color} />
  </Svg>
);

const BookIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 19.5C4 20.881 5.119 22 6.5 22H20V2H6.5C5.119 2 4 3.119 4 4.5V19.5ZM18 4V20H6.5C6.224 20 6 19.776 6 19.5V5.207C6.313 5.348 6.644 5.45 7 5.5V18H18V4Z" fill={color} />
    <Path d="M9 8H15V10H9V8ZM9 11H15V13H9V11Z" fill={color} />
  </Svg>
);

// Placeholder components for other tabs
const PlaceholderScreen: React.FC<{ name: string; description: string }> = ({ name, description }) => (
  <View style={{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorSystem.base.white,
    padding: spacing[24]
  }}>
    <Text style={{
      fontSize: typography.headline4.size,
      fontWeight: typography.fontWeight.semibold,
      color: colorSystem.base.black,
      marginBottom: spacing[8],
      textAlign: 'center'
    }}>
      {name}
    </Text>
    <Text style={{
      fontSize: typography.bodyRegular.size,
      color: colorSystem.gray[600],
      textAlign: 'center',
      lineHeight: 22
    }}>
      {description}
    </Text>
  </View>
);

// Create proper component references to avoid inline functions
// ExercisesScreen now imported from separate file

// ProfileScreen now imported from separate file

const CleanTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colorSystem.base.white,
          borderTopColor: colorSystem.gray[200],
          borderTopWidth: 1,
          paddingBottom: spacing[8],
          paddingTop: spacing[8],
          height: 84,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 8,
        },
        // DEBUG-342: the label now carries selected state. It previously did NOT —
        // active was `base.black` and inactive was the literal '#1C1C1C', which IS
        // base.black, so the two states rendered identically (17.04:1 both ways) and
        // icon hue was the SOLE state cue. That made the icon colour load-bearing for
        // WCAG 1.4.11, and left selection signalled by colour alone (1.4.1, Level A).
        //
        // Darkening the inactive ICON to semantic.text.muted (4.61:1) to clear the 3:1
        // non-text bar would, on its own, have made unselected icons higher-contrast
        // than three of the four ACTIVE tints (navigation.insights 1.41:1,
        // exercises 2.04:1, home 2.68:1) — inverting the affordance. So the state delta
        // is restored structurally in the label instead, per DEBUG-323's ruling that
        // quieting must be structural rather than chromatic.
        //
        // DEBUG-356 closed the half DEBUG-342 left open. This block previously ended
        // "The active tints failing 3:1 are a design-system palette defect and are
        // NOT fixed here — they live in @mp2ez/being-design-system and need a
        // release." That turned out to be avoidable: the release is only required if
        // the HUE has to carry 1.4.11. Wrapping the focused glyph in
        // ActiveTabIndicator moves the obligation onto the container (14.16:1 against
        // this bar), so every brand hex ships unchanged and no package release is
        // needed. See ActiveTabIndicator.tsx for the measurements and the rejected
        // alternatives.
        //
        // Two corrections to DEBUG-342's note above, verified in code: the failing
        // set is TWO tints (insights 1.41:1, home 2.68:1) — navigation.learn is
        // 3.44:1 and passes — and navigation.exercises is not a tab tint at all; it
        // has zero consumers in app/src.
        tabBarActiveTintColor: semantic.text.primary,
        tabBarInactiveTintColor: semantic.text.muted,
        // Rendered here rather than via tabBarLabelStyle because that style is static
        // and cannot vary by state — and weight is half the state cue. `color` arrives
        // already resolved from the active/inactive tint colours above.
        tabBarLabel: ({ focused, color, children }) => (
          <Text
            style={{
              fontSize: typography.micro.size,
              fontWeight: focused
                ? typography.fontWeight.semibold
                : typography.fontWeight.medium,
              marginTop: spacing[4],
              color,
            }}
          >
            {children}
          </Text>
        ),
        headerStyle: {
          backgroundColor: colorSystem.base.white,
          borderBottomColor: colorSystem.gray[200],
          borderBottomWidth: 1,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 4,
        },
        headerTitleStyle: {
          fontSize: typography.title.size,
          fontWeight: typography.fontWeight.semibold,
          color: colorSystem.base.black,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={CleanHomeScreen}
        options={{
          headerTitle: 'Being',
          headerShown: false, // CleanHomeScreen has its own SafeAreaView
          // INFRA-183: tabBarButtonTestID is the only mechanically reliable
          // way for Maestro to target bottom tabs — tab labels render as
          // `text: ""` with `accessibilityText: "Home, tab, 1 of 4"` and
          // Maestro's `text:` selector doesn't match against accessibilityText.
          tabBarButtonTestID: 'tab-home',
          tabBarIcon: ({ focused }) => (
            <ActiveTabIndicator focused={focused}>
              <TriangleIcon
                color={focused ? colorSystem.navigation.home : semantic.text.muted}
              />
            </ActiveTabIndicator>
          ),
        }}
      />

      <Tab.Screen
        name="Learn"
        component={LearnScreen}
        options={{
          headerTitle: 'Learn',
          headerShown: false, // LearnScreen has its own SafeAreaView
          tabBarButtonTestID: 'tab-learn',
          tabBarIcon: ({ focused }) => (
            <ActiveTabIndicator focused={focused}>
              <BookIcon
                color={focused ? colorSystem.navigation.learn : semantic.text.muted}
              />
            </ActiveTabIndicator>
          ),
        }}
      />

      {/* DEBUG-189: Insights renders directly (no FeatureGate wrap) so the
          single root-level crisis overlay (MAINT-290) stays accessible over it.
          CLAUDE.md Safety Fact: "Crisis features ALWAYS accessible,
          regardless of subscription." The earlier paywall was incidental
          FEAT-16-deferral debris (FEAT-16 rescoped 2026-05-25 to V2). When
          FEAT-16 lands the real subscription UX, the gating decision (which
          screens, when in trial vs after trial, crisis-overlay placement on
          paywalls) gets designed end-to-end — don't reintroduce the wrapper
          without an explicit product call there. */}
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          headerTitle: 'Insights',
          headerShown: false, // InsightsScreen has its own SafeAreaView
          tabBarButtonTestID: 'tab-insights',
          tabBarIcon: ({ focused }) => (
            <ActiveTabIndicator focused={focused}>
              <CircleIcon
                color={focused ? colorSystem.navigation.insights : semantic.text.muted}
              />
            </ActiveTabIndicator>
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          headerTitle: 'Profile',
          // FEAT-212: the Profile tab now hosts a nested stack (ProfileStackNavigator)
          // which owns its own headers; keep the tab header hidden to avoid doubling.
          headerShown: false,
          tabBarButtonTestID: 'tab-profile',
          // DEBUG-356: Profile is the one tab whose ACTIVE glyph had to change
          // colour. Its tint was base.midnightBlue — which is now the container
          // fill, so it would render at 1.00:1 against its own background, i.e.
          // invisible. Knocked out to semantic.text.inverse (14.16:1 on the
          // container). The other three keep their brand hue unchanged.
          tabBarIcon: ({ focused }) => (
            <ActiveTabIndicator focused={focused}>
              <BrainIcon color={focused ? semantic.text.inverse : semantic.text.muted} />
            </ActiveTabIndicator>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default CleanTabNavigator;