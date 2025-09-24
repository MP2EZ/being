/**
 * useSyncKeyboardShortcuts - Enhanced keyboard navigation for cross-device sync
 *
 * Features:
 * - Crisis-safe keyboard shortcuts (emergency access always available)
 * - Sync-specific keyboard navigation and shortcuts
 * - Screen reader optimized keyboard commands
 * - Context-aware shortcut availability
 * - Mental health state-responsive keyboard behavior
 */

import { useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SyncAccessibilityCoordinator } from '../services/accessibility/SyncAccessibilityCoordinator';
import { syncOrchestrationService } from '../services/sync/SyncOrchestrationService';
import { MentalHealthState } from '../types/mental-health';
import { SyncStatus } from '../types/sync';

interface KeyboardShortcutConfig {
  key: string;
  modifiers: ('ctrl' | 'cmd' | 'alt' | 'shift')[];
  action: () => void;
  description: string;
  category: 'crisis' | 'sync' | 'navigation' | 'accessibility';
  availableWhen: 'always' | 'sync_active' | 'conflicts_present' | 'screen_reader';
  priority: 'high' | 'medium' | 'low';
}

interface UseSyncKeyboardShortcutsOptions {
  enableSyncShortcuts?: boolean;
  enableAccessibilityShortcuts?: boolean;
  currentMentalHealthState?: MentalHealthState;
  onConflictNavigation?: (direction: 'next' | 'previous') => void;
  onSyncStatusRequest?: () => void;
  onEmergencyAccess?: () => void;
}

