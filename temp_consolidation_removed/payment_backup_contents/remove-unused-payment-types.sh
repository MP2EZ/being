#!/bin/bash

# Remove unused payment type files that have been consolidated into payment-canonical.ts
echo "🗑️ Removing unused payment type files..."

cd /Users/max/Development/active/fullmind/app/src/types

# List of files to remove
files_to_remove=(
    "payment.ts"
    "subscription.ts"
    "payment-error-handling.ts"
    "payment-performance.ts"
    "payment-ui.ts"
    "payment-crisis-detection-enhanced.ts"
    "payment-hipaa-compliance-enhanced.ts"
    "payment-interaction-enhanced.ts"
    "payment-pressable-enhanced.ts"
    "enhanced-payment-components.ts"
    "subscription-components.ts"
    "subscription-hooks.ts"
    "subscription-store.ts"
)

# Remove each file
for file in "${files_to_remove[@]}"; do
    if [ -f "$file" ]; then
        echo "Removing: $file"
        rm "$file"
    else
        echo "File not found: $file"
    fi
done

echo "✅ Cleanup complete - all payment types consolidated to payment-canonical.ts"