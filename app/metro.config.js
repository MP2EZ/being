/**
 * Metro Configuration for Being.
 *
 * Security & Performance Optimizations:
 * - Hermes bytecode compilation provides primary obfuscation (configured in app.json)
 * - Production builds use Terser minification with console.log removal
 * - Source maps are never shipped inside the app. Release builds generate them and,
 *   on EAS production builds only, upload them to Sentry for symbolication (INFRA-800;
 *   SENTRY_DISABLE_AUTO_UPLOAD in eas.json turns the upload off everywhere else)
 *
 * `getSentryExpoConfig` wraps Expo's default config to inject a Sentry debug ID into
 * every bundle. Keep it option-free: `annotateReactComponents` and
 * `includeWebReplay: false` swap the transformer/resolver for every module on the 988
 * path and need their own crisis review (INFRA-800).
 *
 * Legal documents: the canonical `.md` sources at `docs/legal/*.md` (worktree
 * root) are mirrored into `app/src/features/profile/content/legalContent.generated.ts`
 * by `scripts/generate-legal-content.js`. Metro then loads them as a normal TS
 * module — no cross-tree resolution, no custom transformer. See DEBUG-178.
 *
 * @see https://docs.expo.dev/guides/minify/
 * @see https://docs.expo.dev/guides/using-hermes/
 */

const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Initialize default configuration with minimal customization
const config = getSentryExpoConfig(__dirname);

// No `config.resolver.alias` block here, deliberately (MAINT-623).
//
// Metro does not implement that option: `alias` appears nowhere in
// metro-resolver@0.84.4 or @expo/metro-config, so the block this file used to
// carry resolved nothing and had never resolved anything. `@/` works at bundle
// time because Expo CLI reads tsconfig.json's `compilerOptions.paths` via its
// `tsconfigPaths` experiment, which defaults on and app.json does not disable.
//
// Add path aliases to app/tsconfig.json, not here.

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