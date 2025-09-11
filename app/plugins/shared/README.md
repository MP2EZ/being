# FullMind Widget Config Plugin Setup

This directory contains the complete Expo Config Plugin setup for iOS and Android widgets in the FullMind MBCT app.

## Architecture Overview

### 🎯 **Clinical-Grade Privacy Standards**
- **Zero Clinical Data Exposure**: No PHQ-9/GAD-7 scores or assessment data in widgets
- **Encrypted Storage**: AES-256 encryption for all widget data
- **Privacy Auditing**: Automated filtering of sensitive information
- **HIPAA-Aware Design**: Future-proofed for healthcare compliance

### 🔧 **Technical Implementation**
- **Cross-Platform**: Unified experience on iOS and Android
- **Native Performance**: WidgetKit (iOS) and RemoteViews (Android)
- **Secure Deep Linking**: Crisis-priority URL scheme handling
- **Memory Optimized**: Battery-efficient updates with intelligent caching

## Installation & Setup

### 1. Install Dependencies

```bash
npm install @expo/config-plugins
```

### 2. Configure app.json

The widget plugin is already configured in `app.json`:

```json
{
  "expo": {
    "plugins": ["./plugins/expo-fullmind-widgets"],
    "ios": {
      "entitlements": {
        "com.apple.security.application-groups": ["group.com.fullmind.mbct.widgets"]
      }
    }
  }
}
```

### 3. iOS Setup (Manual Steps Required)

After running `expo prebuild` or `npx expo run:ios`, complete these steps in Xcode:

1. **Add Widget Extension Target**
   - Open project in Xcode
   - Add new Widget Extension target named "FullMindWidget"
   - Set bundle identifier: `com.fullmind.mbct.FullMindWidget`

2. **Configure App Groups**
   - Add App Groups capability to both main app and widget targets
   - Use App Group ID: `group.com.fullmind.mbct.widgets`

3. **Add Widget Files**
   - Copy Swift files from `plugins/ios-widget-plugin/ios/` to widget target
   - Ensure all files are added to widget target membership

### 4. Android Setup (Automatic)

The plugin automatically configures:
- Widget receiver in AndroidManifest.xml
- Widget layout and drawable resources
- Deep linking intent filters
- Required permissions

## Usage in React Native

### 1. Setup Widget Integration Hook

```typescript
import { useWidgetIntegration } from './src/hooks/useWidgetIntegration';

export default function App() {
  const { updateWidgetData, handleDeepLink } = useWidgetIntegration();
  
  // Widget integration is automatically active
  return <YourAppContent />;
}
```

### 2. Manual Widget Updates

```typescript
import { WidgetDataService } from './src/services/WidgetDataService';

const widgetService = new WidgetDataService();

// Update widget data
await widgetService.updateWidgetData();

// Handle deep links
await widgetService.handleWidgetDeepLink('fullmind://checkin/morning?resume=true');
```

### 3. Navigation Service Setup

```typescript
import { NavigationService } from './src/services/NavigationService';

// In your App component
const navigationRef = useNavigationContainerRef();

useEffect(() => {
  NavigationService.setNavigationRef(navigationRef);
}, []);
```

## Widget Features

### 📱 **Widget Display**
- **Daily Progress**: Shows completion status for morning/midday/evening check-ins
- **Session Status**: Visual indicators for not started/in progress/completed/skipped
- **Crisis Access**: Emergency button when crisis mode is active
- **Resume Capability**: Direct access to interrupted sessions

### 🔗 **Deep Linking**
- `fullmind://checkin/morning` - Start morning check-in
- `fullmind://checkin/morning?resume=true` - Resume interrupted session
- `fullmind://crisis` - Emergency crisis intervention access

### 🔒 **Privacy & Security**
- Automatic privacy filtering before data reaches widgets
- Encrypted storage with integrity verification
- No personal information or clinical data exposure
- Audit logging for security monitoring

## File Structure

