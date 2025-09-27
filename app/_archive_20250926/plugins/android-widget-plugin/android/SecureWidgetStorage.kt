package com.fullmind.widget.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import org.json.JSONObject
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecureWidgetStorage(private val context: Context) {
    
    companion object {
        private const val KEYSTORE_ALIAS = "FullMindWidgetKey"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_IV_LENGTH = 12
        private const val GCM_TAG_LENGTH = 16
        private const val PREFS_NAME = "secure_widget_data"
        private const val KEY_ENCRYPTED_DATA = "encrypted_widget_package"
    }
    
    private val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
    private var encryptedPrefs: android.content.SharedPreferences? = null
    
    init {
        generateKeyIfNeeded()
        initializeEncryptedPrefs()
    }
    
    fun storeWidgetData(data: ByteArray): Boolean {
        return try {
            val encryptedData = encryptData(data)
            val integrityHash = calculateIntegrityHash(data)
            
            val storagePackage = WidgetStoragePackage(
                encryptedData = encryptedData,
                integrity = integrityHash,
                timestamp = System.currentTimeMillis()
            )
            
            // Try encrypted SharedPreferences first
            encryptedPrefs?.let { prefs ->
                try {
                    prefs.edit()
                        .putString(KEY_ENCRYPTED_DATA, storagePackage.toJson())
                        .apply()
                    return true
                } catch (e: Exception) {
                    android.util.Log.w("SecureWidgetStorage", "EncryptedSharedPreferences failed, using keystore: ${e.message}")
                }
            }
            
            // Fallback to manual keystore encryption
            val regularPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            regularPrefs.edit()
                .putString(KEY_ENCRYPTED_DATA, storagePackage.toJson())
                .apply()
                
            true
        } catch (e: Exception) {
            android.util.Log.e("SecureWidgetStorage", "Failed to store widget data", e)
            false
        }
    }
    
    fun retrieveWidgetData(): ByteArray? {
        return try {
            val packageJson = encryptedPrefs?.getString(KEY_ENCRYPTED_DATA, null) 
                ?: context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .getString(KEY_ENCRYPTED_DATA, null)
                ?: return null
            
            val storagePackage = WidgetStoragePackage.fromJson(packageJson)
            val decryptedData = decryptData(storagePackage.encryptedData)
            
            // Verify integrity
            val expectedHash = calculateIntegrityHash(decryptedData)
            if (expectedHash != storagePackage.integrity) {
                android.util.Log.w("SecureWidgetStorage", "Integrity check failed")
                return null
            }
            
            decryptedData
        } catch (e: Exception) {
            android.util.Log.e("SecureWidgetStorage", "Failed to retrieve widget data", e)
            null
        }
    }
    
    private fun initializeEncryptedPrefs() {
        try {
            val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
            
            encryptedPrefs = EncryptedSharedPreferences.create(
                "${PREFS_NAME}_encrypted",
                masterKeyAlias,
                context,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
            
            android.util.Log.d("SecureWidgetStorage", "EncryptedSharedPreferences initialized")
        } catch (e: Exception) {
            android.util.Log.w("SecureWidgetStorage", "EncryptedSharedPreferences not available: ${e.message}")
            encryptedPrefs = null
        }
    }
    
    private fun generateKeyIfNeeded() {
        if (!keyStore.containsAlias(KEYSTORE_ALIAS)) {
            val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
            val keyGenParameterSpec = KeyGenParameterSpec.Builder(
                KEYSTORE_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUserAuthenticationRequired(false)
                .setRandomizedEncryptionRequired(true)
                .build()
                
            keyGenerator.init(keyGenParameterSpec)
            keyGenerator.generateKey()
            
            android.util.Log.d("SecureWidgetStorage", "New encryption key generated")
        }
    }
    
    private fun encryptData(data: ByteArray): ByteArray {
        val secretKey = keyStore.getKey(KEYSTORE_ALIAS, null) as SecretKey
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey)
        
        val encryptedData = cipher.doFinal(data)
        val iv = cipher.iv
        
        // Combine IV and encrypted data
        return iv + encryptedData
    }
    
    private fun decryptData(encryptedDataWithIv: ByteArray): ByteArray {
        val iv = encryptedDataWithIv.sliceArray(0 until GCM_IV_LENGTH)
        val encryptedData = encryptedDataWithIv.sliceArray(GCM_IV_LENGTH until encryptedDataWithIv.size)
        
        val secretKey = keyStore.getKey(KEYSTORE_ALIAS, null) as SecretKey
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val gcmParameterSpec = GCMParameterSpec(GCM_TAG_LENGTH * 8, iv)
        cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmParameterSpec)
        
        return cipher.doFinal(encryptedData)
    }
    
    private fun calculateIntegrityHash(data: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256")
        return digest.digest(data).fold("") { str, byte -> str + "%02x".format(byte) }
    }
    
    // Health check methods
    fun performHealthCheck(): WidgetSecurityHealth {
        return try {
            // Test encryption/decryption with sample data
            val testData = "health_check_${System.currentTimeMillis()}".toByteArray()
            val success = storeWidgetData(testData) && 
                         retrieveWidgetData()?.let { it.contentEquals(testData) } == true
            
            WidgetSecurityHealth(
                keystoreAvailable = keyStore.containsAlias(KEYSTORE_ALIAS),
                encryptedPrefsAvailable = encryptedPrefs != null,
                encryptionWorking = success,
                lastCheck = System.currentTimeMillis()
            )
        } catch (e: Exception) {
            WidgetSecurityHealth(
                keystoreAvailable = false,
                encryptedPrefsAvailable = false,
                encryptionWorking = false,
                lastCheck = System.currentTimeMillis(),
                error = e.message
            )
        }
    }
}

data class WidgetStoragePackage(
    val encryptedData: ByteArray,
    val integrity: String,
    val timestamp: Long
) {
    fun toJson(): String {
        return JSONObject().apply {
            put("encryptedData", android.util.Base64.encodeToString(encryptedData, android.util.Base64.DEFAULT))
            put("integrity", integrity)
            put("timestamp", timestamp)
        }.toString()
    }
    
    companion object {
        fun fromJson(json: String): WidgetStoragePackage {
            val jsonObj = JSONObject(json)
            return WidgetStoragePackage(
                encryptedData = android.util.Base64.decode(jsonObj.getString("encryptedData"), android.util.Base64.DEFAULT),
                integrity = jsonObj.getString("integrity"),
                timestamp = jsonObj.getLong("timestamp")
            )
        }
    }
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as WidgetStoragePackage

        if (!encryptedData.contentEquals(other.encryptedData)) return false
        if (integrity != other.integrity) return false
        if (timestamp != other.timestamp) return false

        return true
    }

    override fun hashCode(): Int {
        var result = encryptedData.contentHashCode()
        result = 31 * result + integrity.hashCode()
        result = 31 * result + timestamp.hashCode()
        return result
    }
}

data class WidgetSecurityHealth(
    val keystoreAvailable: Boolean,
    val encryptedPrefsAvailable: Boolean,
    val encryptionWorking: Boolean,
    val lastCheck: Long,
    val error: String? = null
) {
    val isHealthy: Boolean
        get() = keystoreAvailable && encryptionWorking
        
    val securityLevel: String
        get() = when {
            encryptedPrefsAvailable && encryptionWorking -> "HIGH"
            keystoreAvailable && encryptionWorking -> "MEDIUM"  
            else -> "LOW"
        }
}