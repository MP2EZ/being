/**
 * ExportService - PDF and CSV export functionality
 * Generates formatted reports from check-in and assessment data
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { dataStore } from './storage/SecureDataStore';
import type { CheckIn, Assessment } from '../types.ts';

export interface ExportOptions {
  format: 'pdf' | 'csv';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeAssessments?: boolean;
  includeCheckIns?: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

class ExportService {
  /**
   * Export user data in specified format
   */
  async exportData(options: ExportOptions): Promise<ExportResult> {
    try {
      const data = await this.gatherExportData(options);
      
      if (options.format === 'pdf') {
        return await this.generatePDF(data, options);
      } else {
        return await this.generateCSV(data, options);
      }
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  /**
   * Gather data for export based on options
   */
  private async gatherExportData(options: ExportOptions) {
    const result: {
      checkIns: CheckIn[];
      assessments: Assessment[];
      dateRange: { start: Date; end: Date };
    } = {
      checkIns: [],
      assessments: [],
      dateRange: options.dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      }
    };

    if (options.includeCheckIns !== false) {
      const allCheckIns = await dataStore.getCheckIns();
      result.checkIns = this.filterByDateRange(allCheckIns, result.dateRange);
    }

    if (options.includeAssessments !== false) {
      const allAssessments = await dataStore.getAssessments();
      result.assessments = this.filterByDateRange(allAssessments, result.dateRange);
    }

    return result;
  }

  /**
   * Filter data by date range
   */
  private filterByDateRange<T extends { timestamp: string }>(
    items: T[], 
    dateRange: { start: Date; end: Date }
  ): T[] {
    return items.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= dateRange.start && itemDate <= dateRange.end;
    });
  }

  /**
   * Generate PDF report
   */
  private async generatePDF(data: any, options: ExportOptions): Promise<ExportResult> {
    try {
      const html = this.generatePDFTemplate(data, options);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      // Move to documents directory with meaningful name
      const fileName = `being-report-${new Date().toISOString().split('T')[0]}.pdf`;
      const finalPath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.moveAsync({
        from: uri,
        to: finalPath
      });

      return {
        success: true,
        filePath: finalPath
      };
    } catch (error) {
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate CSV export
   */
  private async generateCSV(data: any, options: ExportOptions): Promise<ExportResult> {
    try {
      let csvContent = '';
      
      // Check-ins CSV
      if (data.checkIns.length > 0) {
        csvContent += 'CHECK-IN DATA\n';
        csvContent += 'Date,Time,Type,Emotions,Body Areas,Thoughts,Energy Level,Daily Value\n';
        
        data.checkIns.forEach((checkIn: CheckIn) => {
          const date = new Date(checkIn.startedAt);
          const emotions = Array.isArray(checkIn.data.emotions) ? checkIn.data.emotions.join('; ') : '';
          const bodyAreas = Array.isArray(checkIn.data.bodyAreas) ? checkIn.data.bodyAreas.join('; ') : '';
          const thoughts = checkIn.data.thoughts || '';
          const energyLevel = checkIn.data.energyLevel || '';
          const dailyValue = checkIn.data.dailyValue || '';
          
          csvContent += `${date.toLocaleDateString()},${date.toLocaleTimeString()},${checkIn.type},"${emotions}","${bodyAreas}","${thoughts.replace(/"/g, '""')}","${energyLevel}","${dailyValue.replace(/"/g, '""')}"\n`;
        });
        
        csvContent += '\n';
      }

      // Assessments CSV
      if (data.assessments.length > 0) {
        csvContent += 'ASSESSMENT DATA\n';
        csvContent += 'Date,Time,Type,Score,Severity\n';
        
        data.assessments.forEach((assessment: Assessment) => {
          const date = new Date(assessment.timestamp);
          csvContent += `${date.toLocaleDateString()},${date.toLocaleTimeString()},${assessment.type},${assessment.score},${assessment.severity}\n`;
        });
      }

      // Save CSV file
      const fileName = `being-data-${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      return {
        success: true,
        filePath
      };
    } catch (error) {
      throw new Error(`CSV generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate HTML template for PDF
   */
  private generatePDFTemplate(data: any, options: ExportOptions): string {
    const { checkIns, assessments, dateRange } = data;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Being. Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px solid #4A7C59;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          color: #4A7C59;
          font-size: 28px;
          margin: 0;
        }
        
        .header p {
          color: #666;
          font-size: 16px;
          margin: 10px 0 0 0;
        }
        
        .section {
          margin: 30px 0;
        }
        
        .section h2 {
          color: #4A7C59;
          font-size: 22px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        
        .check-in {
          background: #f8f9fa;
          border-left: 4px solid #40B5AD;
          padding: 15px;
          margin: 15px 0;
        }
        
        .check-in h3 {
          color: #40B5AD;
          margin: 0 0 10px 0;
          font-size: 18px;
        }
        
        .check-in-meta {
          color: #666;
          font-size: 14px;
          margin-bottom: 10px;
        }
        
        .data-row {
          margin: 8px 0;
        }
        
        .data-label {
          font-weight: 600;
          display: inline-block;
          min-width: 120px;
        }
        
        .assessment {
          background: #fff8e1;
          border-left: 4px solid #FF9F43;
          padding: 15px;
          margin: 15px 0;
        }
        
        .assessment h3 {
          color: #FF9F43;
          margin: 0 0 10px 0;
        }
        
        .score {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        
        .severity {
          background: #e0e0e0;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          text-transform: uppercase;
        }
        
        .severity.minimal { background: #c8e6c9; }
        .severity.mild { background: #fff9c4; }
        .severity.moderate { background: #ffcc82; }
        .severity.severe { background: #ffab91; }
        
        .summary {
          background: #e8f5e8;
          border: 1px solid #4A7C59;
          padding: 20px;
          border-radius: 8px;
          margin-top: 30px;
        }
        
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Being. Wellness Report</h1>
        <p>Report Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}</p>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      ${checkIns.length > 0 ? `
      <div class="section">
        <h2>Check-in Summary (${checkIns.length} entries)</h2>
        ${checkIns.map((checkIn: CheckIn) => `
        <div class="check-in">
          <h3>${checkIn.type.charAt(0).toUpperCase() + checkIn.type.slice(1)} Check-in</h3>
          <div class="check-in-meta">${new Date(checkIn.startedAt).toLocaleString()}</div>
          
          ${checkIn.data.emotions ? `
          <div class="data-row">
            <span class="data-label">Emotions:</span>
            ${Array.isArray(checkIn.data.emotions) ? checkIn.data.emotions.join(', ') : checkIn.data.emotions}
          </div>
          ` : ''}
          
          ${checkIn.data.bodyAreas ? `
          <div class="data-row">
            <span class="data-label">Body Areas:</span>
            ${Array.isArray(checkIn.data.bodyAreas) ? checkIn.data.bodyAreas.join(', ') : checkIn.data.bodyAreas}
          </div>
          ` : ''}
          
          ${checkIn.data.thoughts ? `
          <div class="data-row">
            <span class="data-label">Thoughts:</span>
            ${checkIn.data.thoughts}
          </div>
          ` : ''}
          
          ${checkIn.data.energyLevel ? `
          <div class="data-row">
            <span class="data-label">Energy Level:</span>
            ${checkIn.data.energyLevel}
          </div>
          ` : ''}
          
          ${checkIn.data.dailyValue ? `
          <div class="data-row">
            <span class="data-label">Daily Value:</span>
            ${checkIn.data.dailyValue}
          </div>
          ` : ''}
        </div>
        `).join('')}
      </div>
      ` : ''}

      ${assessments.length > 0 ? `
      <div class="section">
        <h2>Assessment Results (${assessments.length} entries)</h2>
        ${assessments.map((assessment: Assessment) => `
        <div class="assessment">
          <h3>${assessment.type.toUpperCase()} Assessment</h3>
          <div class="check-in-meta">${new Date(assessment.timestamp).toLocaleString()}</div>
          <div class="data-row">
            <span class="data-label">Score:</span>
            <span class="score">${assessment.score}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Severity:</span>
            <span class="severity ${assessment.severity.toLowerCase()}">${assessment.severity}</span>
          </div>
        </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="summary">
        <h2>Report Summary</h2>
        <p>This report contains your Being. wellness data for the specified period. 
        Use this information to track patterns, share with healthcare providers, or 
        maintain your personal wellness records.</p>
        
        <div class="data-row">
          <span class="data-label">Total Check-ins:</span>
          ${checkIns.length}
        </div>
        <div class="data-row">
          <span class="data-label">Total Assessments:</span>
          ${assessments.length}
        </div>
      </div>

      <div class="footer">
        <p>Generated by Being. - Mindfulness-Based Cognitive Therapy App</p>
        <p>For support or questions, please contact your healthcare provider</p>
      </div>
    </body>
    </html>`;
  }

  /**
   * Share exported file
   */
  async shareFile(filePath: string): Promise<boolean> {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Sharing failed:', error);
      return false;
    }
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): string[] {
    return ['pdf', 'csv'];
  }
}

export const exportService = new ExportService();
export default exportService;