#!/bin/bash

# iOS Simulator Development Build Script
# This script builds the iOS app for simulator without code signing issues

set -e

echo "🚀 Building Being. app for iOS Simulator..."

# Change to app directory
cd "$(dirname "$0")"

# Check if we have the necessary tools
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode command line tools not found. Please install Xcode."
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ npm/npx not found. Please install Node.js."
    exit 1
fi

# Clean any previous builds
echo "🧹 Cleaning previous builds..."
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData/Being-*

# Boot the iOS simulator
echo "📱 Starting iOS Simulator..."
xcrun simctl boot "iPhone 16 Pro" 2>/dev/null || echo "Simulator already running"

# Build the app with specific settings to avoid code signing
echo "🔨 Building iOS app..."
xcodebuild \
  -workspace ios/Being.xcworkspace \
  -scheme Being \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  -derivedDataPath ios/build \
  build \
  ONLY_ACTIVE_ARCH=YES \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  -allowProvisioningUpdates

# Check if build succeeded
APP_PATH="ios/build/Build/Products/Debug-iphonesimulator/Being.app"
if [ -d "$APP_PATH" ] && [ -f "$APP_PATH/Info.plist" ]; then
    echo "✅ Build successful!"

    # Install on simulator
    echo "📱 Installing on simulator..."
    xcrun simctl install "iPhone 16 Pro" "$APP_PATH"

    # Launch the app
    echo "🚀 Launching Being. app..."
    xcrun simctl launch "iPhone 16 Pro" com.being.mbct

    echo "🎉 Being. development build is now running on iOS Simulator!"
    echo "📱 You can now start the Metro bundler with: npx expo start"

else
    echo "❌ Build failed. Check the output above for errors."
    exit 1
fi