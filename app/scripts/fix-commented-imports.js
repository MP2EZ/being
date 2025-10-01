#!/usr/bin/env node
/**
 * Fix Commented Imports
 * Finds and fixes import statements trapped inside JSDoc comment blocks
 */

const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let fixed = false;
  let result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line is inside a JSDoc comment and contains an import
    if (i > 0 && line.trim().startsWith('import ') &&
        result[result.length - 1]?.trim() === '/**') {
      // This import is trapped in a JSDoc comment
      // Extract the import statement
      const importStatement = line.trim();

      // Find the end of the JSDoc comment
      let commentEnd = i + 1;
      while (commentEnd < lines.length && !lines[commentEnd].trim().includes('*/')) {
        commentEnd++;
      }

      if (commentEnd < lines.length) {
        // Reconstruct: JSDoc comment (without import) + actual imports section with the extracted import
        const commentLines = lines.slice(result.length - 1, commentEnd + 1)
          .filter(l => !l.trim().startsWith('import '));

        // Remove the last added /**
        result.pop();

        // Add corrected comment
        result.push(...commentLines);

        // Skip to after the comment end
        i = commentEnd;

        // Find the next import or empty line
        while (i + 1 < lines.length && lines[i + 1].trim() === '') {
          i++;
          result.push(lines[i]);
        }

        // Add the extracted import after the comment and whitespace
        result.push('');
        result.push(importStatement);

        fixed = true;
        continue;
      }
    }

    result.push(line);
  }

  if (fixed) {
    fs.writeFileSync(filePath, result.join('\n'), 'utf8');
    return true;
  }

  return false;
}

// Get list of files with this issue
const { execSync } = require('child_process');

try {
  const files = execSync(
    `find src -name "*.tsx" -o -name "*.ts" | xargs -I {} sh -c 'if head -5 {} | grep -A1 "^/\\\\*\\\\*$" | grep -q "^import"; then echo {}; fi' 2>/dev/null`,
    { encoding: 'utf8', cwd: path.join(__dirname, '..') }
  ).trim().split('\n').filter(Boolean);

  console.log(`Found ${files.length} files with commented imports:`);

  let fixedCount = 0;
  for (const file of files) {
    const fullPath = path.join(__dirname, '..', file);
    if (fixFile(fullPath)) {
      console.log(`  ✓ Fixed: ${file}`);
      fixedCount++;
    } else {
      console.log(`  - Skipped: ${file} (couldn't auto-fix)`);
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} out of ${files.length} files`);

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}