/**
 * CRISIS RESOURCES SCREEN
 * Displays national crisis resources with offline-first support
 *
 * SAFETY REQUIREMENTS:
 * - All resources available offline (<200ms load)
 * - One-tap calling/texting via native protocols
 * - evidence-based supportive language
 * - Emergency 911 prominently displayed
 * - Crisis detection context-aware display
 *
 * COMPLIANCE:
 * - Privacy: No wellness data transmitted to external services
 * - Terms: User acknowledges referral-only service
 * - Accessibility: WCAG AA compliant
 */

import React, { useEffect, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAnalytics } from '@/core/analytics';
import { semantic, colorSystem, spacing, borderRadius, typography, TOUCH_TARGETS } from '@/core/theme';
import { logPerformance, logSecurity, logError, LogCategory } from '@/core/services/logging';
import { openCrisisUrl } from '@/features/crisis/utils/openCrisisUrl';
import { endCrisisTap } from '@/features/crisis/services/crisisTapTrace';
import {
  CRISIS_RESOURCE_CATEGORIES,
  getPriorityCrisisResources,
  type CrisisResource,
  type CrisisResourcePriority
} from '@/features/crisis/services/types/CrisisResources';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';

type CrisisResourcesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CrisisResources'>;
type CrisisResourcesScreenRouteProp = RouteProp<RootStackParamList, 'CrisisResources'>;

/**
 * Validate URL protocol to prevent malicious URLs
 * @param url - URL to validate
 * @param allowedProtocols - Array of allowed protocols (e.g., ['tel', 'sms', 'http', 'https'])
 * @returns True if URL is safe, false otherwise
 */
const validateUrlProtocol = (url: string, allowedProtocols: string[]): boolean => {
  const trimmed = url.trim().toLowerCase();

  // Check if URL starts with an allowed protocol
  const isValid = allowedProtocols.some(protocol => trimmed.startsWith(`${protocol}:`));

  if (!isValid) {
    logError(LogCategory.CRISIS, 'Invalid URL protocol detected');
  }

  return isValid;
};

interface ResourceCardProps {
  resource: CrisisResource;
  onPress: () => void;
  /**
   * DEBUG-432: suppress this card's own "Call Now" control. Set ONLY for the
   * 988 lifeline, whose dial now lives in the pinned footer outside the
   * ScrollView. The card keeps all of its information (availability, languages,
   * TTY); only the duplicate action is withheld.
   *
   * Why suppress rather than render both: DEBUG-341 reverted a duplicated crisis
   * control because two differently-labelled Call-988 buttons on one screen is
   * worse for a screen reader user than the gap it was meant to close, and a
   * duplicated `crisis-call-988-button` testID makes the selectors in
   * crisis-988-dial.yaml and deeplink-consent-gate.yaml ambiguous.
   */
  hidePrimaryAction?: boolean;
}

/**
 * Resource Card Component
 * Displays individual crisis resource with contact actions
 */
