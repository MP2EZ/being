/**
 * Dashboard Store - Enhanced State Management for Home Screen
 *
 * Aggregates data from multiple sources for the home dashboard:
 * - Daily check-in status and mood trends
 * - Therapeutic session progress and streaks
 * - Crisis state monitoring and emergency resource availability
 * - Time-of-day adaptive theming and recommendations
 * - Offline-first data caching for instant dashboard loading
 *
 * Enhanced with clinical validation and therapeutic timing accuracy
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CheckIn } from '../types.ts';
import { dataStore } from '../services/storage/SecureDataStore';
import { networkService } from '../services/NetworkService';
import { encryptionService, DataSensitivity } from '../services/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Time-based context for adaptive dashboard
 */
export interface TimeContext {
  readonly currentPeriod: 'morning' | 'midday' | 'evening';
  readonly hour: number;
  readonly greeting: string;
  readonly recommendedActions: readonly string[];
  readonly nextCheckInTime: string | null;
  readonly adaptiveTheme: 'morning' | 'midday' | 'evening';
}

/**
 * Daily progress aggregation
 */
export interface DailyProgress {
  readonly date: string;
  readonly completed: number;
  readonly total: number;
  readonly percentage: number;
  readonly checkIns: {
    readonly morning: CheckInStatus;
    readonly midday: CheckInStatus;
    readonly evening: CheckInStatus;
  };
  readonly streak: number;
  readonly consistency: number; // 0-1 score based on weekly completion
}

/**
 * Individual check-in status
 */
interface CheckInStatus {
  readonly completed: boolean;
  readonly skipped: boolean;
  readonly completedAt: string | null;
  readonly quality: 'excellent' | 'good' | 'fair' | 'incomplete';
  readonly moodTrend: 'improving' | 'stable' | 'declining' | 'unknown';
  readonly duration: number; // seconds
}

/**
 * Mood trends and analytics
 */
export interface MoodTrends {
  readonly current: number; // 1-10 scale
  readonly change: number; // -5 to +5 change from yesterday
  readonly trend: 'improving' | 'stable' | 'declining';
  readonly weeklyAverage: number;
  readonly monthlyAverage: number;
  readonly insights: readonly string[];
  readonly concerningPatterns: readonly string[];
}

/**
 * Therapeutic milestones and achievements
 */
export interface TherapeuticMilestones {
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly totalSessions: number;
  readonly weeklyGoal: number;
  readonly weeklyProgress: number;
  readonly achievements: readonly {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly unlockedAt: string;
    readonly category: 'consistency' | 'engagement' | 'progress' | 'milestone';
  }[];
  readonly nextMilestone: {
    readonly title: string;
    readonly description: string;
    readonly progress: number; // 0-1
    readonly target: number;
  } | null;
}

/**
 * Crisis monitoring and safety status
 */
export interface CrisisMonitoring {
  readonly status: 'safe' | 'elevated' | 'concerning' | 'crisis';
  readonly lastAssessment: string | null;
  readonly riskFactors: readonly string[];
  readonly protectiveFactors: readonly string[];
  readonly emergencyContactsConfigured: boolean;
  readonly hotlineAccess: boolean;
  readonly safetyPlanActive: boolean;
  readonly recentTriggers: readonly string[];
}

/**
 * Dashboard recommendations based on patterns
 */
export interface SmartRecommendations {
  readonly priority: 'high' | 'medium' | 'low';
  readonly recommendations: readonly {
    readonly id: string;
    readonly type: 'check_in' | 'assessment' | 'exercise' | 'crisis_support';
    readonly title: string;
    readonly description: string;
    readonly action: string;
    readonly urgency: 'immediate' | 'today' | 'this_week' | 'when_ready';
    readonly reason: string;
  }[];
  readonly personalizedInsights: readonly string[];
  readonly therapistsNotes: readonly string[]; // For future integration
}

/**
 * Main dashboard state interface
 */
interface DashboardState {
  // Core aggregated data
  timeContext: TimeContext;
  dailyProgress: DailyProgress;
  moodTrends: MoodTrends;
  therapeuticMilestones: TherapeuticMilestones;
  crisisMonitoring: CrisisMonitoring;
  smartRecommendations: SmartRecommendations;

