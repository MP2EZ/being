#!/bin/bash

# Fix logging calls in assessment components
# Pattern: logError('message', error) → logError(LogCategory.ASSESSMENT, 'message', error)

set -e

FILES=(
  "src/components/assessment/EnhancedAssessmentQuestion.tsx"
  "src/components/assessment/AssessmentIntegrationExample.tsx"
  "src/components/assessment/EnhancedAssessmentFlow.tsx"
  "src/flows/assessment/components/AssessmentResults.tsx"
  "src/flows/assessment/components/AssessmentIntroduction.tsx"
  "src/flows/assessment/stores/assessmentStore.ts"
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
    sed -i '' -E "s/logError\('([^']+)',/logError(LogCategory.ASSESSMENT, '\1',/g" "$FILE"
    sed -i '' -E 's/logError\("([^"]+)",/logError(LogCategory.ASSESSMENT, "\1",/g' "$FILE"
    sed -i '' -E "s/logError\(\`([^\`]+)\`,/logError(LogCategory.ASSESSMENT, \`\1\`,/g" "$FILE"

    # Fix logDebug calls
    sed -i '' -E "s/logDebug\('([^']+)',/logDebug(LogCategory.ASSESSMENT, '\1',/g" "$FILE"
    sed -i '' -E 's/logDebug\("([^"]+)",/logDebug(LogCategory.ASSESSMENT, "\1",/g' "$FILE"
    sed -i '' -E "s/logDebug\(\`([^\`]+)\`,/logDebug(LogCategory.ASSESSMENT, \`\1\`,/g" "$FILE"

    # Fix logInfo calls
    sed -i '' -E "s/logInfo\('([^']+)',/logInfo(LogCategory.ASSESSMENT, '\1',/g" "$FILE"
    sed -i '' -E 's/logInfo\("([^"]+)",/logInfo(LogCategory.ASSESSMENT, "\1",/g' "$FILE"
    sed -i '' -E "s/logInfo\(\`([^\`]+)\`,/logInfo(LogCategory.ASSESSMENT, \`\1\`,/g" "$FILE"

    echo "✓ Fixed $FILE"
  fi
done

echo ""
echo "✓ Assessment components updated"
echo "Run: npx tsc --noEmit | grep -c TS2554"
