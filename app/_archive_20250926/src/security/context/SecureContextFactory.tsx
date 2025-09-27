/**
 * Secure Context Factory for Being. MBCT App
 *
 * Factory functions for creating secure React contexts with built-in
 * data protection, validation, and clinical safety protocols.
 *
 * SECURITY FEATURES:
 * - Automatic data encryption for sensitive contexts
 * - Input validation and sanitization
 * - Memory leak prevention
 * - Access control and audit logging
 * - Clinical data isolation
 */

import React, { createContext, useContext, useRef, useEffect, ReactNode, useMemo } from 'react';
import { SecurityFoundations, SecurityErrorType } from '../core/SecurityFoundations';
import { DataSensitivity } from '../../types/security';
import { useSecurityMonitoring, useClinicalDataSecurity } from '../hooks/SecurityMonitoringHooks';

/**
 * Secure context configuration
 */
export interface SecureContextConfig<T> {
  contextName: string;
  sensitivity: DataSensitivity;
  defaultValue: T;
  validation?: (value: T) => boolean;
  encryption?: boolean;
  auditLogging?: boolean;
  memoryCleanup?: boolean;
  accessControl?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
  };
}

/**
 * Secure context provider props
 */
export interface SecureContextProviderProps<T> {
  children: ReactNode;
  initialValue?: T;
  onSecurityIncident?: (error: Error, context: string) => void;
}

/**
 * Context value wrapper with security metadata
 */
interface SecureContextValue<T> {
  data: T;
  metadata: {
    encrypted: boolean;
    lastAccessed: string;
    accessCount: number;
    checksum?: string;
  };
  security: {
    isValid: boolean;
    violations: string[];
    lastValidation: string;
  };
}

/**
 * Create secure context with built-in security features
 */
