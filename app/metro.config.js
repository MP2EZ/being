/**
 * Metro Configuration for Being.
 *
 * Security & Performance Optimizations:
 * - Hermes bytecode compilation provides primary obfuscation (configured in app.json)
 * - Production builds use Terser minification with console.log removal
 * - Source maps excluded from production bundles (see eas.json)
 *
 * Legal documents: the canonical `.md` sources at `docs/legal/*.md` (worktree
 * root) are mirrored into `app/src/features/profile/content/legalContent.generated.ts`
 * by `scripts/generate-legal-content.js`. Metro then loads them as a normal TS
 * module — no cross-tree resolution, no custom transformer. See DEBUG-178.
 *
 * @see https://docs.expo.dev/guides/minify/
 * @see https://docs.expo.dev/guides/using-hermes/
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

/**
 * Production Minification Configuration
 *
 * Uses Terser (default Metro minifier) with optimized settings:
 * - drop_console: Removes all console.* statements in production
 * - drop_debugger: Removes debugger statements
 * - dead_code: Eliminates unreachable code
 *
 * Note: Hermes bytecode compilation (jsEngine: "hermes" in app.json)
 * provides the primary obfuscation layer by converting JS to bytecode.
 */
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  config.transformer.minifierConfig = {
    compress: {
      // Remove all console.log/warn/error statements in production
      drop_console: true,
      // Remove debugger statements
      drop_debugger: true,
      // Remove unreachable code
      dead_code: true,
      // Optimize conditionals
      conditionals: true,
      // Evaluate constant expressions
      evaluate: true,
      // Remove unused variables
      unused: true,
    },
    mangle: {
      // Shorten variable names for smaller bundle size
      toplevel: true,
    },
    output: {
      // Remove comments in production
      comments: false,
    },
  };
}

// Minimal development console output
if (process.env.NODE_ENV === 'development') {
  console.log('🏥 Being. - Metro Configuration (Development Mode)');
}

// Export consolidated configuration
module.exports = config;