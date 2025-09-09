'use client';

/**
 * FullMind Header Component
 * Clinical-grade navigation with accessibility and therapeutic UX
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';
import { THEME_VARIANTS } from '@/lib/constants';

export interface HeaderProps {
  currentTheme?: 'morning' | 'midday' | 'evening';
  className?: string;
  'data-testid'?: string;
}


export const Header: React.FC<HeaderProps> = ({
  currentTheme = 'midday',
  className,
  'data-testid': testId,
  ...props
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll effect for header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get theme colors
  const themeColors = THEME_VARIANTS[currentTheme.toUpperCase() as keyof typeof THEME_VARIANTS];

  // Mobile menu toggle
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };


  return (
    <header
      className={cn(
        // Base header styling
        'sticky top-0 z-40 w-full transition-all duration-300',
        
        // Scroll state styling
        isScrolled 
          ? 'bg-white/95 backdrop-blur-sm shadow-soft border-b border-gray-100' 
          : 'bg-transparent',
        
        // Custom classes
        className
      )}
      data-testid={testId}
      {...props}
    >
      <Container size="full" padding="md">
        <nav id="navigation" className="flex items-center justify-between h-16 lg:h-20" role="navigation" aria-label="Main navigation">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary-500/50 rounded-md"
            aria-label="FullMind - Clinical MBCT App"
          >
            {/* Logo icon - breathing circle design matching app */}
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
              style={{ backgroundColor: themeColors.primary }}
            >
              <div className="w-4 h-4 rounded-full bg-white/80 animate-pulse-gentle" />
            </div>
            
            <Typography
              variant="h5"
              className="font-bold text-text-primary"
            >
              FullMind
            </Typography>
          </Link>


          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Button
              variant="outline"
              size="md"
              href="#download"
              data-testid="header-download-button"
            >
              Download App
            </Button>
            
            <Button
              variant="primary"
              size="md"
              href="/get-started"
              style={{ backgroundColor: themeColors.primary }}
              className="hover:opacity-90"
              data-testid="header-get-started-button"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors duration-200"
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle mobile menu"
            data-testid="mobile-menu-toggle"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden mt-4 pb-6 border-t border-gray-100 animate-fade-in"
            data-testid="mobile-menu"
          >
            <nav className="flex flex-col gap-4 mt-6">
              {/* Mobile CTA Buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  size="md"
                  href="#download"
                  className="w-full justify-center"
                  data-testid="mobile-download-button"
                >
                  Download App
                </Button>
                
                <Button
                  variant="primary"
                  size="md"
                  href="/get-started"
                  style={{ backgroundColor: themeColors.primary }}
                  className="w-full justify-center hover:opacity-90"
                  data-testid="mobile-get-started-button"
                >
                  Get Started
                </Button>
              </div>
            </nav>
          </div>
        )}
      </Container>
    </header>
  );
};