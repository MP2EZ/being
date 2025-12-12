#!/bin/bash

# Fix logging calls in crisis services
# Pattern: logError('message', error) → logError(LogCategory.CRISIS, 'message', error)

set -e

FILES=(
  "src/services/crisis/CrisisIntegrationOrchestrator.ts"
  "src/services/crisis/CrisisPerformanceMonitor.ts"
  "src/services/crisis/SuicidalIdeationProtocol.ts"
  "src/services/crisis/CrisisInterventionWorkflow.ts"
  "src/components/crisis/CrisisErrorBoundary.tsx"
  "src/flows/shared/components/CollapsibleCrisisButton.tsx"
  "src/flows/shared/components/SafetyButton.tsx"
  "src/screens/crisis/CrisisPlanScreen.tsx"
  "src/screens/crisis/CrisisResourcesScreen.tsx"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "Fixing $FILE..."

    # Add LogCategory import if not present
    if ! grep -q "import.*LogCategory" "$FILE"; then
      sed -i '' "1s|^|import { LogCategory } from '../../services/logging';\n|" "$FILE" 2>/dev/null || \
      sed -i '' "1s|^|import { LogCategory } from '../../../services/logging';\n|" "$FILE" 2>/dev/null || \
      sed -i '' "1s|^|import { LogCategory } from '../logging';\n|" "$FILE"
    fi

    # Fix logError calls
    sed -i '' -E "s/logError\('([^']+)',/logError(LogCategory.CRISIS, '\1',/g" "$FILE"
    sed -i '' -E 's/logError\("([^"]+)",/logError(LogCategory.CRISIS, "\1",/g' "$FILE"
    sed -i '' -E "s/logError\(\`([^\`]+)\`,/logError(LogCategory.CRISIS, \`\1\`,/g" "$FILE"

    # Fix logDebug calls
    sed -i '' -E "s/logDebug\('([^']+)',/logDebug(LogCategory.CRISIS, '\1',/g" "$FILE"
    sed -i '' -E 's/logDebug\("([^"]+)",/logDebug(LogCategory.CRISIS, "\1",/g' "$FILE"
    sed -i '' -E "s/logDebug\(\`([^\`]+)\`,/logDebug(LogCategory.CRISIS, \`\1\`,/g" "$FILE"

    # Fix logInfo calls
    sed -i '' -E "s/logInfo\('([^']+)',/logInfo(LogCategory.CRISIS, '\1',/g" "$FILE"
    sed -i '' -E 's/logInfo\("([^"]+)",/logInfo(LogCategory.CRISIS, "\1",/g' "$FILE"
    sed -i '' -E "s/logInfo\(\`([^\`]+)\`,/logInfo(LogCategory.CRISIS, \`\1\`,/g" "$FILE"

    echo "✓ Fixed $FILE"
  fi
done

echo ""
echo "✓ Crisis services updated"
echo "Run: npx tsc --noEmit | grep -c TS2554"
