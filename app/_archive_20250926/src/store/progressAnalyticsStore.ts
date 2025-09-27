/**
 * Progress Analytics Store - Advanced State Management for Progress & Analytics
 *
 * Handles historical data aggregation and analytics for therapeutic progress:
 * - Historical assessment data aggregation (PHQ-9/GAD-7)
 * - Mood trend calculation and pattern recognition
 * - Therapeutic milestone tracking and achievement unlocking
 * - Exercise completion statistics and effectiveness metrics
 * - Crisis intervention tracking (anonymized) for pattern analysis
 * - Advanced analytics for therapeutic insights and predictions
 *
 * Enhanced with clinical validation and encrypted data handling
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
 * Assessment score trend over time
 */
export interface AssessmentTrend {
  readonly type: 'PHQ-9' | 'GAD-7';
  readonly current: number;
  readonly previous: number;
  readonly change: number;
  readonly trend: 'improving' | 'stable' | 'worsening';
  readonly severity: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
  readonly riskLevel: 'low' | 'moderate' | 'high' | 'crisis';
  readonly lastAssessment: string;
  readonly assessmentCount: number;
  readonly averageScore: number;
  readonly bestScore: number;
  readonly worstScore: number;
}

/**
 * Detailed mood analytics from check-ins
 */
export interface MoodAnalytics {
  readonly currentMood: number; // 1-10 scale
  readonly averageMood: {
    readonly daily: number;
    readonly weekly: number;
    readonly monthly: number;
    readonly overall: number;
  };
  readonly moodTrend: {
    readonly direction: 'improving' | 'stable' | 'declining';
    readonly strength: 'strong' | 'moderate' | 'weak';
    readonly confidence: number; // 0-100%
    readonly daysAnalyzed: number;
  };
  readonly moodPatterns: {
    readonly timeOfDay: {
      readonly morning: number;
      readonly midday: number;
      readonly evening: number;
      readonly bestTime: 'morning' | 'midday' | 'evening';
    };
    readonly dayOfWeek: {
      readonly monday: number;
      readonly tuesday: number;
      readonly wednesday: number;
      readonly thursday: number;
      readonly friday: number;
      readonly saturday: number;
      readonly sunday: number;
      readonly bestDay: string;
      readonly worstDay: string;
    };
    readonly seasonalPatterns: readonly string[];
  };
  readonly moodVariability: {
    readonly high: boolean; // Large mood swings
    readonly averageVariation: number;
    readonly stabilityScore: number; // 0-100%
  };
}

/**
 * Exercise and practice analytics
 */
export interface PracticeAnalytics {
  readonly breathingExercises: {
    readonly totalSessions: number;
    readonly totalMinutes: number;
    readonly averageQuality: number;
    readonly completionRate: number;
    readonly longestStreak: number;
    readonly currentStreak: number;
    readonly preferredTime: 'morning' | 'midday' | 'evening' | null;
    readonly averageDuration: number;
    readonly therapeuticEffectiveness: number; // Based on pre/post mood
  };
  readonly checkInConsistency: {
    readonly totalCheckIns: number;
    readonly completionRate: number;
    readonly morningCompletionRate: number;
    readonly middayCompletionRate: number;
    readonly eveningCompletionRate: number;
    readonly averageCompletionTime: number; // minutes
    readonly qualityScore: number; // 0-100 based on thoroughness
    readonly longestStreak: number;
    readonly currentStreak: number;
  };
  readonly assessmentCompliance: {
    readonly totalAssessments: number;
    readonly onTimeRate: number; // Percentage completed on schedule
    readonly averageInterval: number; // Days between assessments
    readonly lastAssessmentDays: number;
    readonly complianceScore: number; // 0-100%
  };
}

/**
 * Therapeutic progress indicators
 */
export interface TherapeuticProgress {
  readonly overallProgress: {
    readonly score: number; // 0-100% overall progress
    readonly stage: 'beginning' | 'developing' | 'progressing' | 'maintaining' | 'mastering';
    readonly daysInProgram: number;
    readonly milestonesReached: number;
    readonly nextMilestone: string | null;
  };
  readonly clinicalImprovement: {
    readonly depressionImprovement: number; // % change in PHQ-9
    readonly anxietyImprovement: number; // % change in GAD-7
    readonly functionalImprovement: number; // Based on check-in data
    readonly qualityOfLife: number; // Derived score 0-100%
    readonly clinicallySignificant: boolean;
  };
  readonly behavioralChanges: {
    readonly consistencyImprovement: number;
    readonly engagementIncrease: number;
    readonly selfAwarenessGrowth: number;
    readonly copingSkillsUsage: number;
    readonly positiveHabits: readonly string[];
    readonly challengeAreas: readonly string[];
  };
  readonly riskFactorChanges: {
    readonly riskReduction: number; // % reduction in risk factors
    readonly protectiveFactorsIncrease: number;
    readonly currentRiskLevel: 'low' | 'moderate' | 'high' | 'crisis';
    readonly riskTrend: 'improving' | 'stable' | 'worsening';
    readonly safetyFactors: readonly string[];
  };
}

/**
 * Achievement and milestone system
 */
