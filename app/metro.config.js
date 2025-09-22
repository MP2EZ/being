const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Note: unstable_enableSymlinks removed per Expo Doctor recommendation
// New Architecture support is handled by Expo's default configuration

// Fix for expo-web-browser Metro bundler dependency resolution issue
// Prevents ENOENT errors from nested node_modules paths
config.resolver.alias = {
  'expo-web-browser': path.resolve(__dirname, 'node_modules/expo-web-browser'),
};

// Blacklist nested node_modules to prevent duplicate resolution attempts
config.resolver.blacklistRE = /.*\/node_modules\/.*\/node_modules\/expo-web-browser\/.*/;

// Configure resolver for proper Expo package resolution with New Architecture support
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx'];

// New Architecture: Enable Hermes bytecode caching for improved performance
config.transformer.hermesCommand = path.resolve(__dirname, 'node_modules/react-native/sdks/hermesc/%OS-BIN%/hermesc');

// New Architecture: Configure for TurboModules and Fabric
config.transformer.unstable_allowRequireContext = true;

// Performance optimization for New Architecture
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;