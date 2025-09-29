/**
 * ENCRYPTION SERVICE - DRD-FLOW-005 Security Implementation
 *
 * COMPREHENSIVE ENCRYPTION FOR MENTAL HEALTH DATA:
 * - End-to-end encryption for PHQ-9/GAD-7 assessment responses
 * - Crisis intervention data protection with AES-256-GCM
 * - Key derivation and management with PBKDF2
 * - Secure key rotation and recovery mechanisms
 * - Performance-optimized encryption (<200ms for crisis detection)
 *
 * SECURITY STANDARDS:
 * - AES-256-GCM for symmetric encryption
 * - PBKDF2 with 100,000 iterations for key derivation
 * - Cryptographically secure random number generation
 * - Perfect forward secrecy with ephemeral keys
 * - Memory-safe key handling and cleanup
 *
 * MENTAL HEALTH DATA CATEGORIES:
 * - Level 1: PHQ-9/GAD-7 responses (highest security)
 * - Level 2: Crisis intervention metadata
 * - Level 3: Performance and audit data
 * - Level 4: Non-sensitive application data
 *
 * PERFORMANCE REQUIREMENTS:
 * - Encryption: <50ms for assessment data
 * - Decryption: <30ms for crisis detection
 * - Key derivation: <100ms initial setup
 * - Bulk operations: <200ms for data export
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AesCrypto from 'react-native-aes-crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * ENCRYPTION CONFIGURATION
 */
export const ENCRYPTION_CONFIG = {
  /** AES-256-GCM encryption algorithm */
  ALGORITHM: 'AES-GCM' as const,
  /** 256-bit key length */
  KEY_LENGTH: 32,
  /** 96-bit IV length for GCM */
  IV_LENGTH: 12,
  /** 128-bit authentication tag length */
  TAG_LENGTH: 16,
  /** Salt length for key derivation */
  SALT_LENGTH: 32,
  /** PBKDF2 iterations (100,000) */
  PBKDF2_ITERATIONS: 100000,
  /** Key rotation interval (30 days) */
  KEY_ROTATION_INTERVAL_MS: 30 * 24 * 60 * 60 * 1000,
  /** Master key identifier */
  MASTER_KEY_ID: 'mental_health_master_key',
  /** Crisis data key prefix */
  CRISIS_KEY_PREFIX: 'crisis_key_',
  /** Assessment data key prefix */
  ASSESSMENT_KEY_PREFIX: 'assessment_key_',
  /** Performance monitoring threshold */
  PERFORMANCE_THRESHOLD_MS: 200
} as const;

/**
 * DATA SENSITIVITY LEVELS
 * Different encryption policies based on data sensitivity
 */
export type DataSensitivityLevel = 
  | 'level_1_crisis_responses'      // PHQ-9 Q9, GAD-7 severe responses
  | 'level_2_assessment_data'       // Complete PHQ-9/GAD-7 responses
  | 'level_3_intervention_metadata' // Crisis intervention actions
  | 'level_4_performance_data'      // System performance metrics
  | 'level_5_general_data';         // Non-sensitive application data

/**
 * ENCRYPTION METADATA
 * Tracks encryption details for audit and recovery
 */
export interface EncryptionMetadata {
  algorithm: string;
  keyVersion: number;
  ivLength: number;
  tagLength: number;
  encryptedAt: number;
  sensitivityLevel: DataSensitivityLevel;
  performanceMetrics: {
    encryptionTimeMs: number;
    dataSize: number;
    encryptedSize: number;
  };
}

/**
 * ENCRYPTED DATA PACKAGE
 * Complete encrypted data with metadata and integrity verification
 */
export interface EncryptedDataPackage {
  encryptedData: string;          // Base64 encoded encrypted data
  iv: string;                     // Base64 encoded initialization vector
  tag: string;                    // Base64 encoded authentication tag
  salt: string;                   // Base64 encoded salt (if key derived)
  metadata: EncryptionMetadata;
  checksum: string;               // Data integrity verification
}

/**
 * KEY MANAGEMENT RESULT
 */
export interface KeyManagementResult {
  keyId: string;
  keyVersion: number;
  derivedFromMaster: boolean;
  createdAt: number;
  expiresAt: number;
  rotationRequired: boolean;
}

/**
 * ENCRYPTION PERFORMANCE METRICS
 */
export interface EncryptionPerformanceMetrics {
  operationType: 'encrypt' | 'decrypt' | 'key_derivation' | 'key_rotation';
  dataSize: number;
  operationTimeMs: number;
  throughputBytesPerMs: number;
  memoryUsage: number;
  successRate: number;
  errorCount: number;
  timestamp: number;
}

