module.exports = {
  presets: ['babel-preset-expo'],
  env: {
    // Production bundles (expo export / EAS) run with NODE_ENV=production.
    // Strip console.* except error/warn so debug logging never ships, while
    // keeping diagnostic breadcrumbs (and Sentry's console capture) intact.
    production: {
      plugins: [['transform-remove-console', { exclude: ['error', 'warn'] }]],
    },
    // Jest's Node VM can't execute native dynamic `import()`. This test-only
    // plugin rewrites dynamic imports to `Promise.resolve().then(() =>
    // require(...))` so `await import(...)` (used to break circular deps,
    // e.g. subscriptionStore -> IAPService) resolves through Jest's module
    // registry and honors jest.mock. Static imports are untouched. Metro/EAS
    // use their own env and are unaffected. (MAINT-242)
    test: {
      plugins: ['./scripts/babel-plugin-jest-dynamic-import.js'],
    },
  },
};
