/**
 * Profile Stack Navigator (FEAT-212 / FEAT-203 Slice 4)
 *
 * Replaces ProfileScreen's hand-rolled `currentScreen` state machine — and the
 * depth-2 `showCloudBackup` / `selectedDocument` sub-machines that lived inside
 * PrivacyDataScreen / LegalDocumentsListScreen — with a real nested React
 * Navigation stack. Every former subscreen is now a route: native back-chevron
 * headers ("‹ Profile") replace SubMenuHeader's ✕ (audit finding M3) and iOS
 * swipe-back works for free.
 *
 * CRISIS ACCESS — MAINT-290: the crisis overlay is now a single persistent
 * root-level mount (RootCrisisButton in CleanRootNavigator), so every Profile
 * route inherits it globally like every other screen. The per-navigator
 * `CollapsibleCrisisButton` that used to be re-hosted here was removed as
 * redundant; 988 stays <3 taps / <3s / <200ms via the root mount.
 */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { HeaderBackButton } from '@react-navigation/elements';
import { colorSystem, typography } from '@/core/theme';
import { getLegalDocument, type LegalDocumentType } from './content/legalDocuments';
import ProfileScreen from './screens/ProfileScreen';
import AccountSettingsScreen from './screens/AccountSettingsScreen';
import PrivacyDataScreen from './screens/PrivacyDataScreen';
import AppSettingsScreen from './screens/AppSettingsScreen';
import AboutStoicMindfulnessScreen from './screens/AboutStoicMindfulnessScreen';
import AboutBeingScreen from './screens/AboutBeingScreen';
import LegalDocumentsListScreen from './screens/LegalDocumentsListScreen';
import LegalDocumentScreen from './screens/LegalDocumentScreen';
import CloudBackupScreen from './screens/CloudBackupScreen';
import ExportDataScreen from './screens/ExportDataScreen';
import DeleteAccountScreen from './screens/DeleteAccountScreen';

export type ProfileStackParamList = {
  ProfileMenu: undefined;
  Account: undefined;
  Privacy: undefined;
  AppSettings: undefined;
  StoicMindfulness: undefined;
  About: undefined;
  Legal: undefined;
  CloudBackup: undefined;
  LegalDocument: { documentType: LegalDocumentType };
  // FEAT-267: data-subject-rights surfaces. Registered inside the Profile stack
  // for its native back-chevron nav; the crisis overlay is now a single
  // persistent root-level mount (MAINT-290), so these screens inherit it
  // globally like every other screen.
  ExportData: undefined;
  DeleteAccount: undefined;
};

const Stack = createStackNavigator<ProfileStackParamList>();

const ProfileStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ProfileMenu"
      screenOptions={{
        // MAINT-257: borderless to match the harmonized in-body header idiom.
        // headerShadowVisible:false removes the default @react-navigation/stack
        // hairline/elevation so the edge is truly borderless (verified on-sim —
        // dropping only the explicit border left a residual shadow line).
        headerStyle: {
          backgroundColor: colorSystem.base.white,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          // Nav title stays headline3 (semibold, centered). A native nav bar
          // with a back chevron has less room than a content header: headline2
          // truncated the longer titles ("Notifications & Display", "About Stoic
          // Mindfulness") on-sim. Content headers use headline2; the nav bar
          // stays one tier below per iOS convention. Borderless is the
          // harmonization that lands here.
          fontSize: typography.headline3.size,
          fontWeight: typography.fontWeight.semibold,
          color: colorSystem.base.black,
        },
        headerTintColor: colorSystem.base.midnightBlue,
        headerBackTitle: 'Profile',
        headerTitleAlign: 'center',
        gestureEnabled: true,
        // INFRA-185: native HeaderBackButton with a stable testID so Maestro
        // can drive Profile back-nav deterministically (the iOS sim doesn't
        // expose the default back affordance reliably). Same visual UX.
        headerLeft: (props) => (
          <HeaderBackButton {...props} testID="profile-back-button" />
        ),
      }}
    >
      {/* Menu route keeps its own SafeAreaView + in-content "Your Profile"
          header, so the tab landing is visually unchanged. */}
      <Stack.Screen
        name="ProfileMenu"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Account" component={AccountSettingsScreen} options={{ title: 'Account' }} />
      <Stack.Screen name="Privacy" component={PrivacyDataScreen} options={{ title: 'Privacy & Data' }} />
      <Stack.Screen name="AppSettings" component={AppSettingsScreen} options={{ title: 'Notifications & Display' }} />
      <Stack.Screen name="StoicMindfulness" component={AboutStoicMindfulnessScreen} options={{ title: 'About Stoic Mindfulness' }} />
      <Stack.Screen name="About" component={AboutBeingScreen} options={{ title: 'About Being.' }} />
      <Stack.Screen name="Legal" component={LegalDocumentsListScreen} options={{ title: 'Legal Documents' }} />
      <Stack.Screen name="CloudBackup" component={CloudBackupScreen} options={{ title: 'Cloud Backup' }} />
      <Stack.Screen name="ExportData" component={ExportDataScreen} options={{ title: 'Export My Data' }} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: 'Delete Account' }} />
      <Stack.Screen
        name="LegalDocument"
        component={LegalDocumentScreen}
        options={({ route }) => ({
          title: getLegalDocument(route.params.documentType)?.title ?? 'Legal Document',
        })}
      />
    </Stack.Navigator>
  );
};

export default ProfileStackNavigator;
