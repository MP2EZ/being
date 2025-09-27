/**
 * ExportOptionsModal - Advanced export options for PDF and CSV generation
 * Allows users to select format, date range, and data types to include
 * 
 * ✅ PRESSABLE MIGRATION: TouchableOpacity → Pressable with New Architecture optimization
 * - Enhanced android_ripple for export option selections
 * - Improved accessibility for export configuration
 * - Optimized touch targets for export modal interactions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '../core';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';
import { exportService } from '../../services/ExportService';
import { useCommonHaptics } from '../../hooks/useHaptics';
import type { ExportOptions, ExportFormat } from '../../types';

interface ExportOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onExportComplete?: (filePath: string) => void;
}

export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({
  visible,
  onClose,
  onExportComplete
}) => {
  const { onModalOpen, onModalClose, onSelect, onSuccess, onError } = useCommonHaptics();
  
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [includeCheckIns, setIncludeCheckIns] = useState(true);
  const [includeAssessments, setIncludeAssessments] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  const [isExporting, setIsExporting] = useState(false);

  const handleModalOpen = async () => {
    await onModalOpen();
  };

  const handleModalClose = async () => {
    await onModalClose();
    onClose();
  };

  const handleFormatSelect = async (selectedFormat: ExportFormat) => {
    await onSelect();
    setFormat(selectedFormat);
  };

  const handleDateRangeSelect = async (range: typeof dateRange) => {
    await onSelect();
    setDateRange(range);
  };

  const getDateRangeOptions = () => {
    const now = new Date();
    const ranges = {
      week: {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: now,
        label: 'Last 7 days'
      },
      month: {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now,
        label: 'Last 30 days'
      },
      quarter: {
        start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        end: now,
        label: 'Last 3 months'
      },
      year: {
        start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        end: now,
        label: 'Last year'
      },
      all: {
        start: new Date('2020-01-01'), // App launch date
        end: now,
        label: 'All time'
      }
    };
    
    return ranges[dateRange];
  };

  const handleExport = async () => {
    if (!includeCheckIns && !includeAssessments) {
      Alert.alert(
        'Nothing to Export',
        'Please select at least one data type to export.'
      );
      return;
    }

    setIsExporting(true);
    
    try {
      const options: ExportOptions = {
        format,
        dateRange: getDateRangeOptions(),
        includeCheckIns,
        includeAssessments
      };

      const result = await exportService.exportData(options);
      
      if (result.success && result.filePath) {
        await onSuccess();
        
        // Share the file
        const shared = await exportService.shareFile(result.filePath);
        
        if (shared) {
          onExportComplete?.(result.filePath);
          handleModalClose();
        } else {
          Alert.alert(
            'Export Complete',
            `Your ${format.toUpperCase()} report has been saved but could not be shared automatically. You can find it in your device's files.`
          );
        }
      } else {
        throw new Error(result.error || 'Unknown export error');
      }
    } catch (error) {
      console.error('Export failed:', error);
      await onError();
      
      Alert.alert(
        'Export Failed',
        'Unable to generate your export. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  React.useEffect(() => {
    if (visible) {
      handleModalOpen();
    }
  }, [visible]);

  const FormatButton: React.FC<{
    formatType: ExportFormat;
    title: string;
    description: string;
    icon: string;
  }> = ({ formatType, title, description, icon }) => (
    <Pressable
      style={({ pressed }) => [
        styles.formatButton,
        format === formatType && styles.formatButtonSelected,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
      ]}
      onPress={() => handleFormatSelect(formatType)}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Select ${title} format for export`}
      android_ripple={{
        color: 'rgba(0, 0, 0, 0.1)',
        borderless: false,
        radius: 150
      }}
      hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
    >
      <View style={styles.formatIcon}>
        <Text style={styles.formatIconText}>{icon}</Text>
      </View>
      <View style={styles.formatInfo}>
        <Text style={[
          styles.formatTitle,
          format === formatType && styles.formatTitleSelected
        ]}>
          {title}
        </Text>
        <Text style={[
          styles.formatDescription,
          format === formatType && styles.formatDescriptionSelected
        ]}>
          {description}
        </Text>
      </View>
    </Pressable>
  );

  const DateRangeButton: React.FC<{
    range: typeof dateRange;
    label: string;
  }> = ({ range, label }) => (
    <Pressable
      style={({ pressed }) => [
        styles.dateRangeButton,
        dateRange === range && styles.dateRangeButtonSelected,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
      ]}
      onPress={() => handleDateRangeSelect(range)}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Select ${label} date range`}
      android_ripple={{
        color: 'rgba(0, 0, 0, 0.1)',
        borderless: false,
        radius: 100
      }}
      hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
    >
      <Text style={[
        styles.dateRangeText,
        dateRange === range && styles.dateRangeTextSelected
      ]}>
        {label}
      </Text>
    </Pressable>
  );

  const ToggleOption: React.FC<{
    title: string;
    description: string;
    value: boolean;
    onToggle: (value: boolean) => void;
  }> = ({ title, description, value, onToggle }) => (
    <View style={styles.toggleOption}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{
          false: colorSystem.gray[300],
          true: colorSystem.themes.morning.primary
        }}
        thumbColor={value ? colorSystem.base.white : colorSystem.gray[500]}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleModalClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
            ]}
            onPress={handleModalClose}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Cancel export"
            android_ripple={{
              color: 'rgba(0, 0, 0, 0.1)',
              borderless: true,
              radius: 100
            }}
            hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Export Options</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Format Selection */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Export Format</Text>
            
            <FormatButton
              formatType="pdf"
              title="PDF Report"
              description="Professional report with charts and formatting"
              icon="📄"
            />
            
            <FormatButton
              formatType="csv"
              title="CSV Data"
              description="Spreadsheet format for analysis and backup"
              icon="📊"
            />
          </Card>

          {/* Date Range Selection */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Time Period</Text>
            
            <View style={styles.dateRangeGrid}>
              <DateRangeButton range="week" label="Last 7 days" />
              <DateRangeButton range="month" label="Last 30 days" />
              <DateRangeButton range="quarter" label="Last 3 months" />
              <DateRangeButton range="year" label="Last year" />
              <DateRangeButton range="all" label="All time" />
            </View>
          </Card>

          {/* Data Type Selection */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Include Data</Text>
            
            <ToggleOption
              title="Check-in Data"
              description="Morning, midday, and evening check-ins with emotions, thoughts, and reflections"
              value={includeCheckIns}
              onToggle={setIncludeCheckIns}
            />
            
            <ToggleOption
              title="Assessment Results"
              description="PHQ-9 and GAD-7 assessment scores and trends"
              value={includeAssessments}
              onToggle={setIncludeAssessments}
            />
          </Card>

          {/* Export Summary */}
          <Card style={[styles.section, styles.summarySection]}>
            <Text style={styles.summaryTitle}>Export Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Format:</Text>
              <Text style={styles.summaryValue}>{format.toUpperCase()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Period:</Text>
              <Text style={styles.summaryValue}>{getDateRangeOptions().label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Includes:</Text>
              <Text style={styles.summaryValue}>
                {[
                  includeCheckIns && 'Check-ins',
                  includeAssessments && 'Assessments'
                ].filter(Boolean).join(', ') || 'Nothing selected'}
              </Text>
            </View>
          </Card>
        </ScrollView>

        {/* Export Button */}
        <View style={styles.footer}>
          <Button
            variant="primary"
            onPress={handleExport}
            disabled={isExporting || (!includeCheckIns && !includeAssessments)}
            loading={isExporting}
            theme="evening"
          >
            {isExporting ? 'Generating Export...' : `Export ${format.toUpperCase()}`}
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  cancelButton: {
    padding: spacing.xs,
  },
  cancelText: {
    fontSize: 16,
    color: colorSystem.status.info,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
  },
  formatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    marginBottom: spacing.sm,
    backgroundColor: colorSystem.base.white,
  },
  formatButtonSelected: {
    borderColor: colorSystem.themes.evening.primary,
    backgroundColor: colorSystem.themes.evening.background,
  },
  formatIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.medium,
    backgroundColor: colorSystem.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  formatIconText: {
    fontSize: 24,
  },
  formatInfo: {
    flex: 1,
  },
  formatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  formatTitleSelected: {
    color: colorSystem.themes.evening.primary,
  },
  formatDescription: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  formatDescriptionSelected: {
    color: colorSystem.themes.evening.primary,
  },
  dateRangeGrid: {
    gap: spacing.sm,
  },
  dateRangeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    backgroundColor: colorSystem.base.white,
    alignItems: 'center',
  },
  dateRangeButtonSelected: {
    borderColor: colorSystem.themes.evening.primary,
    backgroundColor: colorSystem.themes.evening.background,
  },
  dateRangeText: {
    fontSize: 14,
    color: colorSystem.base.black,
  },
  dateRangeTextSelected: {
    color: colorSystem.themes.evening.primary,
    fontWeight: '500',
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[100],
  },
  toggleText: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  toggleDescription: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  summarySection: {
    backgroundColor: colorSystem.gray[50],
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: colorSystem.gray[600],
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colorSystem.base.black,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
});

export default ExportOptionsModal;