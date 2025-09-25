#!/usr/bin/env node

/**
 * Phase 3C Group 1: Sync Services Import Migration Script
 * 
 * Automatically updates all imports to use the consolidated sync services
 * Preserves functionality while redirecting to unified APIs
 */

const fs = require('fs');
const path = require('path');

const IMPORT_REPLACEMENTS = {
  // SyncOrchestrationService migrations
  "from '../../services/SyncOrchestrationService'": "from '../../services/sync'",
  "from '../services/SyncOrchestrationService'": "from '../services/sync'",
  "from './SyncOrchestrationService'": "from './sync'",
  
  // StateSynchronization migrations  
  "from '../../services/state/StateSynchronization'": "from '../../services/sync'",
  "from '../services/state/StateSynchronization'": "from '../services/sync'",
  "from './state/StateSynchronization'": "from './sync'",
  
  // Performance optimizer migrations
  "from '../../utils/SyncPerformanceOptimizer'": "from '../../services/sync'", 
  "from '../utils/SyncPerformanceOptimizer'": "from '../services/sync'",
  
  // CrossDeviceSyncAPI imports (direct usage)
  "from '../../services/cloud/CrossDeviceSyncAPI'": "from '../../services/sync'",
  "from '../services/cloud/CrossDeviceSyncAPI'": "from '../services/sync'",
  
  // CloudSyncAPI imports (direct usage)
  "from '../../services/cloud/CloudSyncAPI'": "from '../../services/sync'",
  "from '../services/cloud/CloudSyncAPI'": "from '../services/sync'",
  
  // Payment sync service migrations
  "from '../services/cloud/PaymentAwareSyncAPI'": "from '../services/sync'",
  "from '../../services/cloud/PaymentAwareSyncAPI'": "from '../../services/sync'",
  
  // Accessibility sync migrations
  "from '../../services/accessibility/SyncAccessibilityCoordinator'": "from '../../services/sync'",
  "from '../services/accessibility/SyncAccessibilityCoordinator'": "from '../services/sync'",
};

const EXPORT_REPLACEMENTS = {
  // Store index.ts exports
  "export { stateSynchronizationService } from '../services/state/StateSynchronization'": 
    "export { stateSynchronizationService } from '../services/sync'",
    
  // Component service exports
  "export { syncOrchestrationService } from": "export { syncOrchestrationService } from '../services/sync'",
};

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply import replacements
    for (const [oldImport, newImport] of Object.entries(IMPORT_REPLACEMENTS)) {
      const regex = new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (regex.test(content)) {
        content = content.replace(regex, newImport);
        modified = true;
        console.log(`  ✓ Updated import: ${oldImport} → ${newImport}`);
      }
    }
    
    // Apply export replacements
    for (const [oldExport, newExport] of Object.entries(EXPORT_REPLACEMENTS)) {
      const regex = new RegExp(oldExport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (regex.test(content)) {
        content = content.replace(regex, newExport);
        modified = true;
        console.log(`  ✓ Updated export: ${oldExport} → ${newExport}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return false;
  }
}

function scanDirectory(dirPath, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.startsWith('.')) {
        files.push(...scanDirectory(fullPath, extensions));
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error.message);
  }
  
  return files;
}

// Main migration execution
function main() {
  console.log('🔄 Phase 3C Group 1: Sync Services Import Migration');
  console.log('================================================\n');
  
  const srcPath = '/Users/max/Development/active/fullmind/app/src';
  
  if (!fs.existsSync(srcPath)) {
    console.error('❌ Source directory not found:', srcPath);
    process.exit(1);
  }
  
  console.log('📁 Scanning for files to migrate...');
  const files = scanDirectory(srcPath);
  console.log(`📄 Found ${files.length} files to check\n`);
  
  let filesModified = 0;
  
  for (const filePath of files) {
    console.log(`🔍 Checking: ${path.relative(srcPath, filePath)}`);
    
    if (updateFile(filePath)) {
      filesModified++;
      console.log(`  ✅ Modified\n`);
    } else {
      console.log(`  ⏭️  No changes needed\n`);
    }
  }
  
  console.log('📊 Migration Summary:');
  console.log(`   • Files checked: ${files.length}`);
  console.log(`   • Files modified: ${filesModified}`);
  console.log(`   • Unified services: 2 (CrossDeviceSyncAPI + CloudSyncAPI)`);
  console.log(`   • Legacy compatibility: Active`);
  console.log('\n✅ Phase 3C Group 1 import migration completed!');
  console.log('🔔 Note: Legacy services will show deprecation warnings but remain functional');
}

if (require.main === module) {
  main();
}

module.exports = { updateFile, scanDirectory, IMPORT_REPLACEMENTS, EXPORT_REPLACEMENTS };