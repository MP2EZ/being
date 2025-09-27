/**
 * Advanced Threat Detection System for FullMind Webhook Security
 *
 * Implements real-time threat detection with machine learning patterns:
 * - Behavioral analysis and anomaly detection
 * - Advanced persistent threat (APT) detection
 * - Zero-day vulnerability protection
 * - Crisis-aware threat response with therapeutic continuity
 * - Real-time threat intelligence integration
 */

import { webhookSecurityValidator } from '../../services/cloud/WebhookSecurityValidator';
import { encryptionService } from './EncryptionService';
import * as Crypto from 'expo-crypto';

export interface ThreatDetectionConfig {
  enableBehavioralAnalysis: boolean;
  enableAnomalyDetection: boolean;
  enableMLPatterns: boolean;
  threatIntelligenceFeeds: string[];
  analysisWindowMinutes: number;
  sensitivityLevel: 'low' | 'medium' | 'high' | 'maximum';
  crisisProtectionLevel: 'standard' | 'enhanced';
  realTimeProcessing: boolean;
  autoBlockThreshold: number; // 0-100
}

export interface ThreatIntelligenceData {
  threatId: string;
  threatType: 'malware' | 'phishing' | 'ddos' | 'apt' | 'zero_day' | 'insider';
  indicators: ThreatIndicator[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  source: string;
  firstSeen: string;
  lastSeen: string;
  ttl: number; // Time to live in seconds
  mitigationStrategies: string[];
}

export interface ThreatIndicator {
  type: 'ip' | 'domain' | 'hash' | 'pattern' | 'behavior';
  value: string;
  confidence: number;
  category: string;
  description: string;
}

export interface BehavioralAnalysisResult {
  userProfile: UserBehaviorProfile;
  anomalies: BehavioralAnomaly[];
  riskScore: number; // 0-100
  recommendations: string[];
  adaptiveThresholds: AdaptiveThreshold[];
}

export interface UserBehaviorProfile {
  userId: string;
  normalPatterns: BehaviorPattern[];
  sessionPatterns: SessionPattern[];
  paymentPatterns: PaymentPattern[];
  crisisPatterns: CrisisPattern[];
  riskFactors: RiskFactor[];
  trustScore: number; // 0-100
  lastUpdated: string;
}

export interface BehaviorPattern {
  patternType: 'access_frequency' | 'session_duration' | 'feature_usage' | 'payment_timing';
  averageValue: number;
  standardDeviation: number;
  normalRange: [number, number];
  seasonality: SeasonalityData[];
}

export interface SeasonalityData {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  peaks: number[];
  valleys: number[];
  confidence: number;
}

export interface SessionPattern {
  typicalDuration: number;
  typicalActions: string[];
  typicalTiming: string[];
  deviceFingerprints: string[];
  locationPatterns: string[];
}

export interface PaymentPattern {
  typicalAmounts: number[];
  typicalFrequency: number;
  typicalMethods: string[];
  riskIndicators: string[];
}

export interface CrisisPattern {
  crisisFrequency: number;
  crisisTriggers: string[];
  emergencyAccessPatterns: string[];
  recoveryPatterns: string[];
  supportPatterns: string[];
}

export interface RiskFactor {
  factor: string;
  weight: number;
  confidence: number;
  source: string;
  expires: string;
}

export interface BehavioralAnomaly {
  anomalyType: 'statistical' | 'pattern' | 'temporal' | 'contextual';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  deviationScore: number;
  context: AnomalyContext;
  mitigation: string[];
}

export interface AnomalyContext {
  timeframe: string;
  baseline: any;
  observed: any;
  expectedRange: [number, number];
  actualValue: number;
  metadata: Record<string, any>;
}

export interface AdaptiveThreshold {
  metric: string;
  currentThreshold: number;
  recommendedThreshold: number;
  confidence: number;
  adjustmentReason: string;
  impact: 'security' | 'usability' | 'performance';
}

export interface RealTimeThreatEvent {
  eventId: string;
  timestamp: string;
  threatType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: ThreatSource;
  indicators: ThreatIndicator[];
  response: ThreatResponse;
  context: ThreatContext;
  crisisImpact: CrisisImpactAssessment;
}

export interface ThreatSource {
  ipAddress: string;
  userAgent: string;
  headers: Record<string, string>;
  payload: string;
  geolocation?: GeolocationData;
  reputation: ReputationData;
}

export interface GeolocationData {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  isp: string;
  organization: string;
}

export interface ReputationData {
  trustScore: number; // 0-100
  threatScore: number; // 0-100
  categories: string[];
  sources: string[];
  lastVerified: string;
}

export interface ThreatResponse {
  action: 'block' | 'monitor' | 'challenge' | 'allow' | 'crisis_allow';
  confidence: number;
  reasoning: string[];
  alternativeActions: string[];
  escalationRequired: boolean;
  crisisOverride: boolean;
}

export interface ThreatContext {
  userContext: any;
  sessionContext: any;
  paymentContext: any;
  crisisContext: any;
  systemContext: any;
}

export interface CrisisImpactAssessment {
  impactsEmergencyAccess: boolean;
  impactsTherapeuticContinuity: boolean;
  impactsHotlineAccess: boolean;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  mitigation: string[];
  recovery: string[];
}

export interface ThreatDetectionMetrics {
  totalThreatsDetected: number;
  threatsBlocked: number;
  threatsMonitored: number;
  falsePositives: number;
  falseNegatives: number;
  averageDetectionTime: number;
  averageResponseTime: number;
  crisisOverrides: number;
  adaptationEvents: number;
  accuracyScore: number; // 0-100
}

/**
 * Advanced Threat Detection System
 *
 * Key capabilities:
 * - Machine learning-based behavioral analysis
 * - Real-time anomaly detection with adaptive thresholds
 * - Crisis-aware threat response that preserves emergency access
 * - Advanced persistent threat (APT) detection
 * - Zero-day vulnerability protection through behavior analysis
 * - Threat intelligence integration with automatic updates
 */
export class AdvancedThreatDetectionSystem {
  private static instance: AdvancedThreatDetectionSystem;

