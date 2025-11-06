#!/bin/bash

# Fix logging calls in security services
# Pattern: logError('message', error) → logError(LogCategory.SECURITY, 'message', error)
# Pattern: logDebug('message', context) → logDebug(LogCategory.SECURITY, 'message', context)
# Pattern: logInfo('message', context) → logInfo(LogCategory.SECURITY, 'message', context)

set -e

FILES=(
  "src/services/security/SecurityMonitoringService.ts"
  "src/services/security/SecureStorageService.ts"
  "src/services/security/IncidentResponseService.ts"
  "src/services/security/EncryptionService.ts"
  "src/services/security/AuthenticationService.ts"
  "src/services/security/crisis/CrisisSecurityProtocol.ts"
)

for FILE in "${FILES[@]}"; do
  echo "Fixing $FILE..."

  # Add LogCategory import if not present
  if ! grep -q "import.*LogCategory" "$FILE"; then
    sed -i '' "1s|^|import { LogCategory } from '../logging';\n|" "$FILE"
  fi

  # Fix logError calls: logError('...' → logError(LogCategory.SECURITY, '...'
  sed -i '' -E "s/logError\('([^']+)',/logError(LogCategory.SECURITY, '\1',/g" "$FILE"
  sed -i '' -E 's/logError\("([^"]+)",/logError(LogCategory.SECURITY, "\1",/g' "$FILE"
  sed -i '' -E "s/logError\(\`([^\`]+)\`,/logError(LogCategory.SECURITY, \`\1\`,/g" "$FILE"

  # Fix logDebug calls: logDebug('...' → logDebug(LogCategory.SECURITY, '...'
  sed -i '' -E "s/logDebug\('([^']+)',/logDebug(LogCategory.SECURITY, '\1',/g" "$FILE"
  sed -i '' -E 's/logDebug\("([^"]+)",/logDebug(LogCategory.SECURITY, "\1",/g' "$FILE"
  sed -i '' -E "s/logDebug\(\`([^\`]+)\`,/logDebug(LogCategory.SECURITY, \`\1\`,/g" "$FILE"

  # Fix logInfo calls: logInfo('...' → logInfo(LogCategory.SECURITY, '...'
  sed -i '' -E "s/logInfo\('([^']+)',/logInfo(LogCategory.SECURITY, '\1',/g" "$FILE"
  sed -i '' -E 's/logInfo\("([^"]+)",/logInfo(LogCategory.SECURITY, "\1",/g' "$FILE"
  sed -i '' -E "s/logInfo\(\`([^\`]+)\`,/logInfo(LogCategory.SECURITY, \`\1\`,/g" "$FILE"

  echo "✓ Fixed $FILE"
done

echo ""
echo "✓ Security services updated"
echo "Run: npx tsc --noEmit | grep -c TS2554"
