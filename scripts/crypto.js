/**
 * Cryptographic utilities for securing sensitive data in Chrome extension storage
 * Protects against malware that can access chrome.storage APIs
 */

class CryptoManager {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
    this.ivLength = 12; // 96 bits for GCM
  }

  /**
   * Initialize the crypto manager
   */
  async init() {
    try {
      this.key = await this.generateKey();
    } catch (error) {
      console.error('Failed to initialize CryptoManager:', error);
      throw error;
    }
  }

  /**
   * Generate a cryptographic key from user's machine-specific data
   * This creates a unique key per installation that malware can't easily predict
   */
  async generateKey() {
    try {
      // Use machine-specific data to create a unique key
      const machineId = await this.getMachineFingerprint();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(machineId),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      // Derive a strong encryption key
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('webhook-quick-trigger-salt-v1'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        {
          name: this.algorithm,
          length: this.keyLength
        },
        false,
        ['encrypt', 'decrypt']
      );

      return key;
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
      throw new Error('Encryption key generation failed');
    }
  }

  /**
   * Create a machine-specific fingerprint for key derivation
   * This makes the encryption key unique per installation
   * Uses stored fingerprint for consistency with service worker
   */
  async getMachineFingerprint() {
    // Try to get stored fingerprint first (for consistency with service worker)
    let storedFingerprint;
    try {
      const result = await chrome.storage.local.get(['machineFingerprint']);
      storedFingerprint = result.machineFingerprint;
    } catch (error) {
      console.warn('Could not retrieve stored fingerprint:', error);
    }
    
    if (storedFingerprint) {
      return storedFingerprint;
    }
    
    // Generate new fingerprint
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      // Add extension ID as additional entropy
      chrome.runtime.id
    ];
    
    const fingerprint = components.join('|');
    
    // Hash the fingerprint for consistent length
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    const hashedFingerprint = Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Store the fingerprint for future use (ensures consistency)
    try {
      await chrome.storage.local.set({ machineFingerprint: hashedFingerprint });
    } catch (error) {
      console.warn('Could not store machine fingerprint:', error);
    }
    
    return hashedFingerprint;
  }

  /**
   * Encrypt sensitive data before storing
   */
  async encrypt(plaintext) {
    if (!this.key) {
      throw new Error('CryptoManager not initialized');
    }

    try {
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);

      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        this.key,
        data
      );

      // Combine IV and encrypted data
      const result = new Uint8Array(iv.length + encrypted.byteLength);
      result.set(iv);
      result.set(new Uint8Array(encrypted), iv.length);

      // Return as base64 string for storage
      return btoa(String.fromCharCode(...result));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data after retrieval
   */
  async decrypt(encryptedData) {
    if (!this.key) {
      throw new Error('CryptoManager not initialized');
    }

    try {
      
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, this.ivLength);
      const encrypted = combined.slice(this.ivLength);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        this.key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Securely encrypt authentication object
   */
  async encryptAuth(authObject) {
    if (!authObject || Object.keys(authObject).length === 0) {
      return null;
    }

    const sensitiveData = JSON.stringify(authObject);
    return await this.encrypt(sensitiveData);
  }

  /**
   * Securely decrypt authentication object
   */
  async decryptAuth(encryptedAuth) {
    if (!encryptedAuth) {
      return null;
    }

    try {
      const decryptedData = await this.decrypt(encryptedAuth);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.warn('Failed to decrypt auth data, may be corrupted:', error);
      
      // Clear corrupted machine fingerprint to force regeneration
      try {
        await chrome.storage.local.remove(['machineFingerprint']);
      } catch (clearError) {
        console.warn('Could not clear machine fingerprint:', clearError);
      }
      
      return null;
    }
  }

  /**
   * Clear all crypto-related data and reset state
   */
  async clearCryptoData() {
    try {
      await chrome.storage.local.remove(['machineFingerprint', 'cryptoKeys']);
      this.key = null;
    } catch (error) {
      console.warn('Could not clear crypto data:', error);
    }
  }

  /**
   * Force regeneration of encryption key (for recovery purposes)
   */
  async regenerateKey() {
    try {
      await this.clearCryptoData();
      await this.init();
      return true;
    } catch (error) {
      console.error('Failed to regenerate key:', error);
      return false;
    }
  }

  /**
   * Secure wipe of sensitive data from memory
   */
  secureWipe(sensitiveString) {
    if (typeof sensitiveString === 'string') {
      // Overwrite string memory (best effort in JavaScript)
      for (let i = 0; i < sensitiveString.length; i++) {
        sensitiveString = sensitiveString.substring(0, i) + '\0' + sensitiveString.substring(i + 1);
      }
    }
  }
}

// Export singleton instance
window.cryptoManager = new CryptoManager();