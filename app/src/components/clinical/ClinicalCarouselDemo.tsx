/**
 * ClinicalCarouselDemo Component
 *
 * Demonstration component showing how to implement the clinical carousel
 * with sample data and proper error handling.
 */

import React, { memo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text
} from 'react-native';

import ClinicalCarousel from './ClinicalCarousel';
import ClinicalCarouselErrorBoundary from './ClinicalCarouselErrorBoundary';
import { clinicalCarouselData } from './clinicalCarouselData';

const ClinicalCarouselDemo: React.FC = memo(() => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleSlideChange = (index: number) => {
    setCurrentSlide(index);
    console.log('Clinical carousel slide changed to:', index);
  };

  const handleError = (error: Error, errorInfo: any) => {
    // In production, this would report to error tracking service
    console.error('Clinical carousel error reported:', error, errorInfo);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Demo Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Clinical Tools You Can Trust</Text>
          <Text style={styles.subtitle}>
            Professional-grade assessments and insights used by therapists worldwide
          </Text>
        </View>

        {/* Clinical Carousel with Error Boundary */}
        <ClinicalCarouselErrorBoundary onError={handleError}>
          <ClinicalCarousel
            data={clinicalCarouselData}
            autoPlay={true}
            autoPlayInterval={8000}
            showNavigation={true}
            showIndicators={true}
            onSlideChange={handleSlideChange}
            accessibilityLabel="Clinical Tools and Evidence Carousel"
          />
        </ClinicalCarouselErrorBoundary>

        {/* Demo Info */}
        <View style={styles.demoInfo}>
          <Text style={styles.demoTitle}>Demo Information</Text>
          <Text style={styles.demoText}>
            Current slide: {currentSlide + 1} of {clinicalCarouselData.length}
          </Text>
          <Text style={styles.demoText}>
            Slide: {clinicalCarouselData[currentSlide]?.title}
          </Text>
        </View>

        {/* Implementation Notes */}
        <View style={styles.implementationNotes}>
          <Text style={styles.notesTitle}>Implementation Features</Text>
          <View style={styles.notesList}>
            <Text style={styles.noteItem}>• WCAG AA accessible with screen reader support</Text>
            <Text style={styles.noteItem}>• Respects reduced motion preferences</Text>
            <Text style={styles.noteItem}>• 60fps animations for breathing exercises</Text>
            <Text style={styles.noteItem}>• Clinical accuracy validation</Text>
            <Text style={styles.noteItem}>• Error boundary for graceful degradation</Text>
            <Text style={styles.noteItem}>• Keyboard navigation support</Text>
            <Text style={styles.noteItem}>• Auto-play with user interaction pause</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  header: {
    marginBottom: 30,
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A365D',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 24
  },
  demoInfo: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 10
  },
  demoText: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 4
  },
  implementationNotes: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 12
  },
  notesList: {
    gap: 6
  },
  noteItem: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18
  }
});

ClinicalCarouselDemo.displayName = 'ClinicalCarouselDemo';

export default ClinicalCarouselDemo;