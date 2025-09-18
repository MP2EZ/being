/**
 * FullMind Website - Theme Integration Demo Page
 * Dedicated page for testing theme management functionality
 * Isolated from main app to test theme store integration
 */

'use client';

import React from 'react';
import { ThemeIntegrationDemo } from '@/components/demo/ThemeIntegrationDemo';

export default function ThemeDemoPage() {
  return (
    <div className="min-h-screen bg-[var(--fm-bg-primary)] theme-transition">
      {/* Simple header */}
      <header className="bg-[var(--fm-bg-secondary)] border-b border-[var(--fm-border-primary)] theme-transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-[var(--fm-text-primary)] theme-transition">
            FullMind Theme Integration Demo
          </h1>
          <p className="text-[var(--fm-text-secondary)] mt-2 theme-transition">
            Testing Zustand store + ThemeContext integration with localStorage persistence
          </p>
        </div>
      </header>

      {/* Main demo content */}
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ThemeIntegrationDemo />
        </div>
      </main>

      {/* Simple footer */}
      <footer className="bg-[var(--fm-bg-secondary)] border-t border-[var(--fm-border-primary)] theme-transition mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-[var(--fm-text-secondary)] text-sm theme-transition">
              FullMind Theme System - Clinical-grade dark mode with localStorage persistence
            </p>
            <p className="text-[var(--fm-text-tertiary)] text-xs mt-2 theme-transition">
              Visit <code>/theme-demo</code> to test theme functionality
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}