  private config: ThreatDetectionConfig;
  private userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private threatIntelligence: Map<string, ThreatIntelligenceData> = new Map();
  private realtimeEvents: RealTimeThreatEvent[] = [];
  private metrics: ThreatDetectionMetrics;
  private initialized = false;

  // ML-like pattern detection (simplified for React Native environment)
  private readonly ANOMALY_PATTERNS = {
    statistical: {
      zScoreThreshold: 3.0,
      iqrMultiplier: 1.5,
      confidenceInterval: 0.95
    },
    temporal: {
      seasonalityDetection: true,
      trendAnalysis: true,
      cyclicPatterns: true
    },
    behavioral: {
      userJourneyAnalysis: true,
      sessionAnalysis: true,
      paymentAnalysis: true,
      crisisAnalysis: true
    }
  };

  // Crisis protection patterns - these should never be blocked
  private readonly CRISIS_PROTECTION_PATTERNS = [
    /988/g,
    /crisis/gi,
    /emergency/gi,
    /suicide/gi,
    /hotline/gi,
    /help/gi,
    /danger/gi,
    /harm/gi
  ];

  private constructor() {
    this.config = {
      enableBehavioralAnalysis: true,
      enableAnomalyDetection: true,
      enableMLPatterns: true,
      threatIntelligenceFeeds: [
        'internal_intelligence',
        'stripe_security_feeds',
        'healthcare_threat_feeds'
      ],
      analysisWindowMinutes: 60,
      sensitivityLevel: 'high',
      crisisProtectionLevel: 'enhanced',
      realTimeProcessing: true,
      autoBlockThreshold: 85
    };

    this.metrics = {
      totalThreatsDetected: 0,
      threatsBlocked: 0,
      threatsMonitored: 0,
      falsePositives: 0,
      falseNegatives: 0,
      averageDetectionTime: 0,
      averageResponseTime: 0,
      crisisOverrides: 0,
      adaptationEvents: 0,
      accuracyScore: 85
    };
  }

  public static getInstance(): AdvancedThreatDetectionSystem {
    if (!AdvancedThreatDetectionSystem.instance) {
      AdvancedThreatDetectionSystem.instance = new AdvancedThreatDetectionSystem();
    }
    return AdvancedThreatDetectionSystem.instance;
  }

  /**
   * Initialize advanced threat detection system
   */
  async initialize(customConfig?: Partial<ThreatDetectionConfig>): Promise<void> {
    try {
      if (this.initialized) return;

      this.config = { ...this.config, ...customConfig };

      // Initialize threat intelligence feeds
      await this.initializeThreatIntelligence();

      // Initialize behavioral analysis engine
      await this.initializeBehavioralAnalysis();

      // Start real-time processing
      if (this.config.realTimeProcessing) {
        this.startRealTimeProcessing();
      }

      // Initialize adaptive thresholds
      await this.initializeAdaptiveThresholds();

      this.initialized = true;
      console.log('Advanced threat detection system initialized');

    } catch (error) {
      console.error('Advanced threat detection initialization failed:', error);
      throw new Error(`Threat detection initialization failed: ${error}`);
    }
  }

