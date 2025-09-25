// Add to your main navigation or development menu

import { Phase5EDashboardScreen } from './validation/Phase5EIntegration';

// Navigation entry
{
  name: 'Phase 5E Monitor',
  component: Phase5EDashboardScreen,
  options: {
    title: '24-Hour Parallel Run',
    headerStyle: { backgroundColor: '#007AFF' }
  }
}

// Or direct component usage
<Phase5EDashboardScreen />