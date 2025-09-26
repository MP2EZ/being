#!/bin/bash

echo "Phase 8A Intern 1 Cleanup - Starting systematic removal..."

# Count variables
files_removed=0
dirs_removed=0

# Remove PHASE files from app directory
echo "Removing PHASE files from app directory..."
for file in /Users/max/Development/active/fullmind/app/PHASE_*.md; do
    if [ -f "$file" ]; then
        rm "$file" && echo "Removed: $file" && ((files_removed++))
    fi
done

for file in /Users/max/Development/active/fullmind/app/PHASE_*.json; do
    if [ -f "$file" ]; then
        rm "$file" && echo "Removed: $file" && ((files_removed++))
    fi
done

# Remove validation reports
echo "Removing validation reports..."
rm -f /Users/max/Development/active/fullmind/app/payment_consolidation_validation_report.json && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/GROUP_4_MIGRATION_VALIDATION_REPORT.json && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/GROUP_4_INTEGRATION_TEST_REPORT.json && ((files_removed++))

# Remove cleanup documentation files
echo "Removing cleanup documentation..."
rm -f /Users/max/Development/active/fullmind/app/IMMEDIATE_CLEANUP_ACTIONS.md && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/NEW_ARCHITECTURE_COMPLIANCE_VALIDATION.md && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/SERVICE_CONSOLIDATION_ARCHITECTURE.md && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/STATE_AGENT_COORDINATION_BRIEF.md && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/SYNC_TYPES_CANONICAL_MIGRATION_REPORT.md && ((files_removed++))

# Remove JavaScript validation files
echo "Removing JS validation files..."
rm -f /Users/max/Development/active/fullmind/app/cleanup-performance-monitor.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/clinical-performance-validation.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/crisis-performance-monitor.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/execute-crisis-clinical-migration.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/migrate-sync-imports.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/migrate-sync-types-canonical.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/performance-baseline-measurement.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/performance-checkpoint-system.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/phase-3c-group-1-health-check.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/phase-3d-integration-test.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/phase-3d-performance-validation.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/update-payment-imports.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/validate-clinical-pattern.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/validate-phase-2c-implementation.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/validate-sync-consolidation.js && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/validate_payment_consolidation.js && ((files_removed++))

# Remove JSON files
echo "Removing JSON reports..."
rm -f /Users/max/Development/active/fullmind/app/.phase-3c-group-1-success.json && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/clinical-pattern-validation-report.json && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/clinical-performance-validation.json && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/crisis-performance-report-phase-1-group-c-activation.json && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/performance-baseline-report.json && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/phase-3c-group-1-validation-report.json && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/phase-3d-integration-report.json && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/phase-3d-performance-validation-report.json && ((files_removed++))

# Remove shell scripts and other cleanup files
echo "Removing shell scripts and cleanup files..."
rm -f /Users/max/Development/active/fullmind/app/cleanup_payment_services_phase3c.sh && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/cleanup_payment_services_phase3c.log && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/app/comprehensive-performance-baseline-report.md && ((files_removed++))

# Remove root cleanup files
echo "Removing root cleanup files..."
rm -f /Users/max/Development/active/fullmind/CRISIS_SAFETY_BASELINE_REPORT.md && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/batch_remove_script.py && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/cleanup-log.txt && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/cleanup_examples.sh && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/execute_cleanup.py && ((files_removed++))
rm -f /Users/max/Development/active/fullmind/final_cleanup.py && ((files_removed++))

# Remove temporary directories
echo "Removing temporary directories..."
if [ -d "/Users/max/Development/active/fullmind/.temp_delete" ]; then
    rm -rf /Users/max/Development/active/fullmind/.temp_delete && echo "Removed: .temp_delete directory" && ((dirs_removed++))
fi

if [ -d "/Users/max/Development/active/fullmind/.to_delete" ]; then
    rm -rf /Users/max/Development/active/fullmind/.to_delete && echo "Removed: .to_delete directory" && ((dirs_removed++))
fi

if [ -d "/Users/max/Development/active/fullmind/app/.temp_payment_types_backup" ]; then
    rm -rf /Users/max/Development/active/fullmind/app/.temp_payment_types_backup && echo "Removed: .temp_payment_types_backup directory" && ((dirs_removed++))
fi

if [ -d "/Users/max/Development/active/fullmind/app/.to_delete" ]; then
    rm -rf /Users/max/Development/active/fullmind/app/.to_delete && echo "Removed: app/.to_delete directory" && ((dirs_removed++))
fi

echo ""
echo "========================================="
echo "PHASE 8A INTERN 1 CLEANUP COMPLETE"
echo "========================================="
echo "Files removed: $files_removed"
echo "Directories removed: $dirs_removed"
echo "Total items cleaned: $((files_removed + dirs_removed))"
echo ""
echo "Cleanup artifacts successfully removed from Being. MBCT project."

# Clean up this script too
rm "$0"