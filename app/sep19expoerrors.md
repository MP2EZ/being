iOS Bundled 46ms index.ts (1 module)
 LOG  Tier configuration validated: free
 LOG  Tier configuration validated: premium
 LOG  Tier configuration validated: clinical
 LOG  Emergency protocols initialized
 LOG  🔐 Initializing Being. encryption service...
 ERROR  Crypto validation failed: [TypeError: Cannot read property 'generateKey' of undefined]
 LOG  Supabase HIPAA client initialized successfully
 LOG  [CloudMonitoring] Starting monitoring services...
 WARN  [CloudMonitoring] COMPLIANCE ALERT: {"issues": ["HIPAA compliance mode is development", "Data retention period 30 days is not compliant"], "status": {"auditTrailActive": true, "dataRetentionCompliant": false, "encryptionActive": true, "hipaaCompliant": false, "issues": ["HIPAA compliance mode is development", "Data retention period 30 days is not compliant"], "regionCompliant": true, "rlsPoliciesActive": true, "timestamp": "2025-09-19T08:48:41.648Z"}, "timestamp": "2025-09-19T08:48:41.648Z", "type": "compliance_violation"}
 LOG  [CloudMonitoring] Audit Trail: {"alertData": {"issues": ["HIPAA compliance mode is development", "Data retention period 30 days is not compliant"], "status": {"auditTrailActive": true, "dataRetentionCompliant": false, "encryptionActive": true, "hipaaCompliant": false, "issues": [Array], "regionCompliant": true, "rlsPoliciesActive": true, "timestamp": "2025-09-19T08:48:41.648Z"}, "timestamp": "2025-09-19T08:48:41.648Z", "type": "compliance_violation"}, "alertType": "compliance", "timestamp": "2025-09-19T08:48:41.651Z", "type": "monitoring_alert"}
 LOG  [CostMonitoring] Starting cost monitoring for development...
 LOG  🔐 Initializing Being. encryption service...
 ERROR  Crypto validation failed: [TypeError: Cannot read property 'generateKey' of undefined]
 LOG  Registering device for user temp_user
 LOG  🔐 Initializing Being. encryption service...
 ERROR  Crypto validation failed: [TypeError: Cannot read property 'generateKey' of undefined]
 LOG  Registering device for user temp_user
 LOG  Multi-layer encryption framework initialized
 LOG  Crisis safety security system initialized
 LOG  Queue key management initialized
 LOG  Queue audit encryption initialized
 ERROR  ❌ Failed to initialize encryption service: [Error: Device does not support required cryptographic operations]
 ERROR  ❌ Failed to initialize encryption service: [Error: Device does not support required cryptographic operations]
 ERROR  ❌ Failed to initialize encryption service: [Error: Device does not support required cryptographic operations]
 LOG  Cross-device queue security initialized
 LOG  HIPAA queue encryption initialized
 ERROR  Encrypted data store initialization failed: [Error: Device does not support required encryption - app cannot secure data]
 LOG  Real-time security monitoring started
 ERROR  Security Manager initialization failed: [Error: Device does not support required encryption - app cannot secure data]
 ERROR  Security Manager initialization failed: [Error: Device does not support required encryption - app cannot secure data]
 LOG  Payment Sync Security Resilience Service initialized successfully
 LOG  Payment Sync Security Resilience Service initialized successfully
 LOG  [HIPAA AUDIT] {"details": {"event": "INITIAL_SESSION", "featureFlagsEnabled": false, "hasSession": false, "region": "us-east-1", "sessionId": null, "userId": null}, "operation": "AUTH_STATE_CHANGE", "timestamp": "2025-09-19T08:48:41.856Z"}
 LOG  HIPAA compliance system initialized
 LOG  Auth state change: INITIAL_SESSION false
 LOG  [AUTH AUDIT] {"context": {"app_version": "1.0.0-dev", "device_bound": false, "emergency_access": false, "error_message": undefined, "event": "INITIAL_SESSION", "platform": "ios"}, "device_id": null, "entity_id": null, "entity_type": "authentication", "error_code": null, "hipaa_compliant": true, "operation": "AUTH_INITIAL_SESSION", "result": "success", "timestamp": "2025-09-19T08:48:41.867Z", "user_id": null}
 LOG  Crisis Performance Guardian initialized with performance guarantees
 WARN  Zero-knowledge sync not ready: encryption service not prepared
 LOG  Session Security Service initialized
 WARN  Zero-PII validation: encryption service not ready
 LOG  Zero-PII validation framework initialized
 LOG  Device Trust Manager initialized successfully
 LOG  Crisis encryption keys initialized
 LOG  Crisis queue security initialized
 LOG  Loading critical assets for offline availability...
 ERROR  Payment encryption initialization failed: [Error: Calling the 'setValueWithKeyAsync' function has failed
→ Caused by: You must set `NSFaceIDUsageDescription` in your Info.plist file to use the `requireAuthentication` option]
 ERROR  Payment security initialization failed: [Error: Cannot initialize payment security]
 ERROR  Cross-device sync encryption initialization failed: [Error: Zero-knowledge encryption not enabled]
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 ERROR  Payment encryption initialization failed: [Error: Calling the 'setValueWithKeyAsync' function has failed
→ Caused by: You must set `NSFaceIDUsageDescription` in your Info.plist file to use the `requireAuthentication` option]
 ERROR  Payment security initialization failed: [Error: Cannot initialize payment security]
 ERROR  Cross-device sync encryption initialization failed: [Error: Zero-knowledge encryption not enabled]
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  Feature flag cloudSyncEnabled disabled by system
 LOG  Feature flag cloudSyncEnabled disabled by system
 LOG  Crisis Authentication Service initialized
 LOG  Offline queue encryption initialized
 LOG  Cloud services cleared
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  Cloud services cleared
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  Security action not implemented: disable_cross_device_sync
 LOG  Security action not implemented: enable_local_only_mode
 WARN  Security violation recorded: policy_violation - Cross-device encryption initialization failed: Error: Zero-knowledge encryption not enabled
 LOG  Supabase Auth Service initialized successfully
 LOG  Security action not implemented: disable_cross_device_sync
 LOG  Security action not implemented: enable_local_only_mode
 WARN  Security violation recorded: policy_violation - Cross-device encryption initialization failed: Error: Zero-knowledge encryption not enabled
 LOG  Security action not implemented: disable_cloud_features
 LOG  Security action not implemented: enable_offline_mode
 WARN  Security violation recorded: policy_violation - Emergency mode activated: Initialization failed: Error: Device does not support required encryption - app cannot secure data
 LOG  Enhanced OfflineQueueService initialized successfully
 LOG  Security action not implemented: disable_cloud_features
 LOG  Security action not implemented: enable_offline_mode
 WARN  Security violation recorded: policy_violation - Emergency mode activated: Initialization failed: Error: Device does not support required encryption - app cannot secure data
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  Feature flag service initialized with security validation
 WARN  Biometric authentication not available - falling back to PIN
 LOG  Authentication Security Service initialized
 LOG  Consent & Privacy Service initialized
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  ✅ Offline crisis resources initialized successfully
 LOG  Background initialization started
 LOG  Feature flag realTimeSync disabled by system
 ERROR  Warning: TypeError: loadUser is not a function (it is undefined)

