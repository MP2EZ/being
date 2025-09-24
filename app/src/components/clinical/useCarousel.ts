/**
 * useCarousel Hook
 *
 * Custom React hook for managing clinical carousel state and behavior.
 * Implements WCAG-compliant navigation with reduced motion support.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import { UseCarouselReturn } from './types';

interface UseCarouselConfig {
  totalSlides: number;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onSlideChange?: (index: number) => void;
  respectReducedMotion?: boolean;
}

export const useCarousel = ({
  totalSlides,
  autoPlay = false,
  autoPlayInterval = 8000,
  onSlideChange,
  respectReducedMotion = true
}: UseCarouselConfig): UseCarouselReturn => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);
  const [reducedMotionEnabled, setReducedMotionEnabled] = useState(false);

  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  // Check for reduced motion preference
  useEffect(() => {
    if (respectReducedMotion) {
      AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
        setReducedMotionEnabled(enabled);
        if (enabled) {
          setIsAutoPlaying(false);
        }
      });
    }
  }, [respectReducedMotion]);

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlaying && !reducedMotionEnabled && totalSlides > 1) {
      autoPlayRef.current = setInterval(() => {
        // Pause auto-play if user has interacted recently (within 10 seconds)
        const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
        if (timeSinceLastInteraction > 10000) {
          setCurrentSlide((prev) => (prev + 1) % totalSlides);
        }
      }, autoPlayInterval);

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current);
        }
      };
    }
  }, [isAutoPlaying, reducedMotionEnabled, totalSlides, autoPlayInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
      lastInteractionRef.current = Date.now();
      onSlideChange?.(index);

      // Announce slide change for screen readers
      AccessibilityInfo.announceForAccessibility(
        `Slide ${index + 1} of ${totalSlides} selected`
      );
    }
  }, [totalSlides, onSlideChange]);

  const nextSlide = useCallback(() => {
    const nextIndex = (currentSlide + 1) % totalSlides;
    goToSlide(nextIndex);
  }, [currentSlide, totalSlides, goToSlide]);

  const prevSlide = useCallback(() => {
    const prevIndex = currentSlide === 0 ? totalSlides - 1 : currentSlide - 1;
    goToSlide(prevIndex);
  }, [currentSlide, totalSlides, goToSlide]);

  const pauseAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
    lastInteractionRef.current = Date.now();
  }, []);

  const resumeAutoPlay = useCallback(() => {
    if (!reducedMotionEnabled) {
      setIsAutoPlaying(true);
    }
  }, [reducedMotionEnabled]);

  // Handle slide change notifications
  useEffect(() => {
    onSlideChange?.(currentSlide);
  }, [currentSlide, onSlideChange]);

  return {
    currentSlide,
    totalSlides,
    goToSlide,
    nextSlide,
    prevSlide,
    isAutoPlaying,
    pauseAutoPlay,
    resumeAutoPlay
  };
};