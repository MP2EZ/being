#!/bin/bash

# Fix logging calls in Supabase/sync services
# Pattern: logError('message', error) → logError(LogCategory.SYNC, 'message', error)

set -e

FILES=(
  "src/services/supabase/SyncCoordinator.ts"
  "src/services/supabase/SupabaseService.ts"
  "src/services/supabase/CloudBackupService.ts"
  "src/services/supabase/index.ts"
  "src/components/sync/SyncStatusIndicator.tsx"
  "src/components/settings/CloudBackupSettings.tsx"
)

for FILE in "${FILES[@]}"; do
  echo "Fixing $FILE..."

  # Add LogCategory import if not present
  if ! grep -q "import.*LogCategory" "$FILE"; then
    sed -i '' "1s|^|import { LogCategory } from '../logging';\n|" "$FILE" 2>/dev/null || \
    sed -i '' "1s|^|import { LogCategory } from '../../services/logging';\n|" "$FILE"
  fi

  # Fix logError calls
  sed -i '' -E "s/logError\('([^']+)',/logError(LogCategory.SYNC, '\1',/g" "$FILE"
  sed -i '' -E 's/logError\("([^"]+)",/logError(LogCategory.SYNC, "\1",/g' "$FILE"
  sed -i '' -E "s/logError\(\`([^\`]+)\`,/logError(LogCategory.SYNC, \`\1\`,/g" "$FILE"

  # Fix logDebug calls
  sed -i '' -E "s/logDebug\('([^']+)',/logDebug(LogCategory.SYNC, '\1',/g" "$FILE"
  sed -i '' -E 's/logDebug\("([^"]+)",/logDebug(LogCategory.SYNC, "\1",/g' "$FILE"
  sed -i '' -E "s/logDebug\(\`([^\`]+)\`,/logDebug(LogCategory.SYNC, \`\1\`,/g" "$FILE"

  # Fix logInfo calls
  sed -i '' -E "s/logInfo\('([^']+)',/logInfo(LogCategory.SYNC, '\1',/g" "$FILE"
  sed -i '' -E 's/logInfo\("([^"]+)",/logInfo(LogCategory.SYNC, "\1",/g' "$FILE"
  sed -i '' -E "s/logInfo\(\`([^\`]+)\`,/logInfo(LogCategory.SYNC, \`\1\`,/g" "$FILE"

  echo "✓ Fixed $FILE"
done

echo ""
echo "✓ Sync services updated"
echo "Run: npx tsc --noEmit | grep -c TS2554"
