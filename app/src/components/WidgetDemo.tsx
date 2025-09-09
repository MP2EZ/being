/**
 * Widget Demo Component
 * Demonstrates widget integration and testing for FullMind MBCT app
 * For development and testing purposes only
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { WidgetDataService } from '../services/WidgetDataService';
import { useWidgetIntegration } from '../hooks/useWidgetIntegration';

export const WidgetDemo: React.FC = () => {
  const { updateWidgetData, handleDeepLink } = useWidgetIntegration();
  const [lastUpdate, setLastUpdate] = useState<string>('Never');
  const [isUpdating, setIsUpdating] = useState(false);

  const widgetService = new WidgetDataService();

  const handleUpdateWidget = async () => {
    setIsUpdating(true);
    try {
      await updateWidgetData();
      setLastUpdate(new Date().toLocaleTimeString());
      Alert.alert('Success', 'Widget data updated successfully');
    } catch (error) {
      Alert.alert('Error', `Widget update failed: ${error}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const testDeepLink = async (url: string, description: string) => {
    try {
      await handleDeepLink(url);
      Alert.alert('Deep Link Test', `${description} - Navigation triggered`);
    } catch (error) {
      Alert.alert('Error', `Deep link test failed: ${error}`);
    }
  };

  const generateSampleData = async () => {
    try {
      const sampleData = await widgetService.generateWidgetData();
      Alert.alert('Sample Data', JSON.stringify(sampleData, null, 2));
    } catch (error) {
      Alert.alert('Error', `Failed to generate sample data: ${error}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Widget Integration Demo</Text>
      <Text style={styles.subtitle}>For Development & Testing</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Widget Data Management</Text>
        
        <TouchableOpacity 
          style={[styles.button, isUpdating && styles.buttonDisabled]} 
          onPress={handleUpdateWidget}
          disabled={isUpdating}
        >
          <Text style={styles.buttonText}>
            {isUpdating ? 'Updating...' : 'Update Widget Data'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.info}>Last Update: {lastUpdate}</Text>

        <TouchableOpacity 
          style={styles.button} 
          onPress={generateSampleData}
        >
          <Text style={styles.buttonText}>View Sample Widget Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deep Link Testing</Text>
        
        <TouchableOpacity 
          style={styles.deepLinkButton} 
          onPress={() => testDeepLink('fullmind://checkin/morning', 'Morning Check-in')}
        >
          <Text style={styles.buttonText}>Test: Morning Check-in</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deepLinkButton} 
          onPress={() => testDeepLink('fullmind://checkin/midday?resume=true', 'Resume Midday')}
        >
          <Text style={styles.buttonText}>Test: Resume Midday Session</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deepLinkButton} 
          onPress={() => testDeepLink('fullmind://checkin/evening', 'Evening Check-in')}
        >
          <Text style={styles.buttonText}>Test: Evening Check-in</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.deepLinkButton, styles.crisisButton]} 
          onPress={() => testDeepLink('fullmind://crisis', 'Crisis Intervention')}
        >
          <Text style={styles.buttonText}>Test: Crisis Intervention</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔒 Privacy Protection</Text>
          <Text style={styles.infoText}>
            • No PHQ-9/GAD-7 data in widgets{'\n'}
            • Encrypted storage with integrity verification{'\n'}
            • Automatic clinical data filtering{'\n'}
            • Real-time privacy auditing
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🚨 Crisis Safety</Text>
          <Text style={styles.infoText}>
            • Emergency access bypasses navigation{'\n'}
            • 988 hotline integration ready{'\n'}
            • Fail-safe fallback mechanisms{'\n'}
            • High-priority crisis updates
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>⚡ Performance</Text>
          <Text style={styles.infoText}>
            • Updates throttled to 1-minute intervals{'\n'}
            • Memory usage monitored (<50MB){'\n'}
            • Battery-efficient background processing{'\n'}
            • Intelligent caching with LRU eviction
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Widget Features</Text>
        
        <View style={styles.featureList}>
          <Text style={styles.feature}>✅ Daily Progress Tracking</Text>
          <Text style={styles.feature}>✅ Session Resume Capability</Text>
          <Text style={styles.feature}>✅ Crisis Button Access</Text>
          <Text style={styles.feature}>✅ Secure Deep Linking</Text>
          <Text style={styles.feature}>✅ Cross-Platform Support</Text>
          <Text style={styles.feature}>✅ Privacy-First Design</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Implementation Status</Text>
        
        <View style={styles.statusList}>
          <Text style={styles.statusComplete}>✅ iOS WidgetKit Implementation</Text>
          <Text style={styles.statusComplete}>✅ Android App Widget Implementation</Text>
          <Text style={styles.statusComplete}>✅ Expo Config Plugin</Text>
          <Text style={styles.statusComplete}>✅ Privacy Filtering System</Text>
          <Text style={styles.statusComplete}>✅ Encrypted Storage Layer</Text>
          <Text style={styles.statusComplete}>✅ Deep Link Integration</Text>
          <Text style={styles.statusComplete}>✅ React Native Bridge</Text>
          <Text style={styles.statusPending}>⚠️ Manual Xcode Configuration Required</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        Note: This demo is for development testing only.{'\n'}
        Production widgets will automatically integrate with your check-in data.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A7C59',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#4A7C59',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deepLinkButton: {
    backgroundColor: '#40B5AD',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  crisisButton: {
    backgroundColor: '#D32F2F',
  },
  info: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  featureList: {
    paddingLeft: 8,
  },
  feature: {
    fontSize: 14,
    color: '#4A7C59',
    marginBottom: 4,
    fontWeight: '500',
  },
  statusList: {
    paddingLeft: 8,
  },
  statusComplete: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
    fontWeight: '500',
  },
  statusPending: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 4,
    fontWeight: '500',
  },
  footer: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});