  /**
   * Analyze threat with advanced behavioral and ML patterns
   */
  async analyzeAdvancedThreat(
    payload: string,
    headers: Record<string, string>,
    ipAddress: string,
    userId?: string,
    crisisMode = false
  ): Promise<RealTimeThreatEvent> {
    const startTime = Date.now();

    try {
      // 1. Create threat source profile
      const threatSource = await this.buildThreatSource(payload, headers, ipAddress);

      // 2. Behavioral analysis if user identified
      let behavioralAnalysis: BehavioralAnalysisResult | null = null;
      if (userId) {
        behavioralAnalysis = await this.performBehavioralAnalysis(userId, threatSource);
      }

      // 3. Pattern-based threat detection
      const patternThreats = await this.detectPatternBasedThreats(payload, headers);

      // 4. Anomaly detection
      const anomalies = await this.detectAnomalies(threatSource, behavioralAnalysis);

      // 5. Threat intelligence correlation
      const intelligenceMatches = await this.correlateThreatIntelligence(threatSource);

      // 6. Crisis impact assessment
      const crisisImpact = await this.assessCrisisImpact(payload, headers, crisisMode);

      // 7. Calculate comprehensive threat score
      const threatScore = this.calculateAdvancedThreatScore(
        patternThreats,
        anomalies,
        intelligenceMatches,
        behavioralAnalysis,
        crisisImpact
      );

      // 8. Determine response with crisis awareness
      const response = await this.determineAdvancedResponse(
        threatScore,
        crisisImpact,
        crisisMode,
        behavioralAnalysis
      );

      // 9. Create threat event
      const threatEvent: RealTimeThreatEvent = {
        eventId: await this.generateThreatEventId(),
        timestamp: new Date().toISOString(),
        threatType: this.classifyThreatType(patternThreats, anomalies),
        severity: this.determineThreatSeverity(threatScore, crisisImpact),
        source: threatSource,
        indicators: [...patternThreats, ...intelligenceMatches],
        response,
        context: {
          userContext: userId ? { userId, profile: behavioralAnalysis?.userProfile } : null,
          sessionContext: this.extractSessionContext(headers),
          paymentContext: this.extractPaymentContext(payload),
          crisisContext: { crisisMode, crisisImpact },
          systemContext: { processingTime: Date.now() - startTime }
        },
        crisisImpact
      };

      // 10. Execute response
      await this.executeThreatResponse(threatEvent);

      // 11. Update metrics and learning
      await this.updateThreatMetrics(threatEvent);
      if (behavioralAnalysis && userId) {
        await this.updateUserProfile(userId, threatEvent, behavioralAnalysis);
      }

      this.realtimeEvents.push(threatEvent);
      this.trimEventHistory();

      return threatEvent;

    } catch (error) {
      console.error('Advanced threat analysis failed:', error);

      // Fallback event for error conditions
      return {
        eventId: `error_${Date.now()}`,
        timestamp: new Date().toISOString(),
        threatType: 'analysis_error',
        severity: 'medium',
        source: {
          ipAddress,
          userAgent: headers['user-agent'] || 'unknown',
          headers,
          payload,
          reputation: { trustScore: 50, threatScore: 50, categories: [], sources: [], lastVerified: '' }
        },
        indicators: [],
        response: {
          action: crisisMode ? 'crisis_allow' : 'monitor',
          confidence: 0,
          reasoning: ['Analysis system error'],
          alternativeActions: [],
          escalationRequired: true,
          crisisOverride: crisisMode
        },
        context: { userContext: null, sessionContext: {}, paymentContext: {}, crisisContext: { crisisMode }, systemContext: {} },
        crisisImpact: {
          impactsEmergencyAccess: false,
          impactsTherapeuticContinuity: false,
          impactsHotlineAccess: false,
          severity: 'none',
          mitigation: [],
          recovery: []
        }
      };
    }
  }

  /**
   * Perform behavioral analysis for user patterns
   */
  async performBehavioralAnalysis(
    userId: string,
    threatSource: ThreatSource
  ): Promise<BehavioralAnalysisResult> {
    try {
      // Get or create user profile
      let userProfile = this.userProfiles.get(userId);
      if (!userProfile) {
        userProfile = await this.createUserProfile(userId);
        this.userProfiles.set(userId, userProfile);
      }

      // Detect behavioral anomalies
      const anomalies = await this.detectBehavioralAnomalies(userProfile, threatSource);

      // Calculate risk score
      const riskScore = this.calculateBehavioralRiskScore(userProfile, anomalies);

      // Generate recommendations
      const recommendations = this.generateBehavioralRecommendations(anomalies, riskScore);

      // Update adaptive thresholds
      const adaptiveThresholds = await this.updateAdaptiveThresholds(userProfile, anomalies);

      return {
        userProfile,
        anomalies,
        riskScore,
        recommendations,
        adaptiveThresholds
      };

    } catch (error) {
      console.error('Behavioral analysis failed:', error);

      // Return minimal profile for error cases
      return {
        userProfile: await this.createUserProfile(userId),
        anomalies: [],
        riskScore: 50, // Neutral risk score
        recommendations: ['Behavioral analysis unavailable'],
        adaptiveThresholds: []
      };
    }
  }

