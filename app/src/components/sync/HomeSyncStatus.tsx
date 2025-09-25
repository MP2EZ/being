/**
 * Home Sync Status - Integrated sync status display for HomeScreen
 * Shows sync status for all data types with clinical priority indicators
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { SyncEntityType } from '../../types/cross-device-sync-canonical';
import { colors } from '../../constants/colors';

interface HomeSyncStatusProps {
  compact?: boolean;
  showAllStores?: boolean;
}

/**
 * Unified sync status display for the home screen
 */
export const HomeSyncStatus: React.FC<HomeSyncStatusProps> = ({
  compact = false,
  showAllStores = false
}) => {
  const [conflictModalVisible, setConflictModalVisible] = useState(false);

  /**
   * Handle conflict resolution
   */
  const handleConflictPress = () => {
    setConflictModalVisible(true);
  };

  /**
   * Handle sync trigger
   */
  const handleSyncPress = () => {
    // This could trigger a manual sync or show sync details
    console.log('Manual sync triggered from home screen');
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <SyncStatusIndicator
          compact
          onConflictPress={handleConflictPress}
          onPress={handleSyncPress}
        />
        
        <ConflictResolutionModal
          visible={conflictModalVisible}
          onClose={() => setConflictModalVisible(false)}
        />
      </View>
    );
  }

  const storeTypes = showAllStores 
    ? [
        SyncEntityType.CHECK_IN,
        SyncEntityType.ASSESSMENT,
        SyncEntityType.USER_PROFILE,
        SyncEntityType.CRISIS_PLAN,
        SyncEntityType.WIDGET_DATA
      ]
    : [SyncEntityType.CHECK_IN]; // Only show check-ins by default

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sync Status</Text>
        <Pressable 
          onPress={handleSyncPress} 
          style={({ pressed }) => [
            styles.syncButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }
          ]}
        >
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </Pressable>
      </View>
      
      <View style={styles.statusList}>
        {/* Global sync status */}
        <SyncStatusIndicator
          onConflictPress={handleConflictPress}
          onPress={handleSyncPress}
          showDetails={false}
        />
        
        {/* Individual store statuses */}
        {showAllStores && storeTypes.map(entityType => (
          <SyncStatusIndicator
            key={entityType}
            entityType={entityType}
            onConflictPress={handleConflictPress}
            onPress={handleSyncPress}
            showDetails
          />
        ))}
      </View>
      
      <ConflictResolutionModal
        visible={conflictModalVisible}
        onClose={() => setConflictModalVisible(false)}
        onResolutionComplete={(resolution) => {
          console.log('Conflict resolved:', resolution);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    alignItems: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  syncButton: {
    backgroundColor: colors.themes.morning.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  statusList: {
    gap: 8,
  },
});