'use client';

/**
 * Being. Header Component
 * Clinical-grade navigation with accessibility and therapeutic UX with dark mode support
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { ThemeSelector } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { FEATURE_FLAGS } from '@/lib/constants';


export interface HeaderProps {
  className?: string;
  'data-testid'?: string;
  showThemeSelector?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  className,
  'data-testid': testId,
  showThemeSelector = true,
  ...props
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Get current theme from context when available
  // For now, we'll always call the hook since the ThemeProvider is in layout.tsx
  const { themeColors, isDark } = useTheme();

  // Handle scroll effect for header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mobile menu toggle
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header
      className={cn(
        // Base header styling with theme support
        'sticky top-0 z-40 w-full transition-all duration-300 theme-transition',
        
        // Scroll state styling with theme-aware colors
        isScrolled 
          ? 'bg-bg-primary/95 backdrop-blur-sm shadow-theme-soft border-b border-border-primary' 
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
            className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-border-focus rounded-md theme-transition"
            aria-label="Being. - Clinical MBCT App"
          >
            {/* Logo icon - breathing circle design matching app */}
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
              style={{ backgroundColor: isDark ? themeColors.dark.primary : themeColors.primary }}
            >
              <div className="w-4 h-4 rounded-full bg-white/80 animate-pulse-gentle" />
            </div>
            
            <Typography
              variant="h5"
              className="font-bold text-text-primary theme-transition"
            >
              Being.
            </Typography>
          </Link>


          {/* CTA Buttons and Theme Selector */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Quick Theme Toggle */}
            {showThemeSelector && FEATURE_FLAGS.DARK_MODE && <QuickThemeToggle />}
            
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
              style={{ backgroundColor: isDark ? themeColors.dark.primary : themeColors.primary }}
              className="hover:opacity-90 theme-transition"
              data-testid="header-get-started-button"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-border-focus transition-colors duration-200 theme-transition"
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
            className="lg:hidden mt-4 pb-6 border-t border-border-primary animate-fade-in theme-transition"
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
                  style={{ backgroundColor: isDark ? themeColors.dark.primary : themeColors.primary }}
                  className="w-full justify-center hover:opacity-90 theme-transition"
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

// Quick Theme Toggle Component
const QuickThemeToggle: React.FC = () => {
  const { isDark, toggleColorMode } = useTheme();

  return (
    <button
      onClick={toggleColorMode}
      className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-border-focus transition-colors duration-200 theme-transition"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};