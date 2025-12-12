#!/bin/bash

# Fix logging calls in system/misc files
# Pattern: logError('message', error) → logError(LogCategory.SYSTEM, 'message', error)

set -e

FILES=(
  "src/contexts/SimpleThemeContext.tsx"
  "src/screens/OnboardingScreen.tsx"
  "src/flows/midday/MiddayFlowNavigator.tsx"
  "src/components/ErrorBoundary.tsx"
  "src/services/logging/ConsoleReplacementGuide.ts"
  "src/navigation/CleanRootNavigator.tsx"
  "src/components/monitoring/ProductionDashboard.tsx"
  "src/services/resilience/CircuitBreakerService.ts"
  "src/services/monitoring/ErrorMonitoringService.ts"
  "src/services/monitoring/CrisisMonitoringService.ts"
  "src/services/deployment/DeploymentService.ts"
  "src/services/analytics/AnalyticsService.ts"
  "src/services/compliance/HIPAAComplianceEngine.ts"
  "src/services/compliance/HIPAAConsentManager.ts"
  "src/services/compliance/HIPAADataMinimization.ts"
  "src/services/compliance/HIPAABreachResponseEngine.ts"
  "src/services/compliance/HIPAAAssessmentIntegration.ts"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "Fixing $FILE..."

    # Add LogCategory import if not present
    if ! grep -q "import.*LogCategory" "$FILE"; then
      sed -i '' "1s|^|import { LogCategory } from '../services/logging';\n|" "$FILE" 2>/dev/null || \
      sed -i '' "1s|^|import { LogCategory } from '../../services/logging';\n|" "$FILE" 2>/dev/null || \
      sed -i '' "1s|^|import { LogCategory } from '../logging';\n|" "$FILE" 2>/dev/null || \
      sed -i '' "1s|^|import { LogCategory } from './logging';\n|" "$FILE"
    fi

    # Fix logError calls
    sed -i '' -E "s/logError\('([^']+)',/logError(LogCategory.SYSTEM, '\1',/g" "$FILE"
    sed -i '' -E 's/logError\("([^"]+)",/logError(LogCategory.SYSTEM, "\1",/g' "$FILE"
    sed -i '' -E "s/logError\(\`([^\`]+)\`,/logError(LogCategory.SYSTEM, \`\1\`,/g" "$FILE"

    # Fix logDebug calls
    sed -i '' -E "s/logDebug\('([^']+)',/logDebug(LogCategory.SYSTEM, '\1',/g" "$FILE"
    sed -i '' -E 's/logDebug\("([^"]+)",/logDebug(LogCategory.SYSTEM, "\1",/g' "$FILE"
    sed -i '' -E "s/logDebug\(\`([^\`]+)\`,/logDebug(LogCategory.SYSTEM, \`\1\`,/g" "$FILE"

    # Fix logInfo calls
    sed -i '' -E "s/logInfo\('([^']+)',/logInfo(LogCategory.SYSTEM, '\1',/g" "$FILE"
    sed -i '' -E 's/logInfo\("([^"]+)",/logInfo(LogCategory.SYSTEM, "\1",/g' "$FILE"
    sed -i '' -E "s/logInfo\(\`([^\`]+)\`,/logInfo(LogCategory.SYSTEM, \`\1\`,/g" "$FILE"

    echo "✓ Fixed $FILE"
  fi
done

echo ""
echo "✓ System files updated"
echo "Run: npx tsc --noEmit | grep -c TS2554"
