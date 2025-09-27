/**
 * Time Helper Utilities
 * Provides time-of-day adaptive theming and scheduling utilities
 */

export type TimeOfDay = 'morning' | 'midday' | 'evening';

/**
 * Get current time-of-day theme based on system time
 */
export const getTimeOfDayTheme = (): TimeOfDay => {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 11) {
    return 'morning';
  } else if (hour >= 11 && hour < 17) {
    return 'midday';
  } else {
    return 'evening';
  }
};

/**
 * Get therapeutic greeting based on time of day
 */
export const getTherapeuticGreeting = (): string => {
  const timeOfDay = getTimeOfDayTheme();

  switch (timeOfDay) {
    case 'morning':
      return 'Good morning';
    case 'midday':
      return 'Good afternoon';
    case 'evening':
      return 'Good evening';
    default:
      return 'Hello';
  }
};

/**
 * Check if current time is within therapeutic practice hours
 */
export const isTherapeuticPracticeTime = (): boolean => {
  const hour = new Date().getHours();
  // Therapeutic practice hours: 6 AM to 10 PM
  return hour >= 6 && hour <= 22;
};

/**
 * Format time for therapeutic scheduling
 */
export const formatTherapeuticTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Get next suggested practice time based on current time
 */
export const getNextPracticeTime = (): { time: string; period: TimeOfDay } => {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 8) {
    return { time: '8:00 AM', period: 'morning' };
  } else if (hour < 13) {
    return { time: '1:00 PM', period: 'midday' };
  } else if (hour < 20) {
    return { time: '8:00 PM', period: 'evening' };
  } else {
    // Next morning
    return { time: '8:00 AM', period: 'morning' };
  }
};