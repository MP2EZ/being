/**
 * Being. Phone Mockup Component
 * Clinical-grade mobile showcase with therapeutic UX patterns
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Typography } from '../Typography';
import { type ThemeVariant } from '@/types';

interface PhoneMockupProps {
  className?: string;
  variant?: 'static' | 'interactive' | 'demo';
  theme?: ThemeVariant;
  screens?: PhoneScreen[];
  autoPlay?: boolean;
  interval?: number; // milliseconds
  'data-testid'?: string;
}

interface PhoneScreen {
  id: string;
  title: string;
  description: string;
  image: string;
  theme: ThemeVariant;
  clinicalFeature?: string;
}

// Default screens showcasing Being. features
const defaultScreens: PhoneScreen[] = [
  {
    id: 'morning-checkin',
    title: 'Morning Check-in',
    description: 'Start your day with mindful awareness and body scan',
    image: '/images/app-screenshots/morning-body-scan.png',
    theme: 'morning',
    clinicalFeature: 'MBCT Body Awareness'
  },
  {
    id: 'breathing',
    title: '3-Minute Breathing Space',
    description: 'Core MBCT practice for emotional regulation',
    image: '/images/app-screenshots/breathing-circle.png',
    theme: 'midday',
    clinicalFeature: 'Mindfulness Practice'
  },
  {
    id: 'assessment',
    title: 'Clinical Assessment',
    description: 'PHQ-9 validated screening with crisis detection',
    image: '/images/app-screenshots/phq9-assessment.png',
    theme: 'evening',
    clinicalFeature: 'Evidence-based Screening'
  }
];

const themeColors = {
  morning: { primary: '#FF9F43', success: '#E8863A' },
  midday: { primary: '#40B5AD', success: '#2C8A82' },
  evening: { primary: '#4A7C59', success: '#2D5016' }
};

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  className,
  variant = 'static',
  theme = 'midday',
  screens = defaultScreens,
  autoPlay = false,
  interval = 4000,
  'data-testid': testId,
}) => {
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  // Auto-play functionality
  useEffect(() => {
    if (variant === 'demo' && isPlaying && screens.length > 1) {
      const timer = setInterval(() => {
        setCurrentScreenIndex((prev) => (prev + 1) % screens.length);
      }, interval);

      return () => clearInterval(timer);
    }
  }, [isPlaying, interval, screens.length, variant]);

  const currentScreen = screens[currentScreenIndex];
  const currentTheme = currentScreen?.theme || theme;
  const colors = themeColors[currentTheme];

  const phoneClasses = cn(
    // Base phone styling
    'relative mx-auto',
    'w-72 h-[580px]', // Realistic phone proportions
    
    // Phone frame styling
    'bg-gray-900 rounded-[3rem] p-2',
    'shadow-strong',
    
    // Interactive effects
    variant === 'interactive' && 'hover:scale-105 transition-transform duration-300',
    
    className
  );

  const screenClasses = cn(
    // Screen styling
    'w-full h-full rounded-[2.5rem] overflow-hidden',
    'bg-white relative',
    
    // Clinical-grade accessibility
    'focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500'
  );

  return (
    <div className={phoneClasses} data-testid={testId}>
      {/* Phone Screen */}
      <div className={screenClasses}>
        {/* Status Bar */}
        <div 
          className="h-6 flex justify-between items-center px-4 text-white text-xs font-medium"
          style={{ backgroundColor: colors.primary }}
        >
          <span>9:41</span>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-2 border border-white rounded-sm">
              <div className="w-3 h-1 bg-white rounded-sm"></div>
            </div>
          </div>
        </div>

        {/* Screen Content Area */}
        <div className="flex-1 relative bg-gray-50">
          {variant === 'static' || variant === 'interactive' ? (
            <StaticScreenContent screen={currentScreen} />
          ) : (
            <InteractiveScreenContent 
              screen={currentScreen}
              onScreenChange={setCurrentScreenIndex}
              screens={screens}
              currentIndex={currentScreenIndex}
              isPlaying={isPlaying}
              onPlayToggle={() => setIsPlaying(!isPlaying)}
            />
          )}
        </div>

        {/* Home Indicator */}
        <div className="h-8 flex justify-center items-center">
          <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
        </div>
      </div>

      {/* Clinical Feature Badge */}
      {currentScreen?.clinicalFeature && (
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
          <div 
            className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-medium"
            style={{ backgroundColor: colors.success }}
          >
            {currentScreen.clinicalFeature}
          </div>
        </div>
      )}
    </div>
  );
};

