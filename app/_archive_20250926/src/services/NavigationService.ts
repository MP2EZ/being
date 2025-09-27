/**
 * Navigation Service for Widget Deep Links
 * Provides centralized navigation handling for deep links from widgets
 * Integrates with React Navigation while maintaining clinical safety priorities
 */

import { NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

class NavigationServiceClass {
  private navigationRef: NavigationContainerRef<RootStackParamList> | null = null;

  /**
   * Set navigation reference from App component
   */
  setNavigationRef(ref: NavigationContainerRef<RootStackParamList>) {
    this.navigationRef = ref;
  }

  /**
   * Navigate to check-in flow from widget
   */
  navigateToCheckIn(type: 'morning' | 'midday' | 'evening', shouldResume: boolean) {
    if (!this.navigationRef) {
      console.error('Navigation ref not set');
      return;
    }

    console.log(`Widget navigation: Check-in ${type}, resume: ${shouldResume}`);

    try {
      // Navigate to check-in flow with appropriate parameters
      this.navigationRef.dispatch(
        CommonActions.navigate({
          name: 'CheckInFlow',
          params: {
            type,
            resumeSession: shouldResume,
            fromWidget: true,
            timestamp: new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error('Check-in navigation failed:', error);
      this.navigateToHome();
    }
  }

  /**
   * Navigate to crisis intervention (highest priority)
   */
  navigateToCrisis(trigger: string = 'widget_access') {
    if (!this.navigationRef) {
      console.error('Navigation ref not set');
      return;
    }

    console.log(`Widget navigation: Crisis intervention, trigger: ${trigger}`);

    try {
      // Crisis intervention has absolute priority - clear navigation stack
      this.navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'CrisisIntervention',
              params: {
                trigger: {
                  type: 'manual',
                  reason: trigger,
                },
                fromScreen: 'Widget',
                emergencyMode: true,
                timestamp: new Date().toISOString(),
              },
            },
          ],
        })
      );
    } catch (error) {
      console.error('Crisis navigation failed:', error);
      // Even if navigation fails, try to get to home as fallback
      this.navigateToHome();
    }
  }

  /**
   * Navigate to assessment flow
   */
  navigateToAssessment(type: 'phq9' | 'gad7') {
    if (!this.navigationRef) {
      console.error('Navigation ref not set');
      return;
    }

    console.log(`Widget navigation: Assessment ${type}`);

    try {
      this.navigationRef.dispatch(
        CommonActions.navigate({
          name: 'AssessmentFlow',
          params: {
            type,
            context: 'standalone',
            resumeSession: false,
            fromWidget: true,
            timestamp: new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error('Assessment navigation failed:', error);
      this.navigateToHome();
    }
  }

  /**
   * Navigate to home screen (fallback)
   */
  navigateToHome() {
    if (!this.navigationRef) {
      console.error('Navigation ref not set');
      return;
    }

    console.log('Widget navigation: Fallback to home');

    try {
      this.navigationRef.dispatch(
        CommonActions.navigate({
          name: 'Main',
          params: {
            screen: 'Home',
            params: {
              fromWidget: true,
              timestamp: new Date().toISOString(),
            },
          },
        })
      );
    } catch (error) {
      console.error('Home navigation failed:', error);
      // Last resort - reset to home
      this.resetToHome();
    }
  }

  /**
   * Reset navigation stack to home (emergency fallback)
   */
  private resetToHome() {
    if (!this.navigationRef) {
      return;
    }

    try {
      this.navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Main',
              params: {
                screen: 'Home',
                params: {
                  fromWidget: true,
                  reset: true,
                  timestamp: new Date().toISOString(),
                },
              },
            },
          ],
        })
      );
    } catch (error) {
      console.error('Reset to home failed:', error);
    }
  }

  /**
   * Get current route name (for debugging)
   */
  getCurrentRouteName(): string | undefined {
    if (!this.navigationRef) {
      return undefined;
    }

    try {
      return this.navigationRef.getCurrentRoute()?.name;
    } catch (error) {
      console.error('Failed to get current route:', error);
      return undefined;
    }
  }

  /**
   * Check if navigation is ready
   */
  isReady(): boolean {
    return this.navigationRef?.isReady() || false;
  }
}

export const NavigationService = new NavigationServiceClass();