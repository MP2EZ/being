#!/usr/bin/env python3
import os
import shutil
from pathlib import Path

base_path = Path("/Users/max/Development/active/fullmind")
app_path = base_path / "app"
consolidation_path = base_path / "temp_consolidation"

# Files to move to consolidation
files_to_move = [
    # Remaining PHASE files
    "app/PHASE_3B_SERVICE_CONSOLIDATION_PLAN.md",
    "app/PHASE_3C_GROUP_1_COMPLETION_REPORT.md", 
    "app/PHASE_3C_GROUP_2_COMPLETION_REPORT.md",
    "app/PHASE_3D_PERFORMANCE_VALIDATION_COMPLETE.md",
    "app/PHASE_4A_TYPE_SYSTEM_ANALYSIS_REPORT.md",
    "app/PHASE_4B_CANONICAL_CONSOLIDATION_REPORT.md",
    "app/PHASE_4B_TYPE_CONSOLIDATION_QUALITY_REVIEW.md",
    "app/PHASE_4D_TYPE_SAFETY_VALIDATION_REPORT.md",
    "app/PHASE_5C_GROUP_1_USER_STORE_CONSOLIDATION_REPORT.md",
    "app/PHASE_5C_GROUP_2_ASSESSMENT_MIGRATION_COMPLETE.md",
    "app/PHASE_5C_GROUP_2_COMPLETION_REPORT.md",
    "app/PHASE_5C_GROUP_3_CRISIS_MIGRATION_REPORT.md", 
    "app/PHASE_5C_GROUP_4_COMPLETION_REPORT.md",
    "app/PHASE_5E_COMPLETION_REPORT.md",
    "app/PHASE_5E_DASHBOARD_INTEGRATION.md",
    "app/PHASE_5F_FINAL_VALIDATION_REPORT.md",
    "app/PHASE_7A_REACT_BUILD_CONSOLIDATION_COMPLETE.md",
    "app/PHASE_7A_TYPESCRIPT_BUILD_CONSOLIDATION_COMPLETE.md",
    
    # JSON files
    "app/PHASE_5E_EXECUTION_REPORT.json",
    "app/PHASE_5F_STORE_INTEGRATION_REPORT.json", 
    "app/PHASE_5F_VALIDATION_REPORT.json",
    "app/.phase-3c-group-1-success.json",
    "app/payment_consolidation_validation_report.json",
    "app/GROUP_4_MIGRATION_VALIDATION_REPORT.json",
    "app/GROUP_4_INTEGRATION_TEST_REPORT.json",
    "app/clinical-pattern-validation-report.json",
    "app/clinical-performance-validation.json",
    "app/crisis-performance-report-phase-1-group-c-activation.json",
    "app/performance-baseline-report.json",
    "app/phase-3c-group-1-validation-report.json",
    "app/phase-3d-integration-report.json",
    "app/phase-3d-performance-validation-report.json",
    "app/react-native-build-consolidation-report.json",
    "app/typescript-build-report.json",
    
    # JavaScript files
    "app/PHASE_5F_CLINICAL_ACCURACY_VALIDATION.js",
    "app/PHASE_5F_STORE_INTEGRATION_TEST.js",
    "app/cleanup-performance-monitor.js",
    "app/clinical-performance-validation.js",
    "app/crisis-performance-monitor.js",
    "app/execute-crisis-clinical-migration.js",
    "app/migrate-sync-imports.js",
    "app/migrate-sync-types-canonical.js",
    "app/performance-baseline-measurement.js",
    "app/performance-checkpoint-system.js",
    "app/phase-3c-group-1-health-check.js",
    "app/phase-3d-integration-test.js",
    "app/phase-3d-performance-validation.js",
    "app/update-payment-imports.js",
    "app/validate-clinical-pattern.js",
    "app/validate-phase-2c-implementation.js",
    "app/validate-sync-consolidation.js",
    "app/validate_payment_consolidation.js",
    "app/performance-validation-focused.js",
    "app/performance-validation-phase5f.js",
    "app/test-group-4-integration.js",
    "app/validate-architecture-setup.js",
    "app/validate-group-4-migration.js",
    "app/verify-architecture.js",
    "app/verify-react.js",
    "app/execute-phase-5c-group-1-user-consolidation.js",
    "app/execute-phase-5e-parallel-run.js",
    "app/crisis-migration-final-validation.js",
    "app/crisis-rollback-test.js",
    "app/debug_crisis_detection.js",
    
    # Shell scripts and logs
    "app/cleanup_payment_services_phase3c.sh",
    "app/cleanup_payment_services_phase3c.log",
    "app/build-ios-simulator.sh",
    
    # Documentation files
    "app/SERVICE_CONSOLIDATION_ARCHITECTURE.md",
    "app/STATE_AGENT_COORDINATION_BRIEF.md",
    "app/SYNC_TYPES_CANONICAL_MIGRATION_REPORT.md",
    "app/comprehensive-performance-baseline-report.md",
    
    # Cleanup scripts I created
    "cleanup_temp_files.py",
    "batch_cleanup.sh"
]

moved_count = 0

print("Moving cleanup files to consolidation directory...")

for file_rel_path in files_to_move:
    file_path = base_path / file_rel_path
    if file_path.exists():
        try:
            dest_path = consolidation_path / file_path.name
            # Handle name conflicts by adding suffix
            counter = 1
            while dest_path.exists():
                stem = file_path.stem
                suffix = file_path.suffix
                dest_path = consolidation_path / f"{stem}_{counter}{suffix}"
                counter += 1
            
            shutil.move(str(file_path), str(dest_path))
            moved_count += 1
            print(f"Moved: {file_rel_path} -> {dest_path.name}")
        except Exception as e:
            print(f"Error moving {file_path}: {e}")

print(f"\nMoved {moved_count} files to consolidation directory.")
print(f"Next step: Remove the entire /temp_consolidation directory.")