This error is located at:

  28 |
  29 | const RootNavigator: React.FC = () => {
> 30 |   const { user, isLoading, loadUser, isOnboardingComplete } = useUserStore();
     |                                                                           ^
  31 |
  32 |   useEffect(() => {
  33 |     loadUser();

Call Stack
  RootNavigator (src/navigation/RootNavigator.tsx:30:75)
  RNCSafeAreaProvider (<anonymous>)
  App (App.tsx:19:47)
 LOG  Feature flag realTimeSync disabled by system
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 ERROR  Failed to persist device trust profile: [Error: Calling the 'setValueWithKeyAsync' function has failed
→ Caused by: You must set `NSFaceIDUsageDescription` in your Info.plist file to use the `requireAuthentication` option]
 LOG  Device registration completed in 370ms
 ERROR  Failed to persist device trust profile: [Error: Calling the 'setValueWithKeyAsync' function has failed
→ Caused by: You must set `NSFaceIDUsageDescription` in your Info.plist file to use the `requireAuthentication` option]
 LOG  Device registration completed in 358ms
 LOG  [HIPAA AUDIT] {"details": {"error": "Network request failed", "featureFlagsEnabled": false, "region": "us-east-1", "sessionId": null, "url": "https://dev-project-ref.supabase.co/rest/v1/health_check?select=id&limit=1"}, "operation": "HTTP_ERROR", "timestamp": "2025-09-19T08:48:42.045Z"}
 WARN  [CloudMonitoring] PERFORMANCE ALERT: {"latency": 399, "threshold": 200, "timestamp": "2025-09-19T08:48:41.646Z", "type": "crisis_response_threshold_exceeded"}
 LOG  [CloudMonitoring] Audit Trail: {"alertData": {"latency": 399, "threshold": 200, "timestamp": "2025-09-19T08:48:41.646Z", "type": "crisis_response_threshold_exceeded"}, "alertType": "performance", "timestamp": "2025-09-19T08:48:42.045Z", "type": "monitoring_alert"}
 WARN  [CloudMonitoring] HEALTH ALERT: {"error": "TypeError: Network request failed", "service": "supabase", "status": "offline", "timestamp": "2025-09-19T08:48:41.646Z", "type": "service_unhealthy"}
 LOG  [CloudMonitoring] Audit Trail: {"alertData": {"error": "TypeError: Network request failed", "service": "supabase", "status": "offline", "timestamp": "2025-09-19T08:48:41.646Z", "type": "service_unhealthy"}, "alertType": "health", "timestamp": "2025-09-19T08:48:42.046Z", "type": "monitoring_alert"}
 LOG  Feature flag remoteBackupEnabled disabled by system
 LOG  Feature flag remoteBackupEnabled disabled by system
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  Feature flag multiDeviceSync disabled by system
 LOG  Feature flag multiDeviceSync disabled by system
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  Critical assets loaded successfully
 LOG  Performing cache cleanup...
 LOG  AssetCacheService initialized successfully
 LOG  Feature flag cloudSyncEnabled disabled by system
 LOG  Feature flag analyticsEnabled disabled by system
 LOG  Cleanup complete. Removed 0 assets
 LOG  Feature flag analyticsEnabled disabled by system
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  Feature flag realTimeSync disabled by system
 LOG  Feature flag emergencyOfflineMode enabled by system
 WARN  EMERGENCY: Cloud features disabled - Initialization failed: Error: Device does not support required encryption - app cannot secure data
 ERROR  Authentication integration initialization failed: [Error: Security initialization failed: Error: Device does not support required encryption - app cannot secure data]
 LOG  Feature flag emergencyOfflineMode enabled by system
 WARN  EMERGENCY: Cloud features disabled - Initialization failed: Error: Device does not support required encryption - app cannot secure data
 ERROR  Authentication integration initialization failed: [Error: Security initialization failed: Error: Device does not support required encryption - app cannot secure data]
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  Feature flag remoteBackupEnabled disabled by system
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  Feature flag multiDeviceSync disabled by system
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  Feature flag analyticsEnabled disabled by system
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  Feature flag emergencyOfflineMode enabled by system
 WARN  EMERGENCY: Cloud features disabled - Threat detected
 LOG  Executed automatic security action: disable_cloud_sync_immediately
 WARN  Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.
 LOG  Feature flag emergencyOfflineMode enabled by system
 LOG  Executed automatic security action: enable_emergency_offline_mode
 LOG  🔐 Storing master key with biometric protection: false
 ERROR  PBKDF2 key derivation failed: [TypeError: Cannot read property 'importKey' of undefined]
 ERROR  Derived key initialization failed: [Error: Cannot derive encryption key - cryptographic failure]
 ERROR  Key rotation failed: [Error: Cannot initialize encryption keys]
 ERROR  Failed to execute security action rotate_encryption_keys: [Error: Key rotation failed - security compromised]
 LOG  Security controls service initialized
 LOG  Background updates scheduled (disabled in Phase 1)
