/**
 * Profile Screen - User settings and data management
 * Notification preferences, data export, crisis plan access
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useUserStore } from '../../store';
import { Card, Button } from '../../components/core';
import { ExportOptionsModal } from '../../components/modals/ExportOptionsModal';
import { colorSystem, spacing } from '../../constants/colors';
import { dataStore } from '../../services/storage/DataStore';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateUser } = useUserStore();
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportData = () => {
    setShowExportModal(true);
  };

  const handleExportComplete = (filePath: string) => {
    Alert.alert(
      'Export Complete',
      'Your data has been exported and shared successfully!',
      [{ text: 'OK' }]
    );
  };

  const handleExportModalClose = () => {
    setShowExportModal(false);
  };

  const handleToggleNotifications = async () => {
    if (!user) return;
    
    try {
      await updateUser({
        notifications: {
          ...user.notifications,
          enabled: !user.notifications.enabled
        }
      });
    } catch (error) {
      Alert.alert('Settings Error', 'Failed to update notification settings.');
    }
  };

  const handleToggleHaptics = async () => {
    if (!user) return;
    
    try {
      await updateUser({
        preferences: {
          ...user.preferences,
          haptics: !user.preferences.haptics
        }
      });
    } catch (error) {
      Alert.alert('Settings Error', 'Failed to update haptic settings.');
    }
  };

  const SettingCard: React.FC<{
    title: string;
    description: string;
    value: boolean;
    onToggle: () => void;
  }> = ({ title, description, value, onToggle }) => (
    <Card style={styles.settingCard}>
      <View style={styles.settingHeader}>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
        <Button
          variant={value ? 'primary' : 'outline'}
          onPress={onToggle}
          fullWidth={false}
          style={styles.toggleButton}
        >
          {value ? 'ON' : 'OFF'}
        </Button>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile Settings</Text>
          {user && (
            <Text style={styles.subtitle}>
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <SettingCard
            title="Daily Reminders"
            description="Get gentle reminders for your morning, midday, and evening check-ins"
            value={user?.notifications?.enabled ?? false}
            onToggle={handleToggleNotifications}
          />
          
          {user?.notifications?.enabled && (
            <Card style={styles.scheduleCard}>
              <Text style={styles.scheduleTitle}>Reminder Schedule</Text>
              <View style={styles.scheduleItem}>
                <Text style={styles.scheduleLabel}>Morning:</Text>
                <Text style={styles.scheduleTime}>{user.notifications.morning}</Text>
              </View>
              <View style={styles.scheduleItem}>
                <Text style={styles.scheduleLabel}>Midday:</Text>
                <Text style={styles.scheduleTime}>{user.notifications.midday}</Text>
              </View>
              <View style={styles.scheduleItem}>
                <Text style={styles.scheduleLabel}>Evening:</Text>
                <Text style={styles.scheduleTime}>{user.notifications.evening}</Text>
              </View>
            </Card>
          )}
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          
          <SettingCard
            title="Haptic Feedback"
            description="Feel gentle vibrations when interacting with the app"
            value={user?.preferences?.haptics ?? true}
            onToggle={handleToggleHaptics}
          />
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Data</Text>
          
          <Button
            variant="outline"
            onPress={handleExportData}
          >
            Export My Data
          </Button>
          
          <Button
            variant="outline"
            onPress={() => {
              (navigation as any).navigate('CrisisPlan');
            }}
          >
            Crisis Support Plan
          </Button>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <Text style={styles.supportText}>
            If you're experiencing a mental health crisis or having thoughts of suicide or self-harm, 
            please reach out for help immediately.
          </Text>
          
          <Button
            theme="evening"
            variant="primary"
            onPress={() => {
              Alert.alert(
                'Crisis Support',
                'Call 988 for immediate crisis support',
                [
                  { text: 'Call 988', onPress: () => console.log('Calling 988') },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}
          >
            Crisis Hotline: 988
          </Button>
        </View>
      </ScrollView>
      
      <ExportOptionsModal
        visible={showExportModal}
        onClose={handleExportModalClose}
        onExportComplete={handleExportComplete}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
  },
  settingCard: {
    marginBottom: spacing.md,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  toggleButton: {
    minWidth: 60,
  },
  scheduleCard: {
    backgroundColor: colorSystem.gray[100],
    marginBottom: spacing.md,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  scheduleLabel: {
    fontSize: 14,
    color: colorSystem.gray[600],
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: '500',
    color: colorSystem.base.black,
  },
  supportText: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
});

export default ProfileScreen;