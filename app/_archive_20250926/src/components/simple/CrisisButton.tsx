import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';

interface CrisisButtonProps {
  onPress?: () => void;
}

export const CrisisButton: React.FC<CrisisButtonProps> = ({ onPress }) => {
  const handleCrisisPress = () => {
    Alert.alert(
      'Crisis Support',
      'If you are in immediate danger, please call 911.\n\nFor mental health crisis support, call 988 (Suicide & Crisis Lifeline).\n\nWould you like to call 988 now?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 988', onPress: () => {
          // In a real app, this would use Linking.openURL('tel:988')
          Alert.alert('Crisis Support', 'In a real app, this would dial 988');
        }},
      ]
    );
    onPress?.();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed
      ]}
      onPress={handleCrisisPress}
      accessible={true}
      accessibilityLabel="Crisis support button"
      accessibilityHint="Provides immediate access to crisis support resources"
      accessibilityRole="button"
      android_ripple={{
        color: '#FFFFFF40',
        borderless: false
      }}
    >
      <Text style={styles.buttonText}>Crisis Support</Text>
      <Text style={styles.buttonSubtext}>Tap for immediate help</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#B91C1C',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
    backgroundColor: '#991B1B',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
});