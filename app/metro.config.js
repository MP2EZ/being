const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix for expo-web-browser Metro bundler dependency resolution issue
// Prevents ENOENT errors from nested node_modules paths
config.resolver.alias = {
  'expo-web-browser': path.resolve(__dirname, 'node_modules/expo-web-browser'),
};

// Blacklist nested node_modules to prevent duplicate resolution attempts
config.resolver.blacklistRE = /.*\/node_modules\/.*\/node_modules\/expo-web-browser\/.*/;

// Configure resolver for proper Expo package resolution
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx'];

// Disable symlinks to prevent resolution issues
config.resolver.unstable_enableSymlinks = false;

module.exports = config;