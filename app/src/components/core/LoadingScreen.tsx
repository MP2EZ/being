/**
 * LoadingScreen - Professional loading state for app initialization
 * Shows while user data is loading during app startup
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrainIcon } from './BrainIcon';
import { colorSystem, spacing } from '../../constants/colors';

export const LoadingScreen: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Gentle pulsing animation
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [fadeAnim, scaleAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <BrainIcon size={80} color={colorSystem.base.midnightBlue} />
        </Animated.View>

        {/* App Name */}
        <Text style={styles.appName}>FullMind</Text>
        
        {/* Tagline */}
        <Text style={styles.tagline}>
          Mindful awareness for emotional well-being
        </Text>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            <Animated.View 
              style={[
                styles.dot,
                { opacity: fadeAnim }
              ]} 
            />
            <Animated.View 
              style={[
                styles.dot,
                { opacity: fadeAnim }
              ]} 
            />
            <Animated.View 
              style={[
                styles.dot,
                { opacity: fadeAnim }
              ]} 
            />
          </View>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>

        {/* Version Info */}
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 16,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  loadingDots: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: colorSystem.gray[400],
    borderRadius: 4,
    marginHorizontal: 4,
  },
  loadingText: {
    fontSize: 14,
    color: colorSystem.gray[500],
  },
  version: {
    position: 'absolute',
    bottom: spacing.xl,
    fontSize: 12,
    color: colorSystem.gray[400],
  },
});

export default LoadingScreen;