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

// Add .md to source extensions for importing markdown files as raw text
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'md');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'md'];

// Configure transformer to handle .md files as raw text
config.transformer.babelTransformerPath = require.resolve('./metro-md-transformer.js');

// Watch parent directory to allow importing from docs/legal/
// This enables single source of truth for legal documents (used by both website and app)
const repoRoot = path.resolve(__dirname, '..');
config.watchFolders = [repoRoot];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Minimal development console output
if (process.env.NODE_ENV === 'development') {
  console.log('🏥 Being. - Simplified Metro Configuration');
}

// Export consolidated configuration
module.exports = config;