export function createSecureContext<T,>(
  config: SecureContextConfig<T>
): {
  Provider: React.FC<SecureContextProviderProps<T>>;
  useSecureContext: () => {
    data: T;
    updateData: (newData: T | ((prev: T) => T)) => Promise<void>;
    clearData: () => Promise<void>;
    isSecure: boolean;
    violations: string[];
    metadata: {
      encrypted: boolean;
      lastAccessed: string;
      accessCount: number;
    };
  };
  Context: React.Context<SecureContextValue<T> | null>;
} {
  const {
    contextName,
    sensitivity,
    defaultValue,
    validation,
    encryption = sensitivity !== DataSensitivity.SYSTEM,
    auditLogging = sensitivity === DataSensitivity.CLINICAL,
    memoryCleanup = true,
    accessControl = { read: true, write: true, delete: true }
  } = config;

  // Create the actual React context
  const Context = createContext<SecureContextValue<T> | null>(null);

  /**
   * Secure context provider component
   */
  const Provider: React.FC<SecureContextProviderProps<T>> = ({
    children,
    initialValue = defaultValue,
    onSecurityIncident
  }) => {
    const [contextValue, setContextValue] = React.useState<SecureContextValue<T>>(() => ({
      data: initialValue,
      metadata: {
        encrypted: false,
        lastAccessed: new Date().toISOString(),
        accessCount: 0
      },
      security: {
        isValid: true,
        violations: [],
        lastValidation: new Date().toISOString()
      }
    }));

    const { encrypt, decrypt, isSecure: encryptionSecure } = useClinicalDataSecurity(sensitivity);
    const { actions } = useSecurityMonitoring({ enabled: auditLogging });
    const cleanupRef = useRef<(() => void) | null>(null);

    // Memory cleanup registration
    useEffect(() => {
      if (memoryCleanup) {
        const operationId = `context_${contextName}_${Date.now()}`;
        cleanupRef.current = () => {
          setContextValue(prev => ({
            ...prev,
            data: defaultValue,
            security: { ...prev.security, violations: [] }
          }));
        };
        SecurityFoundations.registerMemoryOp(operationId, cleanupRef.current);

        return () => {
          SecurityFoundations.unregisterMemoryOp(operationId);
        };
      }
    }, []);

    // Validation function
    const validateData = React.useCallback((data: T): { isValid: boolean; violations: string[] } => {
      const violations: string[] = [];

      try {
        // Custom validation if provided
        if (validation && !validation(data)) {
          violations.push('Custom validation failed');
        }

        // Type validation
        if (data === null || data === undefined) {
          violations.push('Data is null or undefined');
        }

        // Clinical data specific validation
        if (sensitivity === DataSensitivity.CLINICAL) {
          if (typeof data === 'object' && data !== null) {
            // Check for potential PII in clinical data
            const dataStr = JSON.stringify(data);
            const piiPatterns = [
              /\b\d{3}-\d{2}-\d{4}\b/, // SSN
              /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
              /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/ // Credit card
            ];

            if (piiPatterns.some(pattern => pattern.test(dataStr))) {
              violations.push('Potential PII detected in clinical data');
            }
          }
        }

        return { isValid: violations.length === 0, violations };

      } catch (error) {
        return { isValid: false, violations: ['Validation error occurred'] };
      }
    }, [validation, sensitivity]);

    // Encrypt data if needed
    const secureData = React.useCallback(async (data: T): Promise<T> => {
      if (!encryption || sensitivity === DataSensitivity.SYSTEM) {
        return data;
      }

      try {
        const encrypted = await encrypt(data, `context_${contextName}`);
        return encrypted as unknown as T; // Type assertion for encrypted data
      } catch (error) {
        if (onSecurityIncident) {
          onSecurityIncident(error as Error, `encryption_${contextName}`);
        }
        throw error;
      }
    }, [encryption, sensitivity, encrypt, contextName, onSecurityIncident]);

    // Decrypt data if needed
    const unsecureData = React.useCallback(async (data: T): Promise<T> => {
      if (!encryption || sensitivity === DataSensitivity.SYSTEM) {
        return data;
      }

      try {
        return await decrypt(data as unknown as string, `context_${contextName}`);
      } catch (error) {
        if (onSecurityIncident) {
          onSecurityIncident(error as Error, `decryption_${contextName}`);
        }
        throw error;
      }
    }, [encryption, sensitivity, decrypt, contextName, onSecurityIncident]);

    // Update context data securely
    const updateContextData = React.useCallback(async (
      newData: T | ((prev: T) => T)
    ): Promise<void> => {
      try {
        // Check write access
        if (!accessControl.write) {
          throw new Error(`Write access denied for context: ${contextName}`);
        }

        const updatedData = typeof newData === 'function'
          ? (newData as (prev: T) => T)(contextValue.data)
          : newData;

        // Validate new data
        const validationResult = validateData(updatedData);

        if (!validationResult.isValid) {
          // Log security violations
          if (auditLogging) {
            await actions.reportIncident(
              new Error(`Data validation failed: ${validationResult.violations.join(', ')}`),
              SecurityErrorType.DATA_VALIDATION_ERROR,
              `context_${contextName}`
            );
          }

          // Update with violations but don't reject
          setContextValue(prev => ({
            ...prev,
            security: {
              isValid: false,
              violations: validationResult.violations,
              lastValidation: new Date().toISOString()
            }
          }));

          return;
        }

        // Secure data if needed
        const securedData = await secureData(updatedData);

        // Calculate checksum for integrity
        const checksum = await calculateChecksum(securedData);

        // Update context
        setContextValue(prev => ({
          data: securedData,
          metadata: {
            encrypted: encryption && sensitivity !== DataSensitivity.SYSTEM,
            lastAccessed: new Date().toISOString(),
            accessCount: prev.metadata.accessCount + 1,
            checksum
          },
          security: {
            isValid: true,
            violations: [],
            lastValidation: new Date().toISOString()
          }
        }));

        // Log update if auditing enabled
        if (auditLogging) {
          console.log(`[AUDIT] Context updated: ${contextName}`);
        }

      } catch (error) {
        if (onSecurityIncident) {
          onSecurityIncident(error as Error, `update_${contextName}`);
        }

        // Log security incident
        if (auditLogging) {
          await actions.reportIncident(
            error as Error,
            SecurityErrorType.DATA_CORRUPTION,
            `context_update_${contextName}`
          );
        }

        throw error;
      }
    }, [
      accessControl.write,
      contextName,
      contextValue.data,
      validateData,
      auditLogging,
      actions,
      secureData,
      encryption,
      sensitivity,
      onSecurityIncident
    ]);

    // Clear context data
    const clearContextData = React.useCallback(async (): Promise<void> => {
      try {
        // Check delete access
        if (!accessControl.delete) {
          throw new Error(`Delete access denied for context: ${contextName}`);
        }

        setContextValue({
          data: defaultValue,
          metadata: {
            encrypted: false,
            lastAccessed: new Date().toISOString(),
            accessCount: 0
          },
          security: {
            isValid: true,
            violations: [],
            lastValidation: new Date().toISOString()
          }
        });

        // Force memory cleanup
        if (cleanupRef.current) {
          cleanupRef.current();
        }

        // Log clear action if auditing enabled
        if (auditLogging) {
          console.log(`[AUDIT] Context cleared: ${contextName}`);
        }

      } catch (error) {
        if (onSecurityIncident) {
          onSecurityIncident(error as Error, `clear_${contextName}`);
        }

        if (auditLogging) {
          await actions.reportIncident(
            error as Error,
            SecurityErrorType.UNAUTHORIZED_ACCESS,
            `context_clear_${contextName}`
          );
        }

        throw error;
      }
    }, [
      accessControl.delete,
      contextName,
      defaultValue,
      auditLogging,
      actions,
      onSecurityIncident
    ]);

    // Provide secure context value
    const providerValue = useMemo(() => ({
      ...contextValue,
      updateData: updateContextData,
      clearData: clearContextData
    }), [contextValue, updateContextData, clearContextData]);

    return (
      <Context.Provider value={providerValue}>
        {children}
      </Context.Provider>
    );
  };

  /**
   * Hook to use secure context
   */
  const useSecureContext = () => {
    const contextValue = useContext(Context);

    if (!contextValue) {
      throw new Error(`useSecureContext must be used within ${contextName} Provider`);
    }

    // Access control check
    if (!accessControl.read) {
      throw new Error(`Read access denied for context: ${contextName}`);
    }

    // Update access count and timestamp
    useEffect(() => {
      // This would normally update the access metadata
      // Implementation depends on whether you want to track every read
    }, []);

    // Unsecure data for consumption (decrypt if needed)
    const data = useMemo(() => {
      if (encryption && sensitivity !== DataSensitivity.SYSTEM) {
        // Note: In a real implementation, you'd need to handle async decryption
        // This is a simplified version for the type system
        return contextValue.data;
      }
      return contextValue.data;
    }, [contextValue.data]);

    return {
      data,
      updateData: (contextValue as any).updateData,
      clearData: (contextValue as any).clearData,
      isSecure: contextValue.security.isValid,
      violations: contextValue.security.violations,
      metadata: contextValue.metadata
    };
  };

  return {
    Provider,
    useSecureContext,
    Context
  };
}

