import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSimpleUserStore } from '../../store/simpleUserStore';
import { CrisisButton } from '../../components/simple/CrisisButton';

export const HomeScreen: React.FC = () => {
  const { user } = useSimpleUserStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>
          Welcome back, {user?.name || 'User'}
        </Text>

        <Text style={styles.tagline}>
          How are you feeling today?
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Check-in</Text>
          <Text style={styles.cardDescription}>
            Take a moment to reflect on your current mood and well-being
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mindfulness Exercise</Text>
          <Text style={styles.cardDescription}>
            Practice a 3-minute breathing exercise
          </Text>
        </View>

        <CrisisButton />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1B2951',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B2951',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});