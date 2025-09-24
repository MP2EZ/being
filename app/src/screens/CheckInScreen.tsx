/**
 * Check-In Screen - Being. MBCT App
 * Daily mood tracking and mindfulness check-in
 * New Architecture Compatible - No JSI dependencies
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSimpleThemeColors } from '../contexts/SimpleThemeContext';
import { useUserStore } from '../store/userStoreFixed';

interface CheckInScreenProps {
  navigation: any;
}

interface MoodRating {
  id: number;
  label: string;
  emoji: string;
  description: string;
}

interface AnxietyRating {
  id: number;
  label: string;
  description: string;
}

const MOOD_RATINGS: MoodRating[] = [
  { id: 1, label: 'Very Low', emoji: '😢', description: 'Feeling very down or sad' },
  { id: 2, label: 'Low', emoji: '😕', description: 'Feeling somewhat down' },
  { id: 3, label: 'Neutral', emoji: '😐', description: 'Feeling okay, neither good nor bad' },
  { id: 4, label: 'Good', emoji: '😊', description: 'Feeling pretty good' },
  { id: 5, label: 'Very Good', emoji: '😄', description: 'Feeling great and positive' },
];

const ANXIETY_RATINGS: AnxietyRating[] = [
  { id: 1, label: 'Very Low', description: 'Very calm and relaxed' },
  { id: 2, label: 'Low', description: 'Mostly calm with minimal worry' },
  { id: 3, label: 'Moderate', description: 'Some anxiety or worry present' },
  { id: 4, label: 'High', description: 'Quite anxious or worried' },
  { id: 5, label: 'Very High', description: 'Very anxious, hard to manage' },
];

const CheckInScreen: React.FC<CheckInScreenProps> = ({ navigation }) => {
  const colors = useSimpleThemeColors();
  const { user } = useUserStore();

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedAnxiety, setSelectedAnxiety] = useState<number | null>(null);
  const [mindfulMoments, setMindfulMoments] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmitCheckIn = async () => {
    if (selectedMood === null || selectedAnxiety === null || mindfulMoments === null) {
      return;
    }

    setIsSubmitting(true);

    // Simulate saving check-in data
    setTimeout(() => {
      console.log('Check-in saved:', {
        date: new Date().toISOString(),
        mood: selectedMood,
        anxiety: selectedAnxiety,
        mindfulMoments,
        user: user?.name
      });

      setIsSubmitting(false);
      setIsComplete(true);
    }, 1000);
  };

  const resetCheckIn = () => {
    setSelectedMood(null);
    setSelectedAnxiety(null);
    setMindfulMoments(null);
    setIsComplete(false);
  };

  const isFormComplete = selectedMood !== null && selectedAnxiety !== null && mindfulMoments !== null;

  if (isComplete) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Text style={{
          fontSize: 48,
          marginBottom: 20
        }}>
          ✅
        </Text>

        <Text style={{
          fontSize: 24,
          fontWeight: '600',
          color: colors.text,
          textAlign: 'center',
          marginBottom: 12
        }}>
          Check-in Complete!
        </Text>

        <Text style={{
          fontSize: 16,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: 40,
          lineHeight: 22
        }}>
          Thank you for taking time to check in with yourself. Your mindfulness practice is building stronger emotional awareness.
        </Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 16,
              flex: 1,
              alignItems: 'center'
            }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: 'white'
            }}>
              Done
            </Text>
          </Pressable>

          <Pressable
            style={{
              backgroundColor: 'transparent',
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 16,
              borderWidth: 2,
              borderColor: colors.textSecondary,
              flex: 1,
              alignItems: 'center'
            }}
            onPress={resetCheckIn}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '500',
              color: colors.textSecondary
            }}>
              New Check-in
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{
      flex: 1,
      backgroundColor: colors.background
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 40
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
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 20,
            fontWeight: '600',
            color: colors.text
          }}>
            Daily Check-in
          </Text>
          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 2
          }}>
            How are you feeling today?
          </Text>
        </View>
      </View>

      <View style={{ padding: 20, paddingTop: 0 }}>
        {/* Mood Section */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 16
          }}>
            1. How is your mood today?
          </Text>

          {MOOD_RATINGS.map((mood) => (
            <Pressable
              key={mood.id}
              style={{
                backgroundColor: selectedMood === mood.id ? colors.primary + '20' : colors.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 2,
                borderColor: selectedMood === mood.id ? colors.primary : colors.border,
                flexDirection: 'row',
                alignItems: 'center'
              }}
              onPress={() => setSelectedMood(mood.id)}
            >
              <Text style={{ fontSize: 24, marginRight: 12 }}>{mood.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: 2
                }}>
                  {mood.label}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: colors.textSecondary
                }}>
                  {mood.description}
                </Text>
              </View>
              {selectedMood === mood.id && (
                <Text style={{
                  fontSize: 18,
                  color: colors.primary
                }}>
                  ✓
                </Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Anxiety Section */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 16
          }}>
            2. How is your anxiety level today?
          </Text>

          {ANXIETY_RATINGS.map((anxiety) => (
            <Pressable
              key={anxiety.id}
              style={{
                backgroundColor: selectedAnxiety === anxiety.id ? colors.warning + '20' : colors.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 2,
                borderColor: selectedAnxiety === anxiety.id ? colors.warning : colors.border,
                flexDirection: 'row',
                alignItems: 'center'
              }}
              onPress={() => setSelectedAnxiety(anxiety.id)}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: selectedAnxiety === anxiety.id ? colors.warning : colors.textSecondary,
                marginRight: 12,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  {anxiety.id}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: 2
                }}>
                  {anxiety.label}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: colors.textSecondary
                }}>
                  {anxiety.description}
                </Text>
              </View>
              {selectedAnxiety === anxiety.id && (
                <Text style={{
                  fontSize: 18,
                  color: colors.warning
                }}>
                  ✓
                </Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Mindful Moments Section */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 16
          }}>
            3. How many mindful moments did you notice today?
          </Text>

          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12
          }}>
            {[0, 1, 2, 3, 4, 5].map((count) => (
              <Pressable
                key={count}
                style={{
                  backgroundColor: mindfulMoments === count ? colors.success + '20' : colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 2,
                  borderColor: mindfulMoments === count ? colors.success : colors.border,
                  minWidth: 60,
                  alignItems: 'center'
                }}
                onPress={() => setMindfulMoments(count)}
              >
                <Text style={{
                  fontSize: 24,
                  fontWeight: '600',
                  color: mindfulMoments === count ? colors.success : colors.text,
                  marginBottom: 4
                }}>
                  {count}
                </Text>
                {count === 5 && (
                  <Text style={{
                    fontSize: 10,
                    color: colors.textSecondary
                  }}>
                    5+
                  </Text>
                )}
              </Pressable>
            ))}
          </View>

          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 12,
            lineHeight: 20
          }}>
            Mindful moments are brief instances when you noticed your thoughts, feelings, or surroundings with awareness and acceptance.
          </Text>
        </View>

        {/* Submit Button */}
        <Pressable
          style={{
            backgroundColor: isFormComplete ? colors.primary : colors.textSecondary,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 20,
            opacity: isSubmitting ? 0.6 : 1
          }}
          onPress={handleSubmitCheckIn}
          disabled={!isFormComplete || isSubmitting}
        >
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: 'white'
          }}>
            {isSubmitting ? 'Saving Check-in...' : 'Complete Check-in'}
          </Text>
        </Pressable>

        {/* Progress indicator */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 8,
          padding: 16,
          marginBottom: 20
        }}>
          <Text style={{
            fontSize: 12,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 18
          }}>
            Your daily check-ins help build emotional awareness and track your wellbeing journey over time.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default CheckInScreen;