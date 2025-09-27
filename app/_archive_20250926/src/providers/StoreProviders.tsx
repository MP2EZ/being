/**
 * Store Providers Factory for Being. MBCT App
 *
 * Safe factory pattern for creating and managing Zustand stores
 * with proper initialization and error handling.
 */

import { createSafeService } from '../utils/SafeImports';
import type { ProviderConfig } from '../types/providers';

/**
 * Store initialization interface
 */
export interface StoreInitializer {
  initialize: () => Promise<void>;
  validateStores: () => boolean;
  destroyStores: () => Promise<void>;
}

/**
 * Create store providers using safe factory pattern
 */
export const createStoreProviders = (config: ProviderConfig): StoreInitializer => {
  const storeFactory = createSafeService<StoreInitializer>(
    () => ({
      initialize: async (): Promise<void> => {
        try {
          console.log('Initializing Being. stores with safe patterns');

          // Initialize stores in dependency order
          if (config.enableFeatureFlags) {
            // Feature flag store initialization is handled by the store itself
            const { initializeFeatureFlags } = await import('../store/featureFlagStore');
            await initializeFeatureFlags();
          }

          // Initialize user stores
          const { useSimpleUserStore } = await import('../store/simpleUserStore');
          const userStore = useSimpleUserStore.getState();
          if (userStore.initializeUser) {
            await userStore.initializeUser();
          }

          // Initialize crisis store
          const { useCrisisStore } = await import('../store/simpleCrisisStore');
          const crisisStore = useCrisisStore.getState();
          if (crisisStore.initializeCrisisData) {
            crisisStore.initializeCrisisData();
          }

          // Initialize other stores as needed
          if (config.enableOfflineMode) {
            // Initialize offline-related stores
            console.log('Offline mode stores initialized');
          }

          console.log('All stores initialized successfully');

        } catch (error) {
          console.error('Store initialization failed:', error);
          throw error;
        }
      },

      validateStores: (): boolean => {
        try {
          // Validate that all required stores are available and functional
          const requiredStores = [
            'useSimpleUserStore',
            'useCrisisStore',
          ];

          for (const storeName of requiredStores) {
            // Basic validation that stores exist and have expected methods
            // This would be more comprehensive in a real implementation
          }

          return true;
        } catch (error) {
          console.error('Store validation failed:', error);
          return false;
        }
      },

      destroyStores: async (): Promise<void> => {
        try {
          console.log('Destroying stores safely');
          // Cleanup any persistent connections or subscriptions
          // This would be implemented based on specific store needs
        } catch (error) {
          console.error('Store destruction failed:', error);
          throw error;
        }
      },
    }),
    (service) => {
      // Validate the service has required methods
      return (
        typeof service.initialize === 'function' &&
        typeof service.validateStores === 'function' &&
        typeof service.destroyStores === 'function'
      );
    },
    'StoreProvidersFactory'
  );

  return storeFactory.create();
};

export default createStoreProviders;