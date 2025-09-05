import { colorSystem } from '../constants/colors';

/**
 * Theme hook for accessing color system consistently
 * Supports morning, midday, evening themes
 */
export const useTheme = () => {
  return {
    colorSystem,
    getThemeColors: (theme: 'morning' | 'midday' | 'evening' | null) => {
      return theme ? colorSystem.themes[theme] : null;
    }
  };
};