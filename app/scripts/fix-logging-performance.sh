#!/bin/bash

# Fix logging calls in performance services
# Pattern: logError('message', error) → logError(LogCategory.PERFORMANCE, 'message', error)

set -e

FILES=(
  "src/services/performance/PerformanceValidator.ts"
  "src/services/performance/MemoryOptimizer.ts"
  "src/services/performance/RenderingOptimizer.ts"
  "src/services/performance/PerformanceMonitor.ts"
  "src/services/performance/ZustandStoreOptimizer.ts"
  "src/services/performance/BundleOptimizer.ts"
  "src/services/performance/CrisisPerformanceOptimizer.ts"
  "src/services/performance/AssessmentFlowOptimizer.ts"
  "src/hooks/useAssessmentPerformance.ts"
)

for FILE in "${FILES[@]}"; do
  echo "Fixing $FILE..."

  # Add LogCategory import if not present
  if ! grep -q "import.*LogCategory" "$FILE"; then
    sed -i '' "1s|^|import { LogCategory } from '../logging';\n|" "$FILE" 2>/dev/null || \
    sed -i '' "1s|^|import { LogCategory } from '../../services/logging';\n|" "$FILE"
  fi

  # Fix logError calls
  sed -i '' -E "s/logError\('([^']+)',/logError(LogCategory.PERFORMANCE, '\1',/g" "$FILE"
  sed -i '' -E 's/logError\("([^"]+)",/logError(LogCategory.PERFORMANCE, "\1",/g' "$FILE"
  sed -i '' -E "s/logError\(\`([^\`]+)\`,/logError(LogCategory.PERFORMANCE, \`\1\`,/g" "$FILE"

  # Fix logDebug calls
  sed -i '' -E "s/logDebug\('([^']+)',/logDebug(LogCategory.PERFORMANCE, '\1',/g" "$FILE"
  sed -i '' -E 's/logDebug\("([^"]+)",/logDebug(LogCategory.PERFORMANCE, "\1",/g' "$FILE"
  sed -i '' -E "s/logDebug\(\`([^\`]+)\`,/logDebug(LogCategory.PERFORMANCE, \`\1\`,/g" "$FILE"

  # Fix logInfo calls
  sed -i '' -E "s/logInfo\('([^']+)',/logInfo(LogCategory.PERFORMANCE, '\1',/g" "$FILE"
  sed -i '' -E 's/logInfo\("([^"]+)",/logInfo(LogCategory.PERFORMANCE, "\1",/g' "$FILE"
  sed -i '' -E "s/logInfo\(\`([^\`]+)\`,/logInfo(LogCategory.PERFORMANCE, \`\1\`,/g" "$FILE"

  echo "✓ Fixed $FILE"
done

echo ""
echo "✓ Performance services updated"
echo "Run: npx tsc --noEmit | grep -c TS2554"