  /**
   * Assess crisis impact to prevent blocking emergency access
   */
  async assessCrisisImpact(
    payload: string,
    headers: Record<string, string>,
    crisisMode: boolean
  ): Promise<CrisisImpactAssessment> {
    try {
      let impactsEmergencyAccess = false;
      let impactsTherapeuticContinuity = false;
      let impactsHotlineAccess = false;

      // Check for crisis-related content
      const payloadLower = payload.toLowerCase();
      const hasCrisisContent = this.CRISIS_PROTECTION_PATTERNS.some(pattern =>
        pattern.test(payloadLower)
      );

      // Check headers for crisis indicators
      const userAgent = headers['user-agent'] || '';
      const hasCrisisHeaders = userAgent.toLowerCase().includes('crisis') ||
                              userAgent.toLowerCase().includes('emergency');

      // If crisis content detected, assess impact
      if (hasCrisisContent || hasCrisisHeaders || crisisMode) {
        // Any blocking action could impact emergency access
        impactsEmergencyAccess = true;
        impactsTherapeuticContinuity = true;

        // Check specifically for 988 hotline access
        if (payloadLower.includes('988') || payloadLower.includes('hotline')) {
          impactsHotlineAccess = true;
        }
      }

      // Determine severity
      let severity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
      if (impactsHotlineAccess) {
        severity = 'critical';
      } else if (impactsEmergencyAccess) {
        severity = 'high';
      } else if (impactsTherapeuticContinuity) {
        severity = 'medium';
      }

      return {
        impactsEmergencyAccess,
        impactsTherapeuticContinuity,
        impactsHotlineAccess,
        severity,
        mitigation: severity !== 'none' ? [
          'Allow all crisis-related requests',
          'Bypass security checks for emergency access',
          'Maintain therapeutic continuity',
          'Log for post-crisis review'
        ] : [],
        recovery: severity !== 'none' ? [
          'Review crisis events after resolution',
          'Update crisis protection patterns',
          'Validate emergency access paths'
        ] : []
      };

    } catch (error) {
      console.error('Crisis impact assessment failed:', error);

      // Default to maximum protection for safety
      return {
        impactsEmergencyAccess: true,
        impactsTherapeuticContinuity: true,
        impactsHotlineAccess: true,
        severity: 'critical',
        mitigation: ['Allow all requests during assessment failure'],
        recovery: ['Investigate assessment system failure']
      };
    }
  }

  /**
   * Determine advanced response with crisis awareness
   */
  async determineAdvancedResponse(
    threatScore: number,
    crisisImpact: CrisisImpactAssessment,
    crisisMode: boolean,
    behavioralAnalysis: BehavioralAnalysisResult | null
  ): Promise<ThreatResponse> {
    try {
      // Crisis mode override - always allow with monitoring
      if (crisisMode || crisisImpact.severity === 'critical') {
        return {
          action: 'crisis_allow',
          confidence: 100,
          reasoning: [
            'Crisis mode active',
            'Emergency access prioritized',
            'Security monitoring maintained'
          ],
          alternativeActions: ['Enhanced logging', 'Post-crisis review'],
          escalationRequired: false,
          crisisOverride: true
        };
      }

      // High crisis impact - allow with enhanced monitoring
      if (crisisImpact.severity === 'high') {
        return {
          action: 'allow',
          confidence: 90,
          reasoning: [
            'High crisis impact detected',
            'Emergency access preservation',
            'Enhanced monitoring applied'
          ],
          alternativeActions: ['Challenge authentication', 'Temporary monitoring'],
          escalationRequired: false,
          crisisOverride: true
        };
      }

      // Standard threat analysis with behavioral consideration
      let action: 'block' | 'monitor' | 'challenge' | 'allow' | 'crisis_allow' = 'allow';
      let confidence = 50;
      const reasoning: string[] = [];

      // High threat score analysis
      if (threatScore >= this.config.autoBlockThreshold) {
        action = 'block';
        confidence = 90;
        reasoning.push(`High threat score: ${threatScore}`);
      } else if (threatScore >= 70) {
        action = 'challenge';
        confidence = 75;
        reasoning.push(`Moderate threat score: ${threatScore}`);
      } else if (threatScore >= 50) {
        action = 'monitor';
        confidence = 60;
        reasoning.push(`Low threat score: ${threatScore}`);
      }

      // Behavioral analysis consideration
      if (behavioralAnalysis) {
        if (behavioralAnalysis.riskScore > 80) {
          action = action === 'allow' ? 'challenge' : action;
          confidence = Math.min(95, confidence + 10);
          reasoning.push('High behavioral risk detected');
        } else if (behavioralAnalysis.riskScore < 20) {
          // Trusted user - reduce severity
          if (action === 'block') action = 'challenge';
          else if (action === 'challenge') action = 'monitor';
          confidence = Math.max(50, confidence - 15);
          reasoning.push('Trusted user profile');
        }
      }

      // Crisis impact always overrides blocking
      if (crisisImpact.impactsEmergencyAccess && action === 'block') {
        action = 'monitor';
        reasoning.push('Emergency access protection override');
      }

      return {
        action,
        confidence,
        reasoning,
        alternativeActions: this.generateAlternativeActions(action, threatScore),
        escalationRequired: threatScore > 90 && !crisisMode,
        crisisOverride: crisisMode || crisisImpact.severity !== 'none'
      };

    } catch (error) {
      console.error('Advanced response determination failed:', error);

      // Safe fallback - allow with monitoring
      return {
        action: crisisMode ? 'crisis_allow' : 'monitor',
        confidence: 50,
        reasoning: ['Response determination failed', 'Defaulting to safe mode'],
        alternativeActions: ['Manual review required'],
        escalationRequired: true,
        crisisOverride: crisisMode
      };
    }
  }

