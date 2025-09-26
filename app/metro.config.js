/**
 * Simplified Metro Configuration - Post Systematic Cleanup
 * Hermes-compatible with essential TypeScript path aliases
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Initialize default configuration with minimal customization
const config = getDefaultConfig(__dirname);

// Essential TypeScript path aliases only
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@/components': path.resolve(__dirname, 'src/components'),
  '@/screens': path.resolve(__dirname, 'src/screens'),
  '@/services': path.resolve(__dirname, 'src/services'),
  '@/store': path.resolve(__dirname, 'src/store'),
  '@/types': path.resolve(__dirname, 'src/types'),
  '@/utils': path.resolve(__dirname, 'src/utils'),
  '@/api': path.resolve(__dirname, 'src/api'),
};

// Minimal development console output
if (process.env.NODE_ENV === 'development') {
  console.log('🏥 Being MBCT - Simplified Metro Configuration');
}

// Export consolidated configuration
module.exports = config;