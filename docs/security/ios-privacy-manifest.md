# iOS Privacy Manifest Documentation

## Overview

This document describes the data collection declarations in `app/ios/Being/PrivacyInfo.xcprivacy` as required by Apple's App Store guidelines (enforced May 2024).

## NSPrivacyCollectedDataTypes

### Health Data (`NSPrivacyCollectedDataTypeHealth`)

**Data Collected:**
- PHQ-9 (Patient Health Questionnaire-9) assessment responses
- GAD-7 (Generalized Anxiety Disorder-7) assessment responses
- Daily mood check-in data (emotional state, intensity levels)
- Practice completion status (meditation, breathing exercises)

**Justification:**
This data is classified as "Health" data per Apple's App Privacy Details categories because it relates to the user's mental health and medical state. PHQ-9 and GAD-7 are clinically validated screening instruments for depression and anxiety.

**Privacy Configuration:**
| Property | Value | Justification |
|----------|-------|---------------|
| `NSPrivacyCollectedDataTypeLinked` | `false` | Data is stored locally on-device with encryption. If cloud backup is enabled, data is end-to-end encrypted with user-controlled keys. No server-side user identity linkage occurs. |
| `NSPrivacyCollectedDataTypeTracking` | `false` | Data is never used for advertising, analytics tracking, or shared with third parties for tracking purposes. |
| `NSPrivacyCollectedDataTypePurposes` | `AppFunctionality` | Data is collected solely to provide core app functionality: mood tracking, assessment scoring, progress visualization, and personalized recommendations. |

## NSPrivacyAccessedAPITypes

The app uses the following Apple APIs that require reason declarations:

### File Timestamp API (`NSPrivacyAccessedAPICategoryFileTimestamp`)
**Reasons:**
- `C617.1`: Access file timestamps inside app container
- `0A2A.1`: Access file timestamps for files provided by user
- `3B52.1`: Access file timestamps for app data organization

**Use Case:** Managing encrypted local storage files for health data.

### User Defaults API (`NSPrivacyAccessedAPICategoryUserDefaults`)
**Reasons:**
- `CA92.1`: Access user preferences within app

**Use Case:** Storing non-sensitive app preferences (theme, notification settings).

### System Boot Time API (`NSPrivacyAccessedAPICategorySystemBootTime`)
**Reasons:**
- `35F9.1`: Measure elapsed time within app

**Use Case:** Animation timing, session duration tracking.

### Disk Space API (`NSPrivacyAccessedAPICategoryDiskSpace`)
**Reasons:**
- `E174.1`: Check disk space for storage operations
- `85F4.1`: Check available disk space

**Use Case:** Ensuring sufficient storage for encrypted health data.

## NSPrivacyTracking

Set to `false`. The Being app does not engage in any form of user tracking as defined by Apple's App Tracking Transparency framework.

## Compliance Notes

1. **HIPAA Alignment:** Data collection practices align with HIPAA requirements for PHI protection. See `docs/brand-legal/legal/HIPAA/` for full compliance documentation.

2. **Local-First Architecture:** Health data is primarily stored locally with encryption. Cloud sync is optional and uses end-to-end encryption.

3. **No Third-Party Data Sharing:** Health data is never sold or shared with third parties for any purpose.

4. **User Control:** Users can export or delete their health data at any time through in-app settings.

## App Store Connect Declaration

When submitting to App Store Connect, the following must be declared in the App Privacy questionnaire:

**Health & Fitness > Health:**
- Collected: Yes
- Linked to Identity: No
- Used for Tracking: No
- Purpose: App Functionality

## References

- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Privacy Manifest Files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
- [Describing Data Use in Privacy Manifests](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_data_use_in_privacy_manifests)

## Last Updated

December 2024 - INFRA-113
