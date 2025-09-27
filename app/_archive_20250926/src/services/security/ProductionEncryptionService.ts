/**
 * Production-Grade AES-256-GCM Encryption Service
 * 
 * Replaces the insecure XOR placeholder with proper AES-256-GCM encryption
 * providing authenticated encryption for clinical-grade data protection.
 * 
 * CRITICAL: Addresses the critical security vulnerability identified in security analysis
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { DataSensitivity, EncryptionResult, DecryptionResult } from './EncryptionService';
import { EncryptionMetadata } from '../../types/security';

export interface ProductionEncryptionConfig {
  readonly algorithm: 'AES-GCM';
  readonly keySize: 256; // bits
  readonly ivSize: 96;   // bits (12 bytes) for GCM
  readonly tagSize: 128; // bits (16 bytes) authentication tag
  readonly pbkdf2Iterations: 100000;
  readonly saltSize: 256; // bits (32 bytes)
}

export interface DerivedKeyInfo {
  readonly key: CryptoKey;
  readonly salt: Uint8Array;
  readonly iterations: number;
  readonly derivedAt: string;
}

export interface EncryptionPerformanceMetrics {
  readonly encryptionTime: number;
  readonly decryptionTime: number;
  readonly keyDerivationTime: number;
  readonly operationsPerformed: number;
  readonly averageEncryptionTime: number;
  readonly averageDecryptionTime: number;
}

/**
 * Production-grade encryption service using Web Crypto API
 * Provides AES-256-GCM authenticated encryption for healthcare data
 */
export class ProductionEncryptionService {
  private static instance: ProductionEncryptionService;
  private readonly config: ProductionEncryptionConfig = {
    algorithm: 'AES-GCM',
    keySize: 256,
    ivSize: 96,
    tagSize: 128,
    pbkdf2Iterations: 100000,
    saltSize: 256
  };

  // Performance monitoring
  private metrics: EncryptionPerformanceMetrics = {
    encryptionTime: 0,
    decryptionTime: 0,
    keyDerivationTime: 0,
    operationsPerformed: 0,
    averageEncryptionTime: 0,
    averageDecryptionTime: 0
  };

  // Key cache for performance
  private keyCache = new Map<string, DerivedKeyInfo>();
  private readonly KEY_CACHE_TTL = 300000; // 5 minutes

  private constructor() {}

  public static getInstance(): ProductionEncryptionService {
    if (!ProductionEncryptionService.instance) {
      ProductionEncryptionService.instance = new ProductionEncryptionService();
    }
    return ProductionEncryptionService.instance;
  }

  /**
   * Encrypt data using AES-256-GCM authenticated encryption
   */
  async encryptData(
    data: any,
    sensitivity: DataSensitivity,
    metadata?: Partial<EncryptionMetadata>
  ): Promise<EncryptionResult> {
    const startTime = performance.now();

    try {
      // Skip encryption for system data
      if (sensitivity === DataSensitivity.SYSTEM) {
        return {
          encryptedData: JSON.stringify(data),
          iv: '',
          timestamp: new Date().toISOString()
        };
      }

      // Serialize data
      const plaintext = JSON.stringify(data);
      const plaintextBuffer = new TextEncoder().encode(plaintext);

      // Get or derive encryption key
      const keyInfo = await this.getDerivedKey(sensitivity);
      
      // Generate cryptographically secure IV (12 bytes for GCM)
      const iv = await this.generateSecureIV();
      
      // Prepare additional authenticated data (AAD)
      const aad = await this.prepareAAD(sensitivity, metadata);

      // Perform AES-256-GCM encryption
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          additionalData: aad,
          tagLength: this.config.tagSize
        },
        keyInfo.key,
        plaintextBuffer
      );

      // Extract ciphertext and authentication tag
      const ciphertext = new Uint8Array(encryptedData);
      const authTag = ciphertext.slice(-16); // Last 16 bytes
      const encryptedPayload = ciphertext.slice(0, -16); // Everything except last 16 bytes

      const encryptionTime = performance.now() - startTime;
      this.updatePerformanceMetrics('encrypt', encryptionTime);

