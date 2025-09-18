import Foundation
import WidgetKit
import CryptoKit

class WidgetDataManager {
    static let shared = WidgetDataManager()
    
    private let userDefaults: UserDefaults
    private let appGroupId = "group.com.fullmind.mbct.widgets"
    private let secureStorage = SecureWidgetStorage()
    
    private init() {
        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            fatalError("Unable to access App Group for widget data sharing. Ensure App Group is configured in both app and widget targets.")
        }
        self.userDefaults = defaults
    }
    
    func getCurrentData() -> FullMindWidgetData {
        do {
            // Try to get encrypted data first
            if let encryptedData = try secureStorage.retrieveWidgetData() {
                let jsonData = try JSONSerialization.jsonObject(with: encryptedData, options: [])
                if let widgetDict = jsonData as? [String: Any] {
                    return parseWidgetData(widgetDict)
                }
            }
            
            // Fallback to unencrypted data (for development)
            if let widgetDataJSON = userDefaults.string(forKey: "fullmind_widget_data"),
               let widgetDataDict = parseJSON(widgetDataJSON) {
                
                // Verify data integrity
                if verifyDataIntegrity(widgetDataDict) {
                    return parseWidgetData(widgetDataDict)
                } else {
                    print("Widget data integrity check failed")
                }
            }
            
        } catch {
            print("Failed to retrieve secure widget data: \(error)")
        }
        
        return FullMindWidgetData.placeholder()
    }
    
    func updateFromApp(jsonData: String) {
        // Store both encrypted and plain versions for reliability
        storeEncryptedData(jsonData)
        storePlainData(jsonData)
        
        // Trigger widget timeline refresh
        WidgetCenter.shared.reloadTimelines(ofKind: "FullMindWidget")
        
        print("Widget data updated at \(Date())")
    }
    
    private func storeEncryptedData(_ jsonData: String) {
        do {
            let data = jsonData.data(using: .utf8) ?? Data()
            try secureStorage.storeWidgetData(data)
        } catch {
            print("Failed to store encrypted widget data: \(error)")
        }
    }
    
    private func storePlainData(_ jsonData: String) {
        userDefaults.set(jsonData, forKey: "fullmind_widget_data")
        userDefaults.set(Date().timeIntervalSince1970, forKey: "last_update_timestamp")
    }
    
    // MARK: - Deep Linking Support
    
    func handleWidgetTap(for sessionType: String, canResume: Bool) {
        let urlString = canResume 
            ? "fullmind://checkin/\(sessionType)?resume=true"
            : "fullmind://checkin/\(sessionType)"
            
        guard let url = URL(string: urlString) else { 
            print("Invalid deep link URL: \(urlString)")
            return 
        }
        
        // Log widget interaction (privacy-safe)
        print("Widget tap: \(sessionType), resume: \(canResume)")
        
        // Open main app with deep link
        if #available(iOS 14.0, *) {
            // iOS 14+ method
            UIApplication.shared.open(url) { success in
                if !success {
                    print("Failed to open deep link: \(urlString)")
                }
            }
        }
    }
    
    func handleCrisisButton() {
        // CRITICAL: Crisis button tap MUST provide immediate intervention <200ms (CR-007)
        let startTime = Date()
        
        guard let url = URL(string: "fullmind://crisis") else {
            print("CRITICAL: Invalid crisis URL")
            openMainApp() // Immediate fallback
            return
        }
        
        print("Widget crisis button activated")
        
        if #available(iOS 14.0, *) {
            UIApplication.shared.open(url) { success in
                let responseTime = Date().timeIntervalSince(startTime) * 1000 // Convert to ms
                print("Crisis button response time: \(responseTime)ms")
                
                if responseTime > 200 {
                    print("WARNING: Crisis response time exceeded 200ms threshold")
                }
                
                if !success {
                    print("CRITICAL: Failed to open crisis intervention")
                    
                    // Fallback 1: Try main app
                    self.openMainApp()
                    
                    // Fallback 2: Try to open phone app for 988
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        if let phoneURL = URL(string: "tel://988") {
                            UIApplication.shared.open(phoneURL) { phoneSuccess in
                                if phoneSuccess {
                                    print("Emergency fallback: 988 call initiated")
                                } else {
                                    print("CRITICAL: All crisis fallbacks failed")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func openMainApp() {
        // Fallback method to open main app
        guard let url = URL(string: "fullmind://") else { return }
        UIApplication.shared.open(url)
    }
    
    // MARK: - Data Parsing and Validation
    
    private func parseJSON(_ jsonString: String) -> [String: Any]? {
        guard let data = jsonString.data(using: .utf8) else { return nil }
        
        do {
            return try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any]
        } catch {
            print("JSON parsing failed: \(error)")
            return nil
        }
    }
    
    private func parseWidgetData(_ dict: [String: Any]) -> FullMindWidgetData {
        guard let todayProgressDict = dict["todayProgress"] as? [String: Any] else {
            return FullMindWidgetData.placeholder()
        }
        
        let morningStatus = parseSessionStatus(todayProgressDict["morning"] as? [String: Any])
        let middayStatus = parseSessionStatus(todayProgressDict["midday"] as? [String: Any])
        let eveningStatus = parseSessionStatus(todayProgressDict["evening"] as? [String: Any])
        let completionPercentage = todayProgressDict["completionPercentage"] as? Int ?? 0
        
        let hasActiveCrisis = dict["hasActiveCrisis"] as? Bool ?? false
        let appVersion = dict["appVersion"] as? String ?? "1.0.0"
        
        // Parse timestamp
        let lastUpdateTime: Date
        if let timeString = dict["lastUpdateTime"] as? String {
            let formatter = ISO8601DateFormatter()
            lastUpdateTime = formatter.date(from: timeString) ?? Date()
        } else {
            lastUpdateTime = Date()
        }
        
        return FullMindWidgetData(
            morningStatus: morningStatus,
            middayStatus: middayStatus,
            eveningStatus: eveningStatus,
            completionPercentage: completionPercentage,
            hasActiveCrisis: hasActiveCrisis,
            lastUpdateTime: lastUpdateTime,
            appVersion: appVersion
        )
    }
    
    private func parseSessionStatus(_ sessionDict: [String: Any]?) -> FullMindWidgetData.SessionStatus {
        guard let sessionDict = sessionDict,
              let statusString = sessionDict["status"] as? String else {
            return .notStarted
        }
        
        switch statusString {
        case "completed":
            return .completed
        case "in_progress":
            let progress = sessionDict["progressPercentage"] as? Int ?? 0
            let canResume = sessionDict["canResume"] as? Bool ?? false
            return .inProgress(progress, canResume)
        case "skipped":
            return .skipped
        default:
            return .notStarted
        }
    }
    
    // MARK: - Privacy and Security
    
    private func verifyDataIntegrity(_ data: [String: Any]) -> Bool {
        guard let receivedHash = data["encryptionHash"] as? String else {
            print("Missing encryption hash")
            return false
        }
        
        // Create data for hash calculation (excluding the hash itself)
        var hashableData = data
        hashableData.removeValue(forKey: "encryptionHash")
        
        let calculatedHash = calculateDataHash(hashableData)
        let isValid = calculatedHash == receivedHash
        
        if !isValid {
            print("Data integrity verification failed")
            print("Expected: \(calculatedHash)")
            print("Received: \(receivedHash)")
        }
        
        return isValid
    }
    
    private func calculateDataHash(_ data: [String: Any]) -> String {
        // Sort keys for consistent hashing
        let sortedKeys = data.keys.sorted()
        let dataString = sortedKeys.map { key in
            let value = data[key]
            return "\(key):\(String(describing: value))"
        }.joined(separator: "|")
        
        let inputData = Data(dataString.utf8)
        let hashed = SHA256.hash(data: inputData)
        return hashed.compactMap { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - Secure Storage Implementation

class SecureWidgetStorage {
    private let keychain = WidgetKeychain()
    
    enum StorageError: Error {
        case encryptionFailed
        case decryptionFailed
        case integrityCheckFailed
        case keychainError
        case dataCorrupted
    }
    
    func storeWidgetData(_ data: Data) throws {
        // Get or generate encryption key
        let encryptionKey = try keychain.getOrCreateEncryptionKey()
        
        // Encrypt data
        let encryptedData = try encrypt(data: data, key: encryptionKey)
        
        // Create storage package with integrity hash
        let storagePackage = WidgetStoragePackage(
            encryptedData: encryptedData,
            integrity: calculateIntegrityHash(data),
            timestamp: Date()
        )
        
        // Store in app group
        let packageData = try JSONEncoder().encode(storagePackage)
        
        guard let userDefaults = UserDefaults(suiteName: "group.com.fullmind.mbct.widgets") else {
            throw StorageError.encryptionFailed
        }
        
        userDefaults.set(packageData, forKey: "secure_widget_data")
    }
    
    func retrieveWidgetData() throws -> Data {
        guard let userDefaults = UserDefaults(suiteName: "group.com.fullmind.mbct.widgets"),
              let packageData = userDefaults.data(forKey: "secure_widget_data") else {
            throw StorageError.decryptionFailed
        }
        
        let storagePackage = try JSONDecoder().decode(WidgetStoragePackage.self, from: packageData)
        
        // Get encryption key
        let encryptionKey = try keychain.getOrCreateEncryptionKey()
        
        // Decrypt data
        let decryptedData = try decrypt(data: storagePackage.encryptedData, key: encryptionKey)
        
        // Verify integrity
        let expectedHash = calculateIntegrityHash(decryptedData)
        guard expectedHash == storagePackage.integrity else {
            throw StorageError.integrityCheckFailed
        }
        
        return decryptedData
    }
    
    private func encrypt(data: Data, key: SymmetricKey) throws -> Data {
        do {
            let sealedBox = try AES.GCM.seal(data, using: key)
            guard let combined = sealedBox.combined else {
                throw StorageError.encryptionFailed
            }
            return combined
        } catch {
            throw StorageError.encryptionFailed
        }
    }
    
    private func decrypt(data: Data, key: SymmetricKey) throws -> Data {
        do {
            let sealedBox = try AES.GCM.SealedBox(combined: data)
            return try AES.GCM.open(sealedBox, using: key)
        } catch {
            throw StorageError.decryptionFailed
        }
    }
    
    private func calculateIntegrityHash(_ data: Data) -> String {
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - Keychain Management

class WidgetKeychain {
    private let keyAccount = "widget_encryption_key"
    
    func getOrCreateEncryptionKey() throws -> SymmetricKey {
        // Try to get existing key
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: keyAccount,
            kSecReturnData as String: true,
            kSecAttrAccessGroup as String: "group.com.fullmind.mbct.widgets"
        ]
        
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        
        if status == errSecSuccess {
            let keyData = item as! Data
            return SymmetricKey(data: keyData)
        } else if status == errSecItemNotFound {
            // Generate new key
            let newKey = SymmetricKey(size: .bits256)
            let keyData = newKey.withUnsafeBytes { Data($0) }
            
            let addQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrAccount as String: keyAccount,
                kSecValueData as String: keyData,
                kSecAttrAccessGroup as String: "group.com.fullmind.mbct.widgets"
            ]
            
            let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
            guard addStatus == errSecSuccess else {
                print("Failed to store new encryption key: \(addStatus)")
                throw SecureWidgetStorage.StorageError.keychainError
            }
            
            return newKey
        } else {
            print("Keychain error: \(status)")
            throw SecureWidgetStorage.StorageError.keychainError
        }
    }
}

// MARK: - Storage Package

struct WidgetStoragePackage: Codable {
    let encryptedData: Data
    let integrity: String
    let timestamp: Date
}