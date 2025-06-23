// Background service worker for Webhook Quick Trigger extension

// Import service worker compatible crypto utilities
importScripts('scripts/crypto-worker.js');

// Initialize crypto manager for service worker
let cryptoManager;

async function initializeCryptoManager() {
  if (!cryptoManager) {
    cryptoManager = new CryptoManagerWorker();
    await cryptoManager.init();
  }
}

// Ensure crypto manager is initialized on script load
(async () => {
  try {
    await initializeCryptoManager();
  } catch (error) {
    console.error('Failed to initialize crypto manager:', error);
  }
})();

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  
  // Initialize default storage if empty
  chrome.storage.sync.get(['webhooks', 'settings'], (result) => {
    if (!result.webhooks) {
      chrome.storage.sync.set({
        webhooks: [],
        settings: {
          defaultTimeout: 30000,
          showNotifications: true,
          theme: 'light'
        }
      });
    }
  });
});

// Handle extension icon click to open sidebar
chrome.action.onClicked.addListener(async (tab) => {
  // Open the side panel
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Handle webhook execution requests from sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executeWebhook') {
    executeWebhook(request.webhook, request.payload, request.fileData, request.testMode)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'validateWebhook') {
    validateWebhookUrl(request.url)
      .then(isValid => sendResponse({ valid: isValid }))
      .catch(() => sendResponse({ valid: false }));
    return true;
  }
});

// Execute webhook with proper error handling
async function executeWebhook(webhook, payload, fileData = null, testMode = false) {
  try {
    // Ensure crypto manager is initialized
    await initializeCryptoManager();
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add authentication headers if configured
    if (webhook.auth && webhook.auth.type !== 'none') {
      let authData = webhook.auth;
      
      // Decrypt authentication data if it's encrypted
      if (webhook.auth.encrypted) {
        try {
          authData = await cryptoManager.decryptAuth(webhook.auth.encrypted);
          if (!authData) {
            throw new Error('Failed to decrypt authentication data');
          }
        } catch (error) {
          console.error('Authentication decryption failed:', error);
          // Clear any encrypted data that can't be decrypted (likely due to key incompatibility)
          console.warn('Clearing incompatible encrypted authentication data for webhook:', webhook.name);
          // Remove the corrupted encrypted auth data
          if (webhook.auth) {
            delete webhook.auth.encrypted;
            webhook.auth.type = 'none';
          } else {
            webhook.auth = { type: 'none' };
          }
          // Continue execution without authentication
          authData = null;
          
          // Save the updated webhook configuration
           const webhooks = await chrome.storage.sync.get(['webhooks']);
           if (webhooks.webhooks) {
             const updatedWebhooks = webhooks.webhooks.map(w => 
               w.name === webhook.name ? webhook : w
             );
             await chrome.storage.sync.set({ webhooks: updatedWebhooks });
           }
           
           // Clear stored machine fingerprint to force regeneration with new logic
           await chrome.storage.local.remove(['machineFingerprint']);
           
           // Show notification about corrupted auth data
           chrome.notifications.create({
             type: 'basic',
             iconUrl: 'icons/icon48.png',
             title: 'Authentication Reset',
             message: `Authentication data for "${webhook.name}" was corrupted and has been reset. Please reconfigure.`
           });
        }
      }
      
      // Only apply authentication if authData is valid
      if (authData && authData.type && authData.type !== 'none') {
        switch (authData.type) {
          case 'bearer':
            if (authData.token) {
              headers['Authorization'] = `Bearer ${authData.token}`;
            }
            break;
          case 'basic':
            if (authData.username && authData.password) {
              const credentials = btoa(`${authData.username}:${authData.password}`);
              headers['Authorization'] = `Basic ${credentials}`;
            }
            break;
          case 'apikey':
            if (authData.apiKey) {
              headers[authData.headerName || 'X-API-Key'] = authData.apiKey;
            }
            break;
        }
        
        // Secure wipe of decrypted auth data from memory
        if (authData !== webhook.auth) {
          cryptoManager.secureWipe(JSON.stringify(authData));
        }
      }
    }
    
    // In test mode, just validate the request structure
    if (testMode) {
      return {
        status: 200,
        statusText: 'Test Mode - Request Valid',
        headers: headers,
        data: { message: 'Test mode: Request structure is valid', payload },
        responseTime: 0
      };
    }
    
    // Start timing the request
    const startTime = Date.now();
    
    // Prepare request body based on whether file data is present
    let requestBody;
    let requestHeaders = { ...headers };
    
    if (fileData && webhook.method !== 'GET') {
      // Handle file upload
      if (fileData.encoding === 'binary') {
        // For binary files, use FormData
        const formData = new FormData();
        
        // Add file
        const blob = new Blob([fileData.content], { type: fileData.type });
        formData.append(fileData.parameterName, blob, fileData.name);
        
        // Add payload as JSON if present
        if (payload) {
          formData.append('payload', JSON.stringify(payload));
        }
        
        // Add file metadata if configured
        if (fileData.metadata) {
          formData.append('fileMetadata', JSON.stringify(fileData.metadata));
        }
        
        requestBody = formData;
        // Remove Content-Type header to let browser set it with boundary
        delete requestHeaders['Content-Type'];
      } else {
        // For base64 or text files, include in JSON payload
        const combinedPayload = {
          ...payload,
          [fileData.parameterName]: {
            content: fileData.content,
            name: fileData.name,
            type: fileData.type,
            size: fileData.size,
            encoding: fileData.encoding
          }
        };
        
        // Add metadata if configured
        if (fileData.metadata) {
          combinedPayload[fileData.parameterName].metadata = fileData.metadata;
        }
        
        requestBody = JSON.stringify(combinedPayload);
      }
    } else {
      // Regular JSON payload
      requestBody = webhook.method !== 'GET' ? JSON.stringify(payload) : undefined;
    }
    
    const response = await fetch(webhook.url, {
      method: webhook.method || 'POST',
      headers: requestHeaders,
      body: requestBody
    });
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    const responseData = await response.text();
    let parsedData;
    
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }
    
    const result = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: parsedData,
      responseTime: responseTime
    };
    
    // Show notification if enabled
    const settings = await chrome.storage.sync.get('settings');
    if (settings.settings?.showNotifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Webhook Triggered',
        message: `${webhook.name}: ${response.status} ${response.statusText}`
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('Webhook execution failed:', error);
    throw new Error(`Failed to execute webhook: ${error.message}`);
  }
}

// Validate webhook URL format
async function validateWebhookUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

// Handle storage changes and sync across devices
chrome.storage.onChanged.addListener((changes, namespace) => {
  // Storage change listener for sync namespace
});