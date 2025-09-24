/**
 * Core Components Index - Enhanced Therapeutic UI Components
 *
 * All enhanced components include:
 * - Time-of-day adaptive theming
 * - Anxiety-aware interactions
 * - Therapeutic animations and timing
 * - Enhanced accessibility features
 * - Optimized React Native performance
 */

// Enhanced Core UI Components
export { Button } from './Button';
export { Card } from './Card';
export { Screen } from './Screen';
export { Typography, TherapeuticHeading, CrisisText, MindfulBody } from './Typography';

// Enhanced Specialized Therapeutic Components
export { MoodSelector } from './MoodSelector';
export { CheckInCard } from './CheckInCard';

// Enhanced Navigation Components
export { TabBar } from '../navigation/TabBar';

// Enhanced Check-in Components
export { EmotionGrid } from '../checkin/EmotionGrid';
export { BreathingCircle } from '../checkin/BreathingCircle.optimized';

// Existing Core Components (maintain compatibility)
export { TextInput } from './TextInput';
export { CrisisButton } from './CrisisButton';
export { Slider } from './Slider';
export { MultiSelect } from './MultiSelect';
export { TextArea } from './TextArea';
export { BrainIcon } from './BrainIcon';
export { LoadingScreen } from './LoadingScreen';
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export { AccessibleAlert } from './AccessibleAlert';
export { SessionProgressBar } from './SessionProgressBar';
export { ResumeSessionPrompt } from './ResumeSessionPrompt';