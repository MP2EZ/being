/**
 * Clean Global Type Declarations - Being.
 * Minimal type environment without crypto dependencies
 */

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

// Performance API augmentation for memory monitoring
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

// Typography interface augmentation for missing bodySmall
declare module '@/styles/typography' {
  interface TypographyStyles {
    headline1: {
      size: number;
      weight: string;
      spacing: number;
    };
    headline2: {
      size: number;
      weight: string;
      spacing: number;
    };
    headline3: {
      size: number;
      weight: string;
      spacing: number;
    };
    bodyLarge: {
      size: number;
      weight: string;
      spacing: number;
      lineHeight: number;
    };
    bodyRegular: {
      size: number;
      weight: string;
      spacing: number;
      lineHeight: number;
    };
    bodySmall: {
      size: number;
      weight: string;
      spacing: number;
      lineHeight: number;
    };
    caption: {
      size: number;
      weight: string;
      spacing: number;
    };
    micro: {
      size: number;
      weight: string;
      spacing: number;
    };
  }
}

export {};