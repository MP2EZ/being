#!/bin/bash

# Master script to fix all logging signature errors
# Runs all category-specific fix scripts in safe order

set -e

echo "================================================"
echo "LOGGING SIGNATURE FIX - AUTOMATED MIGRATION"
echo "================================================"
echo ""
echo "Current errors: $(npx tsc --noEmit 2>&1 | grep -c 'TS2554' || echo 0)"
echo ""

# Make all scripts executable
chmod +x scripts/fix-logging-*.sh

# Run fixes in order (safest first, most critical last)
echo "1/7: Fixing Security services..."
bash scripts/fix-logging-security.sh
AFTER_SECURITY=$(npx tsc --noEmit 2>&1 | grep -c 'TS2554' || echo 0)
echo "   Remaining: $AFTER_SECURITY"
echo ""

echo "2/7: Fixing Sync services..."
bash scripts/fix-logging-sync.sh
AFTER_SYNC=$(npx tsc --noEmit 2>&1 | grep -c 'TS2554' || echo 0)
echo "   Remaining: $AFTER_SYNC"
echo ""

echo "3/7: Fixing Performance services..."
bash scripts/fix-logging-performance.sh
AFTER_PERF=$(npx tsc --noEmit 2>&1 | grep -c 'TS2554' || echo 0)
echo "   Remaining: $AFTER_PERF"
echo ""

echo "4/7: Fixing Assessment components..."
bash scripts/fix-logging-assessment.sh
AFTER_ASSESS=$(npx tsc --noEmit 2>&1 | grep -c 'TS2554' || echo 0)
echo "   Remaining: $AFTER_ASSESS"
echo ""

echo "5/7: Fixing Accessibility components..."
bash scripts/fix-logging-accessibility.sh
AFTER_A11Y=$(npx tsc --noEmit 2>&1 | grep -c 'TS2554' || echo 0)
echo "   Remaining: $AFTER_A11Y"
echo ""

echo "6/7: Fixing System files..."
bash scripts/fix-logging-system.sh
AFTER_SYSTEM=$(npx tsc --noEmit 2>&1 | grep -c 'TS2554' || echo 0)
echo "   Remaining: $AFTER_SYSTEM"
echo ""

echo "7/7: Fixing Crisis services (CRITICAL)..."
bash scripts/fix-logging-crisis.sh
AFTER_CRISIS=$(npx tsc --noEmit 2>&1 | grep -c 'TS2554' || echo 0)
echo "   Remaining: $AFTER_CRISIS"
echo ""

echo "================================================"
echo "AUTOMATED FIXES COMPLETE"
echo "================================================"
echo ""
echo "Final error count: $AFTER_CRISIS"
echo ""

if [ "$AFTER_CRISIS" -gt 0 ]; then
  echo "⚠️  $AFTER_CRISIS errors remaining - manual review needed"
  echo ""
  echo "Run to see remaining errors:"
  echo "  npx tsc --noEmit 2>&1 | grep TS2554"
  echo ""
  echo "Common remaining issues:"
  echo "  - logPerformance() calls (need duration parameter)"
  echo "  - logSecurity() calls (need severity parameter)"
  echo "  - Ambiguous categories needing manual classification"
else
  echo "✅ ALL ERRORS FIXED!"
fi
