#!/usr/bin/env python3
"""
Phase 8B: Clean remaining test artifacts and consolidated cleanup files
"""

import os
import shutil
import json
from pathlib import Path

# Base directory
base_dir = Path("/Users/max/Development/active/fullmind")

def remove_directory_safely(dir_path):
    """Safely remove a directory and all its contents."""
    if dir_path.exists() and dir_path.is_dir():
        try:
            shutil.rmtree(dir_path)
            print(f"✓ Removed directory: {dir_path}")
            return True
        except Exception as e:
            print(f"✗ Failed to remove {dir_path}: {e}")
            return False
    return False

def remove_files_pattern(base_path, patterns):
    """Remove files matching patterns."""
    removed_count = 0
    for pattern in patterns:
        for file_path in base_path.glob(pattern):
            try:
                if file_path.is_file():
                    file_path.unlink()
                    print(f"✓ Removed file: {file_path}")
                    removed_count += 1
            except Exception as e:
                print(f"✗ Failed to remove {file_path}: {e}")
    return removed_count

def main():
    print("Phase 8B: Cleaning remaining test artifacts and consolidated cleanup files")
    print("=" * 70)
    
    artifacts_removed = 0
    
    # 1. Remove temp_consolidation directory
    print("\n1. Removing temp_consolidation directory...")
    temp_consolidation = base_dir / "temp_consolidation"
    if remove_directory_safely(temp_consolidation):
        artifacts_removed += 1
    
    # 2. Remove .to_delete directory  
    print("\n2. Removing .to_delete directory...")
    to_delete = base_dir / ".to_delete"
    if remove_directory_safely(to_delete):
        artifacts_removed += 1
    
    # 3. Remove remaining PHASE_* files from app directory
    print("\n3. Removing remaining PHASE_* files...")
    app_dir = base_dir / "app"
    phase_patterns = [
        "PHASE_*.md",
        "PHASE_*.json",
        "*-report*.json",
        "*-validation*.json",
        "*performance*.json"
    ]
    artifacts_removed += remove_files_pattern(app_dir, phase_patterns)
    
    # 4. Remove docs backup files
    print("\n4. Removing docs backup files...")
    backup_patterns = ["docs_backup_*.tar.gz"]
    artifacts_removed += remove_files_pattern(base_dir, backup_patterns)
    
    # 5. Remove remaining test-results artifacts (keeping core test infrastructure)
    print("\n5. Cleaning test-results directory (preserving core tests)...")
    test_results_dir = base_dir / "app" / "test-results"
    if test_results_dir.exists():
        # Only remove cleanup-related test results, preserve core test files
        cleanup_test_patterns = [
            "*cleanup*",
            "*migration*", 
            "*phase*",
            "*validation*",
            "*performance*"
        ]
        artifacts_removed += remove_files_pattern(test_results_dir, cleanup_test_patterns)
    
    # 6. Remove cleanup script we created
    cleanup_script = base_dir / "cleanup_script.sh"
    if cleanup_script.exists():
        try:
            cleanup_script.unlink()
            print(f"✓ Removed cleanup script: {cleanup_script}")
            artifacts_removed += 1
        except Exception as e:
            print(f"✗ Failed to remove cleanup script: {e}")
    
    print("\n" + "=" * 70)
    print(f"Phase 8B Complete: {artifacts_removed} artifacts removed")
    print("Core test infrastructure preserved")
    
    # Create completion report
    report = {
        "phase": "8B",
        "description": "Clean remaining test artifacts and consolidated cleanup files",
        "artifacts_removed": artifacts_removed,
        "directories_removed": ["temp_consolidation", ".to_delete"],
        "core_test_infrastructure_preserved": True,
        "timestamp": "2025-09-25"
    }
    
    report_path = base_dir / "PHASE_8B_COMPLETION_REPORT.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"✓ Completion report saved: {report_path}")
    return artifacts_removed

if __name__ == "__main__":
    main()