#!/bin/bash
# Temporary cleanup script to remove test store files
cd /Users/max/Development/active/fullmind
rm -f app/src/store/testCombinedStore.ts
rm -f app/src/store/testPersistStore.ts
rm -f app/src/store/testSecureStore.ts
rm -f app/src/store/testSubscribeStore.ts
rm -f app/src/store/testCombinedStore.ts.deleted
echo "Files removed successfully"