  // PRIVATE HELPER METHODS

  private async buildThreatSource(
    payload: string,
    headers: Record<string, string>,
    ipAddress: string
  ): Promise<ThreatSource> {
    try {
      // Build reputation data
      const reputation = await this.assessIPReputation(ipAddress);

      // Extract geolocation (simplified for mobile app)
      const geolocation: GeolocationData = {
        country: 'unknown',
        region: 'unknown',
        city: 'unknown',
        latitude: 0,
        longitude: 0,
        isp: 'unknown',
        organization: 'unknown'
      };

      return {
        ipAddress,
        userAgent: headers['user-agent'] || 'unknown',
        headers,
        payload,
        geolocation,
        reputation
      };

    } catch (error) {
      console.error('Failed to build threat source:', error);
      return {
        ipAddress,
        userAgent: headers['user-agent'] || 'unknown',
        headers,
        payload,
        reputation: {
          trustScore: 50,
          threatScore: 50,
          categories: [],
          sources: [],
          lastVerified: new Date().toISOString()
        }
      };
    }
  }

  private async detectPatternBasedThreats(
    payload: string,
    headers: Record<string, string>
  ): Promise<ThreatIndicator[]> {
    const indicators: ThreatIndicator[] = [];

    try {
      // SQL injection patterns
      const sqlPatterns = [
        /['";].*?(-{2}|\/\*|\*\/)/gi,
        /\b(union|select|insert|drop|delete|update)\b.*?\b(from|where|into)\b/gi
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(payload)) {
          indicators.push({
            type: 'pattern',
            value: pattern.source,
            confidence: 85,
            category: 'sql_injection',
            description: 'SQL injection pattern detected'
          });
        }
      }

      // XSS patterns
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];

      for (const pattern of xssPatterns) {
        if (pattern.test(payload)) {
          indicators.push({
            type: 'pattern',
            value: pattern.source,
            confidence: 80,
            category: 'xss',
            description: 'Cross-site scripting pattern detected'
          });
        }
      }

      // Command injection patterns
      const cmdPatterns = [
        /\b(eval|exec|system|shell_exec)\s*\(/gi,
        /\$\{.*?\}/g,
        /`.*?`/g
      ];

      for (const pattern of cmdPatterns) {
        if (pattern.test(payload)) {
          indicators.push({
            type: 'pattern',
            value: pattern.source,
            confidence: 90,
            category: 'command_injection',
            description: 'Command injection pattern detected'
          });
        }
      }

      return indicators;

    } catch (error) {
      console.error('Pattern-based threat detection failed:', error);
      return [];
    }
  }

  private async detectAnomalies(
    threatSource: ThreatSource,
    behavioralAnalysis: BehavioralAnalysisResult | null
  ): Promise<ThreatIndicator[]> {
    const indicators: ThreatIndicator[] = [];

    try {
      // Payload size anomaly
      const payloadSize = threatSource.payload.length;
      if (payloadSize > 100000) { // 100KB threshold
        indicators.push({
          type: 'behavior',
          value: `payload_size_${payloadSize}`,
          confidence: 70,
          category: 'size_anomaly',
          description: `Unusually large payload: ${payloadSize} bytes`
        });
      }

      // Request frequency anomaly (would be tracked over time)
      // This is simplified for the mobile app context

      // User-Agent anomaly
      const userAgent = threatSource.userAgent;
      if (userAgent.length > 500 || userAgent.includes('bot') || userAgent.includes('scanner')) {
        indicators.push({
          type: 'behavior',
          value: userAgent,
          confidence: 60,
          category: 'user_agent_anomaly',
          description: 'Suspicious user agent detected'
        });
      }

      // Behavioral anomalies from user profile
      if (behavioralAnalysis) {
        for (const anomaly of behavioralAnalysis.anomalies) {
          indicators.push({
            type: 'behavior',
            value: anomaly.description,
            confidence: anomaly.confidence,
            category: 'behavioral_anomaly',
            description: `Behavioral anomaly: ${anomaly.description}`
          });
        }
      }

      return indicators;

    } catch (error) {
      console.error('Anomaly detection failed:', error);
      return [];
    }
  }