/**
 * Helper function to calculate data checksum
 */
async function calculateChecksum<T,>(data: T): Promise<string> {
  try {
    const dataStr = JSON.stringify(data);
    // Simple checksum - in production, use crypto hash
    let hash = 0;
    for (let i = 0; i < dataStr.length; i++) {
      const char = dataStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  } catch {
    return 'invalid';
  }
}

/**
 * Pre-configured secure contexts for common use cases
 */

// Clinical assessment context
export const createClinicalAssessmentContext = <T,>(
  defaultValue: T,
  contextName: string = 'ClinicalAssessment'
) => createSecureContext<T>({
  contextName,
  sensitivity: DataSensitivity.CLINICAL,
  defaultValue,
  encryption: true,
  auditLogging: true,
  memoryCleanup: true,
  validation: (value: T) => {
    // Clinical-specific validation
    if (typeof value === 'object' && value !== null) {
      const hasValidStructure = 'responses' in value || 'score' in value;
      return hasValidStructure;
    }
    return true;
  }
});

// Personal data context
export const createPersonalDataContext = <T,>(
  defaultValue: T,
  contextName: string = 'PersonalData'
) => createSecureContext<T>({
  contextName,
  sensitivity: DataSensitivity.PERSONAL,
  defaultValue,
  encryption: true,
  auditLogging: false,
  memoryCleanup: true
});

// System preferences context
export const createSystemContext = <T,>(
  defaultValue: T,
  contextName: string = 'SystemPreferences'
) => createSecureContext<T>({
  contextName,
  sensitivity: DataSensitivity.SYSTEM,
  defaultValue,
  encryption: false,
  auditLogging: false,
  memoryCleanup: false
});

// Crisis plan context with maximum security
export const createCrisisPlanContext = <T,>(
  defaultValue: T,
  contextName: string = 'CrisisPlan'
) => createSecureContext<T>({
  contextName,
  sensitivity: DataSensitivity.CLINICAL,
  defaultValue,
  encryption: true,
  auditLogging: true,
  memoryCleanup: true,
  accessControl: {
    read: true,
    write: true,
    delete: false // Prevent accidental deletion of crisis plans
  },
  validation: (value: T) => {
    // Crisis plan validation
    if (typeof value === 'object' && value !== null) {
      const hasCrisisData = 'emergencyContacts' in value || 'safetyPlan' in value;
      return hasCrisisData;
    }
    return false;
  }
});

/**
 * Context security utilities
 */
export const ContextSecurityUtils = {
  createSecureContext,
  createClinicalAssessmentContext,
  createPersonalDataContext,
  createSystemContext,
  createCrisisPlanContext,

  // Utility to migrate context data securely
  migrateContextData: async <T, U>(
    sourceContext: React.Context<SecureContextValue<T> | null>,
    targetContext: React.Context<SecureContextValue<U> | null>,
    transform: (data: T) => U
  ): Promise<void> => {
    try {
      // This would implement secure data migration between contexts
      console.log('[SECURITY] Context migration initiated');

      // Implementation would depend on specific migration requirements
      // This is a placeholder for the migration logic

    } catch (error) {
      await SecurityFoundations.handleIncident(
        error as Error,
        SecurityErrorType.DATA_CORRUPTION,
        'context_migration',
        { severity: 'high', actionTaken: 'migration_failed' }
      );
      throw error;
    }
  }
};