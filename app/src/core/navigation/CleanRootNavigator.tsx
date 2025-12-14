/**
 * Clean Root Navigator - Fresh start navigation
 * No crypto dependencies, minimal implementation
 * Includes check-in flow modal presentations
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { logPerformance } from '@/core/services/logging';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { spacing, typography } from '@/core/theme';
import CleanTabNavigator from './CleanTabNavigator';
import MorningFlowNavigator from '@/features/practices/morning/MorningFlowNavigator';
import MiddayFlowNavigator from '@/features/practices/midday/MiddayFlowNavigator';
import EveningFlowNavigator from '@/features/practices/evening/EveningFlowNavigator';
import CrisisResourcesScreen from '@/features/crisis/screens/CrisisResourcesScreen';
import PurchaseOptionsScreen from '@/core/components/subscription/PurchaseOptionsScreen';
import SubscriptionStatusCard from '@/core/components/subscription/SubscriptionStatusCard';
import OnboardingScreen from '@/features/onboarding/screens/OnboardingScreen';
import EnhancedAssessmentFlow from '@/features/assessment/components/EnhancedAssessmentFlow';
import ModuleDetailScreen from '@/features/learn/screens/ModuleDetailScreen';
import {
  PracticeTimerScreen,
  ReflectionTimerScreen,
  SortingPracticeScreen,
  BodyScanScreen,
  GuidedBodyScanScreen
} from '@/features/learn/practices';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { useSettingsStore } from '@/core/stores/settingsStore';
import { useConsentStore } from '@/core/stores/consentStore';
import { CombinedLegalGateScreen } from '@/features/consent';
import type { AssessmentType, PHQ9Result, GAD7Result } from '@/features/assessment/types';
import type { ModuleId, SortingScenario } from '@/features/learn/types/education';

export type RootStackParamList = {
  LegalGate: undefined;
  Onboarding: undefined;
  Main: undefined;
  MorningFlow: undefined;
  MiddayFlow: undefined;
  EveningFlow: undefined;
  ModuleDetail: { moduleId: ModuleId };
  PracticeTimer: {
    practiceId: string;
    moduleId: ModuleId;
    duration: number;
    title: string;
  };
  ReflectionTimer: {
    practiceId: string;
    moduleId: ModuleId;
    duration: number;
    title: string;
    prompt?: string;
    instructions?: string[];
  };
  SortingPractice: {
    practiceId: string;
    moduleId: ModuleId;
    scenarios: SortingScenario[];
  };
  BodyScan: {
    practiceId: string;
    moduleId: ModuleId;
    duration: number;
  };
  GuidedBodyScan: {
    practiceId: string;
    moduleId: ModuleId;
    title: string;
  };
  AssessmentFlow: {
    assessmentType: AssessmentType;
    context: 'onboarding' | 'standalone';
    allowSkip?: boolean;
    onComplete?: (result: PHQ9Result | GAD7Result) => void;
    onSkip?: () => void;
  };
  CrisisResources: {
    severityLevel?: 'moderate' | 'high' | 'emergency';
    source?: 'assessment' | 'direct' | 'crisis_button';
  } | undefined;
  Subscription: undefined;
  SubscriptionStatus: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Loading screen component
const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#FF9F43" />
  </View>
);

const CleanRootNavigator: React.FC = () => {
  const { markCheckInComplete } = useStoicPracticeStore();
  const { loadSettings, markOnboardingComplete } = useSettingsStore();
  const { loadConsent, consentStatus } = useConsentStore();
  const [initialRoute, setInitialRoute] = useState<'LegalGate' | 'Onboarding' | 'Main' | null>(null);

  useEffect(() => {
    async function checkInitialRoute() {
      const settings = await loadSettings();
      const consent = await loadConsent();

      // Determine initial route based on onboarding and consent status
      if (settings?.onboardingCompleted) {
        // Already onboarded - go to main
        setInitialRoute('Main');
      } else if (!consent || consentStatus === 'missing' || consentStatus === 'under_age') {
        // No consent or under age - start with legal gate (COPPA compliance)
        setInitialRoute('LegalGate');
      } else {
        // Has consent but not onboarded - go to onboarding
        setInitialRoute('Onboarding');
      }
    }
    checkInitialRoute();
  }, [loadSettings, loadConsent, consentStatus]);

  const handleMorningFlowComplete = async (sessionData: any) => {
    console.log('🌅 Morning flow completed:', sessionData);
    await markCheckInComplete('morning');
    // TODO: Store session data to analytics/state
  };

  const handleMiddayFlowComplete = async (sessionData: any) => {
    console.log('🧘 Midday flow completed:', sessionData);
    await markCheckInComplete('midday');
    // TODO: Store session data to analytics/state
  };

  const handleEveningFlowComplete = async (sessionData: any) => {
    console.log('🌙 Evening flow completed:', sessionData);
    await markCheckInComplete('evening');
    // TODO: Store session data to analytics/state
  };

  const handleOnboardingComplete = async (destination?: 'home' | 'morning') => {
    await markOnboardingComplete();
    setInitialRoute('Main');

    // Navigate to destination after state update
    if (destination === 'morning') {
      // Small delay to ensure Main screen is mounted before modal presentation
      setTimeout(() => {
        // Navigation will be handled by the OnboardingScreen's navigation prop
      }, 100);
    }
  };

  if (!initialRoute) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: '#FFFFFF',
            borderBottomColor: '#E5E7EB',
            borderBottomWidth: 1,
          },
          headerTintColor: '#000000',
          headerTitleStyle: {
            fontSize: typography.bodyLarge.size,
            fontWeight: typography.fontWeight.semibold,
          },
        }}
      >
        {/* Legal Gate (Age + ToS) - First screen for new users */}
        <Stack.Screen
          name="LegalGate"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        >
          {({ navigation }) => (
            <CombinedLegalGateScreen
              onComplete={() => {
                // Legal gate passed - proceed to onboarding
                navigation.replace('Onboarding');
              }}
              onUnderAge={() => {
                // Under age - screen handles showing crisis resources
                // User stays on LegalGate screen with crisis resources
              }}
            />
          )}
        </Stack.Screen>

        {/* Onboarding Flow */}
        <Stack.Screen
          name="Onboarding"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        >
          {({ navigation }) => (
            <OnboardingScreen
              onComplete={async (destination) => {
                await handleOnboardingComplete(destination);
                // Navigate based on destination
                if (destination === 'morning') {
                  navigation.replace('Main');
                  // Navigate to MorningFlow after Main is mounted
                  setTimeout(() => {
                    navigation.navigate('MorningFlow');
                  }, 100);
                } else {
                  navigation.replace('Main');
                }
              }}
              isEmbedded={true}
            />
          )}
        </Stack.Screen>

        {/* Main App */}
        <Stack.Screen name="Main" component={CleanTabNavigator} />

        {/* Educational Module Detail */}
        <Stack.Screen
          name="ModuleDetail"
          component={ModuleDetailScreen}
          options={{
            headerShown: false, // ModuleDetailScreen has its own header
            presentation: 'card',
          }}
        />

        {/* Practice Screens - Educational Exercises */}
        <Stack.Screen
          name="PracticeTimer"
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: false, // Prevent accidental swipe during practice
          }}
        >
          {({ navigation, route }) => (
            <PracticeTimerScreen
              practiceId={route.params.practiceId}
              moduleId={route.params.moduleId}
              duration={route.params.duration}
              title={route.params.title}
              onComplete={() => navigation.goBack()}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="SortingPractice"
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: false,
          }}
        >
          {({ navigation, route }) => (
            <SortingPracticeScreen
              practiceId={route.params.practiceId}
              moduleId={route.params.moduleId}
              scenarios={route.params.scenarios}
              onComplete={() => navigation.goBack()}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="BodyScan"
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: false,
          }}
        >
          {({ navigation, route }) => (
            <BodyScanScreen
              practiceId={route.params.practiceId}
              moduleId={route.params.moduleId}
              duration={route.params.duration}
              onComplete={() => navigation.goBack()}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="ReflectionTimer"
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: false,
          }}
        >
          {({ navigation, route }) => (
            <ReflectionTimerScreen
              practiceId={route.params.practiceId}
              moduleId={route.params.moduleId}
              duration={route.params.duration}
              title={route.params.title}
              {...(route.params.prompt && { prompt: route.params.prompt })}
              {...(route.params.instructions && { instructions: route.params.instructions })}
              onComplete={() => navigation.goBack()}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="GuidedBodyScan"
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: false,
          }}
        >
          {({ navigation, route }) => (
            <GuidedBodyScanScreen
              practiceId={route.params.practiceId}
              moduleId={route.params.moduleId}
              title={route.params.title}
              onComplete={() => navigation.goBack()}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>

        {/* Check-in Flow Modals */}
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen
            name="MorningFlow"
            options={{
              headerShown: false, // MorningFlowNavigator has its own header with progress
              gestureEnabled: false, // Prevent swipe to dismiss during session
              animationTypeForReplace: 'push'
            }}
          >
            {({ navigation }) => (
              <MorningFlowNavigator
                onComplete={(sessionData) => {
                  handleMorningFlowComplete(sessionData);
                  navigation.goBack();
                }}
                onExit={() => {
                  navigation.goBack();
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="MiddayFlow"
            options={{
              headerShown: false, // MiddayFlowNavigator has its own header with progress
              gestureEnabled: false, // Prevent swipe to dismiss during session
              animationTypeForReplace: 'push'
            }}
          >
            {({ navigation }) => (
              <MiddayFlowNavigator
                onComplete={(sessionData) => {
                  handleMiddayFlowComplete(sessionData);
                  navigation.goBack();
                }}
                onExit={() => {
                  navigation.goBack();
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="EveningFlow"
            options={{
              headerShown: false, // EveningFlowNavigator has its own header with progress
              gestureEnabled: false, // Prevent swipe to dismiss during session
              animationTypeForReplace: 'push'
            }}
          >
            {({ navigation }) => (
              <EveningFlowNavigator
                onComplete={(sessionData) => {
                  handleEveningFlowComplete(sessionData);
                  navigation.goBack();
                }}
                onExit={() => {
                  navigation.goBack();
                }}
              />
            )}
          </Stack.Screen>

          {/* Assessment Flow Modal */}
          <Stack.Screen
            name="AssessmentFlow"
            options={{
              headerShown: false, // EnhancedAssessmentFlow has its own UI
              gestureEnabled: false, // Prevent swipe to dismiss during assessment
              animationTypeForReplace: 'push'
            }}
          >
            {({ navigation, route }) => {
              // Create consent status for EnhancedAssessmentFlow
              const consentStatus = {
                dataProcessingConsent: true, // Assumed true if user reached assessment
                clinicalDataConsent: true,
                consentTimestamp: Date.now(),
                consentVersion: '1.0.0'
              };

              return (
                <EnhancedAssessmentFlow
                  assessmentType={route.params.assessmentType}
                  context={route.params.context}
                  theme="neutral"
                  showIntroduction={route.params.context === 'standalone'}
                  consentStatus={consentStatus}
                  sessionId={`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`}
                  onComplete={(result) => {
                    console.log(`✅ Assessment ${route.params.assessmentType} completed:`, result);
                    // Always dismiss the modal first
                    navigation.goBack();
                    // Then notify parent after brief delay to allow modal dismissal animation
                    setTimeout(() => {
                      route.params.onComplete?.(result);
                    }, 50);
                  }}
                  onCancel={() => {
                    // Handle skip for onboarding context
                    if (route.params.allowSkip && route.params.onSkip) {
                      route.params.onSkip();
                    }
                    navigation.goBack();
                  }}
                />
              );
            }}
          </Stack.Screen>

          {/* Crisis Resources Screen */}
          <Stack.Screen
            name="CrisisResources"
            component={CrisisResourcesScreen}
            options={{
              title: 'Crisis Support',
              headerShown: true,
              headerBackTitle: 'Back',
              presentation: 'modal',
              gestureEnabled: true
            }}
          />

          {/* Subscription Screens */}
          <Stack.Screen
            name="Subscription"
            component={PurchaseOptionsScreen}
            options={{
              title: 'Subscription',
              headerShown: true,
              presentation: 'modal',
              gestureEnabled: true
            }}
          />

          <Stack.Screen
            name="SubscriptionStatus"
            component={SubscriptionStatusCard}
            options={{
              title: 'Subscription Status',
              headerShown: true,
              presentation: 'modal',
              gestureEnabled: true
            }}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.regular,
    color: '#1C1C1C',
  },
});

export default CleanRootNavigator;