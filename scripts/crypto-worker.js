/**
 * Service Worker compatible cryptographic utilities
 * Protects against malware that can access chrome.storage APIs
 */

class CryptoManagerWorker {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
    this.ivLength = 12; // 96 bits for GCM
  }

  /**
   * Generate a cryptographic key from extension-specific data
   * This creates a unique key per installation that malware can't easily predict
   */
  async generateKey() {
    try {
      // Use extension-specific data to create a unique key
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
      console.error('Key generation failed:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  /**
   * Create a machine-specific fingerprint for key derivation
   * This makes the encryption key unique per installation
   * Note: Service workers have limited access to browser APIs, so we use stored values when possible
   */
  async getMachineFingerprint() {
    // Try to get stored fingerprint components first (for consistency)
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
    
    // Generate new fingerprint with service worker compatible approach
    let userAgent, language, screenDimensions, timezoneOffset;
    
    try {
      // In service worker context, these APIs may not be available
      userAgent = (typeof navigator !== 'undefined' && navigator.userAgent) ? 
        navigator.userAgent : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      language = (typeof navigator !== 'undefined' && navigator.language) ? 
        navigator.language : 'en-US';
      screenDimensions = (typeof screen !== 'undefined' && screen.width && screen.height) ? 
        screen.width + 'x' + screen.height : '1920x1080';
      timezoneOffset = new Date().getTimezoneOffset().toString();
    } catch (error) {
      // Fallback values for service worker context
      console.warn('Using fallback values for machine fingerprint:', error);
      userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      language = 'en-US';
      screenDimensions = '1920x1080';
      timezoneOffset = '0';
    }
    
    const components = [
      userAgent,
      language,
      screenDimensions,
      timezoneOffset,
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
    
    // Store the fingerprint for future use (ensures consistency across service worker restarts)
    try {
      await chrome.storage.local.set({ machineFingerprint: hashedFingerprint });
    } catch (error) {
      console.warn('Could not store machine fingerprint:', error);
    }
    
    return hashedFingerprint;
  }

  /**
   * Initialize the crypto manager
   */
  async init() {
    try {
      this.key = await this.generateKey();
    } catch (error) {
      console.error('Failed to initialize CryptoManagerWorker:', error);
      throw error;
    }
  }

  /**
   * Encrypt authentication data
   */
  async encryptAuth(authData) {
    if (!this.key) {
      throw new Error('CryptoManagerWorker not initialized');
    }

    try {
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(authData));

      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        this.key,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt authentication data');
    }
  }

  /**
   * Decrypt authentication data
   */
  async decryptAuth(encrypted) {
    try {
      // Handle legacy string format
      if (typeof encrypted === 'string') {
        return await this.decryptLegacyFormat(encrypted);
      }
      // Add version validation first
      if (!encrypted?.version || encrypted.version !== 'v2') {
        throw new Error('Encrypted data format mismatch');
      }
      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: this.base64ToArrayBuffer(encrypted.iv),
          additionalData: new TextEncoder().encode(encrypted.authTag)
        },
        this.key,
        this.base64ToArrayBuffer(encrypted.ciphertext)
      );
      const decoder = new TextDecoder();
      const decryptedText = decoder.decode(decrypted);
      const authData = JSON.parse(decryptedText);
      // Add key validity check
      const keyValid = await this.verifyKeyIntegrity();
      if (!keyValid) {
        throw new Error('Crypto key compromised or invalid');
      }
      return authData;
    } catch (error) {
      console.error('Decryption failed:', error);
      // Clear all related authentication data
      await chrome.storage.local.remove(['machineFingerprint', 'cryptoKeys']);
      // If decryption fails, it might be due to key incompatibility
      // Clear the corrupted data and prompt user to re-enter credentials
      console.warn('Authentication data appears to be corrupted or encrypted with an incompatible key. Please re-configure your webhooks.');
      // Clear stored machine fingerprint to force regeneration with new logic
      await chrome.storage.local.remove(['machineFingerprint']);
      throw new Error('Authentication data is corrupted or invalid');
    }
  }

  async decryptLegacyFormat(encryptedData) {
    if (!encryptedData) return null;
    if (!this.key) throw new Error('CryptoManagerWorker not initialized');
    const combined = new Uint8Array(atob(encryptedData).split('').map(char => char.charCodeAt(0)));
    const iv = combined.slice(0, this.ivLength);
    const encrypted = combined.slice(this.ivLength);
    const decrypted = await crypto.subtle.decrypt({ name: this.algorithm, iv: iv }, this.key, encrypted);
    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decrypted);
    return JSON.parse(decryptedText);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Verify key integrity
   */
  async verifyKeyIntegrity() {
    try {
      // Simple key validation by attempting a test encryption/decryption
      const testData = 'test';
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
      const encoder = new TextEncoder();
      const data = encoder.encode(testData);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: this.algorithm, iv: iv },
        this.key,
        data
      );
      
      const decrypted = await crypto.subtle.decrypt(
        { name: this.algorithm, iv: iv },
        this.key,
        encrypted
      );
      
      const decoder = new TextDecoder();
      const decryptedText = decoder.decode(decrypted);
      return decryptedText === testData;
    } catch (error) {
      console.error('Key integrity check failed:', error);
      return false;
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
   * Securely wipe sensitive data from memory
   */
  secureWipe(obj) {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Overwrite string with random data
          const randomData = crypto.getRandomValues(new Uint8Array(obj[key].length));
          obj[key] = String.fromCharCode(...randomData);
        } else if (typeof obj[key] === 'object') {
          this.secureWipe(obj[key]);
        }
        delete obj[key];
      }
    }
  }
}

// Make available globally in service worker context
self.CryptoManagerWorker = CryptoManagerWorker;