/**
 * Home Screen - Being. MBCT App
 * New Architecture Compatible - No JSI dependencies
 */

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSimpleThemeColors } from '../contexts/SimpleThemeContext';
import { useUserStore } from '../store/userStoreFixed';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const colors = useSimpleThemeColors();
  const { user } = useUserStore();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20 }}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 30 }}>
        <Text style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: colors.text,
          marginBottom: 8,
        }}>
          Welcome to Being.
        </Text>
        <Text style={{
          fontSize: 16,
          color: colors.textSecondary,
          textAlign: 'center',
        }}>
          Mindfulness-Based Cognitive Therapy
        </Text>
        {user && (
          <Text style={{
            fontSize: 14,
            color: colors.primary,
            marginTop: 8,
          }}>
            Hello, {user.name}! 👋
          </Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: colors.text,
          marginBottom: 15,
        }}>
          Today's Practice
        </Text>

        {/* Breathing Exercise Card */}
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          onPress={() => {
            navigation.navigate('BreathingScreen');
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>🫁</Text>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.text,
              }}>
                Breathing Exercise
              </Text>
              <Text style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 2,
              }}>
                3-minute mindful breathing
              </Text>
            </View>
            <Text style={{
              fontSize: 14,
              color: colors.primary,
              fontWeight: '500',
            }}>
              Start
            </Text>
          </View>
        </Pressable>

        {/* Daily Check-in Card */}
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          onPress={() => {
            navigation.navigate('CheckInScreen');
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>📝</Text>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.text,
              }}>
                Daily Check-in
              </Text>
              <Text style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 2,
              }}>
                How are you feeling today?
              </Text>
            </View>
            <Text style={{
              fontSize: 14,
              color: colors.primary,
              fontWeight: '500',
            }}>
              Start
            </Text>
          </View>
        </Pressable>

        {/* Progress Card */}
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          onPress={() => {
            // TODO: Navigate to progress screen
            console.log('Navigate to progress');
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>📈</Text>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.text,
              }}>
                Your Progress
              </Text>
              <Text style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 2,
              }}>
                View insights and trends
              </Text>
            </View>
            <Text style={{
              fontSize: 14,
              color: colors.primary,
              fontWeight: '500',
            }}>
              View
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Status Info */}
      <View style={{
        backgroundColor: colors.success + '20',
        borderRadius: 8,
        padding: 12,
        marginTop: 20,
      }}>
        <Text style={{
          fontSize: 12,
          color: colors.success,
          textAlign: 'center',
          fontWeight: '500',
        }}>
          ✅ New Architecture Enabled • JSI-Free • Therapeutic Theme Active
        </Text>
      </View>
    </ScrollView>
  );
};

export default HomeScreen;