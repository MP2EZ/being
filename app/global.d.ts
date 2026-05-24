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

// Markdown files are imported as raw text strings via Metro transformer
declare module '*.md' {
  const content: string;
  export default content;
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

// React Native AccessibilityProps augmentation: `accessibilityLevel` is valid
// on the `header` accessibilityRole per the W3C ARIA spec but RN's typings
// omit it. Augmenting here removes 13 @ts-expect-error suppressions in
// features/{home,learn,profile}/screens/*.tsx.
declare module 'react-native' {
  interface AccessibilityProps {
    accessibilityLevel?: 1 | 2 | 3 | 4 | 5 | 6;
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