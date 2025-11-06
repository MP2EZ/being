#!/usr/bin/env python3
import os
import subprocess
import re
from pathlib import Path

SRC_DIR = "src"
EXCLUDE_PATTERNS = ["index.ts", "index.tsx", ".test.ts", ".test.tsx", ".d.ts", "App.tsx"]

def should_check(filepath):
    """Check if file should be analyzed"""
    for pattern in EXCLUDE_PATTERNS:
        if pattern in filepath:
            return False
    return True

def get_all_source_files():
    """Get all TypeScript/TSX files in src/"""
    files = []
    for root, dirs, filenames in os.walk(SRC_DIR):
        for filename in filenames:
            if filename.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, filename)
                if should_check(filepath):
                    files.append(filepath)
    return files

def count_imports(filename_without_ext, src_dir="src"):
    """Count how many files import this one"""
    try:
        result = subprocess.run(
            ["rg", "-l", filename_without_ext, src_dir],
            capture_output=True,
            text=True,
            timeout=5
        )
        matches = [line for line in result.stdout.strip().split('\n') if line]
        return len(matches)
    except:
        return 0

def main():
    print("Analyzing source files for unused imports...\n")

    all_files = get_all_source_files()
    unused_by_category = {
        'components': [],
        'screens': [],
        'services': [],
        'stores': [],
        'hooks': [],
        'types': [],
        'utils': [],
        'constants': [],
        'flows': [],
        'contexts': [],
        'navigation': [],
        'theme': [],
        'other': []
    }

    for filepath in sorted(all_files):
        filename = os.path.basename(filepath)
        filename_without_ext = os.path.splitext(filename)[0]

        # Count references
        ref_count = count_imports(filename_without_ext)

        # If only 1 reference (the file itself), it's potentially unused
        if ref_count <= 1:
            # Categorize
            if '/components/' in filepath:
                unused_by_category['components'].append(filepath)
            elif '/screens/' in filepath:
                unused_by_category['screens'].append(filepath)
            elif '/services/' in filepath:
                unused_by_category['services'].append(filepath)
            elif '/stores/' in filepath:
                unused_by_category['stores'].append(filepath)
            elif '/hooks/' in filepath:
                unused_by_category['hooks'].append(filepath)
            elif '/types/' in filepath:
                unused_by_category['types'].append(filepath)
            elif '/utils/' in filepath:
                unused_by_category['utils'].append(filepath)
            elif '/constants/' in filepath:
                unused_by_category['constants'].append(filepath)
            elif '/flows/' in filepath:
                unused_by_category['flows'].append(filepath)
            elif '/contexts/' in filepath:
                unused_by_category['contexts'].append(filepath)
            elif '/navigation/' in filepath:
                unused_by_category['navigation'].append(filepath)
            elif '/theme/' in filepath:
                unused_by_category['theme'].append(filepath)
            else:
                unused_by_category['other'].append(filepath)

    # Print results
    total = 0
    for category, files in unused_by_category.items():
        if files:
            print(f"\n{category.upper()} ({len(files)}):")
            print("-" * 60)
            for f in files:
                print(f"  {f}")
            total += len(files)

    print(f"\n\nTOTAL: {total} potentially unused files")
    print("\nNOTE: Files may be used via:")
    print("- Index file re-exports")
    print("- Dynamic imports")
    print("- App.tsx or other entry points")
    print("- Non-import references (like typeof)")

if __name__ == "__main__":
    main()
