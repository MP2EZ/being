/**
 * Provider Types for Being. MBCT App
 *
 * Type definitions for the provider-based architecture system.
 */

import { ReactNode } from 'react';

/**
 * Provider Configuration Interface
 */
export interface ProviderConfig {
  readonly enableFeatureFlags: boolean;
  readonly enableThemeSystem: boolean;
  readonly enablePerformanceMonitoring: boolean;
  readonly enableErrorBoundaries: boolean;
  readonly enableOfflineMode: boolean;
  readonly enableCrisisProtection: boolean;
  readonly safeMode: boolean;
}

/**
 * App Providers Props
 */
export interface AppProvidersProps {
  readonly children: ReactNode;
  readonly config?: ProviderConfig;
  readonly onInitializationComplete?: () => void;
  readonly onInitializationError?: (error: Error) => void;
}

/**
 * Provider Status
 */
export interface ProviderStatus {
  readonly isReady: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly lastUpdate: string;
}

/**
 * Safe Provider Factory Interface
 */
export interface SafeProviderFactory<T> {
  readonly create: () => T;
  readonly validate: (provider: T) => boolean;
  readonly destroy?: (provider: T) => void;
}

/**
 * Export all provider types
 */
export type {
  ProviderConfig as Config,
  AppProvidersProps as Props,
  ProviderStatus as Status,
  SafeProviderFactory as Factory,
};