module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Temporarily disabled all plugins for Template T2 debugging
      // 'react-native-reanimated/plugin', // DEPRECATED - causes runtime error
      // 'react-native-worklets/plugin'
    ]
  };
};