#!/usr/bin/env node

/**
 * Cross-Device Sync Types Migration to Canonical - Phase 4B
 * 
 * Mission: Consolidate 6→1 sync type files while maintaining Phase 3D service compatibility
 * Focus: Update imports to use canonical cross-device-sync-canonical.ts
 */

const fs = require('fs');
const path = require('path');

// Import patterns to migrate to canonical
const SYNC_TYPE_IMPORT_MAPPINGS = {
  // Cross-device sync imports
  "from '../types/sync'": "from '../types/cross-device-sync-canonical'",
  "from '../../types/sync'": "from '../../types/cross-device-sync-canonical'",
  "from '../../../types/sync'": "from '../../../types/cross-device-sync-canonical'",
  "from '../../../../types/sync'": "from '../../../../types/cross-device-sync-canonical'",
  
  // Specific sync sub-type imports
  "from '../sync/subscription-tier-types'": "from '../cross-device-sync-canonical'",
  "from '../sync/crisis-safety-types'": "from '../cross-device-sync-canonical'",
  "from '../sync/sync-priority-queue'": "from '../cross-device-sync-canonical'",
  "from '../../types/sync/sync-priority-queue'": "from '../../types/cross-device-sync-canonical'",
  
  // Conflict resolution store imports (migrate to canonical)
  "from '../../store/sync/conflict-resolution-store'": "from '../../types/cross-device-sync-canonical'",
  
  // API sync context imports
  "from '../sync/payment-sync-context-api'": "from '../../types/cross-device-sync-canonical'",
  "from './payment-sync-context-api'": "from '../../types/cross-device-sync-canonical'",
};

// Type name mappings for canonical types
const TYPE_MAPPINGS = {
  // Basic sync types
  'SyncStatus': 'SyncState', // Use canonical SyncState.status
  'SyncOperation': 'SyncOperation', // Already matches canonical
  'SyncEntityType': 'SyncOperation', // Use SyncOperation.operation.entity
  'SyncOperationType': 'SyncOperation', // Use SyncOperation.operation.type
  'ConflictType': 'SyncConflict', // Use canonical SyncConflict
  
  // Priority types
  'PriorityLevel': 'SyncPriorityLevel',
  'SyncPriority': 'SyncPriorityLevel',
  
  // Cross-device specific types
  'DeviceInfo': 'DeviceInfo', // Already matches canonical
  'CrisisSeverity': 'CrisisSyncCoordination', // Use canonical crisis coordination
  'StrictSubscriptionTier': 'CrossDeviceSyncConfig', // Use config for tiers
  
  // Conflict resolution types
  'TherapeuticImpact': 'SyncConflict', // Use SyncConflict.conflict.clinicalImplications
  'ConflictResolutionStrategy': 'SyncConflict', // Use SyncConflict.resolution.strategy
  
  // Performance types
  'SyncPerformanceMetrics': 'SyncPerformanceMetrics', // Already matches canonical
};

const PRESERVED_IMPORTS = [
  // Zero-knowledge encryption patterns (IMMUTABLE)
  'EncryptionKey',
  'DeviceID',
  'SyncOperationID',
  
  // Crisis safety patterns (IMMUTABLE) 
  'CrisisSyncCoordination',
  'TherapeuticSessionCoordination',
  
  // Core canonical types
  'DeviceInfo',
  'SyncOperation',
  'SyncState',
  'SyncConflict',
  'SyncPerformanceMetrics',
  'OfflineQueue',
  'CrossDeviceSyncCanonicalService',
  'CrossDeviceSyncConfig',
  
  // Constants and utilities
  'CROSS_DEVICE_SYNC_CANONICAL_CONSTANTS',
  'isDeviceID',
  'isSyncOperationID', 
  'isSyncPriorityLevel',
  'createDeviceID',
  'createSyncOperationID',
  'createSyncPriorityLevel'
];

const processFile = (filePath) => {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if file has sync type imports
  const hasSyncImports = Object.keys(SYNC_TYPE_IMPORT_MAPPINGS).some(pattern => 
    content.includes(pattern)
  );
  
  if (!hasSyncImports) return false;
  
  console.log(`\n📝 Processing: ${filePath}`);
  
  // Replace import paths
  for (const [oldPattern, newPattern] of Object.entries(SYNC_TYPE_IMPORT_MAPPINGS)) {
    if (content.includes(oldPattern)) {
      content = content.replace(new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPattern);
      modified = true;
      console.log(`  ✅ Updated import path: ${oldPattern} → ${newPattern}`);
    }
  }
  
  // Handle specific type mappings within import statements
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"](.*cross-device-sync-canonical.*)['"]/g;
  content = content.replace(importRegex, (match, imports, fromPath) => {
    const importList = imports.split(',').map(imp => imp.trim());
    const updatedImports = importList.map(imp => {
      const cleanImp = imp.replace(/^type\s+/, '').replace(/\s+as\s+\w+$/, '');
      if (TYPE_MAPPINGS[cleanImp] && TYPE_MAPPINGS[cleanImp] !== cleanImp) {
        console.log(`  🔄 Type mapping: ${cleanImp} → ${TYPE_MAPPINGS[cleanImp]}`);
        return imp.replace(cleanImp, TYPE_MAPPINGS[cleanImp]);
      }
      return imp;
    });
    return `import { ${updatedImports.join(', ')} } from '${fromPath}'`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  💾 Updated file: ${path.basename(filePath)}`);
    return true;
  }
  
  return false;
};

const scanDirectory = (dir, processedFiles = new Set()) => {
  const files = fs.readdirSync(dir);
  let totalProcessed = 0;
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    
    if (processedFiles.has(fullPath)) continue;
    processedFiles.add(fullPath);
    
    if (fs.statSync(fullPath).isDirectory()) {
      // Skip node_modules and other non-source directories
      if (['node_modules', '.git', 'build', 'dist', '.expo'].includes(file)) continue;
      totalProcessed += scanDirectory(fullPath, processedFiles);
    } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
      if (processFile(fullPath)) {
        totalProcessed++;
      }
    }
  }
  
  return totalProcessed;
};

// Main execution
console.log('🚀 Starting Cross-Device Sync Types Canonical Migration');
console.log('📋 Mission: Update imports to use canonical cross-device-sync-canonical.ts');
console.log('🎯 Focus: Preserve zero-knowledge encryption & crisis safety patterns\n');

const srcDir = path.join(process.cwd(), 'src');
const startTime = Date.now();

const processedCount = scanDirectory(srcDir);

const endTime = Date.now();
const duration = ((endTime - startTime) / 1000).toFixed(2);

console.log('\n✨ Cross-Device Sync Types Canonical Migration Complete!');
console.log(`📊 Files processed: ${processedCount}`);
console.log(`⏱️  Duration: ${duration}s`);
console.log('\n🔍 Next Steps:');
console.log('1. Run TypeScript check: npm run type-check');
console.log('2. Run sync integration tests: npm run test:sync');
console.log('3. Validate zero-knowledge patterns: npm run test:security');
console.log('4. Check Phase 3D service compatibility');

process.exit(0);