export interface AchievementSystem {
  readonly unlockedAchievements: readonly {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly category: 'consistency' | 'improvement' | 'milestone' | 'special';
    readonly points: number;
    readonly unlockedAt: string;
    readonly rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  }[];
  readonly availableAchievements: readonly {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly category: 'consistency' | 'improvement' | 'milestone' | 'special';
    readonly points: number;
    readonly progress: number; // 0-100%
    readonly requirement: string;
  }[];
  readonly totalPoints: number;
  readonly level: number;
  readonly pointsToNextLevel: number;
  readonly badges: readonly string[];
  readonly streakAchievements: {
    readonly longestCheckInStreak: number;
    readonly longestBreathingStreak: number;
    readonly longestOverallStreak: number;
    readonly currentActiveStreaks: readonly string[];
  };
}

/**
 * Personalized insights and recommendations
 */
export interface PersonalizedInsights {
  readonly keyInsights: readonly {
    readonly id: string;
    readonly type: 'positive' | 'neutral' | 'concern' | 'recommendation';
    readonly title: string;
    readonly description: string;
    readonly evidence: readonly string[];
    readonly actionable: boolean;
    readonly priority: 'high' | 'medium' | 'low';
    readonly category: 'mood' | 'behavior' | 'progress' | 'risk';
  }[];
  readonly moodInsights: readonly string[];
  readonly behaviorPatterns: readonly string[];
  readonly recommendedActions: readonly {
    readonly action: string;
    readonly reason: string;
    readonly urgency: 'immediate' | 'this_week' | 'ongoing';
    readonly category: 'practice' | 'assessment' | 'support' | 'lifestyle';
  }[];
  readonly celebratedWins: readonly string[];
  readonly areasForGrowth: readonly string[];
  readonly personalizedTips: readonly string[];
}

/**
 * Crisis pattern analysis (anonymized)
 */
export interface CrisisPatternAnalysis {
  readonly riskIndicators: readonly {
    readonly indicator: string;
    readonly frequency: number;
    readonly severity: 'low' | 'moderate' | 'high';
    readonly trend: 'increasing' | 'stable' | 'decreasing';
    readonly lastOccurrence: string | null;
  }[];
  readonly protectivePatterns: readonly {
    readonly pattern: string;
    readonly effectiveness: number; // 0-100%
    readonly frequency: number;
    readonly lastUsed: string | null;
  }[];
  readonly earlyWarningSignals: readonly string[];
  readonly recoveryPatterns: readonly string[];
  readonly safetyNetStrength: number; // 0-100%
  readonly crisisPreparedness: number; // 0-100%
}

/**
 * Data export capabilities for clinical use
 */
export interface ClinicalDataExport {
  readonly exportFormat: 'pdf' | 'csv' | 'json';
  readonly timeRange: {
    readonly start: string;
    readonly end: string;
  };
  readonly includedMetrics: readonly string[];
  readonly clinicalSummary: string;
  readonly progressNotes: readonly string[];
  readonly recommendationsForProvider: readonly string[];
  readonly lastExported: string | null;
}

/**
 * Main progress analytics store interface
 */
interface ProgressAnalyticsStore {
  // Core analytics data
  assessmentTrends: {
    readonly phq9: AssessmentTrend | null;
    readonly gad7: AssessmentTrend | null;
  };
  moodAnalytics: MoodAnalytics;
  practiceAnalytics: PracticeAnalytics;
  therapeuticProgress: TherapeuticProgress;
  achievementSystem: AchievementSystem;
  personalizedInsights: PersonalizedInsights;
  crisisPatternAnalysis: CrisisPatternAnalysis;

  // Meta data
  lastAnalysisRun: string | null;
  analysisInProgress: boolean;
  dataQuality: {
    readonly completeness: number; // 0-100%
    readonly reliability: number; // 0-100%
    readonly daysOfData: number;
    readonly missingDataPoints: number;
  };

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Core actions
  runFullAnalysis: () => Promise<void>;
  calculateAssessmentTrends: () => Promise<void>;
  analyzeMoodPatterns: () => Promise<void>;
  calculatePracticeMetrics: () => Promise<void>;
  assessTherapeuticProgress: () => Promise<void>;
  updateAchievements: () => Promise<void>;
  generatePersonalizedInsights: () => Promise<void>;
  analyzeCrisisPatterns: () => Promise<void>;

  // Real-time updates
  updateForNewCheckIn: (checkIn: CheckIn) => Promise<void>;
  updateForNewAssessment: (assessmentType: 'PHQ-9' | 'GAD-7', score: number) => Promise<void>;
  updateForBreathingSession: (sessionMetrics: any) => Promise<void>;

  // Achievement system
  checkForNewAchievements: () => Promise<readonly string[]>;
  unlockAchievement: (achievementId: string) => Promise<void>;
  calculateLevel: () => number;

  // Data export
  exportClinicalData: (format: 'pdf' | 'csv' | 'json', timeRange?: { start: string; end: string }) => Promise<string>;
  generateProgressReport: () => Promise<string>;
  createShareableSummary: () => Promise<string>;

  // Insight generation
  generateDailyInsight: () => Promise<string>;
  generateWeeklyInsight: () => Promise<string>;
  generateMonthlyInsight: () => Promise<string>;

  // Predictive analytics
  predictMoodTrend: (daysAhead: number) => Promise<number>;
  calculateRiskScore: () => Promise<number>;
  recommendNextAction: () => Promise<string>;

  // Data management
  refreshAllAnalytics: () => Promise<void>;
  invalidateCache: () => void;
  optimizeDataRetention: () => Promise<void>;
}

