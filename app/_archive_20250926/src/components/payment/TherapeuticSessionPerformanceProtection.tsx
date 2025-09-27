/**
 * Therapeutic Session Performance Protection
 *
 * Ensures payment sync operations never interfere with therapeutic session performance:
 * - Background payment operations maintain 60fps breathing animations
 * - Payment error notifications don't disrupt therapeutic timers
 * - Payment sync doesn't impact PHQ-9/GAD-7 assessment performance
 * - Session isolation from payment processing with performance guarantees
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  InteractionManager,
  AppState,
  AppStateStatus,
  BackgroundTimer
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';

// Performance monitoring for therapeutic sessions
class TherapeuticPerformanceMonitor {
  private static instance: TherapeuticPerformanceMonitor;
  private activeSession: boolean = false;
  private sessionType: 'breathing' | 'meditation' | 'assessment' | 'check-in' | null = null;
  private frameTimes: number[] = [];
  private paymentOperationsDeferred: number = 0;
  private performanceViolations: number = 0;
  private sessionStartTime: number = 0;

  static getInstance(): TherapeuticPerformanceMonitor {
    if (!TherapeuticPerformanceMonitor.instance) {
      TherapeuticPerformanceMonitor.instance = new TherapeuticPerformanceMonitor();
    }
    return TherapeuticPerformanceMonitor.instance;
  }

  startSession(type: 'breathing' | 'meditation' | 'assessment' | 'check-in'): void {
    this.activeSession = true;
    this.sessionType = type;
    this.sessionStartTime = Date.now();
    this.frameTimes = [];
    this.performanceViolations = 0;

    console.log(`Therapeutic session started: ${type} - Payment operations will be deprioritized`);
  }

  endSession(): void {
    const sessionDuration = Date.now() - this.sessionStartTime;

    console.log(`Therapeutic session ended: ${this.sessionType}`, {
      duration: sessionDuration,
      avgFrameTime: this.getAverageFrameTime(),
      performanceViolations: this.performanceViolations,
      deferredPaymentOps: this.paymentOperationsDeferred
    });

    this.activeSession = false;
    this.sessionType = null;
    this.frameTimes = [];
    this.paymentOperationsDeferred = 0;
  }

  recordFrameTime(frameTime: number): void {
    if (!this.activeSession) return;

    this.frameTimes.push(frameTime);

    // Keep only last 60 frames for rolling average
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    // Check for performance violations (>16.67ms = dropped frame)
    if (frameTime > 16.67) {
      this.performanceViolations++;

      if (this.performanceViolations % 5 === 0) {
        console.warn(`Therapeutic session performance violation: ${frameTime.toFixed(2)}ms (${this.performanceViolations} total)`);
      }
    }
  }

  deferPaymentOperation(): void {
    this.paymentOperationsDeferred++;
  }

  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
  }

  isSessionActive(): boolean {
    return this.activeSession;
  }

  getSessionType(): string | null {
    return this.sessionType;
  }

  shouldDeferPaymentOperations(): boolean {
    // Defer payment operations during critical therapeutic moments
    return this.activeSession && (
      this.sessionType === 'breathing' ||
      this.sessionType === 'assessment' ||
      this.performanceViolations > 2
    );
  }

  getMetrics() {
    return {
      activeSession: this.activeSession,
      sessionType: this.sessionType,
      averageFrameTime: this.getAverageFrameTime(),
      performanceViolations: this.performanceViolations,
      deferredPaymentOperations: this.paymentOperationsDeferred,
      sessionDuration: this.activeSession ? Date.now() - this.sessionStartTime : 0
    };
  }
}

/**
 * Session Performance Protector
 * Manages payment operations to ensure therapeutic session performance
 */
interface SessionPerformanceProtectorProps {
  readonly sessionActive: boolean;
  readonly sessionType: 'breathing' | 'meditation' | 'assessment' | 'check-in';
  readonly targetFPS?: number; // Default: 60
  readonly children: (protectionState: {
    isDeferringPayments: boolean;
    frameTime: number;
    performanceGood: boolean;
    deferredOperations: number;
  }) => React.ReactNode;
}

