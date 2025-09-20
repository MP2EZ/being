/**
 * ClinicalCarousel Component
 *
 * Main carousel component for displaying clinical tools, evidence-based outcomes,
 * and early warning system information. Designed for optimal accessibility and
 * clinical accuracy presentation.
 */

import React, { memo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Text,
  AccessibilityInfo
} from 'react-native';

import { ClinicalCarouselProps } from './types';
import { useCarousel } from './useCarousel';
import { ClinicalToolsPane } from './panes/ClinicalToolsPane';
import { MBCTPracticesPane } from './panes/MBCTPracticesPane';
import { EarlyWarningPane } from './panes/EarlyWarningPane';

const { width: screenWidth } = Dimensions.get('window');

const ClinicalCarousel: React.FC<ClinicalCarouselProps> = memo(({
  data,
  autoPlay = true,
  autoPlayInterval = 8000,
  showNavigation = true,
  showIndicators = true,
  onSlideChange,
  accessibilityLabel = 'Clinical Tools and Evidence Carousel'
}) => {
  const {
    currentSlide,
    totalSlides,
    goToSlide,
    nextSlide,
    prevSlide,
    isAutoPlaying,
    pauseAutoPlay,
    resumeAutoPlay
  } = useCarousel({
    totalSlides: data.length,
    autoPlay,
    autoPlayInterval,
    onSlideChange,
    respectReducedMotion: true
  });

  const renderPane = (paneData: typeof data[0], index: number) => {
    const isActive = index === currentSlide;

    switch (paneData.id) {
      case 'assessment-tools':
        return (
          <ClinicalToolsPane
            key={paneData.id}
            data={paneData}
            isActive={isActive}
          />
        );
      case 'proven-results':
        return (
          <MBCTPracticesPane
            key={paneData.id}
            data={paneData}
            isActive={isActive}
          />
        );
      case 'therapy-bridge':
        return (
          <EarlyWarningPane
            key={paneData.id}
            data={paneData}
            isActive={isActive}
          />
        );
      default:
        return (
          <ClinicalToolsPane
            key={paneData.id}
            data={paneData}
            isActive={isActive}
          />
        );
    }
  };

  const handleNavigationPress = (direction: 'prev' | 'next') => {
    pauseAutoPlay();

    if (direction === 'prev') {
      prevSlide();
    } else {
      nextSlide();
    }

    // Resume auto-play after user interaction delay
    setTimeout(resumeAutoPlay, 10000);
  };

  const handleIndicatorPress = (index: number) => {
    pauseAutoPlay();
    goToSlide(index);

    // Resume auto-play after user interaction delay
    setTimeout(resumeAutoPlay, 10000);
  };

  return (
    <View
      style={styles.carouselContainer}
      accessible={true}
      accessibilityRole="region"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Navigation Buttons */}
      {showNavigation && (
        <>
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton]}
            onPress={() => handleNavigationPress('prev')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Previous clinical pane"
            accessibilityHint="Navigate to the previous clinical information slide"
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={() => handleNavigationPress('next')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Next clinical pane"
            accessibilityHint="Navigate to the next clinical information slide"
          >
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Carousel Content */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false} // Controlled by navigation buttons for accessibility
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        accessible={false} // Individual panes handle accessibility
      >
        <View
          style={[
            styles.carouselContent,
            { transform: [{ translateX: -currentSlide * screenWidth }] }
          ]}
        >
          {data.map((paneData, index) => (
            <View key={paneData.id} style={styles.slideContainer}>
              {renderPane(paneData, index)}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Indicators */}
      {showIndicators && (
        <View
          style={styles.indicatorsContainer}
          accessible={true}
          accessibilityRole="tablist"
          accessibilityLabel="Clinical carousel navigation"
        >
          {data.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.indicator,
                index === currentSlide && styles.activeIndicator
              ]}
              onPress={() => handleIndicatorPress(index)}
              accessible={true}
              accessibilityRole="tab"
              accessibilityLabel={data[index].title}
              accessibilityState={{ selected: index === currentSlide }}
              accessibilityHint={`Navigate to ${data[index].title} slide`}
            />
          ))}
        </View>
      )}

      {/* Auto-play status for screen readers */}
      <View
        style={styles.hiddenAccessibilityInfo}
        accessible={true}
        accessibilityLiveRegion="polite"
        accessibilityLabel={
          isAutoPlaying
            ? 'Carousel is auto-advancing. Touch any navigation button to pause.'
            : 'Carousel is paused. Use navigation buttons to browse slides.'
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  carouselContainer: {
    position: 'relative',
    backgroundColor: '#F0F7FF',
    borderRadius: 20,
    padding: 20,
    minHeight: 600,
    overflow: 'hidden'
  },
  scrollView: {
    flex: 1
  },
  scrollViewContent: {
    flexGrow: 1
  },
  carouselContent: {
    flexDirection: 'row',
    width: screenWidth * 3, // Assuming 3 slides
    transition: 'transform 0.3s ease-in-out'
  },
  slideContainer: {
    width: screenWidth - 40, // Account for container padding
    flex: 1
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Minimum touch target of 44px for accessibility
    minWidth: 44,
    minHeight: 44
  },
  prevButton: {
    left: 20,
    transform: [{ translateY: -25 }]
  },
  nextButton: {
    right: 20,
    transform: [{ translateY: -25 }]
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C5282'
  },
  indicatorsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 12
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(44, 82, 130, 0.3)',
    // Minimum touch target
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  activeIndicator: {
    backgroundColor: '#2C5282',
    transform: [{ scale: 1.2 }]
  },
  hiddenAccessibilityInfo: {
    position: 'absolute',
    left: -9999,
    width: 1,
    height: 1,
    overflow: 'hidden'
  }
});

ClinicalCarousel.displayName = 'ClinicalCarousel';

export default ClinicalCarousel;