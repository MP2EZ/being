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
 * - HIPAA: No PHI transmitted to external services
 * - Terms: User acknowledges referral-only service
 * - Accessibility: WCAG AA compliant
 */

import React, { useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';
import { logPerformance, logSecurity, logError, LogCategory } from '@/core/services/logging';
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
}

/**
 * Resource Card Component
 * Displays individual crisis resource with contact actions
 */
const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onPress }) => {
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
      const smsUrl = `sms:${resource.textNumber}${resource.textMessage ? `&body=${resource.textMessage}` : ''}`;

      // Validate SMS protocol
      if (!validateUrlProtocol(smsUrl, ['sms'])) {
        Alert.alert('Error', 'Invalid SMS URL. Please contact support.');
        return;
      }

      Linking.openURL(smsUrl).catch(error => {
        logError(LogCategory.CRISIS, 'Failed to open SMS', error instanceof Error ? error : new Error(String(error)));
        Alert.alert('Error', 'Unable to open messaging app');
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
        {resource.phone && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed ? '#C62828' : getPriorityColor(resource.priority),
                opacity: pressed ? 0.9 : 1
              }
            ]}
            onPress={onPress}
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
  const startTime = performance.now();

  // Track screen load performance
  useEffect(() => {
    const loadTime = performance.now() - startTime;
    console.log('Crisis Resources Screen loaded', { loadTime }, LogCategory.CRISIS);

    // Track crisis resources access
    logSecurity('Crisis resources accessed', 'high', {
      severityLevel: route.params?.severityLevel || 'unknown',
      source: route.params?.source || 'direct'
    });

    return () => {
      const sessionTime = performance.now() - startTime;
      console.log('Crisis Resources Screen session ended', { sessionTime }, LogCategory.CRISIS);
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

    Linking.canOpenURL(phoneUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          throw new Error('Phone calling not supported');
        }
      })
      .catch(error => {
        logError(LogCategory.CRISIS, 'Failed to initiate crisis resource contact', error instanceof Error ? error : new Error(String(error)));

        Alert.alert(
          'Unable to Call',
          `Please manually dial ${resource.phone} for support.`,
          [
            { text: 'OK', style: 'default' }
          ]
        );
      });
  };

  const priorityResources = getPriorityCrisisResources();

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="crisis-resources-screen">
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

        {/* Emergency Banner */}
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
                      Linking.openURL('tel:911').catch(error => {
                        logError(LogCategory.CRISIS, 'Failed to call 911', error instanceof Error ? error : new Error(String(error)));
                        Alert.alert(
                          'Call Failed',
                          'Unable to initiate 911 call. Please dial 911 manually on your phone.',
                          [{ text: 'OK' }]
                        );
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
              />
            ))}
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
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Being. provides referrals to crisis services. We do not operate these services or provide emergency response. All contacts are external, professional crisis support organizations.
          </Text>
        </View>
      </ScrollView>
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
    color: colorSystem.gray[600],
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
    color: colorSystem.gray[600],
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
    color: colorSystem.gray[600],
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
    color: colorSystem.gray[600],
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
  footer: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[24],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200]
  },
  footerText: {
    fontSize: typography.micro.size,
    color: colorSystem.gray[500],
    lineHeight: typography.bodyLarge.size,
    textAlign: 'center'
  }
});