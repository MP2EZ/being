import React from 'react';
import { View, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { sharedPracticeStyles } from './sharedPracticeStyles';
import PracticeScreenHeader from './PracticeScreenHeader';
import { colorSystem } from '@/core/theme/colors';

interface PracticeScreenLayoutProps {
  title: string;
  onBack: () => void;
  progress?: { current: number; total: number };
  children: React.ReactNode;
  scrollable?: boolean;
  testID?: string;
}

const PracticeScreenLayout: React.FC<PracticeScreenLayoutProps> = ({
  title,
  onBack,
  progress,
  children,
  scrollable = true,
  testID = 'practice-screen',
}) => {
  return (
    <SafeAreaView style={sharedPracticeStyles.container} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={colorSystem.base.white} />

      <PracticeScreenHeader
        title={title}
        onBack={onBack}
        {...(progress && { progress })}
        testID={`${testID}-header`}
      />

      {scrollable ? (
        <ScrollView
          style={sharedPracticeStyles.scrollView}
          contentContainerStyle={sharedPracticeStyles.content}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={sharedPracticeStyles.content}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};

export default PracticeScreenLayout;