const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onPress, hidePrimaryAction = false }) => {
  const getPriorityColor = (priority: CrisisResourcePriority): string => {
    switch (priority) {
      case 'emergency':
        return '#D32F2F';
      case 'high':
        return '#FF6B6B';
      case 'specialized':
        return '#FF8C00';
      case 'normal':
      default:
        return colorSystem.gray[700];
    }
  };

  const handleSecondaryAction = () => {
    if (resource.textNumber) {
      // Correct SMS deeplink: `?body=` delimiter + encoded keyword (e.g.
      // sms:741741?body=HOME). The old `&body=` form broke the Crisis Text
      // Line handoff. (DEBUG-230 / SEC-08.)
      const smsUrl = resource.textMessage
        ? `sms:${resource.textNumber}?body=${encodeURIComponent(resource.textMessage)}`
        : `sms:${resource.textNumber}`;

      // Validate SMS protocol
      if (!validateUrlProtocol(smsUrl, ['sms'])) {
        Alert.alert('Error', 'Invalid SMS URL. Please contact support.');
        return;
      }

      void openCrisisUrl(smsUrl, {
        fallbackTitle: 'Unable to Text',
        fallbackMessage: `Please text ${resource.textMessage ?? ''} to ${resource.textNumber} for support.`.replace(/\s+/g, ' '),
      });
    } else if (resource.website) {
      // Validate HTTP/HTTPS protocol
      if (!validateUrlProtocol(resource.website, ['http', 'https'])) {
        Alert.alert('Error', 'Invalid website URL. Please contact support.');
        return;
      }

      Linking.openURL(resource.website).catch(error => {
        logError(LogCategory.CRISIS, 'Failed to open website', error instanceof Error ? error : new Error(String(error)));
        Alert.alert('Error', 'Unable to open website');
      });
    }
  };

  return (
    <View
      style={[
        styles.resourceCard,
        resource.priority === 'emergency' && styles.emergencyCard,
        resource.priority === 'high' && styles.highPriorityCard
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${resource.name}. ${resource.description}`}
    >
      {/* Priority Indicator */}
      {(resource.priority === 'emergency' || resource.priority === 'high') && (
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(resource.priority) }]}>
          <Text style={styles.priorityText}>
            {resource.priority === 'emergency' ? '🚨 EMERGENCY' : '⚠️ CRISIS SUPPORT'}
          </Text>
        </View>
      )}

      {/* Resource Header */}
      <View style={styles.resourceHeader}>
        <Text style={styles.resourceName}>{resource.name}</Text>
        <Text style={styles.resourceAvailability}>{resource.availability}</Text>
      </View>

      {/* Resource Description */}
      <Text style={styles.resourceDescription}>{resource.description}</Text>

      {/* Contact Information */}
      {resource.phone && (
        <View style={styles.contactInfo}>
          <Text style={styles.contactLabel}>Phone:</Text>
          <Text style={styles.contactValue}>
            {resource.phone}{resource.extension ? ` (Press ${resource.extension})` : ''}
          </Text>
        </View>
      )}

      {resource.textNumber && (
        <View style={styles.contactInfo}>
          <Text style={styles.contactLabel}>Text:</Text>
          <Text style={styles.contactValue}>
            {resource.textMessage} to {resource.textNumber}
          </Text>
        </View>
      )}

      {resource.languages && resource.languages.length > 0 && (
        <View style={styles.contactInfo}>
          <Text style={styles.contactLabel}>Languages:</Text>
          <Text style={styles.contactValue}>{resource.languages.join(', ')}</Text>
        </View>
      )}

      {/* Warning Note */}
      {resource.warningNote && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>⚠️ {resource.warningNote}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {resource.phone && !hidePrimaryAction && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed ? '#C62828' : getPriorityColor(resource.priority),
                opacity: pressed ? 0.9 : 1
              }
            ]}
            onPress={onPress}
            testID={`crisis-call-${resource.id}-button`}
            accessibilityRole="button"
            accessibilityLabel={`Call ${resource.name}`}
          >
            <Text style={styles.primaryButtonText}>📞 Call Now</Text>
          </Pressable>
        )}

        {(resource.textNumber || resource.website) && (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
            onPress={handleSecondaryAction}
            accessibilityRole="button"
            accessibilityLabel={resource.textNumber ? `Text ${resource.name}` : `Visit ${resource.name} website`}
          >
            <Text style={styles.secondaryButtonText}>
              {resource.textNumber ? '💬 Text' : '🌐 Website'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

/**
 * Crisis Resources Screen
 * Main component displaying organized crisis resources
 */
export default function CrisisResourcesScreen() {
  const navigation = useNavigation<CrisisResourcesScreenNavigationProp>();
  const route = useRoute<CrisisResourcesScreenRouteProp>();
  const { trackScreenView, trackCrisisResourcesViewed, trackCrisisHotlineTapped } = useAnalytics();
  const startTime = performance.now();

  // Track screen view for analytics (FEAT-137)
  useFocusEffect(
    useCallback(() => {
      trackScreenView('CrisisResourcesScreen');
      trackCrisisResourcesViewed();
    }, [trackScreenView, trackCrisisResourcesViewed])
  );

  // Close the crisis-tap measurement opened by the crisis button (INFRA-297).
  //
  // `useLayoutEffect`, deliberately: it fires synchronously after React commits
  // the tree, so the view hierarchy exists — the closest defensible boundary for
  // "the user can see it". Rejected alternatives, do not "improve" this later:
  //   - render body → fires before commit, and on every re-render.
  //   - InteractionManager.runAfterInteractions → waits for the modal transition
  //     animation to drain, folding hundreds of ms of settle into the number and
  //     putting the p95 permanently over budget for reasons unrelated to
  //     responsiveness.
  //   - onLayout → per-view, refires on re-layout, ordering not guaranteed.
  // A no-op when no mark is open (e.g. the screen was reached by a route other
  // than the crisis button), by design.
  useLayoutEffect(() => {
    endCrisisTap('screen_commit');
  }, []);

  // Track screen load performance
  useEffect(() => {
    const loadTime = performance.now() - startTime;
    logPerformance('Crisis Resources Screen loaded', loadTime);

    // Track crisis resources access
    logSecurity('Crisis resources accessed', 'high', {
      severityLevel: route.params?.severityLevel || 'unknown',
      source: route.params?.source || 'direct'
    });

    return () => {
      const sessionTime = performance.now() - startTime;
      logPerformance('Crisis Resources Screen session', sessionTime);
    };
  }, []);

  /**
   * Handle resource contact action
   * Opens native phone/SMS with proper error handling
   */
  const handleResourceContact = (resource: CrisisResource) => {
    if (!resource.phone) return;

    const phoneUrl = `tel:${resource.phone}`;

    // Validate tel: protocol
    if (!validateUrlProtocol(phoneUrl, ['tel'])) {
      Alert.alert(
        'Invalid Phone Number',
        'The phone number format is invalid. Please contact support.',
        [{ text: 'OK' }]
      );
      return;
    }

    logSecurity('Crisis resource contact initiated', 'medium', {
      resourceId: resource.id,
      resourceName: resource.name,
      contactType: 'phone'
    });

    // Guarded dial + manual-dial fallback via shared helper. The hotline-tap
    // analytics (FEAT-137) is injected as onTap so it fires exactly once.
    void openCrisisUrl(phoneUrl, {
      manualLabel: resource.phone,
      onTap: trackCrisisHotlineTapped,
    });
  };

  /**
   * DEBUG-432 — the pinned footer's dial.
   *
   * Deliberately does NOT look the number up from CRISIS_RESOURCE_CATEGORIES. The
   * footer is this screen's only 988 affordance and the screen is in
   * SUPPRESSED_ROUTES, so a data-shape change (renaming `988_lifeline`, re-tiering
   * its priority, filtering it out of a section) must not be able to leave the
   * crisis destination with no reachable control. 988 is a constant contract per
   * CLAUDE.md, so it is written as one.
   *
   * Routed through openCrisisUrl, never a bare Linking.openURL: that is what
   * supplies the canOpenURL guard, the manual-dial fallback, and the CRISIS audit
   * record (DEBUG-314, pinned by scripts/check-crisis-dial-guard.js).
   */
  const handleCall988 = useCallback(() => {
    logSecurity('Crisis resource contact initiated', 'medium', {
      resourceId: '988_lifeline',
      resourceName: '988 Suicide & Crisis Lifeline',
      contactType: 'phone'
    });

    void openCrisisUrl('tel:988', {
      manualLabel: '988',
      onTap: trackCrisisHotlineTapped,
    });
  }, [trackCrisisHotlineTapped]);

  const priorityResources = getPriorityCrisisResources();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="crisis-resources-screen">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Crisis Support Resources</Text>
          <Text style={styles.subtitle}>
            You're not alone. Professional support is available 24/7.
          </Text>
        </View>

        {/* Priority Crisis Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Immediate Crisis Support</Text>
          <Text style={styles.sectionDescription}>
            Free, confidential, 24/7 support for emotional distress
          </Text>

          {priorityResources
            .filter(r => r.priority === 'high')
            .map(resource => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onPress={() => handleResourceContact(resource)}
                hidePrimaryAction={resource.id === '988_lifeline'}
              />
            ))}
        </View>

        {/*
          DEBUG-432 — the 911 banner sits BELOW the 988 section, deliberately.

          It used to be the first thing on the screen, above the 988 card. Two
          independent grounds retired that ordering, per the `crisis` pass:

            1. CONTRACT. This screen is the destination every crisis affordance in
               the app routes to — root crisis button, `being://crisis`, assessment
               thresholds, journal scan. CLAUDE.md's non-negotiable names 988
               ("<3 taps from any screen"); there is no 911 contract anywhere. The
               dominant slot belongs to the control the contract names.
            2. TRIAGE. 911 dispatches law enforcement. For someone in suicidal
               distress without imminent physical danger that carries real risk of
               an involuntary hold and a police response to a mental-health call.
               988 exists specifically as the non-police option. Giving 911 the
               first, visually dominant slot nudged toward the higher-harm path.

          De-emphasised, NOT removed: the "In immediate danger?" qualifier is what
          makes 911 the right call when it IS the right call, and it stays. Its
          continued presence inside the scroll region is pinned by
          CrisisResourcesScreen.reachability.test.tsx.
        */}
        <View style={styles.emergencyBanner}>
          <Text style={styles.emergencyBannerText}>
            🚨 In immediate danger? Call emergency services
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.emergency911Button,
              { opacity: pressed ? 0.9 : 1 }
            ]}
            onPress={() => {
              Alert.alert(
                'Call 911?',
                'This will call emergency services. Use for life-threatening emergencies only.',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'Call 911',
                    style: 'destructive',
                    onPress: () => {
                      logSecurity('911 emergency call initiated', 'critical', {});
                      // DEBUG-314: this had a `.catch` but never a `canOpenURL`
                      // guard, so an unsupported scheme still failed silently.
                      // The bespoke copy is preserved verbatim via the override
                      // pair rather than `manualLabel` — "please manually dial
                      // 911 for support" is wrong for 911: it is emergency
                      // dispatch, not support, and "dial 911 manually on your
                      // phone" is the actionable instruction. Same override
                      // pattern as the 'Unable to Text' caller above.
                      // openCrisisUrl already logs LogCategory.CRISIS on
                      // failure, so the old .catch would now double-log.
                      void openCrisisUrl('tel:911', {
                        fallbackTitle: 'Call Failed',
                        fallbackMessage:
                          'Unable to initiate 911 call. Please dial 911 manually on your phone.',
                      });
                    }
                  }
                ]
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="Call 911 for emergency"
          >
            <Text style={styles.emergency911ButtonText}>📞 Call 911</Text>
          </Pressable>
        </View>

        {/* Additional Resources */}
        {CRISIS_RESOURCE_CATEGORIES
          .filter(cat => cat.id !== 'emergency' && cat.id !== 'immediate_crisis')
          .sort((a, b) => a.priority - b.priority)
          .map(category => (
            <View key={category.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{category.name}</Text>
              <Text style={styles.sectionDescription}>{category.description}</Text>

              {category.resources.map(resource => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onPress={() => handleResourceContact(resource)}
                />
              ))}
            </View>
          ))}

        {/* Footer Note */}
        {/*
          DEBUG-432: this disclaimer is the LAST unconditional child of the
          ScrollView, which makes it a structurally guaranteed below-the-fold
          element on every device and every Dynamic Type step. The Maestro flow
          uses that as an in-band calibration control — asserting it NOT visible
          alongside the 988 button being visible proves, on every run, that the
          driver's predicate can still tell above-fold from below-fold on this
          screen. Without that control a green `assertVisible` cannot be
          distinguished from a predicate that stopped discriminating.
        */}
        <View style={styles.footer} testID="crisis-resources-footer-disclaimer">
          <Text style={styles.footerText}>
            Being. provides referrals to crisis services. We do not operate these services or provide emergency response. All contacts are external, professional crisis support organizations.
          </Text>
        </View>
      </ScrollView>

      {/*
        DEBUG-432 — pinned OUTSIDE the ScrollView, deliberately.

        This control used to be the LAST child of the 988 resource card, itself
        inside the screen's only ScrollView. Measured on a Release build with
        `maestro hierarchy` real bounds (not screenshots — DEBUG-403 records two
        wrong fixes diagnosed from pixel-identical renders):

          iPhone SE 3  375x667  DEFAULT type  fold y=86..667   button y=746..797
          iPhone SE 3  375x667  AX5           fold y=86..667   button y=3926..4095
          16 Pro Max   440x956  default type  fold y=128..956  button y=776..827  (ok)
          16 Pro Max   440x956  AX5           fold y=128..956  button y=3612..3781

        Three of four configurations put it below the fold — including the small
        phone at DEFAULT Dynamic Type, where it was not merely clipped but absent
        from the accessibility tree: 0% of a 51pt tap target on screen.

        `CrisisResources` is in RootCrisisButton.SUPPRESSED_ROUTES, so the root
        overlay is deliberately absent and this is the ONLY 988 affordance here —
        on the screen every other crisis affordance routes TO. Suppression is
        earned by an affordance reachable WITHOUT SCROLLING, never by one that
        merely exists. As a flex sibling of a `flex: 1` ScrollView this is on
        screen at every scroll offset and every Dynamic Type step, with no
        absolute positioning to keep in sync.

        Do NOT re-nest it, and do NOT add a second 988 control to a card: position
        is pinned by __tests__/safety/crisis-zero-988-windows.test.tsx (precommit)
        and by CrisisResourcesScreen.reachability.test.tsx (CI, render-tree), and
        the count is pinned by both.

        Do NOT add accessibilityViewIsModal here: it traps VoiceOver in the footer
        and orphans the entire resource list above it.
      */}
      <View style={styles.crisisFooter}>
        <Pressable
          style={({ pressed }) => [styles.crisisFooterButton, { opacity: pressed ? 0.9 : 1 }]}
          onPress={handleCall988}
          testID="crisis-call-988-button"
          accessibilityRole="button"
          accessibilityLabel="Call 988 Suicide & Crisis Lifeline"
        >
          <Text style={styles.crisisFooterButtonText}>📞 Call 988</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: spacing[32]
  },
  header: {
    padding: spacing[24],
    paddingBottom: spacing[16]
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.gray[800],
    marginBottom: spacing[4]
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
    lineHeight: typography.bodyLarge.size
  },
  emergencyBanner: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: spacing[4],
    borderLeftColor: '#D32F2F',
    padding: spacing[24],
    marginHorizontal: spacing[24],
    marginBottom: spacing[24],
    borderRadius: borderRadius.medium
  },
  emergencyBannerText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#C62828',
    marginBottom: spacing[16]
  },
  emergency911Button: {
    backgroundColor: '#D32F2F',
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.medium,
    alignItems: 'center'
  },
  emergency911ButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.bold
  },
  section: {
    marginBottom: spacing[32],
    paddingHorizontal: spacing[24]
  },
  sectionTitle: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[800],
    marginBottom: spacing[4]
  },
  sectionDescription: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    marginBottom: spacing[24],
    lineHeight: spacing[20]
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[16],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: spacing[4]
      },
      android: {
        elevation: 2
      }
    })
  },
  emergencyCard: {
    borderColor: '#D32F2F',
    borderWidth: 2,
    backgroundColor: '#FFEBEE'
  },
  highPriorityCard: {
    borderColor: '#FF6B6B',
    borderWidth: 2
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius.small,
    marginBottom: spacing[8]
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5
  },
  resourceHeader: {
    marginBottom: spacing[8]
  },
  resourceName: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[800],
    marginBottom: spacing[4]
  },
  resourceAvailability: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    fontWeight: typography.fontWeight.medium
  },
  resourceDescription: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    lineHeight: spacing[20],
    marginBottom: spacing[16]
  },
  contactInfo: {
    flexDirection: 'row',
    marginBottom: spacing[4]
  },
  contactLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.secondary,
    width: 80
  },
  contactValue: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[800],
    flex: 1
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    padding: spacing[8],
    borderRadius: borderRadius.medium,
    marginTop: spacing[8],
    marginBottom: spacing[8]
  },
  warningText: {
    fontSize: typography.bodySmall.size,
    color: '#856404',
    fontWeight: typography.fontWeight.medium
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing[16],
    gap: spacing[8]
  },
  primaryButton: {
    flex: 1,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.medium,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.bold
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    backgroundColor: colorSystem.gray[100],
    borderWidth: 1,
    borderColor: colorSystem.gray[300]
  },
  secondaryButtonText: {
    color: colorSystem.gray[800],
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold
  },
  crisisFooter: {
    // DEBUG-432: horizontal and bottom padding are this block's own responsibility.
    // Pinned outside the ScrollView it no longer inherits `scrollContent`, and
    // `SafeAreaView edges` now includes 'bottom' so it clears the home indicator
    // rather than sitting under it (the screen previously reserved nothing there,
    // which is why the fold had to be clamped by the inset when measuring).
    paddingHorizontal: spacing[24],
    paddingTop: spacing[16],
    paddingBottom: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
    backgroundColor: colorSystem.base.white,
    // DEBUG-390's recorded failure: without wrap, a row has a fixed intrinsic width
    // (RN defaults flexShrink to 0) that overflows the column above font multiplier
    // ~1.351 at 375pt — i.e. at xxxLarge, reachable from ordinary iOS Settings — and
    // clipped the crisis control at both edges. Wrap, never cap the label with
    // maxFontSizeMultiplier: capping text growth on the crisis affordance
    // specifically inverts the priority.
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  crisisFooterButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    // TOUCH_TARGETS.large names "Crisis buttons" as its application. DEBUG-390's
    // footer shipped at ~34.7pt, clearing WCAG 2.2 AA 2.5.8 (24) but failing
    // 2.5.5 AAA / iOS HIG (44) and this token.
    minHeight: TOUCH_TARGETS.large
  },
  crisisFooterButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center'
  },
  footer: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[24],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200]
  },
  footerText: {
    fontSize: typography.micro.size,
    color: semantic.text.muted,
    lineHeight: typography.bodyLarge.size,
    textAlign: 'center'
  }
});