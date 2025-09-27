/**
 * SecurityBadge Component
 *
 * Displays security and compliance information for clinical tools.
 * Shows HIPAA readiness and encryption status.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet
} from 'react-native';

import { ClinicalIcon } from './ClinicalIcon';

interface SecurityBadgeProps {
  isHIPAAReady: boolean;
  encryptionStatus: string;
  accessibilityLabel?: string;
}

const SecurityBadge: React.FC<SecurityBadgeProps> = memo(({
  isHIPAAReady,
  encryptionStatus,
  accessibilityLabel
}) => {
  return (
    <View
      style={styles.securityBadge}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={
        accessibilityLabel ||
        `Security: HIPAA ${isHIPAAReady ? 'ready' : 'not ready'}, ${encryptionStatus} encryption`
      }
    >
      <View style={styles.badgeHeader}>
        <ClinicalIcon
          type="shield"
          size={16}
          color="#16A085"
          accessibilityLabel=""
        />
        <Text style={styles.badgeTitle}>Security & Compliance</Text>
      </View>

      <View style={styles.securityFeatures}>
        <View style={styles.securityItem}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isHIPAAReady ? '#48BB78' : '#F56565' }
          ]} />
          <Text style={styles.securityText}>
            HIPAA {isHIPAAReady ? 'Ready' : 'Pending'}
          </Text>
        </View>

        <View style={styles.securityItem}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: '#48BB78' }
          ]} />
          <Text style={styles.securityText}>
            {encryptionStatus} Encryption
          </Text>
        </View>

        <View style={styles.securityItem}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: '#48BB78' }
          ]} />
          <Text style={styles.securityText}>
            End-to-End Privacy
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  securityBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46'
  },
  securityFeatures: {
    gap: 8
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  securityText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '500'
  }
});

SecurityBadge.displayName = 'SecurityBadge';

export { SecurityBadge };