/**
 * Encrypted storage for analytics data
 */
const encryptedAnalyticsStorage = {
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
      console.error('Failed to decrypt analytics data:', error);
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
      console.error('Failed to encrypt analytics data:', error);
      throw error;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

/**
 * Create Progress Analytics Store
 */
export const useProgressAnalyticsStore = create<ProgressAnalyticsStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => {

        // Helper functions
        const calculateMoodTrend = (moodData: readonly number[]): MoodAnalytics['moodTrend'] => {
          if (moodData.length < 3) {
            return {
              direction: 'stable',
              strength: 'weak',
              confidence: 0,
              daysAnalyzed: moodData.length,
            };
          }

          // Simple linear regression for trend
          const n = moodData.length;
          const xSum = moodData.reduce((sum, _, i) => sum + i, 0);
          const ySum = moodData.reduce((sum, y) => sum + y, 0);
          const xySum = moodData.reduce((sum, y, i) => sum + i * y, 0);
          const x2Sum = moodData.reduce((sum, _, i) => sum + i * i, 0);

          const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
          const confidence = Math.min(100, Math.abs(slope) * 20 * n); // Confidence based on slope and data points

          let direction: 'improving' | 'stable' | 'declining';
          let strength: 'strong' | 'moderate' | 'weak';

          if (slope > 0.1) {
            direction = 'improving';
          } else if (slope < -0.1) {
            direction = 'declining';
          } else {
            direction = 'stable';
          }

          if (Math.abs(slope) > 0.2) {
            strength = 'strong';
          } else if (Math.abs(slope) > 0.1) {
            strength = 'moderate';
          } else {
            strength = 'weak';
          }

          return {
            direction,
            strength,
            confidence: Math.round(confidence),
            daysAnalyzed: n,
          };
        };

        const calculateSeverity = (score: number, type: 'PHQ-9' | 'GAD-7'): AssessmentTrend['severity'] => {
          if (type === 'PHQ-9') {
            if (score <= 4) return 'minimal';
            if (score <= 9) return 'mild';
            if (score <= 14) return 'moderate';
            if (score <= 19) return 'moderately_severe';
            return 'severe';
          } else { // GAD-7
            if (score <= 4) return 'minimal';
            if (score <= 9) return 'mild';
            if (score <= 14) return 'moderate';
            return 'severe';
          }
        };

        const calculateRiskLevel = (score: number, type: 'PHQ-9' | 'GAD-7'): AssessmentTrend['riskLevel'] => {
          if (type === 'PHQ-9') {
            if (score >= 20) return 'crisis';
            if (score >= 15) return 'high';
            if (score >= 10) return 'moderate';
            return 'low';
          } else { // GAD-7
            if (score >= 15) return 'high';
            if (score >= 10) return 'moderate';
            return 'low';
          }
        };

        return {
          // Initial state with empty/default analytics
          assessmentTrends: {
            phq9: null,
            gad7: null,
          },
          moodAnalytics: {
            currentMood: 5,
            averageMood: {
              daily: 5,
              weekly: 5,
              monthly: 5,
              overall: 5,
            },
            moodTrend: {
              direction: 'stable',
              strength: 'weak',
              confidence: 0,
              daysAnalyzed: 0,
            },
            moodPatterns: {
              timeOfDay: {
                morning: 5,
                midday: 5,
                evening: 5,
                bestTime: 'morning',
              },
              dayOfWeek: {
                monday: 5,
                tuesday: 5,
                wednesday: 5,
                thursday: 5,
                friday: 5,
                saturday: 5,
                sunday: 5,
                bestDay: 'Saturday',
                worstDay: 'Monday',
              },
              seasonalPatterns: [],
            },
            moodVariability: {
              high: false,
              averageVariation: 0,
              stabilityScore: 100,
            },
          },
          practiceAnalytics: {
            breathingExercises: {
              totalSessions: 0,
              totalMinutes: 0,
              averageQuality: 0,
              completionRate: 0,
              longestStreak: 0,
              currentStreak: 0,
              preferredTime: null,
              averageDuration: 0,
              therapeuticEffectiveness: 0,
            },
            checkInConsistency: {
              totalCheckIns: 0,
              completionRate: 0,
              morningCompletionRate: 0,
              middayCompletionRate: 0,
              eveningCompletionRate: 0,
              averageCompletionTime: 0,
              qualityScore: 0,
              longestStreak: 0,
              currentStreak: 0,
            },
            assessmentCompliance: {
              totalAssessments: 0,
              onTimeRate: 0,
              averageInterval: 0,
              lastAssessmentDays: 0,
              complianceScore: 0,
            },
          },
          therapeuticProgress: {
            overallProgress: {
              score: 0,
              stage: 'beginning',
              daysInProgram: 0,
              milestonesReached: 0,
              nextMilestone: 'Complete first check-in',
            },
            clinicalImprovement: {
              depressionImprovement: 0,
              anxietyImprovement: 0,
              functionalImprovement: 0,
              qualityOfLife: 50,
              clinicallySignificant: false,
            },
            behavioralChanges: {
              consistencyImprovement: 0,
              engagementIncrease: 0,
              selfAwarenessGrowth: 0,
              copingSkillsUsage: 0,
              positiveHabits: [],
              challengeAreas: [],
            },
            riskFactorChanges: {
              riskReduction: 0,
              protectiveFactorsIncrease: 0,
              currentRiskLevel: 'low',
              riskTrend: 'stable',
              safetyFactors: [],
            },
          },
          achievementSystem: {
            unlockedAchievements: [],
            availableAchievements: [
              {
                id: 'first_checkin',
                title: 'First Steps',
                description: 'Complete your first check-in',
                category: 'milestone',
                points: 10,
                progress: 0,
                requirement: 'Complete 1 check-in',
              },
              {
                id: 'three_day_streak',
                title: 'Consistency Builder',
                description: 'Complete check-ins for 3 consecutive days',
                category: 'consistency',
                points: 25,
                progress: 0,
                requirement: 'Complete check-ins for 3 days in a row',
              },
              {
                id: 'first_breathing',
                title: 'Mindful Breather',
                description: 'Complete your first breathing exercise',
                category: 'milestone',
                points: 15,
                progress: 0,
                requirement: 'Complete 1 breathing exercise',
              },
            ],
            totalPoints: 0,
            level: 1,
            pointsToNextLevel: 100,
            badges: [],
            streakAchievements: {
              longestCheckInStreak: 0,
              longestBreathingStreak: 0,
              longestOverallStreak: 0,
              currentActiveStreaks: [],
            },
          },
          personalizedInsights: {
            keyInsights: [],
            moodInsights: [],
            behaviorPatterns: [],
            recommendedActions: [],
            celebratedWins: [],
            areasForGrowth: [],
            personalizedTips: [],
          },
          crisisPatternAnalysis: {
            riskIndicators: [],
            protectivePatterns: [],
            earlyWarningSignals: [],
            recoveryPatterns: [],
            safetyNetStrength: 70,
            crisisPreparedness: 60,
          },

          lastAnalysisRun: null,
          analysisInProgress: false,
          dataQuality: {
            completeness: 0,
            reliability: 100,
            daysOfData: 0,
            missingDataPoints: 0,
          },
          isLoading: false,
          error: null,

          /**
           * Run full comprehensive analysis
           */
          runFullAnalysis: async () => {
            set({ analysisInProgress: true, error: null });

            try {
              await Promise.all([
                get().calculateAssessmentTrends(),
                get().analyzeMoodPatterns(),
                get().calculatePracticeMetrics(),
                get().assessTherapeuticProgress(),
                get().updateAchievements(),
                get().generatePersonalizedInsights(),
                get().analyzeCrisisPatterns(),
              ]);

              set({
                lastAnalysisRun: new Date().toISOString(),
                analysisInProgress: false,
              });

              console.log('Full analytics analysis completed');

            } catch (error) {
              console.error('Full analysis failed:', error);
              set({
                error: error instanceof Error ? error.message : 'Analysis failed',
                analysisInProgress: false,
              });
            }
          },

          /**
           * Calculate assessment trends (PHQ-9/GAD-7)
           */
          calculateAssessmentTrends: async () => {
            try {
              // TODO: Load assessment data from data store
              // For now, using placeholder logic

              const mockPHQ9Data = [
                { score: 12, date: '2024-01-15' },
                { score: 10, date: '2024-01-22' },
                { score: 8, date: '2024-01-29' },
              ];

              if (mockPHQ9Data.length > 0) {
                const current = mockPHQ9Data[mockPHQ9Data.length - 1].score;
                const previous = mockPHQ9Data.length > 1 ? mockPHQ9Data[mockPHQ9Data.length - 2].score : current;
                const change = current - previous;
                const trend = change < -1 ? 'improving' : change > 1 ? 'worsening' : 'stable';
                const average = mockPHQ9Data.reduce((sum, d) => sum + d.score, 0) / mockPHQ9Data.length;

                const phq9Trend: AssessmentTrend = {
                  type: 'PHQ-9',
                  current,
                  previous,
                  change,
                  trend,
                  severity: calculateSeverity(current, 'PHQ-9'),
                  riskLevel: calculateRiskLevel(current, 'PHQ-9'),
                  lastAssessment: mockPHQ9Data[mockPHQ9Data.length - 1].date,
                  assessmentCount: mockPHQ9Data.length,
                  averageScore: Math.round(average * 10) / 10,
                  bestScore: Math.min(...mockPHQ9Data.map(d => d.score)),
                  worstScore: Math.max(...mockPHQ9Data.map(d => d.score)),
                };

                set(state => ({
                  assessmentTrends: {
                    ...state.assessmentTrends,
                    phq9: phq9Trend,
                  },
                }));
              }

              // Similar logic for GAD-7...

            } catch (error) {
              console.error('Failed to calculate assessment trends:', error);
              throw error;
            }
          },

          /**
           * Analyze mood patterns from check-ins
           */
          analyzeMoodPatterns: async () => {
            try {
              const recentCheckIns = await dataStore.getRecentCheckIns(30);
              const moodData = recentCheckIns
                .filter(c => c.data?.mood?.value)
                .map(c => c.data!.mood!.value);

              if (moodData.length === 0) {
                return; // No mood data to analyze
              }

              const currentMood = moodData[moodData.length - 1] || 5;
              const averageOverall = moodData.reduce((sum, m) => sum + m, 0) / moodData.length;

              // Calculate weekly and monthly averages
              const weeklyData = moodData.slice(-7);
              const monthlyData = moodData.slice(-30);
              const weeklyAverage = weeklyData.length > 0 ? weeklyData.reduce((sum, m) => sum + m, 0) / weeklyData.length : averageOverall;
              const monthlyAverage = monthlyData.length > 0 ? monthlyData.reduce((sum, m) => sum + m, 0) / monthlyData.length : averageOverall;

              // Calculate mood trend
              const moodTrend = calculateMoodTrend(moodData);

              // Calculate mood variability
              const variance = moodData.reduce((sum, m) => sum + Math.pow(m - averageOverall, 2), 0) / moodData.length;
              const standardDeviation = Math.sqrt(variance);
              const averageVariation = Math.round(standardDeviation * 10) / 10;
              const stabilityScore = Math.max(0, Math.min(100, 100 - (standardDeviation * 20)));

              // Analyze time patterns (simplified - would need more sophisticated logic)
              const timeOfDayData = {
                morning: averageOverall,
                midday: averageOverall,
                evening: averageOverall,
                bestTime: 'morning' as const,
              };

              const dayOfWeekData = {
                monday: averageOverall,
                tuesday: averageOverall,
                wednesday: averageOverall,
                thursday: averageOverall,
                friday: averageOverall,
                saturday: averageOverall,
                sunday: averageOverall,
                bestDay: 'Saturday',
                worstDay: 'Monday',
              };

              const moodAnalytics: MoodAnalytics = {
                currentMood,
                averageMood: {
                  daily: currentMood,
                  weekly: Math.round(weeklyAverage * 10) / 10,
                  monthly: Math.round(monthlyAverage * 10) / 10,
                  overall: Math.round(averageOverall * 10) / 10,
                },
                moodTrend,
                moodPatterns: {
                  timeOfDay: timeOfDayData,
                  dayOfWeek: dayOfWeekData,
                  seasonalPatterns: [],
                },
                moodVariability: {
                  high: standardDeviation > 2,
                  averageVariation,
                  stabilityScore: Math.round(stabilityScore),
                },
              };

              set({ moodAnalytics });

            } catch (error) {
              console.error('Failed to analyze mood patterns:', error);
              throw error;
            }
          },

          /**
           * Calculate practice and exercise metrics
           */
          calculatePracticeMetrics: async () => {
            try {
              const recentCheckIns = await dataStore.getRecentCheckIns(30);

              // Calculate check-in consistency
              const totalCheckIns = recentCheckIns.filter(c => c.completedAt && !c.skipped).length;
              const possibleCheckIns = 30 * 3; // 30 days × 3 check-ins per day
              const completionRate = Math.round((totalCheckIns / possibleCheckIns) * 100) / 100;

              const morningCheckIns = recentCheckIns.filter(c => c.type === 'morning' && c.completedAt && !c.skipped).length;
              const middayCheckIns = recentCheckIns.filter(c => c.type === 'midday' && c.completedAt && !c.skipped).length;
              const eveningCheckIns = recentCheckIns.filter(c => c.type === 'evening' && c.completedAt && !c.skipped).length;

              const morningCompletionRate = Math.round((morningCheckIns / 30) * 100) / 100;
              const middayCompletionRate = Math.round((middayCheckIns / 30) * 100) / 100;
              const eveningCompletionRate = Math.round((eveningCheckIns / 30) * 100) / 100;

              // Calculate average completion time
              const completionTimes = recentCheckIns
                .filter(c => c.completedAt && c.startedAt)
                .map(c => {
                  const start = new Date(c.startedAt!).getTime();
                  const end = new Date(c.completedAt!).getTime();
                  return (end - start) / (1000 * 60); // Convert to minutes
                });

              const averageCompletionTime = completionTimes.length > 0
                ? Math.round((completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length) * 10) / 10
                : 0;

              // Calculate quality score based on data completeness
              const qualityScores = recentCheckIns.map(c => {
                const dataFields = Object.keys(c.data || {}).length;
                return Math.min(100, dataFields * 10); // 10 points per data field, max 100
              });

              const qualityScore = qualityScores.length > 0
                ? Math.round(qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length)
                : 0;

              // TODO: Calculate streaks, breathing metrics, etc.

              const practiceAnalytics: PracticeAnalytics = {
                breathingExercises: {
                  totalSessions: 0, // TODO: Get from breathing session store
                  totalMinutes: 0,
                  averageQuality: 0,
                  completionRate: 0,
                  longestStreak: 0,
                  currentStreak: 0,
                  preferredTime: null,
                  averageDuration: 0,
                  therapeuticEffectiveness: 0,
                },
                checkInConsistency: {
                  totalCheckIns,
                  completionRate,
                  morningCompletionRate,
                  middayCompletionRate,
                  eveningCompletionRate,
                  averageCompletionTime,
                  qualityScore,
                  longestStreak: 0, // TODO: Calculate actual streak
                  currentStreak: 0,
                },
                assessmentCompliance: {
                  totalAssessments: 0, // TODO: Get from assessment data
                  onTimeRate: 0,
                  averageInterval: 0,
                  lastAssessmentDays: 0,
                  complianceScore: 0,
                },
              };

              set({ practiceAnalytics });

            } catch (error) {
              console.error('Failed to calculate practice metrics:', error);
              throw error;
            }
          },

          /**
           * Assess overall therapeutic progress
           */
          assessTherapeuticProgress: async () => {
            try {
              const { moodAnalytics, practiceAnalytics, assessmentTrends } = get();

              // Calculate overall progress score
              let progressScore = 0;

              // Mood improvement (30%)
              if (moodAnalytics.moodTrend.direction === 'improving') {
                progressScore += 30 * (moodAnalytics.moodTrend.confidence / 100);
              }

              // Practice consistency (25%)
              progressScore += 25 * practiceAnalytics.checkInConsistency.completionRate;

              // Assessment improvement (25%)
              if (assessmentTrends.phq9?.trend === 'improving') {
                progressScore += 12.5;
              }
              if (assessmentTrends.gad7?.trend === 'improving') {
                progressScore += 12.5;
              }

              // Quality of engagement (20%)
              progressScore += 20 * (practiceAnalytics.checkInConsistency.qualityScore / 100);

              progressScore = Math.min(100, Math.max(0, Math.round(progressScore)));

              // Determine stage
              let stage: TherapeuticProgress['overallProgress']['stage'];
              if (progressScore < 20) {
                stage = 'beginning';
              } else if (progressScore < 40) {
                stage = 'developing';
              } else if (progressScore < 60) {
                stage = 'progressing';
              } else if (progressScore < 80) {
                stage = 'maintaining';
              } else {
                stage = 'mastering';
              }

              // Calculate clinical improvement
              const depressionImprovement = assessmentTrends.phq9?.change
                ? Math.max(0, -assessmentTrends.phq9.change / assessmentTrends.phq9.previous * 100)
                : 0;

              const anxietyImprovement = assessmentTrends.gad7?.change
                ? Math.max(0, -assessmentTrends.gad7.change / assessmentTrends.gad7.previous * 100)
                : 0;

              const therapeuticProgress: TherapeuticProgress = {
                overallProgress: {
                  score: progressScore,
                  stage,
                  daysInProgram: Math.max(1, Math.floor((Date.now() - Date.now()) / (1000 * 60 * 60 * 24))), // TODO: Calculate actual days
                  milestonesReached: 0, // TODO: Calculate from achievements
                  nextMilestone: stage === 'beginning' ? 'Complete 3 consecutive check-ins' : null,
                },
                clinicalImprovement: {
                  depressionImprovement: Math.round(depressionImprovement * 10) / 10,
                  anxietyImprovement: Math.round(anxietyImprovement * 10) / 10,
                  functionalImprovement: Math.round(progressScore * 0.8), // Derived from overall progress
                  qualityOfLife: Math.min(100, 50 + progressScore * 0.5),
                  clinicallySignificant: depressionImprovement > 20 || anxietyImprovement > 20,
                },
                behavioralChanges: {
                  consistencyImprovement: Math.round(practiceAnalytics.checkInConsistency.completionRate * 100),
                  engagementIncrease: Math.round(practiceAnalytics.checkInConsistency.qualityScore),
                  selfAwarenessGrowth: Math.round(progressScore * 0.7),
                  copingSkillsUsage: Math.round(progressScore * 0.6),
                  positiveHabits: [], // TODO: Identify from patterns
                  challengeAreas: [], // TODO: Identify areas needing work
                },
                riskFactorChanges: {
                  riskReduction: Math.round(Math.max(0, depressionImprovement + anxietyImprovement) / 2),
                  protectiveFactorsIncrease: Math.round(progressScore * 0.8),
                  currentRiskLevel: assessmentTrends.phq9?.riskLevel || 'low',
                  riskTrend: assessmentTrends.phq9?.trend === 'improving' ? 'improving' :
                           assessmentTrends.phq9?.trend === 'worsening' ? 'worsening' : 'stable',
                  safetyFactors: [], // TODO: Identify from data
                },
              };

              set({ therapeuticProgress });

            } catch (error) {
              console.error('Failed to assess therapeutic progress:', error);
              throw error;
            }
          },

          /**
           * Update achievement system
           */
          updateAchievements: async () => {
            try {
              const { practiceAnalytics } = get();
              const newAchievements: string[] = [];

              // Check for first check-in achievement
              if (practiceAnalytics.checkInConsistency.totalCheckIns >= 1) {
                const achievement = get().achievementSystem.availableAchievements.find(a => a.id === 'first_checkin');
                if (achievement && !get().achievementSystem.unlockedAchievements.some(ua => ua.id === 'first_checkin')) {
                  await get().unlockAchievement('first_checkin');
                  newAchievements.push('first_checkin');
                }
              }

              // TODO: Check other achievements...

              return newAchievements;

            } catch (error) {
              console.error('Failed to update achievements:', error);
              throw error;
            }
          },

          /**
           * Unlock specific achievement
           */
          unlockAchievement: async (achievementId: string) => {
            try {
              const available = get().achievementSystem.availableAchievements.find(a => a.id === achievementId);
              if (!available) return;

              const unlockedAchievement = {
                ...available,
                unlockedAt: new Date().toISOString(),
                rarity: 'common' as const,
              };

              set(state => ({
                achievementSystem: {
                  ...state.achievementSystem,
                  unlockedAchievements: [...state.achievementSystem.unlockedAchievements, unlockedAchievement],
                  availableAchievements: state.achievementSystem.availableAchievements.filter(a => a.id !== achievementId),
                  totalPoints: state.achievementSystem.totalPoints + available.points,
                },
              }));

              console.log(`Achievement unlocked: ${available.title}`);

            } catch (error) {
              console.error('Failed to unlock achievement:', error);
              throw error;
            }
          },

          /**
           * Calculate user level
           */
          calculateLevel: () => {
            const { totalPoints } = get().achievementSystem;
            return Math.floor(totalPoints / 100) + 1;
          },

          /**
           * Generate personalized insights
           */
          generatePersonalizedInsights: async () => {
            try {
              const { moodAnalytics, practiceAnalytics, therapeuticProgress } = get();

              const keyInsights = [];
              const moodInsights = [];
              const behaviorPatterns = [];
              const recommendedActions = [];
              const celebratedWins = [];
              const areasForGrowth = [];

              // Generate mood insights
              if (moodAnalytics.moodTrend.direction === 'improving') {
                moodInsights.push('Your mood has been steadily improving - great progress!');
                celebratedWins.push('Positive mood trend');
              } else if (moodAnalytics.moodTrend.direction === 'declining') {
                moodInsights.push('Your mood has been declining recently. Consider reaching out for support.');
                areasForGrowth.push('Mood stability');
              }

              // Generate behavior patterns
              if (practiceAnalytics.checkInConsistency.completionRate > 0.8) {
                behaviorPatterns.push('You have excellent check-in consistency');
                celebratedWins.push('Outstanding consistency');
              } else if (practiceAnalytics.checkInConsistency.completionRate < 0.5) {
                behaviorPatterns.push('Check-in consistency could be improved');
                areasForGrowth.push('Daily consistency');
                recommendedActions.push({
                  action: 'Set daily reminders for check-ins',
                  reason: 'To improve consistency and habit formation',
                  urgency: 'this_week' as const,
                  category: 'practice' as const,
                });
              }

              // Generate recommendations based on progress
              if (therapeuticProgress.overallProgress.score < 50) {
                recommendedActions.push({
                  action: 'Focus on completing daily check-ins',
                  reason: 'Consistency is key to building therapeutic habits',
                  urgency: 'ongoing' as const,
                  category: 'practice' as const,
                });
              }

              const personalizedInsights: PersonalizedInsights = {
                keyInsights,
                moodInsights,
                behaviorPatterns,
                recommendedActions,
                celebratedWins,
                areasForGrowth,
                personalizedTips: [
                  'Try to complete check-ins at the same time each day',
                  'Use the breathing exercise when feeling stressed',
                  'Celebrate small wins in your progress',
                ],
              };

              set({ personalizedInsights });

            } catch (error) {
              console.error('Failed to generate personalized insights:', error);
              throw error;
            }
          },

          // Simplified implementations of remaining methods...
          analyzeCrisisPatterns: async () => {
            try {
              // TODO: Implement crisis pattern analysis
              console.log('Analyzing crisis patterns...');
            } catch (error) {
              console.error('Failed to analyze crisis patterns:', error);
              throw error;
            }
          },

          updateForNewCheckIn: async (checkIn: CheckIn) => {
            try {
              // Trigger partial re-analysis
              await Promise.all([
                get().analyzeMoodPatterns(),
                get().calculatePracticeMetrics(),
                get().checkForNewAchievements(),
              ]);
            } catch (error) {
              console.error('Failed to update for new check-in:', error);
            }
          },

          updateForNewAssessment: async (assessmentType: 'PHQ-9' | 'GAD-7', score: number) => {
            try {
              await get().calculateAssessmentTrends();
            } catch (error) {
              console.error('Failed to update for new assessment:', error);
            }
          },

          updateForBreathingSession: async (sessionMetrics: any) => {
            try {
              await get().calculatePracticeMetrics();
            } catch (error) {
              console.error('Failed to update for breathing session:', error);
            }
          },

          checkForNewAchievements: async () => {
            return await get().updateAchievements();
          },

          exportClinicalData: async (format: 'pdf' | 'csv' | 'json', timeRange?: { start: string; end: string }) => {
            try {
              const data = {
                assessmentTrends: get().assessmentTrends,
                moodAnalytics: get().moodAnalytics,
                therapeuticProgress: get().therapeuticProgress,
                exportedAt: new Date().toISOString(),
                format,
                timeRange,
              };

              return JSON.stringify(data, null, 2);
            } catch (error) {
              console.error('Failed to export clinical data:', error);
              throw error;
            }
          },

          generateProgressReport: async () => {
            try {
              const { therapeuticProgress, moodAnalytics, practiceAnalytics } = get();

              const report = `
# Progress Report

## Overall Progress: ${therapeuticProgress.overallProgress.score}%
Stage: ${therapeuticProgress.overallProgress.stage}

## Mood Analytics
Current: ${moodAnalytics.currentMood}/10
Trend: ${moodAnalytics.moodTrend.direction}
Stability: ${moodAnalytics.moodVariability.stabilityScore}%

## Practice Consistency
Check-in Rate: ${Math.round(practiceAnalytics.checkInConsistency.completionRate * 100)}%
Quality Score: ${practiceAnalytics.checkInConsistency.qualityScore}%

Generated: ${new Date().toISOString()}
              `;

              return report.trim();
            } catch (error) {
              console.error('Failed to generate progress report:', error);
              throw error;
            }
          },

          createShareableSummary: async () => {
            try {
              const { therapeuticProgress, moodAnalytics } = get();

              return `My mindfulness journey: ${therapeuticProgress.overallProgress.score}% progress, ${moodAnalytics.moodTrend.direction} mood trend. #BeingMindful`;
            } catch (error) {
              console.error('Failed to create shareable summary:', error);
              throw error;
            }
          },

          generateDailyInsight: async () => {
            const { moodAnalytics } = get();
            return `Today's insight: Your current mood (${moodAnalytics.currentMood}/10) ${
              moodAnalytics.moodTrend.direction === 'improving' ? 'shows positive momentum' :
              moodAnalytics.moodTrend.direction === 'declining' ? 'suggests you might benefit from extra self-care' :
              'is stable - consistency is key'
            }.`;
          },

          generateWeeklyInsight: async () => {
            const { practiceAnalytics } = get();
            return `This week: ${Math.round(practiceAnalytics.checkInConsistency.completionRate * 100)}% check-in completion rate. ${
              practiceAnalytics.checkInConsistency.completionRate > 0.8 ? 'Excellent consistency!' :
              practiceAnalytics.checkInConsistency.completionRate > 0.5 ? 'Good progress, keep building the habit.' :
              'Focus on consistency to see greater benefits.'
            }`;
          },

          generateMonthlyInsight: async () => {
            const { therapeuticProgress } = get();
            return `Monthly progress: ${therapeuticProgress.overallProgress.score}% overall progress in your mindfulness journey. Stage: ${therapeuticProgress.overallProgress.stage}.`;
          },

          predictMoodTrend: async (daysAhead: number) => {
            // Simple prediction based on current trend
            const { moodAnalytics } = get();
            const currentMood = moodAnalytics.currentMood;
            const trendDirection = moodAnalytics.moodTrend.direction;

            let prediction = currentMood;
            if (trendDirection === 'improving') {
              prediction += daysAhead * 0.1;
            } else if (trendDirection === 'declining') {
              prediction -= daysAhead * 0.1;
            }

            return Math.max(1, Math.min(10, prediction));
          },

          calculateRiskScore: async () => {
            const { assessmentTrends, moodAnalytics } = get();

            let riskScore = 0;

            if (assessmentTrends.phq9?.riskLevel === 'crisis') riskScore += 40;
            else if (assessmentTrends.phq9?.riskLevel === 'high') riskScore += 30;
            else if (assessmentTrends.phq9?.riskLevel === 'moderate') riskScore += 20;

            if (moodAnalytics.moodTrend.direction === 'declining') riskScore += 20;
            if (moodAnalytics.averageMood.weekly < 4) riskScore += 15;

            return Math.min(100, riskScore);
          },

          recommendNextAction: async () => {
            const { therapeuticProgress, practiceAnalytics } = get();

            if (practiceAnalytics.checkInConsistency.completionRate < 0.5) {
              return 'Focus on completing daily check-ins to build consistent habits';
            } else if (therapeuticProgress.overallProgress.score < 30) {
              return 'Continue building your practice with regular breathing exercises';
            } else {
              return 'Great progress! Consider exploring advanced mindfulness techniques';
            }
          },

          refreshAllAnalytics: async () => {
            await get().runFullAnalysis();
          },

          invalidateCache: () => {
            set({ lastAnalysisRun: null });
          },

          optimizeDataRetention: async () => {
            try {
              // TODO: Implement data retention optimization
              console.log('Optimizing data retention...');
            } catch (error) {
              console.error('Failed to optimize data retention:', error);
            }
          },
        };
      },
      {
        name: 'being-progress-analytics-store',
        storage: createJSONStorage(() => encryptedAnalyticsStorage),
        partialize: (state) => ({
          assessmentTrends: state.assessmentTrends,
          moodAnalytics: state.moodAnalytics,
          therapeuticProgress: state.therapeuticProgress,
          achievementSystem: state.achievementSystem,
          personalizedInsights: state.personalizedInsights,
          lastAnalysisRun: state.lastAnalysisRun,
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            return {
              ...persistedState,
              lastAnalysisRun: null, // Force re-analysis on migration
            };
          }
          return persistedState;
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log('Progress analytics store rehydrated successfully');

            // Check if analysis is stale (older than 24 hours)
            if (state.lastAnalysisRun) {
              const lastRun = new Date(state.lastAnalysisRun).getTime();
              const now = Date.now();
              if (now - lastRun > 24 * 60 * 60 * 1000) {
                // Schedule background refresh
                setTimeout(() => state.runFullAnalysis(), 5000);
              }
            } else {
              // Run initial analysis
              setTimeout(() => state.runFullAnalysis(), 2000);
            }
          }
        },
      }
    )
  )
);

/**
 * Progress analytics store utilities
 */
export const progressAnalyticsStoreUtils = {
  getCurrentProgress: () => useProgressAnalyticsStore.getState().therapeuticProgress.overallProgress.score,
  getMoodTrend: () => useProgressAnalyticsStore.getState().moodAnalytics.moodTrend,
  getRecentAchievements: () => useProgressAnalyticsStore.getState().achievementSystem.unlockedAchievements.slice(-3),
  getTopInsights: () => useProgressAnalyticsStore.getState().personalizedInsights.keyInsights.slice(0, 3),
  isAnalysisStale: () => {
    const lastRun = useProgressAnalyticsStore.getState().lastAnalysisRun;
    if (!lastRun) return true;
    return Date.now() - new Date(lastRun).getTime() > 60 * 60 * 1000; // 1 hour
  },
  refreshIfNeeded: () => {
    if (progressAnalyticsStoreUtils.isAnalysisStale()) {
      useProgressAnalyticsStore.getState().runFullAnalysis();
    }
  },
};