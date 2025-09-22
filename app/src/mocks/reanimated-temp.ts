/**
 * TEMPORARY: React Native Reanimated Mock for Emergency Runtime Fix
 * This provides a complete mock implementation to prevent the 'S' property error
 * while we systematically remove Reanimated from all components.
 */

export const useSharedValue = (initial: any) => ({ value: initial });

export const useAnimatedStyle = (fn: () => any) => ({});

export const withTiming = (value: any, config?: any) => value;

export const withSpring = (value: any, config?: any) => value;

export const withRepeat = (value: any, numberOfReps?: number, reverse?: boolean) => value;

export const withSequence = (...animations: any[]) => animations[animations.length - 1];

export const interpolateColor = (value: any, input: any[], output: any[]) => output[0];

export const interpolate = (value: any, input: any[], output: any[]) => output[0];

export const runOnJS = (fn: Function) => (...args: any[]) => fn(...args);

export const useDerivedValue = (fn: () => any) => ({ value: fn() });

export const useAnimatedGestureHandler = (handlers: any) => handlers;

export const useAnimatedScrollHandler = (handler: any) => handler;

export const useWorkletCallback = (fn: Function) => fn;

export const makeMutable = (value: any) => ({ value });

export const cancelAnimation = (value: any) => {};

export const Easing = {
  ease: 'ease',
  quad: 'quad',
  cubic: 'cubic',
  poly: 'poly',
  sin: 'sin',
  circle: 'circle',
  exp: 'exp',
  elastic: 'elastic',
  back: 'back',
  bounce: 'bounce',
  bezier: () => 'bezier',
  linear: 'linear',
  out: (fn: any) => fn,
  in: (fn: any) => fn,
  inOut: (fn: any) => fn,
};

export const SlideInLeft = {};
export const SlideInRight = {};
export const SlideInUp = {};
export const SlideInDown = {};
export const SlideOutLeft = {};
export const SlideOutRight = {};
export const SlideOutUp = {};
export const SlideOutDown = {};
export const FadeIn = {};
export const FadeOut = {};
export const ZoomIn = {};
export const ZoomOut = {};

// Mock Animated component
import React from 'react';
import { View as RNView, Text as RNText, ScrollView as RNScrollView, Pressable as RNPressable } from 'react-native';

const createAnimatedComponent = (Component: any) => {
  return React.forwardRef((props: any, ref: any) => {
    const { style, ...restProps } = props;
    return <Component ref={ref} style={style} {...restProps} />;
  });
};

export default {
  View: createAnimatedComponent(RNView),
  Text: createAnimatedComponent(RNText),
  ScrollView: createAnimatedComponent(RNScrollView),
  Pressable: createAnimatedComponent(RNPressable),
};