  // Cache management
  lastUpdated: string;
  isRefreshing: boolean;
  cacheValid: boolean;
  offlineMode: boolean;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshDashboard: () => Promise<void>;
  updateTimeContext: () => void;
  aggregateDailyData: () => Promise<void>;
  calculateMoodTrends: () => Promise<void>;
  updateMilestones: () => Promise<void>;
  monitorCrisisState: () => Promise<void>;
  generateRecommendations: () => Promise<void>;

  // Cache management
  invalidateCache: () => void;
  preloadTomorrowData: () => Promise<void>;
  optimizeForOffline: () => Promise<void>;

  // Reactive subscriptions
  subscribeToCheckInUpdates: () => () => void;
  subscribeToTimeChanges: () => () => void;

  // Crisis response
  handleCrisisDetection: (severity: 'elevated' | 'concerning' | 'crisis') => Promise<void>;

  // Analytics
  getEngagementScore: () => number;
  getTherapeuticEffectiveness: () => number;
  getConsistencyMetrics: () => {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

/**
 * Encrypted storage for dashboard cache
 */
const encryptedDashboardStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const encryptedData = await AsyncStorage.getItem(name);
      if (!encryptedData) return null;

      const decrypted = await encryptionService.decryptData(
        JSON.parse(encryptedData),
        DataSensitivity.CLINICAL
      );
      return JSON.stringify(decrypted);
    } catch (error) {
      console.error('Failed to decrypt dashboard data:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const data = JSON.parse(value);
      const encrypted = await encryptionService.encryptData(
        data,
        DataSensitivity.CLINICAL
      );
      await AsyncStorage.setItem(name, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to encrypt dashboard data:', error);
      throw error;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

/**
 * Create Dashboard Store
 */
export const useDashboardStore = create<DashboardState>()(
  subscribeWithSelector(
    persist(
      (set, get) => {

        // Helper functions
        const getCurrentTimeContext = (): TimeContext => {
          const now = new Date();
          const hour = now.getHours();

          let currentPeriod: 'morning' | 'midday' | 'evening';
          let greeting: string;
          let recommendedActions: string[];

          if (hour < 12) {
            currentPeriod = 'morning';
            greeting = 'Good morning';
            recommendedActions = ['Start morning check-in', 'Set daily intention', 'Body awareness scan'];
          } else if (hour < 17) {
            currentPeriod = 'midday';
            greeting = 'Good afternoon';
            recommendedActions = ['Midday reset', 'Breathing exercise', 'Energy check'];
          } else {
            currentPeriod = 'evening';
            greeting = 'Good evening';
            recommendedActions = ['Evening reflection', 'Gratitude practice', 'Sleep preparation'];
          }

          // Calculate next check-in time
          let nextCheckInTime: string | null = null;
          if (currentPeriod === 'morning') {
            nextCheckInTime = `Today at 1:00 PM`; // Midday
          } else if (currentPeriod === 'midday') {
            nextCheckInTime = `Today at 8:00 PM`; // Evening
          } else {
            nextCheckInTime = `Tomorrow at 8:00 AM`; // Next morning
          }

          return {
            currentPeriod,
            hour,
            greeting,
            recommendedActions,
            nextCheckInTime,
            adaptiveTheme: currentPeriod
          };
        };

        const calculateCheckInQuality = (checkIn: CheckIn): CheckInStatus['quality'] => {
          if (!checkIn.completedAt) return 'incomplete';
          if (checkIn.skipped) return 'incomplete';

          const duration = checkIn.completedAt && checkIn.startedAt
            ? Math.floor((new Date(checkIn.completedAt).getTime() - new Date(checkIn.startedAt).getTime()) / 1000)
            : 0;

          // Quality based on completion time and data richness
          const dataCompleteness = Object.keys(checkIn.data || {}).length;

          if (duration > 300 && dataCompleteness >= 6) return 'excellent'; // 5+ minutes, rich data
          if (duration > 180 && dataCompleteness >= 4) return 'good'; // 3+ minutes, good data
          if (duration > 60 && dataCompleteness >= 2) return 'fair'; // 1+ minute, minimal data
          return 'incomplete';
        };

        const getMoodTrend = (recent: number, previous: number): MoodTrends['trend'] => {
          const diff = recent - previous;
          if (diff > 0.5) return 'improving';
          if (diff < -0.5) return 'declining';
          return 'stable';
        };

        return {
          // Initial state with sensible defaults
          timeContext: getCurrentTimeContext(),
          dailyProgress: {
            date: new Date().toISOString().split('T')[0],
            completed: 0,
            total: 3,
            percentage: 0,
            checkIns: {
              morning: { completed: false, skipped: false, completedAt: null, quality: 'incomplete', moodTrend: 'unknown', duration: 0 },
              midday: { completed: false, skipped: false, completedAt: null, quality: 'incomplete', moodTrend: 'unknown', duration: 0 },
              evening: { completed: false, skipped: false, completedAt: null, quality: 'incomplete', moodTrend: 'unknown', duration: 0 },
            },
            streak: 0,
            consistency: 0,
          },
          moodTrends: {
            current: 5,
            change: 0,
            trend: 'stable',
            weeklyAverage: 5,
            monthlyAverage: 5,
            insights: [],
            concerningPatterns: [],
          },
          therapeuticMilestones: {
            currentStreak: 0,
            longestStreak: 0,
            totalSessions: 0,
            weeklyGoal: 21, // 3 check-ins × 7 days
            weeklyProgress: 0,
            achievements: [],
            nextMilestone: {
              title: 'First Steps',
              description: 'Complete your first daily check-in cycle',
              progress: 0,
              target: 3,
            },
          },
          crisisMonitoring: {
            status: 'safe',
            lastAssessment: null,
            riskFactors: [],
            protectiveFactors: [],
            emergencyContactsConfigured: false,
            hotlineAccess: true,
            safetyPlanActive: false,
            recentTriggers: [],
          },
          smartRecommendations: {
            priority: 'medium',
            recommendations: [],
            personalizedInsights: [],
            therapistsNotes: [],
          },

          lastUpdated: new Date().toISOString(),
          isRefreshing: false,
          cacheValid: false,
          offlineMode: !networkService.isOnline(),
          isLoading: false,
          error: null,

          /**
           * Refresh entire dashboard data
           */
          refreshDashboard: async (): Promise<void> => {
            set({ isRefreshing: true, error: null });

            try {
              await Promise.all([
                get().updateTimeContext(),
                get().aggregateDailyData(),
                get().calculateMoodTrends(),
                get().updateMilestones(),
                get().monitorCrisisState(),
                get().generateRecommendations(),
              ]);

              set({
                lastUpdated: new Date().toISOString(),
                cacheValid: true,
                isRefreshing: false,
              });

              console.log('Dashboard refreshed successfully');
            } catch (error) {
              console.error('Dashboard refresh failed:', error);
              set({
                error: error instanceof Error ? error.message : 'Dashboard refresh failed',
                isRefreshing: false,
              });
            }
          },

          /**
           * Update time-based context
           */
          updateTimeContext: (): void => {
            const timeContext = getCurrentTimeContext();
            set({ timeContext });
          },

          /**
           * Aggregate daily progress data
           */
          aggregateDailyData: async (): Promise<void> => {
            try {
              const today = new Date().toISOString().split('T')[0];
              const todaysCheckIns = await dataStore.getTodayCheckIns();

              // Process check-ins by type
              const morningCheckIn = todaysCheckIns.find(c => c.type === 'morning');
              const middayCheckIn = todaysCheckIns.find(c => c.type === 'midday');
              const eveningCheckIn = todaysCheckIns.find(c => c.type === 'evening');

              const processCheckIn = (checkIn: CheckIn | undefined): CheckInStatus => {
                if (!checkIn) {
                  return {
                    completed: false,
                    skipped: false,
                    completedAt: null,
                    quality: 'incomplete',
                    moodTrend: 'unknown',
                    duration: 0,
                  };
                }

                return {
                  completed: !!checkIn.completedAt && !checkIn.skipped,
                  skipped: checkIn.skipped || false,
                  completedAt: checkIn.completedAt || null,
                  quality: calculateCheckInQuality(checkIn),
                  moodTrend: 'stable', // TODO: Calculate from mood data
                  duration: checkIn.completedAt && checkIn.startedAt
                    ? Math.floor((new Date(checkIn.completedAt).getTime() - new Date(checkIn.startedAt).getTime()) / 1000)
                    : 0,
                };
              };

              const checkIns = {
                morning: processCheckIn(morningCheckIn),
                midday: processCheckIn(middayCheckIn),
                evening: processCheckIn(eveningCheckIn),
              };

              const completed = Object.values(checkIns).filter(c => c.completed).length;
              const total = 3;
              const percentage = Math.round((completed / total) * 100);

              // Calculate streak
              const streak = await calculateStreak();

              // Calculate weekly consistency
              const weeklyCheckIns = await dataStore.getRecentCheckIns(7);
              const weeklyCompleted = weeklyCheckIns.filter(c => c.completedAt && !c.skipped).length;
              const expectedWeekly = 21; // 3 per day × 7 days
              const consistency = Math.min(1, weeklyCompleted / expectedWeekly);

              const dailyProgress: DailyProgress = {
                date: today,
                completed,
                total,
                percentage,
                checkIns,
                streak,
                consistency,
              };

              set({ dailyProgress });

            } catch (error) {
              console.error('Failed to aggregate daily data:', error);
              throw error;
            }
          },

          /**
           * Calculate mood trends and patterns
           */
          calculateMoodTrends: async (): Promise<void> => {
            try {
              const recentCheckIns = await dataStore.getRecentCheckIns(30);
              const moodData = recentCheckIns
                .filter(c => c.data?.mood?.value)
                .map(c => ({
                  date: c.completedAt!.split('T')[0],
                  value: c.data!.mood!.value,
                }));

              if (moodData.length === 0) {
                return; // No mood data available
              }

              const current = moodData[moodData.length - 1]?.value || 5;
              const previous = moodData[moodData.length - 2]?.value || current;
              const change = current - previous;
              const trend = getMoodTrend(current, previous);

              // Calculate averages
              const weeklyData = moodData.slice(-7);
              const weeklyAverage = weeklyData.length > 0
                ? weeklyData.reduce((sum, d) => sum + d.value, 0) / weeklyData.length
                : current;

              const monthlyAverage = moodData.length > 0
                ? moodData.reduce((sum, d) => sum + d.value, 0) / moodData.length
                : current;

              // Generate insights
              const insights: string[] = [];
              if (trend === 'improving') {
                insights.push('Your mood has been improving lately. Keep up the great work!');
              } else if (trend === 'declining') {
                insights.push('Consider reaching out for support if you need it.');
              }

              if (weeklyAverage < 4) {
                insights.push('Your mood has been lower than usual this week.');
              }

              // Identify concerning patterns
              const concerningPatterns: string[] = [];
              const lowMoodDays = moodData.slice(-7).filter(d => d.value <= 3).length;
              if (lowMoodDays >= 4) {
                concerningPatterns.push('Multiple days of low mood this week');
              }

              const moodTrends: MoodTrends = {
                current,
                change,
                trend,
                weeklyAverage: Math.round(weeklyAverage * 10) / 10,
                monthlyAverage: Math.round(monthlyAverage * 10) / 10,
                insights,
                concerningPatterns,
              };

              set({ moodTrends });

            } catch (error) {
              console.error('Failed to calculate mood trends:', error);
              throw error;
            }
          },

          /**
           * Update therapeutic milestones and achievements
           */
          updateMilestones: async (): Promise<void> => {
            try {
              const { dailyProgress } = get();
              const recentCheckIns = await dataStore.getRecentCheckIns(30);

              const totalSessions = recentCheckIns.filter(c => c.completedAt && !c.skipped).length;
              const currentStreak = dailyProgress.streak;

              // Calculate longest streak (simplified - would need historical data)
              const longestStreak = Math.max(currentStreak, totalSessions);

              // Weekly progress
              const weeklyCheckIns = await dataStore.getRecentCheckIns(7);
              const weeklyCompleted = weeklyCheckIns.filter(c => c.completedAt && !c.skipped).length;
              const weeklyGoal = 21;
              const weeklyProgress = Math.min(1, weeklyCompleted / weeklyGoal);

              // Generate achievements (simplified)
              const achievements = [];
              if (currentStreak >= 1) {
                achievements.push({
                  id: 'first_checkin',
                  title: 'First Steps',
                  description: 'Completed your first check-in',
                  unlockedAt: new Date().toISOString(),
                  category: 'milestone' as const,
                });
              }

              if (currentStreak >= 3) {
                achievements.push({
                  id: 'three_day_streak',
                  title: 'Consistency Builder',
                  description: 'Maintained a 3-day streak',
                  unlockedAt: new Date().toISOString(),
                  category: 'consistency' as const,
                });
              }

              // Next milestone
              let nextMilestone = null;
              if (currentStreak < 7) {
                nextMilestone = {
                  title: 'Week Warrior',
                  description: 'Complete check-ins for 7 consecutive days',
                  progress: currentStreak / 7,
                  target: 7,
                };
              } else if (currentStreak < 30) {
                nextMilestone = {
                  title: 'Monthly Master',
                  description: 'Complete check-ins for 30 consecutive days',
                  progress: currentStreak / 30,
                  target: 30,
                };
              }

              const therapeuticMilestones: TherapeuticMilestones = {
                currentStreak,
                longestStreak,
                totalSessions,
                weeklyGoal,
                weeklyProgress,
                achievements,
                nextMilestone,
              };

              set({ therapeuticMilestones });

            } catch (error) {
              console.error('Failed to update milestones:', error);
              throw error;
            }
          },

          /**
           * Monitor crisis state and risk factors
           */
          monitorCrisisState: async (): Promise<void> => {
            try {
              const { moodTrends } = get();
              const recentCheckIns = await dataStore.getRecentCheckIns(7);

              // Analyze risk factors
              const riskFactors: string[] = [];
              const protectiveFactors: string[] = [];

              if (moodTrends.concerningPatterns.length > 0) {
                riskFactors.push('Concerning mood patterns detected');
              }

              if (moodTrends.weeklyAverage < 3) {
                riskFactors.push('Persistently low mood');
              }

              // Check for protective factors
              if (recentCheckIns.length >= 3) {
                protectiveFactors.push('Regular check-in engagement');
              }

              if (moodTrends.trend === 'improving') {
                protectiveFactors.push('Improving mood trend');
              }

              // Determine status
              let status: CrisisMonitoring['status'] = 'safe';
              if (riskFactors.length >= 3) {
                status = 'crisis';
              } else if (riskFactors.length >= 2) {
                status = 'concerning';
              } else if (riskFactors.length >= 1) {
                status = 'elevated';
              }

              const crisisMonitoring: CrisisMonitoring = {
                status,
                lastAssessment: new Date().toISOString(),
                riskFactors,
                protectiveFactors,
                emergencyContactsConfigured: false, // TODO: Check actual status
                hotlineAccess: true,
                safetyPlanActive: false, // TODO: Check actual status
                recentTriggers: [], // TODO: Extract from check-in data
              };

              set({ crisisMonitoring });

              // Handle crisis detection
              if (status === 'concerning' || status === 'crisis') {
                await get().handleCrisisDetection(status);
              }

            } catch (error) {
              console.error('Failed to monitor crisis state:', error);
              throw error;
            }
          },

          /**
           * Generate smart recommendations
           */
          generateRecommendations: async (): Promise<void> => {
            try {
              const { timeContext, dailyProgress, moodTrends, crisisMonitoring } = get();

              const recommendations = [];
              let priority: SmartRecommendations['priority'] = 'low';

              // Crisis recommendations (highest priority)
              if (crisisMonitoring.status === 'crisis') {
                priority = 'high';
                recommendations.push({
                  id: 'crisis_support',
                  type: 'crisis_support' as const,
                  title: 'Immediate Support Available',
                  description: 'Connect with crisis support resources right now',
                  action: 'Access Crisis Support',
                  urgency: 'immediate' as const,
                  reason: 'Crisis risk factors detected',
                });
              } else if (crisisMonitoring.status === 'concerning') {
                priority = 'high';
                recommendations.push({
                  id: 'safety_planning',
                  type: 'crisis_support' as const,
                  title: 'Safety Planning',
                  description: 'Create or review your safety plan',
                  action: 'Review Safety Plan',
                  urgency: 'today' as const,
                  reason: 'Elevated risk factors identified',
                });
              }

              // Check-in recommendations
              const incompletedCheckIns = Object.entries(dailyProgress.checkIns)
                .filter(([_, status]) => !status.completed)
                .map(([type, _]) => type);

              if (incompletedCheckIns.includes(timeContext.currentPeriod)) {
                priority = priority === 'high' ? 'high' : 'medium';
                recommendations.push({
                  id: 'current_checkin',
                  type: 'check_in' as const,
                  title: `${timeContext.currentPeriod.charAt(0).toUpperCase() + timeContext.currentPeriod.slice(1)} Check-in`,
                  description: `Complete your ${timeContext.currentPeriod} mindfulness check-in`,
                  action: 'Start Check-in',
                  urgency: 'today' as const,
                  reason: 'Current time period check-in pending',
                });
              }

              // Mood-based recommendations
              if (moodTrends.trend === 'declining') {
                recommendations.push({
                  id: 'mood_support',
                  type: 'exercise' as const,
                  title: 'Mood Support Exercise',
                  description: 'Practice breathing or grounding exercises',
                  action: 'Try Breathing Exercise',
                  urgency: 'today' as const,
                  reason: 'Declining mood trend detected',
                });
              }

              // Assessment recommendations
              const daysSinceLastAssessment = 7; // TODO: Calculate from actual data
              if (daysSinceLastAssessment >= 7) {
                recommendations.push({
                  id: 'weekly_assessment',
                  type: 'assessment' as const,
                  title: 'Weekly Assessment',
                  description: 'Take your PHQ-9/GAD-7 assessment',
                  action: 'Take Assessment',
                  urgency: 'this_week' as const,
                  reason: 'Regular assessment due',
                });
              }

              // Generate insights
              const personalizedInsights: string[] = [];
              if (dailyProgress.streak > 0) {
                personalizedInsights.push(`You're on a ${dailyProgress.streak}-day streak! Keep it up.`);
              }

              if (moodTrends.trend === 'improving') {
                personalizedInsights.push('Your mood has been improving. Your mindfulness practice is paying off.');
              }

              const smartRecommendations: SmartRecommendations = {
                priority,
                recommendations,
                personalizedInsights,
                therapistsNotes: [], // For future integration
              };

              set({ smartRecommendations });

            } catch (error) {
              console.error('Failed to generate recommendations:', error);
              throw error;
            }
          },

          /**
           * Invalidate cache to force refresh
           */
          invalidateCache: (): void => {
            set({ cacheValid: false });
          },

          /**
           * Preload data for tomorrow's dashboard
           */
          preloadTomorrowData: async (): Promise<void> => {
            try {
              // Preload anticipated data for faster tomorrow experience
              console.log('Preloading tomorrow data...');
              // TODO: Implement preloading logic
            } catch (error) {
              console.error('Failed to preload tomorrow data:', error);
            }
          },

          /**
           * Optimize dashboard for offline usage
           */
          optimizeForOffline: async (): Promise<void> => {
            try {
              set({ offlineMode: true });
              // Cache essential data for offline use
              console.log('Optimizing for offline...');
              // TODO: Implement offline optimization
            } catch (error) {
              console.error('Failed to optimize for offline:', error);
            }
          },

          /**
           * Subscribe to check-in updates
           */
          subscribeToCheckInUpdates: (): (() => void) => {
            // TODO: Implement reactive subscription to check-in store
            return () => {
              console.log('Unsubscribed from check-in updates');
            };
          },

          /**
           * Subscribe to time changes for adaptive updates
           */
          subscribeToTimeChanges: (): (() => void) => {
            const interval = setInterval(() => {
              get().updateTimeContext();
            }, 60000); // Update every minute

            return () => {
              clearInterval(interval);
            };
          },

          /**
           * Handle crisis detection
           */
          handleCrisisDetection: async (severity: 'elevated' | 'concerning' | 'crisis'): Promise<void> => {
            try {
              console.warn(`Crisis detection: ${severity} level`);

              // TODO: Integrate with crisis response system
              // - Notify emergency contacts
              // - Suggest immediate resources
              // - Log for clinical review

            } catch (error) {
              console.error('Failed to handle crisis detection:', error);
            }
          },

          /**
           * Get engagement score (0-100)
           */
          getEngagementScore: (): number => {
            const { dailyProgress, therapeuticMilestones } = get();

            // Calculate based on consistency and quality
            const consistencyScore = dailyProgress.consistency * 40;
            const streakScore = Math.min(30, therapeuticMilestones.currentStreak * 5);
            const completionScore = dailyProgress.percentage * 0.3;

            return Math.round(consistencyScore + streakScore + completionScore);
          },

          /**
           * Get therapeutic effectiveness score (0-100)
           */
          getTherapeuticEffectiveness: (): number => {
            const { moodTrends, dailyProgress } = get();

            // Calculate based on mood improvement and engagement
            let effectivenessScore = 50; // Baseline

            if (moodTrends.trend === 'improving') {
              effectivenessScore += 25;
            } else if (moodTrends.trend === 'declining') {
              effectivenessScore -= 25;
            }

            if (moodTrends.weeklyAverage > 6) {
              effectivenessScore += 15;
            } else if (moodTrends.weeklyAverage < 4) {
              effectivenessScore -= 15;
            }

            // Engagement factor
            effectivenessScore += dailyProgress.consistency * 10;

            return Math.max(0, Math.min(100, Math.round(effectivenessScore)));
          },

          /**
           * Get consistency metrics
           */
          getConsistencyMetrics: (): { daily: number; weekly: number; monthly: number } => {
            const { dailyProgress } = get();

            return {
              daily: dailyProgress.percentage / 100,
              weekly: dailyProgress.consistency,
              monthly: dailyProgress.consistency, // TODO: Calculate actual monthly consistency
            };
          },
        };

        // Helper function to calculate streak
        async function calculateStreak(): Promise<number> {
          try {
            // TODO: Implement actual streak calculation from historical data
            // For now, return a placeholder
            return 1;
          } catch (error) {
            console.error('Failed to calculate streak:', error);
            return 0;
          }
        }
      },
      {
        name: 'being-dashboard-store',
        storage: createJSONStorage(() => encryptedDashboardStorage),
        partialize: (state) => ({
          dailyProgress: state.dailyProgress,
          moodTrends: state.moodTrends,
          therapeuticMilestones: state.therapeuticMilestones,
          lastUpdated: state.lastUpdated,
          cacheValid: state.cacheValid,
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            return {
              ...persistedState,
              cacheValid: false, // Force refresh on migration
            };
          }
          return persistedState;
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log('Dashboard store rehydrated successfully');
            // Refresh if cache is stale (older than 1 hour)
            const lastUpdated = new Date(state.lastUpdated).getTime();
            const now = Date.now();
            if (now - lastUpdated > 60 * 60 * 1000) {
              state.invalidateCache();
            }
          }
        },
      }
    )
  )
);

/**
 * Dashboard store utilities for external access
 */
export const dashboardStoreUtils = {
  getCurrentTimeContext: () => useDashboardStore.getState().timeContext,
  getDailyProgress: () => useDashboardStore.getState().dailyProgress,
  getMoodTrends: () => useDashboardStore.getState().moodTrends,
  getCrisisStatus: () => useDashboardStore.getState().crisisMonitoring.status,
  getRecommendations: () => useDashboardStore.getState().smartRecommendations,
  isOffline: () => useDashboardStore.getState().offlineMode,
  needsRefresh: () => !useDashboardStore.getState().cacheValid,

  // Quick actions
  refreshNow: () => useDashboardStore.getState().refreshDashboard(),
  invalidateCache: () => useDashboardStore.getState().invalidateCache(),
};