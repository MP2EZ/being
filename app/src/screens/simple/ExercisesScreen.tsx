import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ExercisesScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Mindfulness Exercises</Text>
        <Text style={styles.subtitle}>Practice mindful awareness</Text>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Breathing exercises and mindfulness practices will be added in later phases
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 32,
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