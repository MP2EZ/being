module.exports = {
  presets: ['babel-preset-expo'],
  env: {
    // Production bundles (expo export / EAS) run with NODE_ENV=production.
    // Strip console.* except error/warn so debug logging never ships, while
    // keeping diagnostic breadcrumbs (and Sentry's console capture) intact.
    production: {
      plugins: [['transform-remove-console', { exclude: ['error', 'warn'] }]],
    },
  },
};
