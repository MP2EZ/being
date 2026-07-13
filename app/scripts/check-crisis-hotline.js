#!/usr/bin/env node
/**
 * Asserts EXPO_PUBLIC_CRISIS_HOTLINE=988 is the sole uncommented hotline line
 * in both .env.production and .env.development. Runs from the npm `prepush`
 * hook. Aborts the push with a clear error on any mismatch — silent failure
 * is the exact regression mode this guard exists to prevent.
 *
 * 988 = US Suicide & Crisis Lifeline. Non-negotiable per CLAUDE.md safety facts.
 */

const fs = require('fs');
const path = require('path');

const ENV_FILES = ['.env.production', '.env.development'];
const KEY = 'EXPO_PUBLIC_CRISIS_HOTLINE';
const EXPECTED = `${KEY}=988`;

function validateContent(content) {
  const matches = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith(`${KEY}=`));
  if (matches.length === 0) return `missing required line: ${EXPECTED}`;
  if (matches.length > 1) return `multiple ${KEY} lines (dotenv is last-wins, ambiguous): ${matches.join(' | ')}`;
  if (matches[0] !== EXPECTED) return `wrong value — expected ${EXPECTED}, got: ${matches[0]}`;
  return null;
}

function main() {
  for (const file of ENV_FILES) {
    const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); // ENOENT bubbles up loudly
    const reason = validateContent(content);
    if (reason) {
      console.error(`❌ ${file}: ${reason}`);
      console.error('   988 is the US Suicide & Crisis Lifeline — non-negotiable per CLAUDE.md safety facts.');
      process.exit(1);
    }
  }
  console.log('✅ Crisis hotline (988) verified in both env files.');
}

if (require.main === module) main();
module.exports = { validateContent, EXPECTED, KEY };
