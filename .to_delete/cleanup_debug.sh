#!/bin/bash
cd /Users/max/Development/active/fullmind

# Get file sizes before removal
echo "Files to be removed:"
find app/src/components/debug -type f -exec ls -lh {} \; | awk '{print $5 " " $9}'

# Calculate total size
total_size=$(find app/src/components/debug -type f -exec stat -f%z {} \; | awk '{sum+=$1} END {print sum}')
echo "Total size to recover: $total_size bytes"

# Remove the directory
rm -rf app/src/components/debug

# Confirm removal
if [ ! -d "app/src/components/debug" ]; then
    echo "Successfully removed debug directory"
    echo "Space recovered: $total_size bytes ($(echo "scale=2; $total_size/1024" | bc) KB)"
else
    echo "Failed to remove debug directory"
fi