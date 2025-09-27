/**
 * Home Screen - Main dashboard with check-in cards
 * Shows today's progress and quick access to assessments
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCheckInStore, useUserStore } from '../../store';
import { Card, Button, ResumeSessionPrompt, CrisisButton } from '../../components/core';
import { colorSystem, spacing } from '../../constants/colors';
import { ResumableSession, SessionProgress } from '../../types/ResumableSession';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useUserStore();
  const { 
    todaysCheckIns, 
    loadTodaysCheckIns, 
    getTodaysProgress,
    hasCompletedTodaysCheckIn,
    getSessionProgress,
    resumeCheckIn,
    clearPartialSession
  } = useCheckInStore();

  // Resume session state
  const [resumableSession, setResumableSession] = useState<{
    type: 'morning' | 'midday' | 'evening';
    progress: SessionProgress;
  } | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [isCheckingForSessions, setIsCheckingForSessions] = useState(true);

  useEffect(() => {
    loadTodaysCheckIns();
    checkForResumableSessions();
  }, [loadTodaysCheckIns]);

  // Check for resumable sessions on mount
  const checkForResumableSessions = async () => {
    setIsCheckingForSessions(true);
    
    try {
      // Check each check-in type for active sessions
      const checkInTypes: ('morning' | 'midday' | 'evening')[] = ['morning', 'midday', 'evening'];
      
      for (const type of checkInTypes) {
        const sessionProgress = await getSessionProgress(type);
        if (sessionProgress && sessionProgress.percentComplete >= 10) {
          // Found a resumable session with meaningful progress
          setResumableSession({
            type,
            progress: sessionProgress,
          });
          setShowResumePrompt(true);
          break; // Show only the first resumable session found
        }
      }
    } catch (error) {
      console.error('Error checking for resumable sessions:', error);
    } finally {
      setIsCheckingForSessions(false);
    }
  };

  // Handle resuming a session
  const handleResumeSession = async () => {
    if (!resumableSession) return;
    
    try {
      const success = await resumeCheckIn(resumableSession.type);
      if (success) {
        setShowResumePrompt(false);
        setResumableSession(null);
        // Navigate to the check-in flow
        (navigation as any).navigate('CheckInFlow', { 
          type: resumableSession.type,
          resuming: true 
        });
      } else {
        // Session couldn't be resumed, clear it
        setShowResumePrompt(false);
        setResumableSession(null);
      }
    } catch (error) {
      console.error('Error resuming session:', error);
      setShowResumePrompt(false);
      setResumableSession(null);
    }
  };

  // Handle dismissing the resume prompt
  const handleDismissResumePrompt = async () => {
    if (!resumableSession) return;
    
    try {
      // Clear the session progress to prevent showing again
      await clearPartialSession(resumableSession.type);
      setShowResumePrompt(false);
      setResumableSession(null);
    } catch (error) {
      console.error('Error dismissing resume prompt:', error);
      // Still hide the prompt even if clearing failed
      setShowResumePrompt(false);
      setResumableSession(null);
    }
  };

  const progress = getTodaysProgress();
  const currentHour = new Date().getHours();
  
  // Determine current time period
  const getCurrentPeriod = () => {
    if (currentHour < 12) return 'morning';
    if (currentHour < 17) return 'midday';
    return 'evening';
  };

  const currentPeriod = getCurrentPeriod();

  const getGreeting = () => {
    if (currentHour < 12) return 'Good morning';
    if (currentHour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const CheckInCard: React.FC<{ 
    type: 'morning' | 'midday' | 'evening';
    title: string;
    description: string;
  }> = ({ type, title, description }) => {
    const isCompleted = hasCompletedTodaysCheckIn(type);
    const isCurrent = type === currentPeriod;
    
    return (
      <Card 
        theme={type}
        style={[
          styles.checkInCard,
          isCurrent && styles.currentCard
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[
            styles.cardTitle,
            { color: colorSystem.themes[type].primary }
          ]}>
            {title}
          </Text>
          {isCompleted && (
            <Text style={styles.completedBadge}>✓ Complete</Text>
          )}
        </View>
        
        <Text style={styles.cardDescription}>{description}</Text>
        
        <Button
          theme={type}
          variant={isCompleted ? 'outline' : 'primary'}
          onPress={() => {
            (navigation as any).navigate('CheckInFlow', { type });
          }}
        >
          {isCompleted ? 'Review' : 'Start Check-in'}
        </Button>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Crisis Button - Always accessible in <3 seconds */}
      <CrisisButton variant="floating" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.progressText}>
            Today's Progress: {progress.completed}/{progress.total} check-ins
          </Text>
        </View>

        {/* Check-in Cards */}
        <View style={styles.checkInSection}>
          <CheckInCard
            type="morning"
            title="Morning Awareness"
            description="Start your day with mindful awareness of your body, emotions, and intentions."
          />
          
          <CheckInCard
            type="midday"
            title="Midday Reset"
            description="Take a moment to reconnect with the present and reset your energy."
          />
          
          <CheckInCard
            type="evening"
            title="Evening Reflection"
            description="Reflect on your day and prepare your mind for restful sleep."
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <Button
            variant="outline"
            onPress={() => {
              (navigation as any).navigate('AssessmentFlow', { type: 'phq9' });
            }}
          >
            Take Assessment (PHQ-9/GAD-7)
          </Button>

          <Button
            variant="outline"
            onPress={() => {
              (navigation as any).navigate('BreathingScreen', { theme: currentPeriod });
            }}
          >
            3-Minute Breathing Exercise
          </Button>

          <Button
            variant="outline"
            onPress={() => {
              (navigation as any).navigate('ProgressScreen');
            }}
          >
            View Your Progress
          </Button>
        </View>
      </ScrollView>

      {/* Resume Session Prompt */}
      {resumableSession && (
        <ResumeSessionPrompt
          isVisible={showResumePrompt}
          checkInType={resumableSession.type}
          percentage={resumableSession.progress.percentComplete}
          estimatedTimeRemaining={resumableSession.progress.estimatedTimeRemaining}
          onContinue={handleResumeSession}
          onDismiss={handleDismissResumePrompt}
          variant="modal"
          testID="home-resume-session-prompt"
        />
      )}
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
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
  },
  progressText: {
    fontSize: 16,
    color: colorSystem.gray[600],
  },
  checkInSection: {
    marginBottom: spacing.xl,
  },
  checkInCard: {
    marginBottom: spacing.md,
  },
  currentCard: {
    borderWidth: 2,
    borderColor: colorSystem.status.info,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  completedBadge: {
    fontSize: 14,
    color: colorSystem.status.success,
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  quickActions: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
  },
});

export default HomeScreen;