// Static Screen Content Component
interface StaticScreenContentProps {
  screen: PhoneScreen;
}

const StaticScreenContent: React.FC<StaticScreenContentProps> = ({ screen }) => {
  const colors = themeColors[screen.theme];
  
  // Show specialized content for morning check-in
  if (screen.id === 'morning-checkin') {
    return (
      <div className="h-full flex flex-col p-6">
        {/* App Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Typography variant="caption" className="text-white font-bold">
                FM
              </Typography>
            </div>
            <Typography variant="h5" className="text-gray-900 font-bold">
              Being.
            </Typography>
          </div>
          <div className="text-gray-500">
            <Typography variant="caption">9:24 AM</Typography>
          </div>
        </div>

        {/* Morning Greeting */}
        <div className="mb-6">
          <Typography variant="h3" className="text-gray-900 font-bold mb-2">
            Good Morning
          </Typography>
          <Typography variant="body" className="text-gray-600">
            Let&apos;s start with a mindful body scan
          </Typography>
        </div>

        {/* Body Scan Visual */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            {/* Body outline */}
            <div className="w-32 h-48 relative">
              <svg viewBox="0 0 100 150" className="w-full h-full">
                <path 
                  d="M50 10 C45 10 40 15 40 20 L40 30 C35 32 30 38 30 45 L30 80 C30 85 25 90 25 95 L25 120 C25 125 30 130 35 130 L40 130 L40 145 C40 148 42 150 45 150 L55 150 C58 150 60 148 60 145 L60 130 L65 130 C70 130 75 125 75 120 L75 95 C75 90 70 85 70 80 L70 45 C70 38 65 32 60 30 L60 20 C60 15 55 10 50 10 Z"
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="2"
                  className="animate-pulse"
                />
                {/* Scanning line */}
                <line 
                  x1="20" y1="30" x2="80" y2="30"
                  stroke={colors.primary}
                  strokeWidth="3"
                  className="animate-pulse"
                  opacity="0.8"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-4">
          <Typography variant="body" className="text-center text-gray-600 mb-4">
            Notice any tension in your shoulders
          </Typography>
          <div className="flex justify-center">
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: colors.primary }}
            ></div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex justify-center space-x-2 mb-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full",
                i <= 1 ? 'opacity-100' : 'opacity-30'
              )}
              style={{ backgroundColor: colors.primary }}
            />
          ))}
        </div>
      </div>
    );
  }
  
  // Default content for other screens
  return (
    <div className="h-full flex flex-col p-6">
      {/* App Header */}
      <div className="flex items-center justify-between mb-6">
        <Typography variant="h4" className="text-gray-900 font-bold">
          Being.
        </Typography>
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Typography variant="body" className="text-white font-bold">
            FM
          </Typography>
        </div>
      </div>

      {/* Feature Content */}
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        {/* Feature Icon/Visual */}
        <div 
          className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
          style={{ backgroundColor: `${colors.primary}20` }}
        >
          <div 
            className="w-12 h-12 rounded-xl"
            style={{ backgroundColor: colors.primary }}
          ></div>
        </div>

        {/* Feature Title */}
        <Typography 
          variant="h3" 
          className="text-gray-900 font-bold mb-3"
          element="h3"
        >
          {screen.title}
        </Typography>

        {/* Feature Description */}
        <Typography 
          variant="body" 
          className="text-gray-600 leading-relaxed mb-6 max-w-xs"
          element="p"
        >
          {screen.description}
        </Typography>

        {/* CTA Button */}
        <button 
          className="px-8 py-3 rounded-xl text-white font-semibold shadow-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: colors.primary }}
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

// Interactive Screen Content Component
interface InteractiveScreenContentProps {
  screen: PhoneScreen;
  onScreenChange: (index: number) => void;
  screens: PhoneScreen[];
  currentIndex: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
}

const InteractiveScreenContent: React.FC<InteractiveScreenContentProps> = ({
  screen,
  onScreenChange,
  screens,
  currentIndex,
  isPlaying,
  onPlayToggle
}) => {
  return (
    <div className="h-full relative">
      <StaticScreenContent screen={screen} />
      
      {/* Screen Navigation Dots */}
      {screens.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {screens.map((_, index) => (
            <button
              key={index}
              onClick={() => onScreenChange(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                index === currentIndex 
                  ? 'bg-primary-500' 
                  : 'bg-gray-300 hover:bg-gray-400'
              )}
              aria-label={`Go to screen ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Play/Pause Control */}
      <button
        onClick={onPlayToggle}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
        aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </div>
  );
};