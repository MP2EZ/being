'use client';

/**
 * Being. Features Section
 * Clinical features showcase with therapeutic UX patterns
 */

import React, { useState, useEffect } from 'react';
import { Container, Typography } from '@/components/ui';
import { cn } from '@/lib/utils';

interface FeaturesProps {
  className?: string;
  variant?: 'default' | 'clinical' | 'interactive';
  layout?: 'grid' | 'tabs' | 'carousel';
  'data-testid'?: string;
}

// Define time-based features data
const timeBasedFeatures = [
  {
    id: 'morning',
    time: 'Morning',
    title: 'Start Your Day Mindfully',
    subtitle: '7:00 - 10:00 AM',
    description: 'Begin each morning with intentional check-ins that set the foundation for emotional awareness and mental clarity throughout your day.',
    features: [
      'Daily mood and energy assessment',
      'Mindful intention setting',
      'Personalized MBCT exercises',
      'Progress tracking and insights'
    ],
    colors: {
      primary: 'from-orange-400 to-amber-500',
      background: 'from-orange-50 to-amber-50',
      accent: 'text-orange-600',
      border: 'border-orange-200'
    },
    icon: '🌅'
  },
  {
    id: 'midday',
    time: 'Midday',
    title: 'Reset and Recharge',
    subtitle: '11:00 AM - 3:00 PM',
    description: 'Take purposeful breaks to reconnect with yourself through guided breathing exercises and mindfulness practices that restore focus and calm.',
    features: [
      'Guided breathing exercises (3-minute sessions)',
      'Stress level monitoring',
      'Mindful movement prompts',
      'Real-time anxiety support'
    ],
    colors: {
      primary: 'from-teal-400 to-cyan-500',
      background: 'from-teal-50 to-cyan-50',
      accent: 'text-teal-600',
      border: 'border-teal-200'
    },
    icon: '🧘‍♀️'
  },
  {
    id: 'evening',
    time: 'Evening',
    title: 'Reflect and Restore',
    subtitle: '6:00 - 10:00 PM',
    description: 'End your day with thoughtful reflection, processing emotions and experiences while preparing your mind for restorative sleep.',
    features: [
      'Daily reflection and journaling',
      'Emotional processing exercises',
      'Sleep preparation rituals',
      'Weekly progress summaries'
    ],
    colors: {
      primary: 'from-indigo-400 to-purple-500',
      background: 'from-indigo-50 to-purple-50',
      accent: 'text-indigo-600',
      border: 'border-indigo-200'
    },
    icon: '🌙'
  }
];