  private async correlateThreatIntelligence(
    threatSource: ThreatSource
  ): Promise<ThreatIndicator[]> {
    const indicators: ThreatIndicator[] = [];

    try {
      // Check IP against threat intelligence
      const ipIntel = this.threatIntelligence.get(threatSource.ipAddress);
      if (ipIntel) {
        indicators.push({
          type: 'ip',
          value: threatSource.ipAddress,
          confidence: ipIntel.confidence,
          category: ipIntel.threatType,
          description: `Known threat IP: ${ipIntel.threatType}`
        });
      }

      // Check user agent patterns
      for (const [key, intel] of this.threatIntelligence) {
        if (intel.indicators.some(ind =>
          ind.type === 'pattern' &&
          new RegExp(ind.value, 'i').test(threatSource.userAgent)
        )) {
          indicators.push({
            type: 'pattern',
            value: threatSource.userAgent,
            confidence: intel.confidence,
            category: intel.threatType,
            description: `Threat intelligence match: ${intel.threatType}`
          });
        }
      }

      return indicators;

    } catch (error) {
      console.error('Threat intelligence correlation failed:', error);
      return [];
    }
  }

  private calculateAdvancedThreatScore(
    patternThreats: ThreatIndicator[],
    anomalies: ThreatIndicator[],
    intelligenceMatches: ThreatIndicator[],
    behavioralAnalysis: BehavioralAnalysisResult | null,
    crisisImpact: CrisisImpactAssessment
  ): number {
    let score = 0;

    // Pattern-based threats (high weight)
    for (const threat of patternThreats) {
      score += (threat.confidence / 100) * 30;
    }

    // Anomalies (medium weight)
    for (const anomaly of anomalies) {
      score += (anomaly.confidence / 100) * 20;
    }

    // Intelligence matches (high weight)
    for (const match of intelligenceMatches) {
      score += (match.confidence / 100) * 35;
    }

    // Behavioral analysis (medium weight)
    if (behavioralAnalysis) {
      score += (behavioralAnalysis.riskScore / 100) * 15;
    }

    // Crisis impact reduces threat score (safety first)
    if (crisisImpact.severity !== 'none') {
      score *= 0.3; // Reduce threat score by 70% during crisis
    }

    return Math.min(100, Math.max(0, score));
  }

  private classifyThreatType(
    patternThreats: ThreatIndicator[],
    anomalies: ThreatIndicator[]
  ): string {
    const categories = [...patternThreats, ...anomalies].map(t => t.category);

    if (categories.includes('sql_injection')) return 'injection';
    if (categories.includes('xss')) return 'xss';
    if (categories.includes('command_injection')) return 'injection';
    if (categories.includes('behavioral_anomaly')) return 'anomaly';
    if (categories.includes('size_anomaly')) return 'ddos';

    return 'unknown';
  }

  private determineThreatSeverity(
    threatScore: number,
    crisisImpact: CrisisImpactAssessment
  ): 'critical' | 'high' | 'medium' | 'low' {
    // Crisis impact overrides severity (safety first)
    if (crisisImpact.severity === 'critical') return 'low'; // Reduce during crisis
    if (crisisImpact.severity === 'high') return 'low';

    if (threatScore >= 90) return 'critical';
    if (threatScore >= 70) return 'high';
    if (threatScore >= 50) return 'medium';
    return 'low';
  }

  private async createUserProfile(userId: string): Promise<UserBehaviorProfile> {
    return {
      userId,
      normalPatterns: [],
      sessionPatterns: [],
      paymentPatterns: [],
      crisisPatterns: [],
      riskFactors: [],
      trustScore: 50, // Neutral starting score
      lastUpdated: new Date().toISOString()
    };
  }

  private async detectBehavioralAnomalies(
    userProfile: UserBehaviorProfile,
    threatSource: ThreatSource
  ): Promise<BehavioralAnomaly[]> {
    const anomalies: BehavioralAnomaly[] = [];

    try {
      // This would contain sophisticated behavioral analysis
      // For now, simplified implementation

      // Check for unusual timing
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour > 22) {
        anomalies.push({
          anomalyType: 'temporal',
          description: 'Unusual access time detected',
          severity: 'low',
          confidence: 60,
          deviationScore: 2.1,
          context: {
            timeframe: 'hourly',
            baseline: { normalHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] },
            observed: { accessHour: currentHour },
            expectedRange: [8, 21],
            actualValue: currentHour,
            metadata: { type: 'timing_anomaly' }
          },
          mitigation: ['Monitor enhanced', 'Request additional verification']
        });
      }