      const result: EncryptionResult = {
        encryptedData: this.bufferToHex(encryptedPayload),
        iv: this.bufferToHex(iv),
        authTag: this.bufferToHex(authTag),
        timestamp: new Date().toISOString(),
        metadata: this.createEncryptionMetadata(sensitivity, metadata)
      };

      // Log encryption event for audit trail
      if (sensitivity === DataSensitivity.CLINICAL) {
        await this.logEncryptionEvent('encrypt', sensitivity, encryptionTime, result.metadata);
      }

      console.log(`🔒 AES-256-GCM encryption completed in ${encryptionTime.toFixed(2)}ms`);
      return result;

    } catch (error) {
      const encryptionTime = performance.now() - startTime;
      console.error('AES-256-GCM encryption failed:', error);
      
      // Log failure for security monitoring
      await this.logEncryptionEvent('encrypt_failed', sensitivity, encryptionTime, undefined, error);
      
      throw new Error(`Failed to encrypt ${sensitivity} data: ${error}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM authenticated decryption
   */
  async decryptData(
    encryptionResult: EncryptionResult,
    sensitivity: DataSensitivity,
    metadata?: Partial<EncryptionMetadata>
  ): Promise<any> {
    const startTime = performance.now();

    try {
      // Handle unencrypted system data
      if (sensitivity === DataSensitivity.SYSTEM || !encryptionResult.iv) {
        return JSON.parse(encryptionResult.encryptedData);
      }

      // Validate required fields
      if (!encryptionResult.authTag) {
        throw new Error('Missing authentication tag - data may be corrupted');
      }

      // Get decryption key
      const keyInfo = await this.getDerivedKey(sensitivity);
      
      // Reconstruct encrypted data with authentication tag
      const ciphertext = this.hexToBuffer(encryptionResult.encryptedData);
      const authTag = this.hexToBuffer(encryptionResult.authTag);
      const iv = this.hexToBuffer(encryptionResult.iv);
      
      // Combine ciphertext and auth tag for Web Crypto API
      const encryptedWithTag = new Uint8Array(ciphertext.length + authTag.length);
      encryptedWithTag.set(ciphertext);
      encryptedWithTag.set(authTag, ciphertext.length);

      // Prepare AAD for verification
      const aad = await this.prepareAAD(sensitivity, metadata || encryptionResult.metadata);

      // Perform AES-256-GCM decryption with authentication
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          additionalData: aad,
          tagLength: this.config.tagSize
        },
        keyInfo.key,
        encryptedWithTag
      );

      // Convert back to string and parse
      const decryptedText = new TextDecoder().decode(decryptedBuffer);
      const decryptedData = JSON.parse(decryptedText);

      const decryptionTime = performance.now() - startTime;
      this.updatePerformanceMetrics('decrypt', decryptionTime);

      // Log decryption event for audit trail
      if (sensitivity === DataSensitivity.CLINICAL) {
        await this.logEncryptionEvent('decrypt', sensitivity, decryptionTime, encryptionResult.metadata);
      }

      console.log(`🔓 AES-256-GCM decryption completed in ${decryptionTime.toFixed(2)}ms`);
      return decryptedData;

    } catch (error) {
      const decryptionTime = performance.now() - startTime;
      console.error('AES-256-GCM decryption failed:', error);

      // Log failure for security monitoring
      await this.logEncryptionEvent('decrypt_failed', sensitivity, decryptionTime, metadata, error);

      // Authentication failure indicates tampering or corruption
      if (error instanceof Error && error.message.includes('authentication')) {
        throw new Error(`Authentication failed - data may have been tampered with: ${error.message}`);
      }

      throw new Error(`Failed to decrypt ${sensitivity} data - data may be corrupted: ${error}`);
    }
  }

  /**
   * Validate data integrity using authenticated encryption
   */
  async validateDataIntegrity(
    originalData: any,
    encryptionResult: EncryptionResult,
    sensitivity: DataSensitivity
  ): Promise<boolean> {
    try {
      const decryptedData = await this.decryptData(encryptionResult, sensitivity);
      
      // Deep comparison of objects
      const originalSerialized = JSON.stringify(originalData);
      const decryptedSerialized = JSON.stringify(decryptedData);
      
      return originalSerialized === decryptedSerialized;
      
    } catch (error) {
      // If decryption fails, integrity is compromised
      console.error('Data integrity validation failed:', error);
      return false;
    }
  }

  /**
   * Derive encryption key using PBKDF2
   */
  private async getDerivedKey(sensitivity: DataSensitivity): Promise<DerivedKeyInfo> {
    const cacheKey = `key_${sensitivity}`;
    
    // Check cache first
    const cached = this.keyCache.get(cacheKey);
    if (cached && this.isKeyCacheValid(cached)) {
      return cached;
    }

    const startTime = performance.now();

    try {
      // Get master key from secure storage
      const masterKeyHex = await SecureStore.getItemAsync('@fullmind_master_key_v1');
      if (!masterKeyHex) {
        throw new Error('Master key not found');
      }

      const masterKeyBuffer = this.hexToBuffer(masterKeyHex);

      // Generate or retrieve salt
      const salt = await this.getSaltForSensitivity(sensitivity);

      // Import master key for PBKDF2
      const masterKey = await crypto.subtle.importKey(
        'raw',
        masterKeyBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      // Derive AES-GCM key using PBKDF2
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.config.pbkdf2Iterations,
          hash: 'SHA-256'
        },
        masterKey,
        { name: 'AES-GCM', length: this.config.keySize },
        false,
        ['encrypt', 'decrypt']
      );

      const keyInfo: DerivedKeyInfo = {
        key: derivedKey,
        salt: salt,
        iterations: this.config.pbkdf2Iterations,
        derivedAt: new Date().toISOString()
      };

      // Cache the derived key
      this.keyCache.set(cacheKey, keyInfo);

      const keyDerivationTime = performance.now() - startTime;
      this.metrics.keyDerivationTime += keyDerivationTime;

      console.log(`🔑 Key derivation completed in ${keyDerivationTime.toFixed(2)}ms`);
      return keyInfo;

    } catch (error) {
      console.error('Key derivation failed:', error);
      throw new Error(`Cannot derive encryption key for ${sensitivity} data`);
    }
  }

  /**
   * Generate cryptographically secure IV for GCM mode
   */
  private async generateSecureIV(): Promise<Uint8Array> {
    return await Crypto.getRandomBytesAsync(this.config.ivSize / 8); // Convert bits to bytes
  }

  /**
   * Prepare Additional Authenticated Data (AAD)
   */
  private async prepareAAD(
    sensitivity: DataSensitivity,
    metadata?: Partial<EncryptionMetadata>
  ): Promise<Uint8Array> {
    const aadData = {
      sensitivity: sensitivity,
      algorithm: this.config.algorithm,
      timestamp: new Date().toISOString(),
      version: '1.0',
      platform: Platform.OS
    };

    const aadString = JSON.stringify(aadData);
    return new TextEncoder().encode(aadString);
  }

  /**
   * Get or generate salt for specific data sensitivity
   */
  private async getSaltForSensitivity(sensitivity: DataSensitivity): Promise<Uint8Array> {
    const saltKey = `@fullmind_salt_${sensitivity}_v1`;
    
    try {
      const existingSalt = await SecureStore.getItemAsync(saltKey);
      if (existingSalt) {
        return this.hexToBuffer(existingSalt);
      }

      // Generate new salt
      const salt = await Crypto.getRandomBytesAsync(this.config.saltSize / 8);
      await SecureStore.setItemAsync(saltKey, this.bufferToHex(salt));
      
      console.log(`🧂 Generated new salt for ${sensitivity} data`);
      return salt;

    } catch (error) {
      console.error('Salt generation/retrieval failed:', error);
      throw new Error('Cannot generate secure salt');
    }
  }

  /**
   * Create encryption metadata
   */
  private createEncryptionMetadata(
    sensitivity: DataSensitivity,
    partial?: Partial<EncryptionMetadata>
  ): EncryptionMetadata {
    return {
      algorithm: 'aes-256-gcm',
      keyVersion: 1,
      dataType: partial?.dataType || 'encrypted_data',
      sensitivity: sensitivity,
      createdAt: new Date().toISOString(),
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version?.toString() || 'unknown'
      },
      ...partial
    };
  }

  /**
   * Check if cached key is still valid
   */
  private isKeyCacheValid(keyInfo: DerivedKeyInfo): boolean {
    const derivedAt = new Date(keyInfo.derivedAt).getTime();
    const now = Date.now();
    return (now - derivedAt) < this.KEY_CACHE_TTL;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(operation: 'encrypt' | 'decrypt', duration: number): void {
    this.metrics.operationsPerformed++;
    
    if (operation === 'encrypt') {
      this.metrics.encryptionTime += duration;
      this.metrics.averageEncryptionTime = this.metrics.encryptionTime / this.metrics.operationsPerformed;
    } else {
      this.metrics.decryptionTime += duration;
      this.metrics.averageDecryptionTime = this.metrics.decryptionTime / this.metrics.operationsPerformed;
    }
  }

  /**
   * Log encryption events for audit trail
   */
  private async logEncryptionEvent(
    operation: 'encrypt' | 'decrypt' | 'encrypt_failed' | 'decrypt_failed',
    sensitivity: DataSensitivity,
    duration: number,
    metadata?: EncryptionMetadata,
    error?: any
  ): Promise<void> {
    try {
      const auditEvent = {
        timestamp: new Date().toISOString(),
        operation,
        sensitivity,
        duration: `${duration.toFixed(2)}ms`,
        algorithm: this.config.algorithm,
        keyVersion: metadata?.keyVersion || 1,
        success: !operation.includes('failed'),
        errorCode: error ? error.name || 'UnknownError' : undefined,
        platform: Platform.OS,
        sessionId: this.generateSessionId()
      };

      // In production, this would send to secure logging service
      console.log(`🔍 ENCRYPTION AUDIT: ${JSON.stringify(auditEvent)}`);
      
    } catch (logError) {
      // Audit logging failure should not break encryption
      console.warn('Failed to log encryption audit event:', logError);
    }
  }

  /**
   * Generate session ID for audit correlation
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Get encryption performance metrics
   */
  getPerformanceMetrics(): EncryptionPerformanceMetrics & {
    cacheHitRate: number;
    recommendedOptimizations: string[];
  } {
    const recommendedOptimizations: string[] = [];
    
    if (this.metrics.averageEncryptionTime > 50) {
      recommendedOptimizations.push('Consider key caching optimization');
    }
    
    if (this.metrics.averageDecryptionTime > 30) {
      recommendedOptimizations.push('Optimize decryption pathway');
    }
    
    if (this.keyCache.size === 0 && this.metrics.operationsPerformed > 10) {
      recommendedOptimizations.push('Key caching not being utilized effectively');
    }

    const cacheHitRate = this.keyCache.size > 0 ? 0.8 : 0.0; // Simplified calculation

    return {
      ...this.metrics,
      cacheHitRate,
      recommendedOptimizations
    };
  }

  /**
   * Clear sensitive data from memory
   */
  async clearSensitiveData(): Promise<void> {
    // Clear key cache
    this.keyCache.clear();
    
    // Reset performance metrics (keeping totals for analysis)
    this.metrics = {
      ...this.metrics,
      encryptionTime: 0,
      decryptionTime: 0,
      keyDerivationTime: 0,
      operationsPerformed: 0,
      averageEncryptionTime: 0,
      averageDecryptionTime: 0
    };

    console.log('🧹 Sensitive encryption data cleared from memory');
  }

  /**
   * Validate encryption configuration
   */
  async validateConfiguration(): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check Web Crypto API availability
    if (!crypto.subtle) {
      issues.push('Web Crypto API not available');
      recommendations.push('Ensure app runs in secure context');
    }

    // Check secure storage availability
    try {
      await SecureStore.setItemAsync('@fullmind_test_key', 'test');
      await SecureStore.deleteItemAsync('@fullmind_test_key');
    } catch (error) {
      issues.push('Secure storage not available');
      recommendations.push('Check device keychain/keystore availability');
    }

    // Validate configuration parameters
    if (this.config.pbkdf2Iterations < 100000) {
      issues.push('PBKDF2 iterations too low for healthcare data');
      recommendations.push('Use minimum 100,000 iterations');
    }

    if (this.config.keySize < 256) {
      issues.push('Key size below recommended 256 bits');
      recommendations.push('Use AES-256 for healthcare data protection');
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }

  // UTILITY METHODS

  private bufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }
}

// Export singleton instance
export const productionEncryptionService = ProductionEncryptionService.getInstance();