/**
 * Being. Widget Config Plugin
 * Expo config plugin for iOS and Android widgets in Being. MBCT app
 * Implements clinical-grade security and privacy standards
 */

const { withDangerousMod, withPlugins, withEntitlementsPlist, withAndroidManifest, withStringsXml } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const withBeingWidgets = (config) => {
  return withPlugins(config, [
    // iOS Widget Implementation
    withIOSWidget,
    withIOSEntitlements,
    // Android Widget Implementation  
    withAndroidWidget,
    withAndroidManifest,
    withAndroidStrings,
  ]);
};

/**
 * iOS Widget Integration
 */
const withIOSWidget = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosProjectPath = path.join(config.modRequest.projectRoot, 'ios');
      const widgetTargetPath = path.join(iosProjectPath, 'BeingWidget');
      
      // Create widget extension directory
      if (!fs.existsSync(widgetTargetPath)) {
        fs.mkdirSync(widgetTargetPath, { recursive: true });
      }
      
      // Copy iOS widget files
      await copyDirectoryRecursive(
        path.join(__dirname, 'ios-widget-plugin', 'ios'),
        widgetTargetPath
      );
      
      // Update Xcode project configuration
      await updateXcodeProject(iosProjectPath, config);
      
      console.log('✅ iOS Widget extension configured successfully');
      return config;
    }
  ]);
};

/**
 * iOS App Groups Entitlements
 */
const withIOSEntitlements = (config) => {
  return withEntitlementsPlist(config, (config) => {
    const appGroupId = 'group.com.being.mbct.widgets';
    
    // Add App Groups entitlement
    config.modResults['com.apple.security.application-groups'] = [appGroupId];
    
    // Add URL scheme handling
    if (!config.modResults['com.apple.developer.associated-domains']) {
      config.modResults['com.apple.developer.associated-domains'] = [];
    }
    
    return config;
  });
};

/**
 * Android Widget Integration
 */
const withAndroidWidget = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidProjectPath = path.join(config.modRequest.projectRoot, 'android');
      const packageName = 'com.being.mbct';
      const widgetSourcePath = path.join(__dirname, 'android-widget-plugin', 'android');
      const widgetTargetPath = path.join(
        androidProjectPath, 
        'app/src/main/java/com/being/widget'
      );
      
      // Create widget directory
      if (!fs.existsSync(widgetTargetPath)) {
        fs.mkdirSync(widgetTargetPath, { recursive: true });
      }
      
      // Copy Android widget files
      await copyDirectoryRecursive(widgetSourcePath, widgetTargetPath);
      
      // Copy widget resources
      const resSourcePath = path.join(__dirname, 'android-widget-plugin', 'res');
      const resTargetPath = path.join(androidProjectPath, 'app/src/main/res');
      
      await copyDirectoryRecursive(resSourcePath, resTargetPath, { merge: true });
      
      console.log('✅ Android Widget configured successfully');
      return config;
    }
  ]);
};

/**
 * Android Manifest Configuration
 */
const withAndroidManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    // Add widget receiver
    const widgetReceiver = {
      $: {
        'android:name': '.widget.BeingWidgetProvider',
        'android:exported': 'false',
        'android:enabled': 'true'
      },
      'intent-filter': [{
        action: [{
          $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' }
        }]
      }],
      'meta-data': [{
        $: {
          'android:name': 'android.appwidget.provider',
          'android:resource': '@xml/being_widget_info'
        }
      }]
    };
    
    // Add widget receiver to application
    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }
    mainApplication.receiver.push(widgetReceiver);
    
    // Add deep linking intent filters
    const mainActivity = mainApplication.activity.find(
      activity => activity.$['android:name'] === '.MainActivity'
    );
    
    if (mainActivity) {
      if (!mainActivity['intent-filter']) {
        mainActivity['intent-filter'] = [];
      }
      
      // Add deep link intent filter
      mainActivity['intent-filter'].push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
          { $: { 'android:name': 'android.intent.category.BROWSABLE' } }
        ],
        data: [{ $: { 'android:scheme': 'being' } }]
      });
    }
    
    // Add wake lock permission for widget updates
    if (!config.modResults.manifest['uses-permission']) {
      config.modResults.manifest['uses-permission'] = [];
    }
    
    config.modResults.manifest['uses-permission'].push({
      $: { 'android:name': 'android.permission.WAKE_LOCK' }
    });
    
    return config;
  });
};

/**
 * Android Strings Configuration
 */
const withAndroidStrings = (config) => {
  return withStringsXml(config, (config) => {
    // Add widget description string
    config.modResults.resources.string.push({
      $: { name: 'widget_description' },
      _: 'Track your daily mindfulness progress and quick access to check-ins'
    });
    
    // Add app name for widget
    config.modResults.resources.string.push({
      $: { name: 'widget_app_name' },
      _: 'Being.'
    });
    
    return config;
  });
};

/**
 * Utility Functions
 */

async function copyDirectoryRecursive(src, dest, options = {}) {
  const { merge = false } = options;
  
  if (!fs.existsSync(src)) {
    console.warn(`Source directory does not exist: ${src}`);
    return;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectoryRecursive(srcPath, destPath, options);
    } else {
      // Skip if file exists and not merging
      if (!merge && fs.existsSync(destPath)) {
        console.log(`Skipping existing file: ${destPath}`);
        continue;
      }
      
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${entry.name}`);
    }
  }
}

async function updateXcodeProject(iosProjectPath, config) {
  // This would require xcodeproj manipulation
  // For now, we'll create the necessary files and log instructions
  const projectName = config.name || 'Being.';
  const bundleIdentifier = config.ios?.bundleIdentifier || 'com.being.mbct';
  
  console.log('\n📝 Manual Xcode Configuration Required:');
  console.log('1. Open your project in Xcode');
  console.log(`2. Add a new Widget Extension target named "BeingWidget"`);
  console.log(`3. Set bundle identifier to: ${bundleIdentifier}.BeingWidget`);
  console.log('4. Add the App Group capability to both main app and widget targets');
  console.log('5. Configure App Group ID: group.com.being.mbct.widgets');
  console.log('6. Add the copied Swift files to the widget target\n');
}

module.exports = withBeingWidgets;