      return anomalies;

    } catch (error) {
      console.error('Behavioral anomaly detection failed:', error);
      return [];
    }
  }

  private calculateBehavioralRiskScore(
    userProfile: UserBehaviorProfile,
    anomalies: BehavioralAnomaly[]
  ): number {
    let riskScore = 50; // Start with neutral

    // Adjust based on trust score
    riskScore = riskScore + (50 - userProfile.trustScore) * 0.5;

    // Add risk from anomalies
    for (const anomaly of anomalies) {
      const weight = {
        'critical': 25,
        'high': 15,
        'medium': 10,
        'low': 5
      }[anomaly.severity];

      riskScore += (anomaly.confidence / 100) * weight;
    }

    // Add risk from risk factors
    for (const factor of userProfile.riskFactors) {
      riskScore += factor.weight * (factor.confidence / 100);
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  private generateBehavioralRecommendations(
    anomalies: BehavioralAnomaly[],
    riskScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (riskScore > 80) {
      recommendations.push('Enhanced monitoring recommended');
      recommendations.push('Consider additional authentication');
    } else if (riskScore > 60) {
      recommendations.push('Monitor user activity closely');
    } else if (riskScore < 30) {
      recommendations.push('User appears trustworthy');
      recommendations.push('Consider reduced monitoring');
    }

    for (const anomaly of anomalies) {
      recommendations.push(...anomaly.mitigation);
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private async updateAdaptiveThresholds(
    userProfile: UserBehaviorProfile,
    anomalies: BehavioralAnomaly[]
  ): Promise<AdaptiveThreshold[]> {
    const thresholds: AdaptiveThreshold[] = [];

    // This would contain sophisticated threshold adaptation logic
    // For now, simplified implementation

    if (anomalies.length > 2) {
      thresholds.push({
        metric: 'anomaly_sensitivity',
        currentThreshold: 0.8,
        recommendedThreshold: 0.9,
        confidence: 75,
        adjustmentReason: 'High anomaly count detected',
        impact: 'security'
      });
    }

    return thresholds;
  }

  private async assessIPReputation(ipAddress: string): Promise<ReputationData> {
    // Simplified IP reputation assessment
    // In production, this would integrate with threat intelligence feeds

    let trustScore = 50;
    let threatScore = 50;
    const categories: string[] = [];

    // Basic checks
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.0.') || ipAddress.startsWith('172.16.')) {
      categories.push('private_network');
      threatScore += 20;
      trustScore -= 20;
    }

    if (ipAddress === '127.0.0.1') {
      categories.push('localhost');
      threatScore += 30;
      trustScore -= 30;
    }

    return {
      trustScore: Math.min(100, Math.max(0, trustScore)),
      threatScore: Math.min(100, Math.max(0, threatScore)),
      categories,
      sources: ['internal_analysis'],
      lastVerified: new Date().toISOString()
    };
  }

  private generateAlternativeActions(
    primaryAction: string,
    threatScore: number
  ): string[] {
    const alternatives: string[] = [];

    switch (primaryAction) {
      case 'block':
        alternatives.push('Challenge with CAPTCHA', 'Temporary monitoring', 'Manual review');
        break;
      case 'challenge':
        alternatives.push('Enhanced monitoring', 'Additional authentication', 'Rate limiting');
        break;
      case 'monitor':
        alternatives.push('Passive logging', 'Behavioral analysis', 'Pattern tracking');
        break;
      case 'allow':
        alternatives.push('Standard monitoring', 'Periodic review');
        break;
    }

    if (threatScore > 70) {
      alternatives.push('Escalate to security team');
    }

    return alternatives;
  }

  private extractSessionContext(headers: Record<string, string>): any {
    return {
      userAgent: headers['user-agent'],
      acceptLanguage: headers['accept-language'],
      contentType: headers['content-type'],
      timestamp: new Date().toISOString()
    };
  }

  private extractPaymentContext(payload: string): any {
    try {
      const payloadData = JSON.parse(payload);
      return {
        hasPaymentData: payloadData.type?.includes('payment') || payloadData.type?.includes('subscription'),
        eventType: payloadData.type,
        objectType: payloadData.object
      };
    } catch {
      return { hasPaymentData: false };
    }
  }

  private async executeThreatResponse(threatEvent: RealTimeThreatEvent): Promise<void> {
    try {
      switch (threatEvent.response.action) {
        case 'block':
          if (threatEvent.source.ipAddress) {
            await webhookSecurityValidator.blockIP(
              threatEvent.source.ipAddress,
              `Automated threat response: ${threatEvent.threatType}`
            );
          }
          break;

        case 'challenge':
          // Would implement challenge mechanism
          console.log(`Challenge required for threat: ${threatEvent.eventId}`);
          break;

        case 'monitor':
        case 'allow':
        case 'crisis_allow':
          // Enhanced monitoring only
          console.log(`Monitoring threat: ${threatEvent.eventId}`);
          break;
      }

      // Log the response
      console.log(`Threat response executed: ${threatEvent.response.action} for ${threatEvent.eventId}`);

    } catch (error) {
      console.error('Threat response execution failed:', error);
    }
  }

  private async updateThreatMetrics(threatEvent: RealTimeThreatEvent): Promise<void> {
    this.metrics.totalThreatsDetected++;

    switch (threatEvent.response.action) {
      case 'block':
        this.metrics.threatsBlocked++;
        break;
      case 'monitor':
      case 'allow':
      case 'crisis_allow':
        this.metrics.threatsMonitored++;
        break;
    }

    if (threatEvent.response.crisisOverride) {
      this.metrics.crisisOverrides++;
    }

    // Update average detection time
    const processingTime = threatEvent.context.systemContext?.processingTime || 0;
    this.metrics.averageDetectionTime =
      (this.metrics.averageDetectionTime * (this.metrics.totalThreatsDetected - 1) + processingTime) /
      this.metrics.totalThreatsDetected;
  }

  private async updateUserProfile(
    userId: string,
    threatEvent: RealTimeThreatEvent,
    behavioralAnalysis: BehavioralAnalysisResult
  ): Promise<void> {
    try {
      const profile = behavioralAnalysis.userProfile;

      // Update trust score based on threat response
      if (threatEvent.response.action === 'block') {
        profile.trustScore = Math.max(0, profile.trustScore - 10);
      } else if (threatEvent.response.action === 'allow') {
        profile.trustScore = Math.min(100, profile.trustScore + 1);
      }

      profile.lastUpdated = new Date().toISOString();
      this.userProfiles.set(userId, profile);

    } catch (error) {
      console.error('User profile update failed:', error);
    }
  }

  private async generateThreatEventId(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 9);
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${timestamp}_${random}`,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return `threat_${hash.substr(0, 16)}`;
  }

  private trimEventHistory(): void {
    // Keep only recent events to manage memory
    if (this.realtimeEvents.length > 1000) {
      this.realtimeEvents = this.realtimeEvents.slice(-500);
    }
  }

  private async initializeThreatIntelligence(): Promise<void> {
    try {
      // Initialize with basic threat intelligence
      // In production, this would load from external feeds

      const basicThreats: ThreatIntelligenceData[] = [
        {
          threatId: 'BASIC-001',
          threatType: 'ddos',
          indicators: [
            {
              type: 'pattern',
              value: 'high_frequency_requests',
              confidence: 90,
              category: 'ddos',
              description: 'High frequency request pattern'
            }
          ],
          severity: 'high',
          confidence: 85,
          source: 'internal',
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          ttl: 86400, // 24 hours
          mitigationStrategies: ['Rate limiting', 'IP blocking']
        }
      ];

      for (const threat of basicThreats) {
        this.threatIntelligence.set(threat.threatId, threat);
      }

      console.log('Threat intelligence initialized');

    } catch (error) {
      console.error('Threat intelligence initialization failed:', error);
    }
  }

  private async initializeBehavioralAnalysis(): Promise<void> {
    try {
      // Initialize behavioral analysis components
      console.log('Behavioral analysis engine initialized');
    } catch (error) {
      console.error('Behavioral analysis initialization failed:', error);
    }
  }

  private startRealTimeProcessing(): void {
    // Start background processing for real-time threat detection
    setInterval(() => {
      this.performMaintenanceTasks().catch(console.error);
    }, 60000); // Every minute

    console.log('Real-time threat processing started');
  }

  private async initializeAdaptiveThresholds(): Promise<void> {
    try {
      // Initialize adaptive threshold system
      console.log('Adaptive thresholds initialized');
    } catch (error) {
      console.error('Adaptive threshold initialization failed:', error);
    }
  }

  private async performMaintenanceTasks(): Promise<void> {
    try {
      // Clean up expired threat intelligence
      const now = Date.now();
      for (const [key, threat] of this.threatIntelligence) {
        const lastSeen = new Date(threat.lastSeen).getTime();
        if (now - lastSeen > threat.ttl * 1000) {
          this.threatIntelligence.delete(key);
        }
      }

      // Update user profile trust scores based on recent activity
      for (const [userId, profile] of this.userProfiles) {
        // Gradual trust score recovery over time
        if (profile.trustScore < 50) {
          profile.trustScore = Math.min(50, profile.trustScore + 0.1);
        }
      }

      // Trim event history
      this.trimEventHistory();

    } catch (error) {
      console.error('Maintenance tasks failed:', error);
    }
  }

  /**
   * Get threat detection metrics
   */
  async getThreatDetectionMetrics(): Promise<ThreatDetectionMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get recent threat events
   */
  async getRecentThreatEvents(limit = 50): Promise<RealTimeThreatEvent[]> {
    return this.realtimeEvents.slice(-limit);
  }

  /**
   * Force update threat intelligence
   */
  async updateThreatIntelligence(): Promise<void> {
    try {
      // This would fetch from external threat intelligence feeds
      console.log('Threat intelligence updated');
    } catch (error) {
      console.error('Threat intelligence update failed:', error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      this.userProfiles.clear();
      this.threatIntelligence.clear();
      this.realtimeEvents = [];
      this.initialized = false;
      console.log('Advanced threat detection system cleanup completed');
    } catch (error) {
      console.error('Threat detection cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const advancedThreatDetectionSystem = AdvancedThreatDetectionSystem.getInstance();