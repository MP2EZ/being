/**
 * Global Crisis Button - PERFORMANCE OPTIMIZED for <200ms response
 * SAFETY CRITICAL: Must be accessible from every screen in <3 seconds total
 */

import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, Linking, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colorSystem } from '../../constants/colors';

interface CrisisButtonProps {
  variant?: 'floating' | 'header' | 'embedded';
  style?: any;
}

export const CrisisButton: React.FC<CrisisButtonProps> = React.memo(({
  variant = 'floating',
  style
}) => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  // PERFORMANCE CRITICAL: Optimized crisis call with minimal delay
  const handleCrisisCall = useCallback(async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      // CRITICAL: Direct call without validation checks
      // Target response time: <100ms
      const phoneURL = '988';
      await Linking.openURL(`tel:${phoneURL}`);
      
    } catch (error) {
      // Immediate fallback
      Alert.alert(
        'Call 988',
        'Please dial 988 directly for immediate crisis support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Navigation to full crisis resources
  const handleCrisisResources = useCallback(() => {
    (navigation as any).navigate('CrisisPlan');
  }, [navigation]);

  const getButtonStyle = () => {
    switch (variant) {
      case 'floating':
        return [styles.floatingButton, styles.crisisButton];
      case 'header':
        return [styles.headerButton, styles.crisisButton];
      case 'embedded':
        return [styles.embeddedButton, styles.crisisButton];
      default:
        return [styles.floatingButton, styles.crisisButton];
    }
  };

  if (variant === 'floating') {
    return (
      <TouchableOpacity
        style={[...getButtonStyle(), style]}
        onPress={handleCrisisCall}
        activeOpacity={0.8}
        disabled={isLoading}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={isLoading ? "Calling crisis support line" : "Emergency crisis support - Call 988"}
        accessibilityHint="Double tap to immediately call the crisis support hotline at 988"
        accessibilityState={{ disabled: isLoading }}
        accessibilityValue={{ text: isLoading ? "Connecting to crisis support" : "988 Crisis Hotline available" }}
        accessibilityLiveRegion={isLoading ? "assertive" : "none"}
      >
        <Text
          style={styles.floatingButtonText}
          accessible={false}
          importantForAccessibility="no"
        >
          {isLoading ? '...' : '988'}
        </Text>
        <Text
          style={styles.floatingSubtext}
          accessible={false}
          importantForAccessibility="no"
        >
          CRISIS
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={handleCrisisResources}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Crisis support and safety resources"
      accessibilityHint="Double tap to access crisis support, safety planning, and emergency resources"
    >
      <Text
        style={styles.buttonText}
        accessible={false}
        importantForAccessibility="no"
      >
        Crisis Support
      </Text>
    </TouchableOpacity>
  );
});

CrisisButton.displayName = 'CrisisButton';

const styles = StyleSheet.create({
  crisisButton: {
    backgroundColor: colorSystem.status.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
  },
  embeddedButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  floatingSubtext: {
    color: 'white',
    fontSize: 9,
    fontWeight: '500',
    opacity: 0.9,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CrisisButton;