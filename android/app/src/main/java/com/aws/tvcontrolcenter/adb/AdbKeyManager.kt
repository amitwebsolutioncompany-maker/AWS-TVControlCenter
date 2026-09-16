package com.aws.tvcontrolcenter.adb

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.io.File
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.spec.RSAKeyGenParameterSpec
import java.util.Base64

class AdbKeyManager(private val context: Context) {
    
    private val keyStore = KeyStore.getInstance("AndroidKeyStore")
    private val adbKeyDir = File(context.filesDir, "adb_keys")
    
    init {
        keyStore.load(null)
        adbKeyDir.mkdirs()
    }
    
    suspend fun generateOrGetAdbKey(): Result<String> = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        try {
            val keyAlias = "adb_private_key"
            
            if (!keyStore.containsAlias(keyAlias)) {
                generateKeyPair(keyAlias)
            }
            
            val privateKey = keyStore.getKey(keyAlias, null) as java.security.PrivateKey
            val publicKey = keyStore.getCertificate(keyAlias).publicKey
            
            // Convert to ADB format
            val publicKeyStr = "ssh-rsa ${Base64.getEncoder().encodeToString(publicKey.encoded)} adb@android"
            
            // Save to file for ADB use
            val publicKeyFile = File(adbKeyDir, "adbkey.pub")
            publicKeyFile.writeText(publicKeyStr)
            
            Result.success(publicKeyStr)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun generateKeyPair(alias: String) {
        val keyPairGenerator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_RSA,
            "AndroidKeyStore"
        )
        
        val spec = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        )
            .setKeySize(2048)
            .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
            .setDigests(KeyProperties.DIGEST_SHA256)
            .build()
        
        keyPairGenerator.initialize(spec)
        keyPairGenerator.generateKeyPair()
    }
    
    fun getPublicKeyPath(): String {
        return File(adbKeyDir, "adbkey.pub").absolutePath
    }
    
    fun getPrivateKeyPath(): String {
        return File(adbKeyDir, "adbkey").absolutePath
    }
}
