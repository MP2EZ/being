#!/bin/bash
# Phase 8B: Clean remaining test artifacts and consolidated cleanup files

echo "Removing temp_consolidation directory..."
rm -rf /Users/max/Development/active/fullmind/temp_consolidation

echo "Removing .to_delete cleanup files..."
rm -rf /Users/max/Development/active/fullmind/.to_delete

echo "Removing remaining test artifacts from app directory..."
rm -f /Users/max/Development/active/fullmind/app/PHASE_7A_*.md
rm -f /Users/max/Development/active/fullmind/app/PHASE_*.md
rm -f /Users/max/Development/active/fullmind/app/*.json

echo "Removing remaining cleanup artifacts from root..."
rm -f /Users/max/Development/active/fullmind/docs_backup_*.tar.gz

echo "Phase 8B cleanup complete!"