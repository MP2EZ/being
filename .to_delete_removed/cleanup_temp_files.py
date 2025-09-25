#!/usr/bin/env python3
import os
import shutil

# Files and directories to remove
files_to_remove = [
    # Phase reports from project root
    "/Users/max/Development/active/fullmind/PHASE_6A_HISTORY_AUDIT_REPORT.md",
    "/Users/max/Development/active/fullmind/PHASE_7B_COMPLIANCE_ENVIRONMENT_CONSOLIDATION_REPORT.md",
    "/Users/max/Development/active/fullmind/PHASE_7B_SECURITY_ENVIRONMENT_CONSOLIDATION_COMPLETE.md",
    "/Users/max/Development/active/fullmind/CRISIS_SAFETY_BASELINE_REPORT.md",
    
    # Cleanup scripts at root
    "/Users/max/Development/active/fullmind/batch_remove_script.py",
    "/Users/max/Development/active/fullmind/cleanup-log.txt", 
    "/Users/max/Development/active/fullmind/cleanup_examples.sh",
    "/Users/max/Development/active/fullmind/execute_cleanup.py",
    "/Users/max/Development/active/fullmind/final_cleanup.py",
    
    # Phase reports from app directory
    "/Users/max/Development/active/fullmind/app/PHASE_3B_SERVICE_CONSOLIDATION_PLAN.md",
    "/Users/max/Development/active/fullmind/app/PHASE_3C_GROUP_1_COMPLETION_REPORT.md",
    "/Users/max/Development/active/fullmind/app/PHASE_3C_GROUP_2_COMPLETION_REPORT.md",
    "/Users/max/Development/active/fullmind/app/PHASE_3D_PERFORMANCE_VALIDATION_COMPLETE.md",
    "/Users/max/Development/active/fullmind/app/PHASE_4A_TYPE_SYSTEM_ANALYSIS_REPORT.md",
    "/Users/max/Development/active/fullmind/app/PHASE_4B_TYPE_CONSOLIDATION_QUALITY_REVIEW.md",
    "/Users/max/Development/active/fullmind/app/PHASE_4B_CANONICAL_CONSOLIDATION_REPORT.md",
    "/Users/max/Development/active/fullmind/app/PHASE_4D_TYPE_SAFETY_VALIDATION_REPORT.md",
    "/Users/max/Development/active/fullmind/app/PHASE_5C_GROUP_2_COMPLETION_REPORT.md",
    "/Users/max/Development/active/fullmind/app/PHASE_5C_GROUP_3_CRISIS_MIGRATION_REPORT.md",
    "/Users/max/Development/active/fullmind/app/PHASE_5C_GROUP_1_USER_STORE_CONSOLIDATION_REPORT.md",
    "/Users/max/Development/active/fullmind/app/PHASE_5C_GROUP_2_ASSESSMENT_MIGRATION_COMPLETE.md",
    "/Users/max/Development/active/fullmind/app/PHASE_5C_GROUP_4_COMPLETION_REPORT.md",
    "/Users/max/Development/active/fullmind/app/PHASE_5E_DASHBOARD_INTEGRATION.md",
    "/Users/max/Development/active/fullmind/app/PHASE_5E_COMPLETION_REPORT.md",
    "/Users/max/Development/active/fullmind/app/PHASE_5F_FINAL_VALIDATION_REPORT.md",
    "/Users/max/Development/active/fullmind/app/PHASE_7A_TYPESCRIPT_BUILD_CONSOLIDATION_COMPLETE.md",
    "/Users/max/Development/active/fullmind/app/PHASE_7A_REACT_BUILD_CONSOLIDATION_COMPLETE.md",
    
    # Phase JSON files  
    "/Users/max/Development/active/fullmind/app/PHASE_5E_EXECUTION_REPORT.json",
    "/Users/max/Development/active/fullmind/app/PHASE_5F_VALIDATION_REPORT.json",
    "/Users/max/Development/active/fullmind/app/PHASE_5F_STORE_INTEGRATION_REPORT.json",
    "/Users/max/Development/active/fullmind/app/PHASE_5F_PERFORMANCE_REPORT.json",
    "/Users/max/Development/active/fullmind/app/PHASE_5F_PERFORMANCE_VALIDATION_REPORT.json",
    
    # Validation reports
    "/Users/max/Development/active/fullmind/app/payment_consolidation_validation_report.json",
    "/Users/max/Development/active/fullmind/app/GROUP_4_MIGRATION_VALIDATION_REPORT.json",
    
    # Other cleanup files
    "/Users/max/Development/active/fullmind/app/IMMEDIATE_CLEANUP_ACTIONS.md",
    "/Users/max/Development/active/fullmind/app/NEW_ARCHITECTURE_COMPLIANCE_VALIDATION.md", 
    "/Users/max/Development/active/fullmind/app/SERVICE_CONSOLIDATION_ARCHITECTURE.md",
    "/Users/max/Development/active/fullmind/app/STATE_AGENT_COORDINATION_BRIEF.md",
    "/Users/max/Development/active/fullmind/app/SYNC_TYPES_CANONICAL_MIGRATION_REPORT.md",
    "/Users/max/Development/active/fullmind/app/.phase-3c-group-1-success.json",
    
    # JavaScript validation files
    "/Users/max/Development/active/fullmind/app/cleanup-performance-monitor.js",
    "/Users/max/Development/active/fullmind/app/clinical-performance-validation.js",
    "/Users/max/Development/active/fullmind/app/crisis-performance-monitor.js",
    "/Users/max/Development/active/fullmind/app/execute-crisis-clinical-migration.js",
    "/Users/max/Development/active/fullmind/app/migrate-sync-imports.js",
    "/Users/max/Development/active/fullmind/app/migrate-sync-types-canonical.js",
    "/Users/max/Development/active/fullmind/app/performance-baseline-measurement.js",
    "/Users/max/Development/active/fullmind/app/performance-checkpoint-system.js",
    "/Users/max/Development/active/fullmind/app/phase-3c-group-1-health-check.js",
    "/Users/max/Development/active/fullmind/app/phase-3d-integration-test.js",
    "/Users/max/Development/active/fullmind/app/phase-3d-performance-validation.js",
    "/Users/max/Development/active/fullmind/app/update-payment-imports.js",
    "/Users/max/Development/active/fullmind/app/validate-clinical-pattern.js",
    "/Users/max/Development/active/fullmind/app/validate-phase-2c-implementation.js",
    "/Users/max/Development/active/fullmind/app/validate-sync-consolidation.js",
    "/Users/max/Development/active/fullmind/app/validate_payment_consolidation.js",
]

dirs_to_remove = [
    "/Users/max/Development/active/fullmind/.temp_delete",
    "/Users/max/Development/active/fullmind/.to_delete", 
    "/Users/max/Development/active/fullmind/app/.temp_payment_types_backup",
    "/Users/max/Development/active/fullmind/app/.to_delete",
]

count = 0

# Remove files
for file_path in files_to_remove:
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            count += 1
            print(f"Removed file: {file_path}")
        except Exception as e:
            print(f"Error removing file {file_path}: {e}")
    else:
        print(f"File not found: {file_path}")

# Remove directories
for dir_path in dirs_to_remove:
    if os.path.exists(dir_path):
        try:
            shutil.rmtree(dir_path)
            count += 1  
            print(f"Removed directory: {dir_path}")
        except Exception as e:
            print(f"Error removing directory {dir_path}: {e}")
    else:
        print(f"Directory not found: {dir_path}")

print(f"\nCleanup complete. Removed {count} items total.")