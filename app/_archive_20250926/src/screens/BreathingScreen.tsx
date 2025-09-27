/**
 * Breathing Screen - Being. MBCT App
 * 3-minute mindful breathing exercise
 * New Architecture Compatible - No JSI dependencies
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useSimpleThemeColors } from '../contexts/SimpleThemeContext';

interface BreathingScreenProps {
  navigation: any;
}

const BreathingScreen: React.FC<BreathingScreenProps> = ({ navigation }) => {
  const colors = useSimpleThemeColors();
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes = 180 seconds
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [cycleProgress, setCycleProgress] = useState(0);

  const breatheAnimation = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cycleRef = useRef<NodeJS.Timeout | null>(null);

  // Breathing cycle: 4s inhale, 2s hold, 6s exhale = 12s total
  const CYCLE_DURATION = 12000;
  const INHALE_DURATION = 4000;
  const HOLD_DURATION = 2000;
  const EXHALE_DURATION = 6000;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startBreathingCycle = () => {
    const runCycle = () => {
      // Inhale phase
      setPhase('inhale');
      setCycleProgress(0);
      Animated.timing(breatheAnimation, {
        toValue: 1.5,
        duration: INHALE_DURATION,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        // Hold phase
        setPhase('hold');
        setCycleProgress(33);
      }, INHALE_DURATION);

      setTimeout(() => {
        // Exhale phase
        setPhase('exhale');
        setCycleProgress(67);
        Animated.timing(breatheAnimation, {
          toValue: 1,
          duration: EXHALE_DURATION,
          useNativeDriver: true,
        }).start();
      }, INHALE_DURATION + HOLD_DURATION);

      setTimeout(() => {
        setCycleProgress(100);
      }, CYCLE_DURATION - 500);
    };

    runCycle();
    cycleRef.current = setInterval(runCycle, CYCLE_DURATION);
  };

  const startSession = () => {
    setIsActive(true);
    startBreathingCycle();

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Session complete
          setIsActive(false);
          if (cycleRef.current) clearInterval(cycleRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseSession = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (cycleRef.current) clearInterval(cycleRef.current);
  };

  const resetSession = () => {
    setIsActive(false);
    setTimeRemaining(180);
    setPhase('inhale');
    setCycleProgress(0);
    breatheAnimation.setValue(1);
    if (timerRef.current) clearInterval(timerRef.current);
    if (cycleRef.current) clearInterval(cycleRef.current);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, []);

  const getPhaseText = () => {
    switch (phase) {
      case 'inhale': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'exhale': return 'Breathe Out';
      default: return 'Breathe';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale': return colors.primary;
      case 'hold': return colors.warning;
      case 'exhale': return colors.success;
      default: return colors.primary;
    }
  };

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background,
      padding: 20
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20
      }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            padding: 12,
            marginRight: 16
          }}
        >
          <Text style={{ fontSize: 18, color: colors.text }}>←</Text>
        </Pressable>
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: colors.text
        }}>
          Mindful Breathing
        </Text>
      </View>

      {/* Timer */}
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <Text style={{
          fontSize: 48,
          fontWeight: '300',
          color: colors.text,
          marginBottom: 8
        }}>
          {formatTime(timeRemaining)}
        </Text>
        <Text style={{
          fontSize: 16,
          color: colors.textSecondary
        }}>
          {timeRemaining === 0 ? 'Session Complete!' : '3-minute session'}
        </Text>
      </View>

      {/* Breathing Circle */}
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 60
      }}>
        <Animated.View
          style={{
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: getPhaseColor() + '20',
            borderWidth: 3,
            borderColor: getPhaseColor(),
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ scale: breatheAnimation }]
          }}
        >
          <Text style={{
            fontSize: 24,
            fontWeight: '600',
            color: getPhaseColor(),
            marginBottom: 8
          }}>
            {getPhaseText()}
          </Text>
          <Text style={{
            fontSize: 14,
            color: colors.textSecondary
          }}>
            {phase === 'inhale' && '4 seconds'}
            {phase === 'hold' && '2 seconds'}
            {phase === 'exhale' && '6 seconds'}
          </Text>
        </Animated.View>
      </View>

      {/* Controls */}
      <View style={{ alignItems: 'center' }}>
        {!isActive && timeRemaining > 0 && (
          <Pressable
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingHorizontal: 32,
              paddingVertical: 16,
              marginBottom: 12,
              minWidth: 200,
              alignItems: 'center'
            }}
            onPress={startSession}
          >
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: 'white'
            }}>
              {timeRemaining === 180 ? 'Start Breathing' : 'Resume'}
            </Text>
          </Pressable>
        )}

        {isActive && (
          <Pressable
            style={{
              backgroundColor: colors.warning,
              borderRadius: 12,
              paddingHorizontal: 32,
              paddingVertical: 16,
              marginBottom: 12,
              minWidth: 200,
              alignItems: 'center'
            }}
            onPress={pauseSession}
          >
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: 'white'
            }}>
              Pause
            </Text>
          </Pressable>
        )}

        {timeRemaining < 180 && (
          <Pressable
            style={{
              backgroundColor: 'transparent',
              borderRadius: 12,
              paddingHorizontal: 32,
              paddingVertical: 16,
              borderWidth: 2,
              borderColor: colors.textSecondary,
              minWidth: 200,
              alignItems: 'center'
            }}
            onPress={resetSession}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '500',
              color: colors.textSecondary
            }}>
              Reset Session
            </Text>
          </Pressable>
        )}

        {timeRemaining === 0 && (
          <Pressable
            style={{
              backgroundColor: colors.success,
              borderRadius: 12,
              paddingHorizontal: 32,
              paddingVertical: 16,
              marginBottom: 12,
              minWidth: 200,
              alignItems: 'center'
            }}
            onPress={resetSession}
          >
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: 'white'
            }}>
              Start New Session
            </Text>
          </Pressable>
        )}
      </View>

      {/* Instructions */}
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 16,
        marginTop: 20
      }}>
        <Text style={{
          fontSize: 12,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 18
        }}>
          Follow the breathing circle: Inhale as it grows, hold when steady, exhale as it shrinks.
          {'\n'}Focus on your breath and let thoughts pass gently.
        </Text>
      </View>
    </View>
  );
};

export default BreathingScreen;