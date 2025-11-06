#!/bin/bash

# Fix logging calls in accessibility components
# Pattern: logError('message', error) → logError(LogCategory.ACCESSIBILITY, 'message', error)

set -e

FILES=(
  "src/components/accessibility/advanced/UnifiedProvider.tsx"
  "src/components/accessibility/advanced/CrisisAccessibility.tsx"
  "src/components/accessibility/advanced/MotorAccessibility.tsx"
  "src/components/accessibility/advanced/SensoryAccessibility.tsx"
  "src/components/accessibility/advanced/CognitiveAccessibility.tsx"
  "src/components/accessibility/RadioGroup.tsx"
  "src/components/accessibility/advanced/AdvancedScreenReader.tsx"
  "src/components/accessibility/advanced/AccessibilityTesting.tsx"
  "src/components/accessibility/advanced/AccessibilityPerformance.tsx"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "Fixing $FILE..."

    # Add LogCategory import if not present
    if ! grep -q "import.*LogCategory" "$FILE"; then
      sed -i '' "1s|^|import { LogCategory } from '../../../services/logging';\n|" "$FILE" 2>/dev/null || \
      sed -i '' "1s|^|import { LogCategory } from '../../services/logging';\n|" "$FILE"
    fi

    # Fix logError calls
    sed -i '' -E "s/logError\('([^']+)',/logError(LogCategory.ACCESSIBILITY, '\1',/g" "$FILE"
    sed -i '' -E 's/logError\("([^"]+)",/logError(LogCategory.ACCESSIBILITY, "\1",/g' "$FILE"
    sed -i '' -E "s/logError\(\`([^\`]+)\`,/logError(LogCategory.ACCESSIBILITY, \`\1\`,/g" "$FILE"

    # Fix logDebug calls
    sed -i '' -E "s/logDebug\('([^']+)',/logDebug(LogCategory.ACCESSIBILITY, '\1',/g" "$FILE"
    sed -i '' -E 's/logDebug\("([^"]+)",/logDebug(LogCategory.ACCESSIBILITY, "\1",/g' "$FILE"
    sed -i '' -E "s/logDebug\(\`([^\`]+)\`,/logDebug(LogCategory.ACCESSIBILITY, \`\1\`,/g" "$FILE"

    # Fix logInfo calls
    sed -i '' -E "s/logInfo\('([^']+)',/logInfo(LogCategory.ACCESSIBILITY, '\1',/g" "$FILE"
    sed -i '' -E 's/logInfo\("([^"]+)",/logInfo(LogCategory.ACCESSIBILITY, "\1",/g' "$FILE"
    sed -i '' -E "s/logInfo\(\`([^\`]+)\`,/logInfo(LogCategory.ACCESSIBILITY, \`\1\`,/g" "$FILE"

    echo "✓ Fixed $FILE"
  fi
done

echo ""
echo "✓ Accessibility components updated"
echo "Run: npx tsc --noEmit | grep -c TS2554"