export const useSyncKeyboardShortcuts = (options: UseSyncKeyboardShortcutsOptions = {}) => {
  const {
    enableSyncShortcuts = true,
    enableAccessibilityShortcuts = true,
    currentMentalHealthState = 'stable',
    onConflictNavigation,
    onSyncStatusRequest,
    onEmergencyAccess
  } = options;

  const navigation = useNavigation();
  const keyHandlerRef = useRef<((event: KeyboardEvent) => void) | null>(null);
  const shortcutRegistryRef = useRef<Map<string, KeyboardShortcutConfig>>(new Map());

  // Register keyboard shortcuts
  const registerShortcuts = useCallback(() => {
    const shortcuts: KeyboardShortcutConfig[] = [
      // Crisis shortcuts (highest priority, always available)
      {
        key: '9',
        modifiers: ['ctrl'],
        action: handleEmergencyAccess,
        description: 'Emergency crisis support access',
        category: 'crisis',
        availableWhen: 'always',
        priority: 'high'
      },
      {
        key: '9',
        modifiers: ['cmd'],
        action: handleEmergencyAccess,
        description: 'Emergency crisis support access (Mac)',
        category: 'crisis',
        availableWhen: 'always',
        priority: 'high'
      },
      {
        key: 'F9',
        modifiers: [],
        action: handleEmergencyAccess,
        description: 'Emergency crisis support (Function key)',
        category: 'crisis',
        availableWhen: 'always',
        priority: 'high'
      },

      // Sync management shortcuts
      {
        key: 's',
        modifiers: ['ctrl', 'shift'],
        action: handleSyncStatusAnnouncement,
        description: 'Announce current sync status',
        category: 'sync',
        availableWhen: 'always',
        priority: 'medium'
      },
      {
        key: 'r',
        modifiers: ['ctrl', 'shift'],
        action: handleManualSync,
        description: 'Trigger manual sync',
        category: 'sync',
        availableWhen: 'always',
        priority: 'medium'
      },
      {
        key: 'c',
        modifiers: ['ctrl', 'shift'],
        action: handleOpenConflictResolver,
        description: 'Open conflict resolution',
        category: 'sync',
        availableWhen: 'conflicts_present',
        priority: 'medium'
      },
      {
        key: 'd',
        modifiers: ['ctrl', 'shift'],
        action: handleOpenDeviceManagement,
        description: 'Open device management',
        category: 'sync',
        availableWhen: 'always',
        priority: 'medium'
      },

      // Conflict navigation shortcuts
      {
        key: 'ArrowRight',
        modifiers: ['ctrl', 'alt'],
        action: () => handleConflictNavigation('next'),
        description: 'Next conflict',
        category: 'navigation',
        availableWhen: 'conflicts_present',
        priority: 'medium'
      },
      {
        key: 'ArrowLeft',
        modifiers: ['ctrl', 'alt'],
        action: () => handleConflictNavigation('previous'),
        description: 'Previous conflict',
        category: 'navigation',
        availableWhen: 'conflicts_present',
        priority: 'medium'
      },

      // Accessibility shortcuts
      {
        key: 'a',
        modifiers: ['ctrl', 'shift'],
        action: handleAccessibilityStatusReport,
        description: 'Accessibility status report',
        category: 'accessibility',
        availableWhen: 'screen_reader',
        priority: 'low'
      },
      {
        key: 'h',
        modifiers: ['ctrl', 'shift'],
        action: handleShowKeyboardHelp,
        description: 'Show keyboard shortcuts help',
        category: 'accessibility',
        availableWhen: 'always',
        priority: 'low'
      },

      // Emergency pattern shortcuts (panic sequences)
      {
        key: 'Escape',
        modifiers: ['ctrl'],
        action: handleEmergencyEscape,
        description: 'Emergency escape sequence',
        category: 'crisis',
        availableWhen: 'always',
        priority: 'high'
      }
    ];

    // Clear existing shortcuts
    shortcutRegistryRef.current.clear();

    // Register shortcuts that are available in current context
    shortcuts.forEach(shortcut => {
      if (isShortcutAvailable(shortcut)) {
        const key = createShortcutKey(shortcut.key, shortcut.modifiers);
        shortcutRegistryRef.current.set(key, shortcut);
      }
    });

  }, [currentMentalHealthState, enableSyncShortcuts, enableAccessibilityShortcuts]);

  // Crisis emergency access handler
  const handleEmergencyAccess = useCallback(async () => {
    try {
      // Announce emergency activation
      SyncAccessibilityCoordinator.announceCrisis(
        'keyboard-emergency',
        'Emergency crisis support activated. Help is available immediately.'
      );

      // Trigger emergency access callback or default navigation
      if (onEmergencyAccess) {
        onEmergencyAccess();
      } else {
        // Default to crisis support screen
        navigation.navigate('CrisisSupport' as never);
      }

      // Log emergency access for safety monitoring
      console.info('Emergency access triggered via keyboard shortcut');

    } catch (error) {
      console.error('Emergency access failed:', error);

      // Fallback announcement
      SyncAccessibilityCoordinator.announceForComponent(
        'keyboard-emergency-fallback',
        'Emergency access failed. Please use crisis button or call 988 directly.',
        'assertive',
        'crisis'
      );
    }
  }, [navigation, onEmergencyAccess]);

  // Sync status announcement handler
  const handleSyncStatusAnnouncement = useCallback(async () => {
    try {
      const syncState = await syncOrchestrationService.getSyncState();
      const conflicts = await syncOrchestrationService.getConflicts();

      const statusAnnouncement = generateComprehensiveSyncStatus(syncState, conflicts);

      SyncAccessibilityCoordinator.announceForComponent(
        'keyboard-sync-status',
        statusAnnouncement,
        'assertive',
        'sync'
      );

      // Call status request callback if provided
      if (onSyncStatusRequest) {
        onSyncStatusRequest();
      }

    } catch (error) {
      console.error('Sync status announcement failed:', error);

      SyncAccessibilityCoordinator.announceForComponent(
        'keyboard-sync-status-error',
        'Unable to get sync status. Sync service may be unavailable.',
        'assertive',
        'sync'
      );
    }
  }, [onSyncStatusRequest]);

  // Manual sync trigger handler
  const handleManualSync = useCallback(async () => {
    try {
      SyncAccessibilityCoordinator.announceForComponent(
        'keyboard-manual-sync',
        'Starting manual sync. This may take a moment.',
        'polite',
        'sync'
      );

      await syncOrchestrationService.triggerManualSync();

      SyncAccessibilityCoordinator.announceForComponent(
        'keyboard-manual-sync-success',
        'Manual sync completed successfully.',
        'polite',
        'sync'
      );

    } catch (error) {
      console.error('Manual sync failed:', error);

      SyncAccessibilityCoordinator.announceForComponent(
        'keyboard-manual-sync-error',
        'Manual sync failed. Will retry automatically.',
        'assertive',
        'sync'
      );
    }
  }, []);

  // Conflict resolution navigation handler
  const handleConflictNavigation = useCallback((direction: 'next' | 'previous') => {
    if (onConflictNavigation) {
      onConflictNavigation(direction);

      SyncAccessibilityCoordinator.announceForComponent(
        'keyboard-conflict-nav',
        `Navigated to ${direction} conflict.`,
        'polite',
        'navigation'
      );
    } else {
      SyncAccessibilityCoordinator.announceForComponent(
        'keyboard-conflict-nav-unavailable',
        'Conflict navigation not available in current context.',
        'polite',
        'navigation'
      );
    }
  }, [onConflictNavigation]);

  // Open conflict resolver handler
  const handleOpenConflictResolver = useCallback(async () => {
    try {
      const conflicts = await syncOrchestrationService.getConflicts();

      if (conflicts.length === 0) {
        SyncAccessibilityCoordinator.announceForComponent(
          'keyboard-no-conflicts',
          'No sync conflicts to resolve.',
          'polite',
          'sync'
        );
        return;
      }

      navigation.navigate('SyncConflictResolver' as never);

      SyncAccessibilityCoordinator.announceForComponent(
        'keyboard-conflict-resolver',
        `Opening conflict resolver. ${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} to resolve.`,
        'polite',
        'sync'
      );

    } catch (error) {
      console.error('Failed to open conflict resolver:', error);

      SyncAccessibilityCoordinator.announceForComponent(
        'keyboard-conflict-resolver-error',
        'Unable to open conflict resolver. Please try again.',
        'assertive',
        'sync'
      );
    }
  }, [navigation]);

  // Open device management handler
  const handleOpenDeviceManagement = useCallback(() => {
    navigation.navigate('DeviceManagement' as never);

    SyncAccessibilityCoordinator.announceForComponent(
      'keyboard-device-management',
      'Opening device management screen.',
      'polite',
      'sync'
    );
  }, [navigation]);

  // Accessibility status report handler
  const handleAccessibilityStatusReport = useCallback(() => {
    const stats = SyncAccessibilityCoordinator.getAccessibilityStats();

    const report = `
      Accessibility status: ${stats.activeAnnouncements} active announcements,
      ${stats.cacheSize} cached items,
      mental health state: ${stats.currentState},
      announcement speed: ${stats.throttleTime}ms intervals.
    `.replace(/\s+/g, ' ').trim();

    SyncAccessibilityCoordinator.announceForComponent(
      'keyboard-accessibility-report',
      report,
      'assertive',
      'accessibility'
    );
  }, []);

  // Show keyboard help handler
  const handleShowKeyboardHelp = useCallback(() => {
    const availableShortcuts = Array.from(shortcutRegistryRef.current.values())
      .sort((a, b) => {
        // Sort by priority, then category
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.category.localeCompare(b.category);
      });

    const helpText = generateKeyboardHelpText(availableShortcuts);

    // Show help modal or announce shortcuts
    Alert.alert(
      'Keyboard Shortcuts',
      helpText,
      [
        {
          text: 'Close',
          onPress: () => {
            SyncAccessibilityCoordinator.announceForComponent(
              'keyboard-help-closed',
              'Keyboard help closed.',
              'polite',
              'accessibility'
            );
          }
        }
      ]
    );

    // Also announce for screen reader users
    SyncAccessibilityCoordinator.announceForComponent(
      'keyboard-help',
      `Keyboard shortcuts help displayed. ${availableShortcuts.length} shortcuts available.`,
      'polite',
      'accessibility'
    );
  }, []);

  // Emergency escape handler (for panic situations)
  const handleEmergencyEscape = useCallback(() => {
    // Quick escape to safe screen
    navigation.navigate('Home' as never);

    SyncAccessibilityCoordinator.announceForComponent(
      'keyboard-emergency-escape',
      'Returned to home screen. Emergency support available if needed.',
      'assertive',
      'crisis'
    );
  }, [navigation]);

  // Keyboard event handler
  const handleKeyboardEvent = useCallback((event: KeyboardEvent) => {
    // Prevent default for our shortcuts
    const shortcutKey = createShortcutKey(event.key, getActiveModifiers(event));
    const shortcut = shortcutRegistryRef.current.get(shortcutKey);

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();

      // Execute shortcut action
      try {
        shortcut.action();
      } catch (error) {
        console.error(`Keyboard shortcut execution failed for ${shortcutKey}:`, error);
      }
    }
  }, []);

  // Panic key detection (rapid key presses)
  const setupPanicKeyDetection = useCallback(() => {
    if (currentMentalHealthState !== 'crisis') return;

    let keyPressCount = 0;
    let keyPressTimer: NodeJS.Timeout;

    const panicKeyHandler = () => {
      keyPressCount++;

      clearTimeout(keyPressTimer);
      keyPressTimer = setTimeout(() => {
        keyPressCount = 0;
      }, 3000); // 3 second window

      // If user presses any key 8+ times in 3 seconds during crisis, activate emergency
      if (keyPressCount >= 8) {
        handleEmergencyAccess();
        keyPressCount = 0;
      }
    };

    document.addEventListener('keydown', panicKeyHandler);

    return () => {
      document.removeEventListener('keydown', panicKeyHandler);
      clearTimeout(keyPressTimer);
    };
  }, [currentMentalHealthState, handleEmergencyAccess]);

  // Setup keyboard shortcuts
  useEffect(() => {
    if (Platform.OS !== 'web') return; // Keyboard shortcuts primarily for web

    registerShortcuts();

    // Create keyboard event handler
    keyHandlerRef.current = handleKeyboardEvent;

    // Add event listener
    document.addEventListener('keydown', keyHandlerRef.current);

    // Setup panic detection if in crisis
    const cleanupPanicDetection = setupPanicKeyDetection();

    return () => {
      if (keyHandlerRef.current) {
        document.removeEventListener('keydown', keyHandlerRef.current);
      }
      if (cleanupPanicDetection) {
        cleanupPanicDetection();
      }
    };
  }, [registerShortcuts, handleKeyboardEvent, setupPanicKeyDetection]);

  // Helper functions
  const isShortcutAvailable = (shortcut: KeyboardShortcutConfig): boolean => {
    // Crisis shortcuts always available
    if (shortcut.category === 'crisis') return true;

    // Check enablement flags
    if (shortcut.category === 'sync' && !enableSyncShortcuts) return false;
    if (shortcut.category === 'accessibility' && !enableAccessibilityShortcuts) return false;

    // Check availability conditions
    switch (shortcut.availableWhen) {
      case 'always':
        return true;
      case 'sync_active':
        return syncOrchestrationService.isSyncActive();
      case 'conflicts_present':
        return syncOrchestrationService.hasConflicts();
      case 'screen_reader':
        return isScreenReaderActive();
      default:
        return true;
    }
  };

  const createShortcutKey = (key: string, modifiers: string[]): string => {
    const sortedModifiers = modifiers.sort();
    return `${sortedModifiers.join('+')}+${key.toLowerCase()}`;
  };

  const getActiveModifiers = (event: KeyboardEvent): string[] => {
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.metaKey) modifiers.push('cmd');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    return modifiers;
  };

  const isScreenReaderActive = (): boolean => {
    // Detect if screen reader is likely active
    return (
      'speechSynthesis' in window ||
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      document.body.getAttribute('aria-hidden') === 'false'
    );
  };

  const generateComprehensiveSyncStatus = (syncState: any, conflicts: any[]): string => {
    const statusParts: string[] = [];

    // Overall sync state
    statusParts.push(`Sync status: ${syncState?.globalStatus || 'unknown'}`);

    // Active syncs
    const activeSyncs = syncState?.stores?.filter((store: any) => store.status === 'syncing').length || 0;
    if (activeSyncs > 0) {
      statusParts.push(`${activeSyncs} active sync${activeSyncs !== 1 ? 's' : ''}`);
    }

    // Conflicts
    if (conflicts.length > 0) {
      statusParts.push(`${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} need attention`);
    }

    // Crisis sync status
    const crisisStore = syncState?.stores?.find((store: any) => store.entityType === 'CRISIS_PLAN');
    if (crisisStore) {
      statusParts.push(`Crisis plan: ${crisisStore.status}`);
    }

    // Add encouragement based on mental health state
    if (currentMentalHealthState === 'depression' && conflicts.length === 0) {
      statusParts.push('Your progress is being safely backed up');
    } else if (currentMentalHealthState === 'anxiety') {
      statusParts.push('Everything is working normally');
    }

    return statusParts.join('. ') + '.';
  };

  const generateKeyboardHelpText = (shortcuts: KeyboardShortcutConfig[]): string => {
    const categories = ['crisis', 'sync', 'navigation', 'accessibility'];
    const helpSections: string[] = [];

    categories.forEach(category => {
      const categoryShortcuts = shortcuts.filter(s => s.category === category);
      if (categoryShortcuts.length === 0) return;

      const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
      const shortcutList = categoryShortcuts
        .map(s => `  ${formatShortcut(s.key, s.modifiers)}: ${s.description}`)
        .join('\n');

      helpSections.push(`${categoryTitle}:\n${shortcutList}`);
    });

    return helpSections.join('\n\n');
  };

  const formatShortcut = (key: string, modifiers: string[]): string => {
    const modifierSymbols: Record<string, string> = {
      'ctrl': Platform.OS === 'ios' ? '⌃' : 'Ctrl',
      'cmd': '⌘',
      'alt': Platform.OS === 'ios' ? '⌥' : 'Alt',
      'shift': '⇧'
    };

    const formattedModifiers = modifiers.map(m => modifierSymbols[m] || m);
    return [...formattedModifiers, key.toUpperCase()].join(' + ');
  };

  // Return hook interface
  return {
    // Status
    isEnabled: enableSyncShortcuts || enableAccessibilityShortcuts,
    availableShortcuts: Array.from(shortcutRegistryRef.current.values()),

    // Actions
    triggerEmergencyAccess: handleEmergencyAccess,
    announceSyncStatus: handleSyncStatusAnnouncement,
    triggerManualSync: handleManualSync,
    showKeyboardHelp: handleShowKeyboardHelp,

    // Utilities
    getShortcutForAction: (action: string) => {
      return Array.from(shortcutRegistryRef.current.values())
        .find(s => s.description.toLowerCase().includes(action.toLowerCase()));
    }
  };
};

export default useSyncKeyboardShortcuts;