export const Features: React.FC<FeaturesProps> = ({
  className,
  variant = 'default',
  layout = 'grid',
  'data-testid': testId,
}) => {
  const [activeTimeSlot, setActiveTimeSlot] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    if (!autoRotate) return;
    
    const interval = setInterval(() => {
      setActiveTimeSlot((current) => (current + 1) % timeBasedFeatures.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRotate]);

  const currentFeature = timeBasedFeatures[activeTimeSlot];

  const sectionClasses = cn(
    // Base styling
    'py-16 lg:py-24',
    
    // Clinical variant background
    variant === 'clinical' && 'bg-gradient-to-b from-white to-clinical-safe/5',
    
    className
  );

  const handleTimeSlotChange = (index: number) => {
    setActiveTimeSlot(index);
    setAutoRotate(false); // Pause auto-rotation when user interacts
    setTimeout(() => setAutoRotate(true), 10000); // Resume after 10 seconds
  };

  return (
    <section className={sectionClasses} data-testid={testId} id="features">
      <Container>
        {/* Section Header */}
        <div className="text-center mb-16">
          <Typography 
            variant="h2" 
            className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            element="h2"
          >
            Your Daily Mental Health Journey
          </Typography>
          <Typography 
            variant="body" 
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-8"
            element="p"
          >
            Being. adapts to your natural rhythms, providing personalized MBCT practices 
            that evolve throughout your day for optimal mental wellness.
          </Typography>
        </div>

        {/* Time Navigation */}
        <div className="flex justify-center mb-12">
          <div className="flex space-x-2 p-1 bg-gray-100 rounded-xl">
            {timeBasedFeatures.map((feature, index) => (
              <button
                key={feature.id}
                onClick={() => handleTimeSlotChange(index)}
                className={cn(
                  'px-6 py-3 rounded-lg font-medium transition-all duration-300 relative',
                  index === activeTimeSlot
                    ? `bg-white shadow-md ${feature.colors.accent}`
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <span className="text-xl mr-2" role="img" aria-hidden="true">
                  {feature.icon}
                </span>
                {feature.time}
                {index === activeTimeSlot && (
                  <div className={cn(
                    'absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2 w-2 h-2 rounded-full bg-gradient-to-r',
                    feature.colors.primary
                  )} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Showcase */}
        <div className={cn(
          'rounded-2xl p-8 lg:p-12 transition-all duration-500 bg-gradient-to-br',
          currentFeature.colors.background
        )}>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content Side */}
            <div>
              <div className="flex items-center mb-4">
                <span className="text-4xl mr-4" role="img" aria-label={currentFeature.time}>
                  {currentFeature.icon}
                </span>
                <div>
                  <Typography variant="h3" className={cn('font-bold', currentFeature.colors.accent)}>
                    {currentFeature.title}
                  </Typography>
                  <Typography variant="body" className="text-gray-600 text-sm">
                    {currentFeature.subtitle}
                  </Typography>
                </div>
              </div>
              
              <Typography variant="body" className="text-gray-700 mb-8 leading-relaxed">
                {currentFeature.description}
              </Typography>

              <div className="space-y-4">
                {currentFeature.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-4 mt-0.5 bg-gradient-to-r',
                      currentFeature.colors.primary
                    )}>
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <Typography variant="body" className="text-gray-700">
                      {feature}
                    </Typography>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Side */}
            <div className="relative">
              <TimeVisualization 
                timeSlot={currentFeature.id} 
                colors={currentFeature.colors}
                isActive={true}
              />
            </div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="flex justify-center mt-8 space-x-2">
          {timeBasedFeatures.map((_, index) => (
            <button
              key={index}
              onClick={() => handleTimeSlotChange(index)}
              className={cn(
                'w-3 h-3 rounded-full transition-all duration-300',
                index === activeTimeSlot
                  ? `bg-gradient-to-r ${currentFeature.colors.primary}`
                  : 'bg-gray-300 hover:bg-gray-400'
              )}
              aria-label={`Go to ${timeBasedFeatures[index].time} features`}
            />
          ))}
        </div>
      </Container>
    </section>
  );
};

// Time Visualization Component
interface TimeVisualizationProps {
  timeSlot: string;
  colors: {
    primary: string;
    background: string;
    accent: string;
    border: string;
  };
  isActive: boolean;
}

const TimeVisualization: React.FC<TimeVisualizationProps> = ({ 
  timeSlot, 
  colors, 
  isActive 
}) => {
  const renderVisualization = () => {
    switch (timeSlot) {
      case 'morning':
        return (
          <div className="relative w-full max-w-md mx-auto">
            {/* Sunrise visualization */}
            <div className={cn(
              'w-72 h-72 rounded-full mx-auto relative bg-gradient-to-b',
              colors.primary,
              'animate-pulse-gentle'
            )}>
              {/* Sun rays */}
              <div className="absolute inset-0">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'absolute w-1 bg-gradient-to-t',
                      colors.primary,
                      'animate-pulse-gentle'
                    )}
                    style={{
                      height: '60px',
                      left: '50%',
                      top: '-30px',
                      transformOrigin: 'bottom center',
                      transform: `translateX(-50%) rotate(${i * 45}deg)`,
                      opacity: 0.7,
                      animationDelay: `${i * 0.2}s`
                    }}
                  />
                ))}
              </div>
              
              {/* Center content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-6xl mb-2">🌅</div>
                  <Typography variant="h6" className="font-bold">
                    Morning Check-in
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'midday':
        return (
          <div className="relative w-full max-w-md mx-auto">
            {/* Breathing circle visualization */}
            <div className="relative">
              <div className={cn(
                'w-72 h-72 rounded-full mx-auto bg-gradient-to-br',
                colors.primary,
                'animate-breathing'
              )}>
                {/* Ripple effects */}
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'absolute inset-0 rounded-full border-4',
                      'border-white/30 animate-ripple'
                    )}
                    style={{
                      animationDelay: `${i * 1}s`,
                      animationDuration: '3s'
                    }}
                  />
                ))}
                
                {/* Center content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-2">🧘‍♀️</div>
                    <Typography variant="h6" className="font-bold">
                      Mindful Reset
                    </Typography>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'evening':
        return (
          <div className="relative w-full max-w-md mx-auto">
            {/* Night sky visualization */}
            <div className={cn(
              'w-72 h-72 rounded-full mx-auto relative bg-gradient-to-b',
              colors.primary,
              'overflow-hidden'
            )}>
              {/* Stars */}
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-white rounded-full animate-twinkle"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 0.5}s`
                  }}
                />
              ))}
              
              {/* Center content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-6xl mb-2">🌙</div>
                  <Typography variant="h6" className="font-bold">
                    Evening Reflection
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {renderVisualization()}
      
      {/* Floating elements */}
      <div className="absolute -top-4 -right-4">
        <div className={cn(
          'w-8 h-8 rounded-full bg-gradient-to-r',
          colors.primary,
          'animate-float'
        )} />
      </div>
      
      <div className="absolute -bottom-4 -left-4">
        <div className={cn(
          'w-6 h-6 rounded-full bg-gradient-to-r',
          colors.primary,
          'animate-float opacity-60'
        )}
        style={{ animationDelay: '1s' }}
        />
      </div>
    </div>
  );
};