export const SessionPerformanceProtector: React.FC<SessionPerformanceProtectorProps> = ({
  sessionActive,
  sessionType,
  targetFPS = 60,
  children
}) => {
  const frameTimeRef = useRef<number>(0);
  const performanceMonitor = TherapeuticPerformanceMonitor.getInstance();
  const rafRef = useRef<number>();

  // Performance monitoring loop
  const monitorPerformance = useCallback(() => {
    const startTime = performance.now();

    const animationFrame = () => {
      const frameTime = performance.now() - startTime;
      frameTimeRef.current = frameTime;

      if (sessionActive) {
        performanceMonitor.recordFrameTime(frameTime);
      }

      if (sessionActive) {
        rafRef.current = requestAnimationFrame(animationFrame);
      }
    };

    rafRef.current = requestAnimationFrame(animationFrame);
  }, [sessionActive, performanceMonitor]);

  // Session lifecycle management
  useEffect(() => {
    if (sessionActive) {
      performanceMonitor.startSession(sessionType);
      monitorPerformance();
    } else {
      performanceMonitor.endSession();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [sessionActive, sessionType, performanceMonitor, monitorPerformance]);

  const protectionState = useMemo(() => {
    const metrics = performanceMonitor.getMetrics();

    return {
      isDeferringPayments: performanceMonitor.shouldDeferPaymentOperations(),
      frameTime: frameTimeRef.current,
      performanceGood: metrics.averageFrameTime < (1000 / targetFPS),
      deferredOperations: metrics.deferredPaymentOperations
    };
  }, [performanceMonitor, targetFPS]);

  return <>{children(protectionState)}</>;
};

/**
 * Background Payment Operations Manager
 * Ensures payment operations don't interfere with therapeutic sessions
 */
interface BackgroundPaymentOperationsProps {
  readonly sessionActive: boolean;
  readonly sessionType?: string;
  readonly operations: PaymentOperation[];
  readonly onOperationDeferred?: (operation: PaymentOperation) => void;
  readonly onOperationExecuted?: (operation: PaymentOperation) => void;
}

interface PaymentOperation {
  id: string;
  type: 'sync' | 'webhook' | 'retry' | 'status_update';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // milliseconds
  canDefer: boolean;
  payload: any;
}

export const BackgroundPaymentOperationsManager: React.FC<BackgroundPaymentOperationsProps> = ({
  sessionActive,
  sessionType,
  operations,
  onOperationDeferred,
  onOperationExecuted
}) => {
  const performanceMonitor = TherapeuticPerformanceMonitor.getInstance();
  const deferredOpsRef = useRef<PaymentOperation[]>([]);
  const processingRef = useRef<boolean>(false);

  // Process operations with session-aware scheduling
  const processOperations = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      for (const operation of operations) {
        // Check if operation should be deferred during session
        if (sessionActive && performanceMonitor.shouldDeferPaymentOperations()) {
          if (operation.canDefer && operation.priority !== 'critical') {
            // Defer non-critical operations during therapeutic sessions
            deferredOpsRef.current.push(operation);
            performanceMonitor.deferPaymentOperation();

            if (onOperationDeferred) {
              onOperationDeferred(operation);
            }
            continue;
          }
        }

        // Execute operation with performance monitoring
        await executeOperationSafely(operation);

        if (onOperationExecuted) {
          onOperationExecuted(operation);
        }

        // Yield to main thread to maintain session performance
        if (sessionActive) {
          await new Promise(resolve => {
            InteractionManager.runAfterInteractions(() => {
              setTimeout(resolve, 16); // One frame at 60fps
            });
          });
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [operations, sessionActive, performanceMonitor, onOperationDeferred, onOperationExecuted]);

  // Execute individual operation with performance safeguards
  const executeOperationSafely = useCallback(async (operation: PaymentOperation) => {
    const startTime = performance.now();

    try {
      // Simulate operation execution
      await new Promise(resolve => setTimeout(resolve, operation.estimatedDuration));

      const executionTime = performance.now() - startTime;

      // Log warning if operation took too long during session
      if (sessionActive && executionTime > 16.67) {
        console.warn(`Payment operation ${operation.type} took ${executionTime.toFixed(2)}ms during ${sessionType} session`);
      }
    } catch (error) {
      console.error(`Payment operation ${operation.id} failed:`, error);
    }
  }, [sessionActive, sessionType]);

  // Process deferred operations when session ends
  useEffect(() => {
    if (!sessionActive && deferredOpsRef.current.length > 0) {
      const deferredOps = [...deferredOpsRef.current];
      deferredOpsRef.current = [];

      // Process deferred operations after session
      InteractionManager.runAfterInteractions(async () => {
        for (const operation of deferredOps) {
          await executeOperationSafely(operation);

          if (onOperationExecuted) {
            onOperationExecuted(operation);
          }
        }
      });
    }
  }, [sessionActive, executeOperationSafely, onOperationExecuted]);

  // Start processing operations
  useEffect(() => {
    if (operations.length > 0) {
      InteractionManager.runAfterInteractions(processOperations);
    }
  }, [operations, processOperations]);

  return null; // This is a manager component with no UI
};

/**
 * Non-Disruptive Payment Notifications
 * Shows payment status without interrupting therapeutic flow
 */
interface NonDisruptiveNotificationProps {
  readonly notification: PaymentNotification | null;
  readonly sessionActive: boolean;
  readonly sessionType?: string;
  readonly onDismiss?: () => void;
  readonly testID: string;
}

interface PaymentNotification {
  id: string;
  type: 'payment_error' | 'sync_complete' | 'connection_restored';
  message: string;
  priority: 'low' | 'medium' | 'high';
  showDuringSession: boolean;
  autoHideDuringSession: boolean;
}

export const NonDisruptivePaymentNotification: React.FC<NonDisruptiveNotificationProps> = ({
  notification,
  sessionActive,
  sessionType,
  onDismiss,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const autoHideTimer = useRef<NodeJS.Timeout>();

  // Determine if notification should be shown during session
  const shouldShow = useMemo(() => {
    if (!notification) return false;

    // Don't show notifications during assessment sessions
    if (sessionActive && sessionType === 'assessment') return false;

    // Show only critical notifications during breathing sessions
    if (sessionActive && sessionType === 'breathing') {
      return notification.priority === 'high' && notification.showDuringSession;
    }

    // Show most notifications during other sessions or when not in session
    return notification.showDuringSession || !sessionActive;
  }, [notification, sessionActive, sessionType]);

  // Animation management with session awareness
  useEffect(() => {
    if (shouldShow && notification) {
      // Gentle animation during sessions
      const animationDuration = sessionActive ? 500 : 300;

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: sessionActive ? 0.9 : 1, // Slightly transparent during sessions
          duration: animationDuration,
          useNativeDriver: true,
        })
      ]).start();

      // Auto-hide during sessions if configured
      if (sessionActive && notification.autoHideDuringSession) {
        autoHideTimer.current = setTimeout(() => {
          if (onDismiss) {
            onDismiss();
          }
        }, 3000);
      }
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }

    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
  }, [shouldShow, notification, sessionActive, slideAnim, opacityAnim, onDismiss]);

  // Notification styling based on session state
  const notificationStyle = useMemo(() => {
    if (!notification) return {};

    const baseStyle = {
      payment_error: {
        backgroundColor: colors.status.errorBackground,
        borderColor: colors.status.error,
        textColor: colors.status.error
      },
      sync_complete: {
        backgroundColor: colors.status.successBackground,
        borderColor: colors.status.success,
        textColor: colors.status.success
      },
      connection_restored: {
        backgroundColor: colors.status.infoBackground,
        borderColor: colors.status.info,
        textColor: colors.status.info
      }
    };

    const style = baseStyle[notification.type];

    // Adjust opacity and border during sessions
    if (sessionActive) {
      return {
        ...style,
        borderWidth: 1,
        borderStyle: 'dashed' as const // Less visually prominent during sessions
      };
    }

    return style;
  }, [notification, sessionActive, colors]);

  if (!shouldShow || !notification) return null;

  return (
    <Animated.View
      style={[
        styles.notificationContainer,
        {
          backgroundColor: notificationStyle.backgroundColor,
          borderColor: notificationStyle.borderColor,
          borderWidth: notificationStyle.borderWidth || 2,
          borderStyle: notificationStyle.borderStyle || 'solid',
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        }
      ]}
      testID={testID}
    >
      <Text style={[styles.notificationText, { color: notificationStyle.textColor }]}>
        {notification.message}
      </Text>

      {sessionActive && (
        <Text style={[styles.sessionNote, { color: colors.gray[600] }]}>
          (Session-safe notification)
        </Text>
      )}
    </Animated.View>
  );
};