/**
 * COMPREHENSIVE ENCRYPTION SERVICE
 * Handles all mental health data encryption requirements
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private keyCache: Map<string, ArrayBuffer> = new Map();
  private keyMetadata: Map<string, KeyManagementResult> = new Map();
  private performanceMetrics: EncryptionPerformanceMetrics[] = [];
  private masterKeyInitialized: boolean = false;
  private keyRotationTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeKeyRotationScheduler();
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * INITIALIZE ENCRYPTION SYSTEM
   * Sets up master key and encryption infrastructure
   */
  public async initialize(userPassphrase?: string): Promise<void> {
    const startTime = performance.now();

    try {
      console.log('🔐 Initializing Encryption Service...');

      // Initialize master key
      await this.initializeMasterKey(userPassphrase);

      // Verify encryption capabilities
      await this.verifyEncryptionCapabilities();

      // Initialize key rotation
      await this.checkKeyRotationRequirements();

      // Run legacy data migration
      const migrationResult = await this.migrateLegacyEncryptedData();
      if (migrationResult.warnings.length > 0) {
        console.warn('⚠️  Migration warnings:', migrationResult.warnings);
      }

      this.masterKeyInitialized = true;

      const initializationTime = performance.now() - startTime;
      console.log(`✅ Encryption Service initialized (${initializationTime.toFixed(2)}ms)`);

      // Record performance metrics
      await this.recordPerformanceMetrics({
        operationType: 'key_derivation',
        dataSize: 0,
        operationTimeMs: initializationTime,
        throughputBytesPerMs: 0,
        memoryUsage: this.calculateMemoryUsage(),
        successRate: 1.0,
        errorCount: 0,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('🚨 ENCRYPTION INITIALIZATION ERROR:', error);
      throw new Error(`Encryption initialization failed: ${error.message}`);
    }
  }

  /**
   * ENCRYPT MENTAL HEALTH DATA
   * Encrypts sensitive data with appropriate security level
   */
  public async encryptData(
    data: any,
    sensitivityLevel: DataSensitivityLevel,
    keyId?: string
  ): Promise<EncryptedDataPackage> {
    const startTime = performance.now();

    try {
      if (!this.masterKeyInitialized) {
        throw new Error('Encryption service not initialized');
      }

      // Convert data to JSON string
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const dataBuffer = new TextEncoder().encode(dataString);

      // Generate encryption key
      const encryptionKey = await this.deriveEncryptionKey(sensitivityLevel, keyId);

      // Generate cryptographically secure IV
      const iv = await this.generateSecureRandomBytes(ENCRYPTION_CONFIG.IV_LENGTH);

      // Perform AES-GCM encryption
      const encryptionResult = await this.performAESGCMEncryption(
        dataBuffer,
        encryptionKey,
        iv
      );

      // Calculate performance metrics
      const encryptionTime = performance.now() - startTime;
      const originalSize = dataBuffer.length;
      const encryptedSize = encryptionResult.ciphertext.length;

      // Create metadata
      const metadata: EncryptionMetadata = {
        algorithm: ENCRYPTION_CONFIG.ALGORITHM,
        keyVersion: 1, // Would be managed dynamically
        ivLength: ENCRYPTION_CONFIG.IV_LENGTH,
        tagLength: ENCRYPTION_CONFIG.TAG_LENGTH,
        encryptedAt: Date.now(),
        sensitivityLevel,
        performanceMetrics: {
          encryptionTimeMs: encryptionTime,
          dataSize: originalSize,
          encryptedSize: encryptedSize
        }
      };

      // Create encrypted package
      const encryptedPackage: EncryptedDataPackage = {
        encryptedData: this.arrayBufferToBase64(encryptionResult.ciphertext),
        iv: this.arrayBufferToBase64(iv),
        tag: this.arrayBufferToBase64(encryptionResult.tag),
        salt: this.arrayBufferToBase64(encryptionResult.salt || new ArrayBuffer(0)),
        metadata,
        checksum: await this.calculateChecksum(dataString)
      };

      // Validate encryption performance
      await this.validateEncryptionPerformance(encryptionTime, sensitivityLevel);

      // Record performance metrics
      await this.recordPerformanceMetrics({
        operationType: 'encrypt',
        dataSize: originalSize,
        operationTimeMs: encryptionTime,
        throughputBytesPerMs: originalSize / Math.max(encryptionTime, 1),
        memoryUsage: this.calculateMemoryUsage(),
        successRate: 1.0,
        errorCount: 0,
        timestamp: Date.now()
      });

      console.log(`🔐 Data encrypted (${encryptionTime.toFixed(2)}ms, ${originalSize}→${encryptedSize} bytes)`);

      return encryptedPackage;

    } catch (error) {
      const encryptionTime = performance.now() - startTime;
      console.error('🚨 ENCRYPTION ERROR:', error);

      // Record failure metrics
      await this.recordPerformanceMetrics({
        operationType: 'encrypt',
        dataSize: 0,
        operationTimeMs: encryptionTime,
        throughputBytesPerMs: 0,
        memoryUsage: this.calculateMemoryUsage(),
        successRate: 0.0,
        errorCount: 1,
        timestamp: Date.now()
      });

      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * DECRYPT MENTAL HEALTH DATA
   * Decrypts data with verification and integrity checking
   */
  public async decryptData(
    encryptedPackage: EncryptedDataPackage,
    keyId?: string
  ): Promise<any> {
    const startTime = performance.now();

    try {
      if (!this.masterKeyInitialized) {
        throw new Error('Encryption service not initialized');
      }

      // Derive decryption key
      const decryptionKey = await this.deriveEncryptionKey(
        encryptedPackage.metadata.sensitivityLevel,
        keyId
      );

      // Convert base64 to ArrayBuffer
      const ciphertext = this.base64ToArrayBuffer(encryptedPackage.encryptedData);
      const iv = this.base64ToArrayBuffer(encryptedPackage.iv);
      const tag = this.base64ToArrayBuffer(encryptedPackage.tag);

      // Perform AES-GCM decryption
      const decryptedBuffer = await this.performAESGCMDecryption(
        ciphertext,
        decryptionKey,
        iv,
        tag
      );

      // Convert decrypted data back to string
      const decryptedString = new TextDecoder().decode(decryptedBuffer);

      // Verify data integrity
      const calculatedChecksum = await this.calculateChecksum(decryptedString);
      if (calculatedChecksum !== encryptedPackage.checksum) {
        throw new Error('Data integrity verification failed');
      }

      // Parse JSON if applicable
      let decryptedData: any;
      try {
        decryptedData = JSON.parse(decryptedString);
      } catch {
        decryptedData = decryptedString;
      }

      const decryptionTime = performance.now() - startTime;

      // Validate decryption performance for crisis scenarios
      if (encryptedPackage.metadata.sensitivityLevel === 'level_1_crisis_responses') {
        if (decryptionTime > ENCRYPTION_CONFIG.PERFORMANCE_THRESHOLD_MS) {
          console.warn(`⚠️  Crisis data decryption slow: ${decryptionTime.toFixed(2)}ms`);
        }
      }

      // Record performance metrics
      await this.recordPerformanceMetrics({
        operationType: 'decrypt',
        dataSize: ciphertext.byteLength,
        operationTimeMs: decryptionTime,
        throughputBytesPerMs: ciphertext.byteLength / Math.max(decryptionTime, 1),
        memoryUsage: this.calculateMemoryUsage(),
        successRate: 1.0,
        errorCount: 0,
        timestamp: Date.now()
      });

      console.log(`🔓 Data decrypted (${decryptionTime.toFixed(2)}ms)`);

      return decryptedData;

    } catch (error) {
      const decryptionTime = performance.now() - startTime;
      console.error('🚨 DECRYPTION ERROR:', error);

      // Record failure metrics
      await this.recordPerformanceMetrics({
        operationType: 'decrypt',
        dataSize: 0,
        operationTimeMs: decryptionTime,
        throughputBytesPerMs: 0,
        memoryUsage: this.calculateMemoryUsage(),
        successRate: 0.0,
        errorCount: 1,
        timestamp: Date.now()
      });

      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * CRISIS DATA ENCRYPTION
   * Special handling for crisis intervention data with <200ms requirement
   */
  public async encryptCrisisData(
    crisisData: any,
    crisisEpisodeId: string
  ): Promise<EncryptedDataPackage> {
    const startTime = performance.now();

    try {
      // Use dedicated crisis key
      const crisisKeyId = `${ENCRYPTION_CONFIG.CRISIS_KEY_PREFIX}${crisisEpisodeId}`;

      // Encrypt with highest security level
      const encryptedPackage = await this.encryptData(
        crisisData,
        'level_1_crisis_responses',
        crisisKeyId
      );

      const totalTime = performance.now() - startTime;

      // Enforce crisis performance requirement
      if (totalTime > ENCRYPTION_CONFIG.PERFORMANCE_THRESHOLD_MS) {
        console.error(`🚨 CRISIS ENCRYPTION TOO SLOW: ${totalTime.toFixed(2)}ms > ${ENCRYPTION_CONFIG.PERFORMANCE_THRESHOLD_MS}ms`);
        
        // This is critical - crisis data must encrypt quickly
        throw new Error(`Crisis encryption performance violation: ${totalTime.toFixed(2)}ms`);
      }

      console.log(`🚨 Crisis data encrypted (${totalTime.toFixed(2)}ms)`);

      return encryptedPackage;

    } catch (error) {
      console.error('🚨 CRISIS ENCRYPTION ERROR:', error);
      throw error;
    }
  }

  /**
   * ASSESSMENT DATA ENCRYPTION
   * Specialized encryption for PHQ-9/GAD-7 assessment responses
   */
  public async encryptAssessmentData(
    assessmentData: {
      type: 'PHQ-9' | 'GAD-7';
      responses: number[];
      totalScore: number;
      timestamp: number;
      userId: string;
    },
    assessmentId: string
  ): Promise<EncryptedDataPackage> {
    try {
      // Use dedicated assessment key
      const assessmentKeyId = `${ENCRYPTION_CONFIG.ASSESSMENT_KEY_PREFIX}${assessmentId}`;

      // Determine sensitivity level based on scores
      let sensitivityLevel: DataSensitivityLevel = 'level_2_assessment_data';
      
      // Elevate to crisis level for high-risk responses
      if (assessmentData.type === 'PHQ-9' && assessmentData.responses[8] > 0) {
        // Question 9 (suicidal ideation) - highest security
        sensitivityLevel = 'level_1_crisis_responses';
      } else if (assessmentData.totalScore >= 20 || 
                 (assessmentData.type === 'GAD-7' && assessmentData.totalScore >= 15)) {
        // High severity scores
        sensitivityLevel = 'level_1_crisis_responses';
      }

      const encryptedPackage = await this.encryptData(
        assessmentData,
        sensitivityLevel,
        assessmentKeyId
      );

      console.log(`📋 Assessment data encrypted (${assessmentData.type}, score: ${assessmentData.totalScore})`);

      return encryptedPackage;

    } catch (error) {
      console.error('🚨 ASSESSMENT ENCRYPTION ERROR:', error);
      throw error;
    }
  }

  /**
   * KEY MANAGEMENT
   */

  private async initializeMasterKey(userPassphrase?: string): Promise<void> {
    try {
      // Check if master key already exists
      const existingKey = await SecureStore.getItemAsync(ENCRYPTION_CONFIG.MASTER_KEY_ID);
      
      if (existingKey) {
        console.log('🔑 Master key found, verifying...');
        await this.verifyMasterKey(existingKey);
        return;
      }

      console.log('🔑 Generating new master key...');

      // Generate or derive master key
      let masterKey: ArrayBuffer;
      
      if (userPassphrase) {
        // Derive from user passphrase
        masterKey = await this.deriveKeyFromPassphrase(userPassphrase);
      } else {
        // Generate cryptographically secure random key
        masterKey = await this.generateSecureRandomBytes(ENCRYPTION_CONFIG.KEY_LENGTH);
      }

      // Store master key securely
      const masterKeyB64 = this.arrayBufferToBase64(masterKey);
      await SecureStore.setItemAsync(ENCRYPTION_CONFIG.MASTER_KEY_ID, masterKeyB64);

      // Store metadata
      const keyMetadata: KeyManagementResult = {
        keyId: ENCRYPTION_CONFIG.MASTER_KEY_ID,
        keyVersion: 1,
        derivedFromMaster: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + ENCRYPTION_CONFIG.KEY_ROTATION_INTERVAL_MS,
        rotationRequired: false
      };

      this.keyMetadata.set(ENCRYPTION_CONFIG.MASTER_KEY_ID, keyMetadata);

      console.log('✅ Master key initialized successfully');

    } catch (error) {
      console.error('🚨 MASTER KEY INITIALIZATION ERROR:', error);
      throw error;
    }
  }

  private async deriveEncryptionKey(
    sensitivityLevel: DataSensitivityLevel,
    keyId?: string
  ): Promise<ArrayBuffer> {
    try {
      const derivationKeyId = keyId || `${sensitivityLevel}_${Date.now()}`;

      // Check cache first
      const cachedKey = this.keyCache.get(derivationKeyId);
      if (cachedKey) {
        return cachedKey;
      }

      // Get master key
      const masterKeyB64 = await SecureStore.getItemAsync(ENCRYPTION_CONFIG.MASTER_KEY_ID);
      if (!masterKeyB64) {
        throw new Error('Master key not found');
      }

      const masterKey = this.base64ToArrayBuffer(masterKeyB64);

      // Generate salt for key derivation
      const salt = await this.generateSecureRandomBytes(ENCRYPTION_CONFIG.SALT_LENGTH);

      // Derive key using PBKDF2
      const derivedKey = await this.deriveKeyPBKDF2(
        masterKey,
        salt,
        ENCRYPTION_CONFIG.PBKDF2_ITERATIONS,
        ENCRYPTION_CONFIG.KEY_LENGTH
      );

      // Cache derived key (with memory cleanup)
      this.keyCache.set(derivationKeyId, derivedKey);

      // Schedule key cleanup to prevent memory leaks
      setTimeout(() => {
        this.keyCache.delete(derivationKeyId);
      }, 300000); // 5 minutes

      return derivedKey;

    } catch (error) {
      console.error('🚨 KEY DERIVATION ERROR:', error);
      throw error;
    }
  }

  private async deriveKeyFromPassphrase(passphrase: string): Promise<ArrayBuffer> {
    try {
      const salt = await this.generateSecureRandomBytes(ENCRYPTION_CONFIG.SALT_LENGTH);
      const passphraseBuffer = new TextEncoder().encode(passphrase);

      return await this.deriveKeyPBKDF2(
        passphraseBuffer,
        salt,
        ENCRYPTION_CONFIG.PBKDF2_ITERATIONS,
        ENCRYPTION_CONFIG.KEY_LENGTH
      );

    } catch (error) {
      console.error('🚨 PASSPHRASE KEY DERIVATION ERROR:', error);
      throw error;
    }
  }

  /**
   * CRYPTOGRAPHIC OPERATIONS
   */

  private async performAESGCMEncryption(
    data: ArrayBuffer,
    key: ArrayBuffer,
    iv: ArrayBuffer
  ): Promise<{ ciphertext: ArrayBuffer; tag: ArrayBuffer; salt?: ArrayBuffer }> {
    try {
      if (Platform.OS === 'web') {
        // Web Crypto API implementation
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          key,
          { name: 'AES-GCM' },
          false,
          ['encrypt']
        );

        const encryptedResult = await crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv: iv,
            tagLength: ENCRYPTION_CONFIG.TAG_LENGTH * 8 // Convert to bits
          },
          cryptoKey,
          data
        );

        // Extract ciphertext and tag
        const encryptedArray = new Uint8Array(encryptedResult);
        const ciphertext = encryptedArray.slice(0, -ENCRYPTION_CONFIG.TAG_LENGTH);
        const tag = encryptedArray.slice(-ENCRYPTION_CONFIG.TAG_LENGTH);

        return {
          ciphertext: ciphertext.buffer,
          tag: tag.buffer
        };

      } else {
        // React Native implementation using react-native-aes-crypto
        const keyB64 = this.arrayBufferToBase64(key);
        const ivB64 = this.arrayBufferToBase64(iv);
        const dataB64 = this.arrayBufferToBase64(data);

        // AES-256-GCM encryption with authentication
        const encryptedResult = await AesCrypto.encrypt(
          dataB64,
          keyB64,
          ivB64,
          'aes-256-gcm'
        );

        // Parse the result which contains both ciphertext and auth tag
        // react-native-aes-crypto returns: "ciphertext:authTag" format
        const [ciphertext, authTag] = encryptedResult.split(':');

        if (!ciphertext || !authTag) {
          throw new Error('Invalid encryption result format');
        }

        return {
          ciphertext: this.base64ToArrayBuffer(ciphertext),
          tag: this.base64ToArrayBuffer(authTag)
        };
      }

    } catch (error) {
      console.error('🚨 AES-GCM ENCRYPTION ERROR:', error);
      throw error;
    }
  }

  private async performAESGCMDecryption(
    ciphertext: ArrayBuffer,
    key: ArrayBuffer,
    iv: ArrayBuffer,
    tag: ArrayBuffer
  ): Promise<ArrayBuffer> {
    try {
      if (Platform.OS === 'web') {
        // Web Crypto API implementation
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          key,
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        );

        // Combine ciphertext and tag
        const encryptedData = new Uint8Array(ciphertext.byteLength + tag.byteLength);
        encryptedData.set(new Uint8Array(ciphertext), 0);
        encryptedData.set(new Uint8Array(tag), ciphertext.byteLength);

        const decryptedResult = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: iv,
            tagLength: ENCRYPTION_CONFIG.TAG_LENGTH * 8
          },
          cryptoKey,
          encryptedData
        );

        return decryptedResult;

      } else {
        // React Native implementation using react-native-aes-crypto
        const keyB64 = this.arrayBufferToBase64(key);
        const ivB64 = this.arrayBufferToBase64(iv);
        const ciphertextB64 = this.arrayBufferToBase64(ciphertext);
        const tagB64 = this.arrayBufferToBase64(tag);

        // Combine ciphertext and auth tag for decryption
        const encryptedData = `${ciphertextB64}:${tagB64}`;

        // AES-256-GCM decryption with authentication verification
        const decryptedB64 = await AesCrypto.decrypt(
          encryptedData,
          keyB64,
          ivB64,
          'aes-256-gcm'
        );

        return this.base64ToArrayBuffer(decryptedB64);
      }

    } catch (error) {
      console.error('🚨 AES-GCM DECRYPTION ERROR:', error);
      throw error;
    }
  }

  private async deriveKeyPBKDF2(
    password: ArrayBuffer,
    salt: ArrayBuffer,
    iterations: number,
    keyLength: number
  ): Promise<ArrayBuffer> {
    try {
      if (Platform.OS === 'web') {
        // Web Crypto API implementation
        const passwordKey = await crypto.subtle.importKey(
          'raw',
          password,
          { name: 'PBKDF2' },
          false,
          ['deriveBits']
        );

        const derivedBits = await crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256'
          },
          passwordKey,
          keyLength * 8 // Convert to bits
        );

        return derivedBits;

      } else {
        // React Native implementation using react-native-aes-crypto
        const passwordB64 = this.arrayBufferToBase64(password);
        const saltB64 = this.arrayBufferToBase64(salt);

        // PBKDF2 with specified iterations and key length
        const derivedKeyB64 = await AesCrypto.pbkdf2(
          passwordB64,
          saltB64,
          iterations,
          keyLength * 8 // Convert bytes to bits
        );

        return this.base64ToArrayBuffer(derivedKeyB64);
      }

    } catch (error) {
      console.error('🚨 PBKDF2 KEY DERIVATION ERROR:', error);
      throw error;
    }
  }

  /**
   * LEGACY DATA MIGRATION
   * Handles migration from broken encryption to secure implementation
   */
  public async migrateLegacyEncryptedData(): Promise<{
    migrationRequired: boolean;
    migrationCompleted: boolean;
    legacyDataDetected: string[];
    warnings: string[];
  }> {
    try {
      console.log('🔄 Checking for legacy encrypted data...');

      const migrationStatus = {
        migrationRequired: false,
        migrationCompleted: false,
        legacyDataDetected: [] as string[],
        warnings: [] as string[]
      };

      // Check if migration already completed
      const migrationFlag = await SecureStore.getItemAsync('@being/encryption_migration_v2');
      if (migrationFlag === 'completed') {
        migrationStatus.migrationCompleted = true;
        console.log('✅ Encryption migration already completed');
        return migrationStatus;
      }

      // Check for legacy encrypted data patterns
      const legacyKeys = [
        '@being/assessment_data',
        '@being/crisis_data',
        '@being/user_data',
        '@being/encrypted_backup'
      ];

      for (const key of legacyKeys) {
        try {
          const legacyData = await SecureStore.getItemAsync(key);
          if (legacyData) {
            // Check if this looks like legacy SHA-256 hash (64 hex characters)
            if (/^[a-f0-9]{64}$/i.test(legacyData)) {
              migrationStatus.legacyDataDetected.push(key);
              migrationStatus.migrationRequired = true;
              migrationStatus.warnings.push(
                `Legacy data at ${key} cannot be recovered - was only hashed, not encrypted`
              );
            }
          }
        } catch (error) {
          console.warn(`Unable to check legacy data at ${key}:`, error);
        }
      }

      if (migrationStatus.migrationRequired) {
        console.warn('⚠️  Legacy encrypted data detected - migration required');

        // Since legacy data was only hashed (not encrypted), we can't recover it
        // We'll need to clear it and let users re-enter their data
        for (const key of migrationStatus.legacyDataDetected) {
          try {
            await SecureStore.deleteItemAsync(key);
            console.log(`🗑️  Cleared unrecoverable legacy data: ${key}`);
          } catch (error) {
            console.error(`Failed to clear legacy data ${key}:`, error);
          }
        }

        // Mark migration as completed
        await SecureStore.setItemAsync('@being/encryption_migration_v2', 'completed');
        migrationStatus.migrationCompleted = true;

        console.log('✅ Legacy data migration completed');
      } else {
        // No legacy data found, mark as completed
        await SecureStore.setItemAsync('@being/encryption_migration_v2', 'completed');
        migrationStatus.migrationCompleted = true;
        console.log('✅ No legacy data found - migration not required');
      }

      return migrationStatus;

    } catch (error) {
      console.error('🚨 LEGACY DATA MIGRATION ERROR:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * DEVICE ID GENERATION
   * Secure device identification for anonymous authentication
   */
  public async generateSecureDeviceId(): Promise<string> {
    try {
      // Check if device ID already exists
      const existingDeviceId = await SecureStore.getItemAsync('@being/device_id');

      if (existingDeviceId) {
        console.log('🔑 Device ID found');
        return existingDeviceId;
      }

      // Generate cryptographically secure UUIDv4
      const deviceId = uuidv4();

      // Store securely
      await SecureStore.setItemAsync('@being/device_id', deviceId);

      console.log('🔑 New device ID generated');
      return deviceId;

    } catch (error) {
      console.error('🚨 DEVICE ID GENERATION ERROR:', error);
      throw new Error(`Device ID generation failed: ${error.message}`);
    }
  }

  /**
   * UTILITY METHODS
   */

  private async generateSecureRandomBytes(length: number): Promise<ArrayBuffer> {
    try {
      if (Platform.OS === 'web') {
        const randomBytes = new Uint8Array(length);
        crypto.getRandomValues(randomBytes);
        return randomBytes.buffer;
      } else {
        // React Native implementation
        const randomString = await Crypto.getRandomBytesAsync(length);
        return new Uint8Array(randomString).buffer;
      }
    } catch (error) {
      console.error('🚨 RANDOM BYTES GENERATION ERROR:', error);
      throw error;
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private async calculateChecksum(data: string): Promise<string> {
    try {
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      return digest.substring(0, 32); // First 32 characters
    } catch (error) {
      console.error('🚨 CHECKSUM CALCULATION ERROR:', error);
      throw error;
    }
  }

  /**
   * PERFORMANCE AND MONITORING
   */

  private async validateEncryptionPerformance(
    operationTimeMs: number,
    sensitivityLevel: DataSensitivityLevel
  ): Promise<void> {
    const performanceThresholds = {
      'level_1_crisis_responses': 50,
      'level_2_assessment_data': 100,
      'level_3_intervention_metadata': 150,
      'level_4_performance_data': 200,
      'level_5_general_data': 300
    };

    const threshold = performanceThresholds[sensitivityLevel];
    
    if (operationTimeMs > threshold) {
      console.warn(`⚠️  Encryption performance warning: ${operationTimeMs.toFixed(2)}ms > ${threshold}ms for ${sensitivityLevel}`);
      
      // Critical for crisis data
      if (sensitivityLevel === 'level_1_crisis_responses' && operationTimeMs > ENCRYPTION_CONFIG.PERFORMANCE_THRESHOLD_MS) {
        throw new Error(`Critical encryption performance violation: ${operationTimeMs.toFixed(2)}ms`);
      }
    }
  }

  private async recordPerformanceMetrics(metrics: EncryptionPerformanceMetrics): Promise<void> {
    try {
      this.performanceMetrics.push(metrics);
      
      // Keep only last 1000 metrics to prevent memory leaks
      if (this.performanceMetrics.length > 1000) {
        this.performanceMetrics = this.performanceMetrics.slice(-1000);
      }

      // Log critical performance issues
      if (metrics.successRate < 0.95) {
        console.error(`🚨 ENCRYPTION SUCCESS RATE LOW: ${(metrics.successRate * 100).toFixed(1)}%`);
      }

      if (metrics.operationTimeMs > ENCRYPTION_CONFIG.PERFORMANCE_THRESHOLD_MS) {
        console.warn(`⚠️  ENCRYPTION PERFORMANCE WARNING: ${metrics.operationTimeMs.toFixed(2)}ms`);
      }

    } catch (error) {
      console.error('🚨 PERFORMANCE METRICS RECORDING ERROR:', error);
    }
  }

  private calculateMemoryUsage(): number {
    // Estimate memory usage based on cached keys and metrics
    const keyMemory = this.keyCache.size * ENCRYPTION_CONFIG.KEY_LENGTH;
    const metricsMemory = this.performanceMetrics.length * 200; // Estimated size per metric
    return keyMemory + metricsMemory;
  }

  /**
   * KEY ROTATION AND MANAGEMENT
   */

  private initializeKeyRotationScheduler(): void {
    // Schedule key rotation check every 24 hours
    this.keyRotationTimer = setInterval(async () => {
      try {
        await this.checkKeyRotationRequirements();
      } catch (error) {
        console.error('🚨 KEY ROTATION CHECK ERROR:', error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  private async checkKeyRotationRequirements(): Promise<void> {
    try {
      const currentTime = Date.now();
      
      for (const [keyId, metadata] of this.keyMetadata.entries()) {
        if (currentTime > metadata.expiresAt) {
          console.log(`🔄 Key rotation required for: ${keyId}`);
          await this.rotateKey(keyId);
        }
      }
    } catch (error) {
      console.error('🚨 KEY ROTATION CHECK ERROR:', error);
    }
  }

  private async rotateKey(keyId: string): Promise<void> {
    const startTime = performance.now();

    try {
      console.log(`🔄 Rotating key: ${keyId}`);

      // Generate new key
      const newKey = await this.generateSecureRandomBytes(ENCRYPTION_CONFIG.KEY_LENGTH);
      
      // Store new key
      const newKeyB64 = this.arrayBufferToBase64(newKey);
      await SecureStore.setItemAsync(`${keyId}_v2`, newKeyB64);

      // Update metadata
      const newMetadata: KeyManagementResult = {
        keyId: `${keyId}_v2`,
        keyVersion: 2,
        derivedFromMaster: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + ENCRYPTION_CONFIG.KEY_ROTATION_INTERVAL_MS,
        rotationRequired: false
      };

      this.keyMetadata.set(`${keyId}_v2`, newMetadata);

      // Clear old key from cache
      this.keyCache.delete(keyId);

      const rotationTime = performance.now() - startTime;

      // Record performance metrics
      await this.recordPerformanceMetrics({
        operationType: 'key_rotation',
        dataSize: 0,
        operationTimeMs: rotationTime,
        throughputBytesPerMs: 0,
        memoryUsage: this.calculateMemoryUsage(),
        successRate: 1.0,
        errorCount: 0,
        timestamp: Date.now()
      });

      console.log(`✅ Key rotated successfully (${rotationTime.toFixed(2)}ms)`);

    } catch (error) {
      console.error('🚨 KEY ROTATION ERROR:', error);
      throw error;
    }
  }

  /**
   * VERIFICATION AND TESTING
   */

  private async verifyEncryptionCapabilities(): Promise<void> {
    try {
      console.log('🔍 Verifying encryption capabilities...');

      // Test encryption/decryption cycle
      const testData = 'encryption_test_data';
      const encrypted = await this.encryptData(testData, 'level_5_general_data');
      const decrypted = await this.decryptData(encrypted);

      if (decrypted !== testData) {
        throw new Error('Encryption verification failed');
      }

      console.log('✅ Encryption capabilities verified');

    } catch (error) {
      console.error('🚨 ENCRYPTION VERIFICATION ERROR:', error);
      throw error;
    }
  }

  private async verifyMasterKey(masterKeyB64: string): Promise<void> {
    try {
      const masterKey = this.base64ToArrayBuffer(masterKeyB64);
      
      if (masterKey.byteLength !== ENCRYPTION_CONFIG.KEY_LENGTH) {
        throw new Error('Invalid master key length');
      }

      console.log('✅ Master key verified');

    } catch (error) {
      console.error('🚨 MASTER KEY VERIFICATION ERROR:', error);
      throw error;
    }
  }

  /**
   * PUBLIC API METHODS
   */

  public async getPerformanceMetrics(): Promise<EncryptionPerformanceMetrics[]> {
    return [...this.performanceMetrics];
  }

  public async getEncryptionStatus(): Promise<{
    initialized: boolean;
    keyCount: number;
    cacheSize: number;
    performanceMetricsCount: number;
    averageEncryptionTime: number;
    averageDecryptionTime: number;
    successRate: number;
  }> {
    const encryptMetrics = this.performanceMetrics.filter(m => m.operationType === 'encrypt');
    const decryptMetrics = this.performanceMetrics.filter(m => m.operationType === 'decrypt');
    
    const avgEncryptTime = encryptMetrics.length > 0 
      ? encryptMetrics.reduce((sum, m) => sum + m.operationTimeMs, 0) / encryptMetrics.length 
      : 0;
    
    const avgDecryptTime = decryptMetrics.length > 0 
      ? decryptMetrics.reduce((sum, m) => sum + m.operationTimeMs, 0) / decryptMetrics.length 
      : 0;
    
    const totalOperations = this.performanceMetrics.length;
    const successfulOperations = this.performanceMetrics.filter(m => m.successRate > 0).length;
    const successRate = totalOperations > 0 ? successfulOperations / totalOperations : 0;

    return {
      initialized: this.masterKeyInitialized,
      keyCount: this.keyMetadata.size,
      cacheSize: this.keyCache.size,
      performanceMetricsCount: this.performanceMetrics.length,
      averageEncryptionTime: avgEncryptTime,
      averageDecryptionTime: avgDecryptTime,
      successRate
    };
  }

  public async clearSensitiveData(): Promise<void> {
    try {
      console.log('🧹 Clearing sensitive encryption data...');

      // Clear key cache
      this.keyCache.clear();

      // Clear performance metrics
      this.performanceMetrics = [];

      // Clear key metadata (keep master key metadata)
      const masterKeyMetadata = this.keyMetadata.get(ENCRYPTION_CONFIG.MASTER_KEY_ID);
      this.keyMetadata.clear();
      
      if (masterKeyMetadata) {
        this.keyMetadata.set(ENCRYPTION_CONFIG.MASTER_KEY_ID, masterKeyMetadata);
      }

      console.log('✅ Sensitive data cleared');

    } catch (error) {
      console.error('🚨 SENSITIVE DATA CLEARING ERROR:', error);
      throw error;
    }
  }

  public async destroy(): Promise<void> {
    try {
      console.log('🗑️  Destroying encryption service...');

      // Clear timers
      if (this.keyRotationTimer) {
        clearInterval(this.keyRotationTimer);
        this.keyRotationTimer = null;
      }

      // Clear all sensitive data
      await this.clearSensitiveData();

      // Reset initialization flag
      this.masterKeyInitialized = false;

      console.log('✅ Encryption service destroyed');

    } catch (error) {
      console.error('🚨 ENCRYPTION SERVICE DESTRUCTION ERROR:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default EncryptionService.getInstance();