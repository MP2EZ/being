/**
 * Global Type Declarations - Being. MBCT
 * Clinical-grade TypeScript environment setup
 */

// === REACT NATIVE EXTENSIONS ===
declare module 'react-native' {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
  }
}

// === EXPO EXTENSIONS ===
declare module 'expo-constants' {
  interface Constants {
    expoConfig?: {
      extra?: {
        apiUrl?: string;
        supabaseUrl?: string;
        supabaseAnonKey?: string;
        stripePublishableKey?: string;
        environment?: 'development' | 'staging' | 'production';
      };
    };
  }
}

// === CLINICAL TYPE SAFETY GLOBALS ===
declare global {
  namespace Being {
    // Crisis intervention types (immutable)
    type CrisisLevel = 'low' | 'medium' | 'high' | 'critical';
    type EmergencyAction = 'monitor' | 'intervene' | 'escalate' | 'emergency';
    
    // Assessment scoring (100% accuracy required)
    type PHQScore = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27;
    type GADScore = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21;
    
    // Therapeutic content validation
    type TherapeuticContent = {
      readonly validated: true;
      readonly clinicallyApproved: true;
      readonly content: string;
    };
  }
  
  // === NODE ENVIRONMENT ===
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      EXPO_PUBLIC_API_URL?: string;
      EXPO_PUBLIC_SUPABASE_URL?: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
    }
  }
}

// === MODULE AUGMENTATIONS ===
declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.json' {
  const value: any;
  export default value;
}

export {};