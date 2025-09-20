import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSimpleUserStore } from '../../store/simpleUserStore';

export const ProfileScreen: React.FC = () => {
  const { user } = useSimpleUserStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>User Information</Text>
          <Text style={styles.infoRow}>Name: {user?.name || 'Not set'}</Text>
          <Text style={styles.infoRow}>ID: {user?.id || 'Not set'}</Text>
          <Text style={styles.infoRow}>
            First Time User: {user?.isFirstTime ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.infoRow}>
            Onboarding Complete: {user?.completedOnboarding ? 'Yes' : 'No'}
          </Text>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Profile settings and preferences will be added in later phases
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B2951',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B2951',
    marginBottom: 16,
  },
  infoRow: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  placeholder: {
    backgroundColor: '#F8F9FA',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
});