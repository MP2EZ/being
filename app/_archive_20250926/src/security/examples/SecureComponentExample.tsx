/**
 * Secure Component Example for Being. MBCT App
 *
 * Demonstrates comprehensive integration of security foundations
 * with React components for clinical data handling.
 *
 * This example shows:
 * - Secure context usage
 * - Input validation and sanitization
 * - Clinical data encryption
 * - Security monitoring
 * - Error boundary integration
 * - Memory-safe operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import {
  BeingSecurityAPI,
  useSecurityMonitoring,
  useClinicalDataSecurity,
  useSecureInput,
  createClinicalAssessmentContext,
  AssessmentErrorBoundary,
  DataSensitivity,
  SecurityConstants
} from '../index';

/**
 * Clinical assessment data structure
 */
interface ClinicalAssessment {
  id: string;
  type: 'PHQ9' | 'GAD7';
  responses: number[];
  totalScore: number;
  timestamp: string;
  encrypted: boolean;
}

/**
 * Create secure context for clinical assessments
 */
const { Provider: AssessmentProvider, useSecureContext } = createClinicalAssessmentContext<ClinicalAssessment | null>(
  null,
  'ClinicalAssessmentExample'
);

/**
 * Secure Assessment Form Component
 */
function SecureAssessmentForm() {
  // Security monitoring
  const { metrics, isSecure, threats, actions } = useSecurityMonitoring({
    enabled: true,
    checkInterval: SecurityConstants.MONITORING_INTERVAL,
    autoCleanup: true
  });

  // Clinical data encryption
  const { encrypt, decrypt, encryptionMetrics } = useClinicalDataSecurity(DataSensitivity.CLINICAL);

  // Secure context for clinical data
  const { data: assessment, updateData, isSecure: contextSecure } = useSecureContext();

  // Secure input handling
  const {
    value: userInput,
    setValue: setUserInput,
    isValid: inputValid,
    validationErrors,
    sanitizedValue
  } = useSecureInput('', 'clinical');

  // Local state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // PHQ-9 questions (simplified)
  const questions = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep",
    // ... more questions would be here
  ];

  /**
   * Handle response input with security validation
   */
  const handleResponseInput = useCallback(async (responseText: string) => {
    const operationId = `response_input_${Date.now()}`;

    try {
      // Register memory operation
      BeingSecurityAPI.Memory.register(operationId, () => {
        console.log('[SECURITY] Cleanup response input operation');
      });

      // Validate input
      const validation = await BeingSecurityAPI.Input.validate(
        responseText,
        'assessment_response',
        {
          sensitivity: DataSensitivity.CLINICAL,
          operation: 'create',
          source: 'user_input',
          sessionId: 'assessment_session',
          componentContext: 'SecureAssessmentForm'
        }
      );

      if (!validation.isValid) {
        Alert.alert(
          'Invalid Input',
          `Please check your response: ${validation.errors.join(', ')}`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Sanitize and convert to number
      const sanitized = BeingSecurityAPI.Input.sanitize(
        responseText,
        'assessment_response',
        {
          sensitivity: DataSensitivity.CLINICAL,
          operation: 'create',
          source: 'user_input',
          sessionId: 'assessment_session'
        }
      );

      const responseValue = parseInt(sanitized, 10);
      if (isNaN(responseValue) || responseValue < 0 || responseValue > 3) {
        Alert.alert('Invalid Response', 'Please enter a number between 0 and 3');
        return;
      }

      // Update responses array
      const newResponses = [...responses];
      newResponses[currentQuestion] = responseValue;
      setResponses(newResponses);

      // Clear input
      setUserInput('');

      // Move to next question or complete assessment
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        await completeAssessment(newResponses);
      }

    } catch (error) {
      await actions.reportIncident(
        error as Error,
        'DATA_VALIDATION_ERROR',
        'response_input_handling'
      );

      Alert.alert('Security Error', 'There was a security issue processing your response');
    } finally {
      BeingSecurityAPI.Memory.unregister(operationId);
    }
  }, [currentQuestion, responses, questions.length, actions, setUserInput]);

  /**
   * Complete assessment with secure data handling
   */
  const completeAssessment = useCallback(async (finalResponses: number[]) => {
    const operationId = `complete_assessment_${Date.now()}`;
    setIsProcessing(true);

    try {
      // Register memory operation
      BeingSecurityAPI.Memory.register(operationId, () => {
        console.log('[SECURITY] Cleanup assessment completion');
        setIsProcessing(false);
      });

      // Calculate total score
      const totalScore = finalResponses.reduce((sum, response) => sum + response, 0);

      // Create assessment object
      const assessmentData: ClinicalAssessment = {
        id: `phq9_${Date.now()}`,
        type: 'PHQ9',
        responses: finalResponses,
        totalScore,
        timestamp: new Date().toISOString(),
        encrypted: true
      };

      // Validate complete assessment
      const validation = await BeingSecurityAPI.Input.validate(
        assessmentData,
        'clinical_assessment',
        {
          sensitivity: DataSensitivity.CLINICAL,
          operation: 'create',
          source: 'user_input',
          sessionId: 'assessment_session'
        }
      );

      if (!validation.isValid) {
        throw new Error(`Assessment validation failed: ${validation.errors.join(', ')}`);
      }

      // Encrypt assessment data
      const encryptedData = await encrypt(assessmentData, 'phq9_completion');

      // Store in secure context
      await updateData(assessmentData);

      // Success feedback
      Alert.alert(
        'Assessment Complete',
        `PHQ-9 assessment completed successfully. Score: ${totalScore}`,
        [{ text: 'OK' }]
      );

      // Reset form
      setResponses([]);
      setCurrentQuestion(0);

    } catch (error) {
      await actions.reportIncident(
        error as Error,
        'ENCRYPTION_FAILURE',
        'assessment_completion'
      );

      Alert.alert(
        'Error',
        'Failed to complete assessment securely. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      BeingSecurityAPI.Memory.unregister(operationId);
      setIsProcessing(false);
    }
  }, [encrypt, updateData, actions]);

  /**
   * Load and decrypt existing assessment
   */
  const loadAssessment = useCallback(async () => {
    if (!assessment || !assessment.encrypted) return;

    const operationId = `load_assessment_${Date.now()}`;

    try {
      BeingSecurityAPI.Memory.register(operationId, () => {
        console.log('[SECURITY] Cleanup assessment loading');
      });

      // In a real app, you would decrypt the stored data
      console.log('[SECURITY] Assessment loaded securely');

    } catch (error) {
      await actions.reportIncident(
        error as Error,
        'DECRYPTION_FAILURE',
        'assessment_loading'
      );
    } finally {
      BeingSecurityAPI.Memory.unregister(operationId);
    }
  }, [assessment, actions]);

  // Load assessment on mount
  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  // Security status indicator
  const SecurityStatus = () => (
    <View style={styles.securityStatus}>
      <Text style={[
        styles.securityText,
        { color: isSecure && contextSecure ? '#4A7C59' : '#FF6B6B' }
      ]}>
        Security: {isSecure && contextSecure ? '✅ Secure' : '⚠️ Issues'}
      </Text>

      {threats.length > 0 && (
        <Text style={styles.threatText}>
          Threats: {threats.join(', ')}
        </Text>
      )}

      {!inputValid && validationErrors.length > 0 && (
        <Text style={styles.validationText}>
          Input Issues: {validationErrors.join(', ')}
        </Text>
      )}
    </View>
  );

  // Performance metrics (dev only)
  const PerformanceMetrics = () => {
    if (!__DEV__) return null;

    return (
      <View style={styles.metricsContainer}>
        <Text style={styles.metricsTitle}>Security Metrics (Dev)</Text>
        <Text>Incidents: {metrics.incidents.total} (Critical: {metrics.incidents.critical})</Text>
        <Text>Memory: {metrics.memory.activeOperations} operations</Text>
        <Text>Encryption: {encryptionMetrics.operationsCount} ops, {encryptionMetrics.errorCount} errors</Text>
        <Text>Input Validation: {inputValid ? 'Valid' : 'Invalid'}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SecurityStatus />

      <Text style={styles.title}>Secure PHQ-9 Assessment</Text>

      {currentQuestion < questions.length ? (
        <View style={styles.questionContainer}>
          <Text style={styles.questionNumber}>
            Question {currentQuestion + 1} of {questions.length}
          </Text>

          <Text style={styles.questionText}>
            {questions[currentQuestion]}
          </Text>

          <Text style={styles.instructionText}>
            Rate how often you've been bothered by this (0-3):
          </Text>

          <TextInput
            style={[
              styles.input,
              !inputValid && styles.inputError
            ]}
            value={userInput}
            onChangeText={setUserInput}
            placeholder="Enter 0, 1, 2, or 3"
            keyboardType="numeric"
            maxLength={1}
            editable={!isProcessing}
          />

          {sanitizedValue !== userInput && (
            <Text style={styles.sanitizedText}>
              Sanitized input: "{sanitizedValue}"
            </Text>
          )}

          <Pressable
            style={[
              styles.button,
              (!inputValid || isProcessing) && styles.buttonDisabled
            ]}
            onPress={() => handleResponseInput(userInput)}
            disabled={!inputValid || isProcessing}
          >
            <Text style={styles.buttonText}>
              {currentQuestion === questions.length - 1 ? 'Complete Assessment' : 'Next Question'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.completeContainer}>
          <Text style={styles.completeText}>
            Assessment ready to complete with {responses.length} responses
          </Text>

          <Pressable
            style={[styles.button, isProcessing && styles.buttonDisabled]}
            onPress={() => completeAssessment(responses)}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>
              {isProcessing ? 'Securing Data...' : 'Finalize Assessment'}
            </Text>
          </Pressable>
        </View>
      )}

      {assessment && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Previous Assessment</Text>
          <Text>Type: {assessment.type}</Text>
          <Text>Score: {assessment.totalScore}</Text>
          <Text>Encrypted: {assessment.encrypted ? 'Yes' : 'No'}</Text>
          <Text>Date: {new Date(assessment.timestamp).toLocaleDateString()}</Text>
        </View>
      )}

      <PerformanceMetrics />
    </View>
  );
}

/**
 * Main secure component with error boundary
 */
export function SecureComponentExample() {
  return (
    <AssessmentErrorBoundary>
      <AssessmentProvider>
        <SecureAssessmentForm />
      </AssessmentProvider>
    </AssessmentErrorBoundary>
  );
}

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F9F9F9'
  },
  securityStatus: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5'
  },
  securityText: {
    fontSize: 16,
    fontWeight: '600'
  },
  threatText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 4
  },
  validationText: {
    fontSize: 14,
    color: '#FF9500',
    marginTop: 4
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B2951',
    textAlign: 'center',
    marginBottom: 20
  },
  questionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  questionNumber: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8
  },
  questionText: {
    fontSize: 18,
    color: '#1B2951',
    marginBottom: 12,
    lineHeight: 24
  },
  instructionText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16
  },
  inputError: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5'
  },
  sanitizedText: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 16
  },
  button: {
    backgroundColor: '#4A7C59',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center'
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC'
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  completeContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center'
  },
  completeText: {
    fontSize: 16,
    color: '#1B2951',
    textAlign: 'center',
    marginBottom: 20
  },
  resultContainer: {
    backgroundColor: '#F0F8F0',
    padding: 16,
    borderRadius: 8,
    marginTop: 20
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A7C59',
    marginBottom: 8
  },
  metricsContainer: {
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    marginTop: 20
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#996633',
    marginBottom: 8
  }
});

export default SecureComponentExample;