#!/usr/bin/env python3
"""
Find truly unused files by checking actual import statements
"""
import os
import subprocess
from pathlib import Path

SRC_DIR = "src"

# Files we know ARE entry points or used in special ways
KNOWN_USED = [
    "App.tsx",
    "CleanRootNavigator.tsx",  # Entry point
    "CleanTabNavigator.tsx",  # Used by root navigator
    # Navigators used by flows
    "EveningFlowNavigator.tsx",
    "MorningFlowNavigator.tsx",
    "MiddayFlowNavigator.tsx",
]

# Files that export from other files (not direct imports)
INDEX_FILES = []

def should_skip(filepath):
    """Skip test files, index files, type definitions"""
    if any(x in filepath for x in ['.test.ts', '.test.tsx', '.d.ts', 'index.ts', 'index.tsx']):
        return True
    filename = os.path.basename(filepath)
    return filename in KNOWN_USED

def search_for_import(filename_base, file_path):
    """Search for import of this file"""
    try:
        # Try multiple import patterns
        patterns = [
            f'import.*from.*{filename_base}',
            f'import.*from.*/{filename_base}',
            f"import.*from.*'{filename_base}'",
            f'import.*from.*"{filename_base}"',
        ]

        for pattern in patterns:
            result = subprocess.run(
                ["rg", pattern, ".", "--type", "typescript", "--type", "tsx"],
                capture_output=True,
                text=True,
                timeout=2
            )
            # Exclude the file itself from matches
            matches = [line for line in result.stdout.strip().split('\n')
                      if line and file_path not in line]
            if matches:
                return True

        return False
    except:
        return True  # If error, assume it's used

def main():
    print("Finding TRULY UNUSED files...\n")
    print("Checking for actual import statements...\n")

    # Get all source files
    all_files = []
    for root, dirs, filenames in os.walk(SRC_DIR):
        for filename in filenames:
            if filename.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, filename)
                if not should_skip(filepath):
                    all_files.append(filepath)

    truly_unused = {
        'documentation': [],  # Guide files, not code
        'services': [],
        'components': [],
        'screens': [],
        'other': []
    }

    for filepath in sorted(all_files):
        filename = os.path.basename(filepath)
        filename_base = os.path.splitext(filename)[0]

        # Check if imported
        is_used = search_for_import(filename_base, filepath)

        if not is_used:
            # Categorize
            if 'Guide' in filename or 'Validation' in filename:
                truly_unused['documentation'].append(filepath)
            elif '/services/' in filepath:
                truly_unused['services'].append(filepath)
            elif '/components/' in filepath or '/flows/' in filepath:
                truly_unused['components'].append(filepath)
            elif '/screens/' in filepath:
                truly_unused['screens'].append(filepath)
            else:
                truly_unused['other'].append(filepath)

    # Print results
    total = 0
    for category, files in truly_unused.items():
        if files:
            print(f"\n{category.upper()}:")
            print("-" * 70)
            for f in files:
                print(f"  {f}")
            total += len(files)

    print(f"\n\nTOTAL TRULY UNUSED: {total} files")

    if total > 0:
        print("\n" + "="*70)
        print("RECOMMENDATIONS:")
        print("="*70)
        print("1. Documentation/Guide files: Review if still needed for reference")
        print("2. Services: May be infrastructure not yet integrated")
        print("3. Components/Screens: Likely deprecated or未実装features")
        print("4. Consider moving to archive or deleting to reduce codebase size")

if __name__ == "__main__":
    main()
