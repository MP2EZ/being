#!/usr/bin/env node

/**
 * Payment/Subscription Import Update Script
 * Updates all imports to use canonical payment types
 */

const fs = require('fs');
const path = require('path');

// Mapping of old import patterns to canonical replacements
const IMPORT_REPLACEMENTS = {
  // Payment type imports
  "from '../../types/payment'": "from '../../types/payment-canonical'",
  "from '../types/payment'": "from '../types/payment-canonical'",
  "from './types/payment'": "from './types/payment-canonical'",
  
  // Subscription type imports
  "from '../../types/subscription'": "from '../../types/payment-canonical'",
  "from '../types/subscription'": "from '../types/payment-canonical'",
  "from './types/subscription'": "from './types/payment-canonical'",
  
  // Enhanced payment type imports
  "from '../../types/payment-ui'": "from '../../types/payment-canonical'",
  "from '../types/payment-ui'": "from '../types/payment-canonical'",
  "from '../../types/enhanced-payment-components'": "from '../../types/payment-canonical'",
  "from '../types/enhanced-payment-components'": "from '../types/payment-canonical'",
  "from '../../types/payment-performance'": "from '../../types/payment-canonical'",
  "from '../types/payment-performance'": "from '../types/payment-canonical'",
  "from '../../types/payment-error-handling'": "from '../../types/payment-canonical'",
  "from '../types/payment-error-handling'": "from '../types/payment-canonical'",
  "from '../../types/payment-pressable-enhanced'": "from '../../types/payment-canonical'",
  "from '../types/payment-pressable-enhanced'": "from '../types/payment-canonical'",
  "from '../../types/payment-interaction-enhanced'": "from '../../types/payment-canonical'",
  "from '../types/payment-interaction-enhanced'": "from '../types/payment-canonical'",
  "from '../../types/payment-crisis-detection-enhanced'": "from '../../types/payment-canonical'",
  "from '../types/payment-crisis-detection-enhanced'": "from '../types/payment-canonical'",
  "from '../../types/payment-hipaa-compliance-enhanced'": "from '../../types/payment-canonical'",
  "from '../types/payment-hipaa-compliance-enhanced'": "from '../types/payment-canonical'",
  
  // Subscription component imports
  "from '../../types/subscription-components'": "from '../../types/payment-canonical'",
  "from '../types/subscription-components'": "from '../types/payment-canonical'",
  "from '../../types/subscription-store'": "from '../../types/payment-canonical'",
  "from '../types/subscription-store'": "from '../types/payment-canonical'",
  "from '../../types/subscription-hooks'": "from '../../types/payment-canonical'",
  "from '../types/subscription-hooks'": "from '../types/payment-canonical'"
};

// Types that need to be mapped to canonical equivalents
const TYPE_MAPPINGS = {
  // Keep canonical types as-is (no mapping needed)
  'PaymentAmount': 'PaymentAmount',
  'CurrencyCode': 'CurrencyCode',
  'SubscriptionTier': 'SubscriptionTier',
  'PaymentAnxietySeverity': 'PaymentAnxietySeverity',
  
  // Map old payment types to canonical
  'PaymentState': 'PaymentStoreState',
  'PaymentConfig': 'PaymentEnvironmentConfig',
  'PaymentIntent': 'PaymentIntentData',
  'PaymentMethod': 'PaymentMethodData',
  'PaymentResult': 'PaymentResult',
  'PaymentError': 'PaymentError',
  'CrisisPaymentOverride': 'CrisisPaymentOverride',
  
  // Map subscription types to canonical  
  'SubscriptionState': 'SubscriptionState',
  'SubscriptionPlan': 'SubscriptionPlan',
  'FeatureGateConfig': 'FeatureGateConfig',
  
  // Map UI components to canonical
  'PaymentPressableProps': 'PaymentPressableProps',
  'PaymentInteractionContext': 'PaymentInteractionContext',
  
  // Map anxiety/crisis types to canonical
  'PaymentAnxietyIndicators': 'PaymentAnxietyIndicators',
  'PaymentAnxietyIntervention': 'PaymentAnxietyIntervention'
};

function updateFileImports(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let updated = false;

  // Update import paths
  for (const [oldImport, newImport] of Object.entries(IMPORT_REPLACEMENTS)) {
    if (content.includes(oldImport)) {
      content = content.replace(new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newImport);
      updated = true;
      console.log(`Updated import in ${filePath}: ${oldImport} → ${newImport}`);
    }
  }

  if (updated) {
    fs.writeFileSync(filePath, content);
  }

  return updated;
}

function findFilesWithPaymentImports(dir) {
  const files = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scan(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        // Quick check for payment/subscription imports
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('from ') && 
           (content.includes('/payment') || content.includes('/subscription') || 
            content.includes('payment-ui') || content.includes('enhanced-payment') ||
            content.includes('subscription-'))) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scan(dir);
  return files;
}

// Main execution
console.log('Starting payment/subscription import consolidation...');

const srcDir = path.join(__dirname, 'src');
const files = findFilesWithPaymentImports(srcDir);

console.log(`Found ${files.length} files with payment/subscription imports`);

let updatedFiles = 0;
for (const file of files) {
  if (updateFileImports(file)) {
    updatedFiles++;
  }
}

console.log(`\nConsolidation complete!`);
console.log(`- Files processed: ${files.length}`);
console.log(`- Files updated: ${updatedFiles}`);
console.log(`- Imports now consolidated to: /types/payment-canonical.ts`);

// Validate the canonical file exists
const canonicalPath = path.join(srcDir, 'types', 'payment-canonical.ts');
if (fs.existsSync(canonicalPath)) {
  console.log(`✅ Canonical types file confirmed: ${canonicalPath}`);
} else {
  console.error(`❌ ERROR: Canonical types file not found at ${canonicalPath}`);
  process.exit(1);
}