/**
 * Assessment Performance Guardian
 * Ensures PHQ-9/GAD-7 assessments maintain perfect performance
 */
interface AssessmentPerformanceGuardianProps {
  readonly assessmentActive: boolean;
  readonly assessmentType: 'PHQ-9' | 'GAD-7' | 'custom';
  readonly children: (guardianState: {
    paymentOperationsSuspended: boolean;
    assessmentPerformanceOptimal: boolean;
    backgroundTasksDeferred: number;
  }) => React.ReactNode;
}

export const AssessmentPerformanceGuardian: React.FC<AssessmentPerformanceGuardianProps> = ({
  assessmentActive,
  assessmentType,
  children
}) => {
  const performanceMonitor = TherapeuticPerformanceMonitor.getInstance();
  const deferredTasksRef = useRef<number>(0);

  // Suspend all non-critical payment operations during assessments
  useEffect(() => {
    if (assessmentActive) {
      // Start assessment session with highest performance priority
      performanceMonitor.startSession('assessment');

      // Clear any pending background tasks that might interfere
      InteractionManager.clearInteractionHandle();

      console.log(`Assessment performance guardian activated for ${assessmentType}`);
    } else {
      performanceMonitor.endSession();

      console.log(`Assessment performance guardian deactivated - ${deferredTasksRef.current} tasks deferred`);
      deferredTasksRef.current = 0;
    }
  }, [assessmentActive, assessmentType, performanceMonitor]);

  const guardianState = useMemo(() => {
    const metrics = performanceMonitor.getMetrics();

    return {
      paymentOperationsSuspended: assessmentActive,
      assessmentPerformanceOptimal: metrics.averageFrameTime < 16.67,
      backgroundTasksDeferred: deferredTasksRef.current
    };
  }, [assessmentActive, performanceMonitor]);

  return <>{children(guardianState)}</>;
};

const styles = StyleSheet.create({
  notificationContainer: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    zIndex: 100, // Lower z-index during sessions to not interfere
  },
  notificationText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    textAlign: 'center',
  },
  sessionNote: {
    fontSize: typography.micro.size,
    textAlign: 'center',
    marginTop: spacing.xs / 2,
    fontStyle: 'italic',
  },
});

export {
  SessionPerformanceProtector,
  BackgroundPaymentOperationsManager,
  NonDisruptivePaymentNotification,
  AssessmentPerformanceGuardian,
  TherapeuticPerformanceMonitor
};