```
plugins/
├── expo-fullmind-widgets.js          # Main config plugin
├── ios-widget-plugin/
│   └── ios/
│       ├── FullMindWidget.swift       # Main widget implementation
│       ├── WidgetDataManager.swift    # Data management & security
│       ├── WidgetViews.swift          # SwiftUI views
│       └── Info.plist                 # Widget metadata
├── android-widget-plugin/
│   ├── android/
│   │   ├── FullMindWidgetProvider.kt  # Widget provider
│   │   ├── WidgetDataManager.kt       # Data management
│   │   └── SecureWidgetStorage.kt     # Encryption layer
│   └── res/                           # Layouts and drawables
└── shared/
    ├── WidgetDataService.ts           # React Native bridge
    ├── WidgetTypes.ts                 # TypeScript definitions
    └── README.md                      # This file
```

## Clinical Safety Features

### 🚨 **Crisis Priority**
- Crisis button bypasses all navigation stacks
- Direct access to emergency intervention
- 988 hotline integration ready
- Fail-safe fallback mechanisms

### 🔐 **Privacy Protection**
- Real-time clinical data filtering
- Prohibited content patterns detection
- Email/phone number scrubbing
- Encrypted data integrity verification

### ⚡ **Performance Optimization**
- 1-minute update throttling
- Battery-efficient background processing
- Memory usage monitoring (<50MB)
- Intelligent caching with LRU eviction

## Testing & Validation

### 1. Privacy Compliance Test

```typescript
import { WidgetDataService } from './src/services/WidgetDataService';

const service = new WidgetDataService();
const widgetData = await service.generateWidgetData();

// Verify no clinical data present
console.assert(!JSON.stringify(widgetData).includes('phq'));
console.assert(!JSON.stringify(widgetData).includes('gad'));
```

### 2. Widget Update Performance

```typescript
const startTime = performance.now();
await service.updateWidgetData();
const duration = performance.now() - startTime;

console.assert(duration < 200, 'Widget update should complete under 200ms');
```

### 3. Deep Link Handling

```typescript
// Test all supported deep links
const testLinks = [
  'fullmind://checkin/morning',
  'fullmind://checkin/midday?resume=true',
  'fullmind://crisis'
];

for (const link of testLinks) {
  await service.handleWidgetDeepLink(link);
}
```

## Troubleshooting

### iOS Widget Not Appearing
1. Verify App Groups entitlement is added to both targets
2. Check widget target has correct bundle identifier
3. Ensure Swift files are added to widget target membership
4. Rebuild and reinstall app

### Android Widget Update Issues
1. Check widget provider is registered in AndroidManifest.xml
2. Verify permissions are granted (WAKE_LOCK, RECEIVE_BOOT_COMPLETED)
3. Test with `adb shell dumpsys appwidget` command
4. Check LogCat for widget-related errors

### Privacy Violations
1. Review widget data generation logic
2. Check privacy filter implementation
3. Verify no clinical data patterns in JSON output
4. Test with production data samples

## Performance Monitoring

### Key Metrics
- **Update Duration**: Target <200ms
- **Memory Usage**: Target <50MB
- **Battery Impact**: Minimal background processing
- **Privacy Compliance**: 100% (zero clinical data exposure)

### Monitoring Setup

```typescript
// Add to your analytics service
WidgetAnalytics.trackWidgetPerformance('update', duration);
WidgetAnalytics.trackWidgetInteraction('checkin_started', { type: 'morning' });
```

## Support

For implementation questions or clinical safety concerns, refer to the comprehensive architecture documentation in `WIDGET_ARCHITECTURE.md`.

### Key Principles
1. **Privacy First**: No clinical data ever reaches widgets
2. **Crisis Priority**: Emergency access always available
3. **Battery Efficient**: Minimal background processing
4. **Secure by Design**: Encrypted storage and integrity verification

---

**Note**: This widget implementation is designed specifically for the FullMind MBCT mental health app and includes specialized privacy protections for clinical data. Use as reference for similar healthcare applications.