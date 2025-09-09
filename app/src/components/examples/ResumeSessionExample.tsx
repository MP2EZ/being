/**
 * ResumeSessionExample - Usage example for resume session components
 * Demonstrates both modal and banner variants with different progress levels
 * 
 * NOT FOR PRODUCTION USE - Example only
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResumeSessionPrompt, SessionProgressBar, Button, Card } from '../core';
import { colorSystem, spacing } from '../../constants/colors';

export const ResumeSessionExample: React.FC = () => {
  const [showModalExample, setShowModalExample] = useState(false);
  const [showBannerExample, setShowBannerExample] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        
        {/* Progress Bar Examples */}
        <Card style={styles.section}>
          <View style={styles.progressSection}>
            <SessionProgressBar
              percentage={25}
              theme="morning"
              accessibilityLabel="Morning check-in progress: 25% complete"
            />
            
            <SessionProgressBar
              percentage={60}
              theme="midday"
              height={12}
              accessibilityLabel="Midday check-in progress: 60% complete"
            />
            
            <SessionProgressBar
              percentage={85}
              theme="evening"
              showPercentage={false}
              accessibilityLabel="Evening reflection progress: 85% complete"
            />
          </View>
        </Card>

        {/* Banner Example */}
        {showBannerExample && (
          <ResumeSessionPrompt
            isVisible={true}
            checkInType="morning"
            percentage={35}
            estimatedTimeRemaining={180} // 3 minutes
            onContinue={() => {
              console.log('Continuing morning check-in...');
              setShowBannerExample(false);
            }}
            onDismiss={() => {
              console.log('Dismissing banner...');
              setShowBannerExample(false);
            }}
            variant="banner"
            testID="example-banner-prompt"
          />
        )}

        {/* Control Buttons */}
        <Card style={styles.section}>
          <Button
            onPress={() => setShowModalExample(true)}
            theme="morning"
            testID="show-modal-example"
          >
            Show Modal Example (Morning, 75%)
          </Button>
          
          <Button
            onPress={() => setShowBannerExample(true)}
            theme="midday"
            variant="outline"
            testID="show-banner-example"
          >
            Show Banner Example (Morning, 35%)
          </Button>
        </Card>

      </ScrollView>

      {/* Modal Example */}
      <ResumeSessionPrompt
        isVisible={showModalExample}
        checkInType="evening"
        percentage={75}
        estimatedTimeRemaining={120} // 2 minutes
        onContinue={() => {
          console.log('Continuing evening reflection...');
          setShowModalExample(false);
        }}
        onDismiss={() => {
          console.log('Dismissing modal...');
          setShowModalExample(false);
        }}
        variant="modal"
        testID="example-modal-prompt"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  progressSection: {
    gap: spacing.md,
  },
});