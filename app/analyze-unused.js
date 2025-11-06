const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files to definitely exclude from unused check
const EXCLUDED_FILES = [
  'App.tsx',
  'index.ts',
  'index.tsx',
  '.test.ts',
  '.test.tsx',
  '.d.ts',
  'CleanRootNavigator.tsx', // Entry point
  'CleanTabNavigator.tsx',  // Used by root navigator
];

// Check if file should be excluded
function shouldExclude(filePath) {
  return EXCLUDED_FILES.some(excluded => filePath.includes(excluded));
}

// Get all source files
const srcDir = path.join(__dirname, 'src');

// Get all TypeScript files
const allFiles = execSync(`find ${srcDir} -type f \\( -name "*.ts" -o -name "*.tsx" \\)`, {
  encoding: 'utf-8'
}).trim().split('\n').filter(f => !shouldExclude(f));

const unusedFiles = {
  components: [],
  screens: [],
  services: [],
  stores: [],
  hooks: [],
  types: [],
  utils: [],
  constants: [],
  flows: [],
  contexts: [],
  other: []
};

// Check each file
allFiles.forEach(filePath => {
  const relativePath = path.relative(process.cwd(), filePath);
  const fileName = path.basename(filePath);
  const fileNameWithoutExt = fileName.replace(/\.(ts|tsx)$/, '');

  // Try to find imports of this file
  try {
    const result = execSync(
      `rg -l "from ['\"].*${fileNameWithoutExt}['\"]" ${srcDir} --type-not json --glob '!**/*.test.*' --glob '!${relativePath}' 2>/dev/null || true`,
      { encoding: 'utf-8' }
    ).trim();

    // If no files import this one, it might be unused
    if (!result) {
      // Categorize
      if (relativePath.includes('/components/')) unusedFiles.components.push(relativePath);
      else if (relativePath.includes('/screens/')) unusedFiles.screens.push(relativePath);
      else if (relativePath.includes('/services/')) unusedFiles.services.push(relativePath);
      else if (relativePath.includes('/stores/')) unusedFiles.stores.push(relativePath);
      else if (relativePath.includes('/hooks/')) unusedFiles.hooks.push(relativePath);
      else if (relativePath.includes('/types/')) unusedFiles.types.push(relativePath);
      else if (relativePath.includes('/utils/')) unusedFiles.utils.push(relativePath);
      else if (relativePath.includes('/constants/')) unusedFiles.constants.push(relativePath);
      else if (relativePath.includes('/flows/')) unusedFiles.flows.push(relativePath);
      else if (relativePath.includes('/contexts/')) unusedFiles.contexts.push(relativePath);
      else unusedFiles.other.push(relativePath);
    }
  } catch (error) {
    // Ignore errors
  }
});

// Print results
console.log('POTENTIALLY UNUSED FILES ANALYSIS');
console.log('=================================\n');

let total = 0;
Object.entries(unusedFiles).forEach(([category, files]) => {
  if (files.length > 0) {
    console.log(`\n${category.toUpperCase()} (${files.length}):`);
    console.log('-'.repeat(50));
    files.forEach(file => console.log(`  ${file}`));
    total += files.length;
  }
});

console.log(`\n\nTOTAL: ${total} potentially unused files`);
