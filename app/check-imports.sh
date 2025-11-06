#!/bin/bash

# Files to check for imports
files=(
  "ConsoleReplacementGuide:src/services/logging/ConsoleReplacementGuide.ts"
  "SecurityValidation:src/services/logging/SecurityValidation.ts"
  "rollback-validation:src/services/deployment/rollback-validation.ts"
)

echo "CHECKING FOR UNUSED FILES"
echo "========================="
echo ""

unused=()

for entry in "${files[@]}"; do
  IFS=':' read -r name path <<< "$entry"
  echo "Checking: $name..."
  
  # Search for imports
  count=$(rg "from.*$name|import.*$name" src/ 2>/dev/null | wc -l | tr -d ' ')
  
  if [ "$count" -eq "0" ]; then
    echo "  ❌ NOT IMPORTED"
    unused+=("$path")
  else
    echo "  ✓ Found $count imports"
  fi
done

echo ""
echo "UNUSED FILES:"
echo "-------------"
if [ ${#unused[@]} -eq 0 ]; then
  echo "None found!"
else
  for file in "${unused[@]}"; do
    echo "  $file"
  done
fi
