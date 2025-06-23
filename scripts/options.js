// Webhook Quick Trigger Options Page Script

class WebhookOptionsManager {
  constructor() {
    this.webhooks = [];
    this.settings = {};
    this.currentEditIndex = -1;
    this.init();
  }

  async init() {
    // Initialize crypto manager
    window.cryptoManager = new CryptoManager();
    await window.cryptoManager.init();
    
    await this.loadData();
    this.setupEventListeners();
    this.updateUI();
  }

  async loadData() {
    try {
      const result = await chrome.storage.sync.get(['webhooks', 'settings']);
      this.webhooks = result.webhooks || [];
      this.settings = result.settings || {
        defaultTimeout: 30000,
        showNotifications: true,
        theme: 'light'
      };
    } catch (error) {
      console.error('Failed to load data:', error);
      this.showMessage('Failed to load settings', 'error');
    }
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchSection(e.target.dataset.section);
      });
    });

    // Webhook management
    document.getElementById('addWebhookBtn').addEventListener('click', () => {
      this.openWebhookModal();
    });

    // Modal controls
    document.getElementById('closeModal').addEventListener('click', () => {
      this.closeWebhookModal();
    });
    document.getElementById('cancelBtn').addEventListener('click', () => {
      this.closeWebhookModal();
    });

    // Webhook form
    document.getElementById('webhookForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveWebhook();
    });

    // Auth type change
    document.getElementById('authType').addEventListener('change', (e) => {
      this.updateAuthFields(e.target.value);
    });

    // File upload toggle
    document.getElementById('enableFileUpload').addEventListener('change', (e) => {
      this.toggleFileUploadConfig(e.target.checked);
    });

    // Settings
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      this.saveSettings();
    });
    document.getElementById('resetSettingsBtn').addEventListener('click', () => {
      this.resetSettings();
    });
    document.getElementById('resetCryptoBtn').addEventListener('click', () => {
      this.resetCryptoKeys();
    });

    // Import/Export
    document.getElementById('importBtn').addEventListener('click', () => {
      this.openImportExportModal('import');
    });
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.openImportExportModal('export');
    });
    document.getElementById('closeImportExportModal').addEventListener('click', () => {
      this.closeImportExportModal();
    });
    document.getElementById('cancelImportExportBtn').addEventListener('click', () => {
      this.closeImportExportModal();
    });
    document.getElementById('executeImportExportBtn').addEventListener('click', () => {
      this.executeImportExport();
    });

    // GitHub link
    document.getElementById('githubBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/iam-niranjan/Webhook-Quick-Trigger-Chrome-Extension' });
    });

    // Webhook list button delegation
    document.getElementById('webhooksList').addEventListener('click', (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;
      
      const action = button.dataset.action;
      const index = parseInt(button.dataset.index);
      
      if (action === 'edit') {
        this.editWebhook(index);
      } else if (action === 'delete') {
        this.deleteWebhook(index);
      } else if (action === 'duplicate') {
        this.duplicateWebhook(index);
      }
    });

    // Modal backdrop clicks
    document.getElementById('webhookModal').addEventListener('click', (e) => {
      if (e.target.id === 'webhookModal') {
        this.closeWebhookModal();
      }
    });
    document.getElementById('importExportModal').addEventListener('click', (e) => {
      if (e.target.id === 'importExportModal') {
        this.closeImportExportModal();
      }
    });
  }

  switchSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === sectionName);
    });

    // Update content
    document.querySelectorAll('.section').forEach(section => {
      section.classList.toggle('active', section.id === `${sectionName}-section`);
    });
  }

  updateUI() {
    this.renderWebhooks();
    this.loadSettings();
  }

  renderWebhooks() {
    const container = document.getElementById('webhooksList');
    const emptyState = document.getElementById('webhooksEmptyState');

    if (this.webhooks.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    container.innerHTML = this.webhooks.map((webhook, index) => `
      <div class="webhook-card">
        <div class="webhook-header">
          <div class="webhook-info">
            <h3>${this.escapeHtml(webhook.name)}</h3>
            <div class="webhook-meta">
              <span class="method-badge ${webhook.method || 'POST'}">${webhook.method || 'POST'}</span>
              <span class="webhook-url">${this.escapeHtml(webhook.url)}</span>
            </div>
            ${webhook.description ? `<p class="webhook-description">${this.escapeHtml(webhook.description)}</p>` : ''}
          </div>
          <div class="webhook-actions">
            <button class="duplicate-btn" data-action="duplicate" data-index="${index}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Duplicate
            </button>
            <button class="edit-btn" data-action="edit" data-index="${index}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit
            </button>
            <button class="delete-btn" data-action="delete" data-index="${index}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2,2h4a2,2,0,0,1,2,2V6"></path>
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  loadSettings() {
    document.getElementById('defaultTimeout').value = this.settings.defaultTimeout || 30000;
    document.getElementById('showNotifications').checked = this.settings.showNotifications !== false;
    document.getElementById('theme').value = this.settings.theme || 'light';
  }

  async openWebhookModal(editIndex = -1) {
    this.currentEditIndex = editIndex;
    const modal = document.getElementById('webhookModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('webhookForm');

    title.textContent = editIndex >= 0 ? 'Edit Webhook' : 'Add Webhook';
    
    if (editIndex >= 0) {
      await this.populateWebhookForm(this.webhooks[editIndex]);
    } else {
      form.reset();
      this.updateAuthFields('none');
    }

    modal.classList.add('active');
  }

  closeWebhookModal() {
    document.getElementById('webhookModal').classList.remove('active');
    this.currentEditIndex = -1;
  }

  async populateWebhookForm(webhook) {
    document.getElementById('webhookName').value = webhook.name || '';
    document.getElementById('webhookMethod').value = webhook.method || 'POST';
    document.getElementById('webhookUrl').value = webhook.url || '';
    document.getElementById('webhookDescription').value = webhook.description || '';
    
    const authType = webhook.auth?.type || 'none';
    document.getElementById('authType').value = authType;
    this.updateAuthFields(authType);
    
    if (webhook.auth) {
      await this.populateAuthFields(webhook.auth);
    }
    
    if (webhook.defaultPayload) {
      document.getElementById('defaultPayload').value = JSON.stringify(webhook.defaultPayload, null, 2);
    }
    
    // Populate file upload configuration
    const enableFileUpload = webhook.fileUpload?.enabled || false;
    document.getElementById('enableFileUpload').checked = enableFileUpload;
    this.toggleFileUploadConfig(enableFileUpload);
    
    if (webhook.fileUpload) {
      document.getElementById('fileParameterName').value = webhook.fileUpload.parameterName || 'file';
      document.getElementById('includeFileMetadata').checked = webhook.fileUpload.includeMetadata || false;
    } else {
      // Set defaults
      document.getElementById('fileParameterName').value = 'file';
      document.getElementById('includeFileMetadata').checked = false;
    }
  }

  updateAuthFields(authType) {
    const container = document.getElementById('authFields');
    
    switch (authType) {
      case 'bearer':
        container.innerHTML = `
          <div class="form-group full-width">
            <label for="authToken">Bearer Token *</label>
            <input type="password" id="authToken" required placeholder="your-bearer-token">
          </div>
        `;
        break;
      case 'basic':
        container.innerHTML = `
          <div class="form-group">
            <label for="authUsername">Username *</label>
            <input type="text" id="authUsername" required placeholder="username">
          </div>
          <div class="form-group">
            <label for="authPassword">Password *</label>
            <input type="password" id="authPassword" required placeholder="password">
          </div>
        `;
        break;
      case 'apikey':
        container.innerHTML = `
          <div class="form-group">
            <label for="authApiKey">API Key *</label>
            <input type="password" id="authApiKey" required placeholder="your-api-key">
          </div>
          <div class="form-group">
            <label for="authHeaderName">Header Name</label>
            <input type="text" id="authHeaderName" placeholder="X-API-Key" value="X-API-Key">
          </div>
        `;
        break;
      default:
        container.innerHTML = '';
        break;
    }
  }

  toggleFileUploadConfig(enabled) {
    const configSection = document.getElementById('fileUploadConfig');
    configSection.style.display = enabled ? 'grid' : 'none';
  }

  async populateAuthFields(auth) {
    // Clear all fields first (with null checks)
    const authToken = document.getElementById('authToken');
    const authUsername = document.getElementById('authUsername');
    const authPassword = document.getElementById('authPassword');
    const authApiKey = document.getElementById('authApiKey');
    const authHeaderName = document.getElementById('authHeaderName');
    
    if (authToken) authToken.value = '';
    if (authUsername) authUsername.value = '';
    if (authPassword) authPassword.value = '';
    if (authApiKey) authApiKey.value = '';
    if (authHeaderName) authHeaderName.value = 'X-API-Key';
    
    if (!auth || auth.type === 'none') {
      return;
    }
    
    try {
      // Decrypt authentication data if it's encrypted
      let authData = auth;
      if (auth.encrypted) {
        authData = await window.cryptoManager.decryptAuth(auth.encrypted);
        if (!authData) {
          console.warn('Failed to decrypt auth data, clearing corrupted data');
          
          // Clear corrupted auth data from webhook
          const webhooks = await chrome.storage.sync.get('webhooks');
          if (webhooks.webhooks) {
            const updatedWebhooks = webhooks.webhooks.map(w => {
              if (w.name === webhook.name && w.auth && w.auth.encrypted) {
                // Clearing corrupted auth data
                return { ...w, auth: { type: 'none' } };
              }
              return w;
            });
            await chrome.storage.sync.set({ webhooks: updatedWebhooks });
          }
          
          // Show user notification
          this.showMessage('Authentication data was corrupted and has been reset. Please reconfigure authentication.', 'error');
          return;
        }
      }
      
      switch (authData.type) {
        case 'bearer':
          const tokenField = document.getElementById('authToken');
          if (tokenField) tokenField.value = authData.token || '';
          break;
        case 'basic':
          const usernameField = document.getElementById('authUsername');
          const passwordField = document.getElementById('authPassword');
          if (usernameField) usernameField.value = authData.username || '';
          if (passwordField) passwordField.value = authData.password || '';
          break;
        case 'apikey':
          const apiKeyField = document.getElementById('authApiKey');
          const headerNameField = document.getElementById('authHeaderName');
          if (apiKeyField) apiKeyField.value = authData.apiKey || '';
          if (headerNameField) headerNameField.value = authData.headerName || 'X-API-Key';
          break;
      }
    } catch (error) {
      console.error('Error populating auth fields:', error);
      this.showMessage('Failed to load authentication data', 'error');
    }
  }

  async saveWebhook() {
    const form = document.getElementById('webhookForm');
    const formData = new FormData(form);
    
    const webhook = {
      name: document.getElementById('webhookName').value.trim(),
      method: document.getElementById('webhookMethod').value,
      url: document.getElementById('webhookUrl').value.trim(),
      description: document.getElementById('webhookDescription').value.trim()
    };

    // Validate required fields
    if (!webhook.name || !webhook.url) {
      this.showMessage('Name and URL are required', 'error');
      return;
    }

    // Validate URL format
    try {
      new URL(webhook.url);
    } catch {
      this.showMessage('Please enter a valid URL', 'error');
      return;
    }

    // Handle authentication
    const authTypeElement = document.getElementById('authType');
    const authType = authTypeElement ? authTypeElement.value : 'none';
    if (authType !== 'none') {
      const authData = { type: authType };
      
      switch (authType) {
        case 'bearer':
          const tokenElement = document.getElementById('authToken');
          const token = tokenElement ? tokenElement.value.trim() : '';
          if (!token) {
            this.showMessage('Bearer token is required', 'error');
            return;
          }
          authData.token = token;
          break;
        case 'basic':
          const usernameElement = document.getElementById('authUsername');
          const passwordElement = document.getElementById('authPassword');
          const username = usernameElement ? usernameElement.value.trim() : '';
          const password = passwordElement ? passwordElement.value.trim() : '';
          if (!username || !password) {
            this.showMessage('Username and password are required', 'error');
            return;
          }
          authData.username = username;
          authData.password = password;
          break;
        case 'apikey':
          const apiKeyElement = document.getElementById('authApiKey');
          const headerNameElement = document.getElementById('authHeaderName');
          const apiKey = apiKeyElement ? apiKeyElement.value.trim() : '';
          const headerName = headerNameElement ? (headerNameElement.value.trim() || 'X-API-Key') : 'X-API-Key';
          if (!apiKey) {
            this.showMessage('API key is required', 'error');
            return;
          }
          authData.apiKey = apiKey;
          authData.headerName = headerName;
          break;
      }
      
      // Encrypt sensitive authentication data
      try {
        webhook.auth = { type: authType, encrypted: await window.cryptoManager.encryptAuth(authData) };
      } catch (error) {
        console.error('Failed to encrypt authentication data:', error);
        this.showMessage('Failed to secure authentication data', 'error');
        return;
      }
    }

    // Handle default payload
    const payloadText = document.getElementById('defaultPayload').value.trim();
    if (payloadText) {
      try {
        webhook.defaultPayload = JSON.parse(payloadText);
      } catch (error) {
        this.showMessage('Invalid JSON in default payload', 'error');
        return;
      }
    }

    // Handle file upload configuration
    const enableFileUpload = document.getElementById('enableFileUpload').checked;
    if (enableFileUpload) {
      const parameterName = document.getElementById('fileParameterName').value.trim();
      const includeMetadata = document.getElementById('includeFileMetadata').checked;
      
      // Validate file parameter name
      if (!parameterName) {
        this.showMessage('File parameter name is required when file upload is enabled', 'error');
        return;
      }
      
      webhook.fileUpload = {
        enabled: true,
        parameterName,
        includeMetadata
      };
    } else {
      webhook.fileUpload = { enabled: false };
    }

    // Save webhook
    try {
      if (this.currentEditIndex >= 0) {
        this.webhooks[this.currentEditIndex] = webhook;
      } else {
        this.webhooks.push(webhook);
      }

      await chrome.storage.sync.set({ webhooks: this.webhooks });
      this.renderWebhooks();
      this.closeWebhookModal();
      this.showMessage(
        this.currentEditIndex >= 0 ? 'Webhook updated successfully' : 'Webhook added successfully',
        'success'
      );
    } catch (error) {
      console.error('Failed to save webhook:', error);
      this.showMessage('Failed to save webhook', 'error');
    }
  }

  editWebhook(index) {
    this.openWebhookModal(index);
  }

  async deleteWebhook(index) {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      this.webhooks.splice(index, 1);
      await chrome.storage.sync.set({ webhooks: this.webhooks });
      this.renderWebhooks();
      this.showMessage('Webhook deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      this.showMessage('Failed to delete webhook', 'error');
    }
  }

  async duplicateWebhook(index) {
    try {
      const originalWebhook = this.webhooks[index];
      const duplicatedWebhook = {
        ...originalWebhook,
        name: `${originalWebhook.name} (Copy)`,
        // Clear any saved payload data for the duplicate
        defaultPayload: originalWebhook.defaultPayload || ''
      };

      this.webhooks.push(duplicatedWebhook);
      await chrome.storage.sync.set({ webhooks: this.webhooks });
      this.renderWebhooks();
      this.showMessage('Webhook duplicated successfully', 'success');
    } catch (error) {
      console.error('Failed to duplicate webhook:', error);
      this.showMessage('Failed to duplicate webhook', 'error');
    }
  }

  async saveSettings() {
    try {
      this.settings = {
        defaultTimeout: parseInt(document.getElementById('defaultTimeout').value) || 30000,
        showNotifications: document.getElementById('showNotifications').checked,
        theme: document.getElementById('theme').value
      };

      await chrome.storage.sync.set({ settings: this.settings });
      this.showMessage('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showMessage('Failed to save settings', 'error');
    }
  }

  resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    this.settings = {
      defaultTimeout: 30000,
      showNotifications: true,
      theme: 'light'
    };

    this.loadSettings();
    this.showMessage('Settings reset to defaults', 'success');
  }

  openImportExportModal(mode) {
    const modal = document.getElementById('importExportModal');
    const title = document.getElementById('importExportTitle');
    const textarea = document.getElementById('importExportData');
    const button = document.getElementById('executeImportExportBtn');

    title.textContent = mode === 'import' ? 'Import Webhooks' : 'Export Webhooks';
    button.textContent = mode === 'import' ? 'Import' : 'Copy to Clipboard';
    button.dataset.mode = mode;

    if (mode === 'export') {
      textarea.value = JSON.stringify({
        webhooks: this.webhooks,
        settings: this.settings,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      }, null, 2);
      textarea.readOnly = true;
    } else {
      textarea.value = '';
      textarea.readOnly = false;
      textarea.placeholder = 'Paste your webhook configuration JSON here...';
    }

    modal.classList.add('active');
  }

  closeImportExportModal() {
    document.getElementById('importExportModal').classList.remove('active');
  }

  async executeImportExport() {
    const mode = document.getElementById('executeImportExportBtn').dataset.mode;
    const textarea = document.getElementById('importExportData');

    if (mode === 'export') {
      try {
        await navigator.clipboard.writeText(textarea.value);
        this.showMessage('Configuration copied to clipboard', 'success');
        this.closeImportExportModal();
      } catch (error) {
        this.showMessage('Failed to copy to clipboard', 'error');
      }
    } else {
      try {
        const data = JSON.parse(textarea.value);
        
        if (!data.webhooks || !Array.isArray(data.webhooks)) {
          throw new Error('Invalid format: webhooks array not found');
        }

        if (confirm('This will replace all existing webhooks. Continue?')) {
          this.webhooks = data.webhooks;
          if (data.settings) {
            this.settings = { ...this.settings, ...data.settings };
          }

          await chrome.storage.sync.set({
            webhooks: this.webhooks,
            settings: this.settings
          });

          this.updateUI();
          this.closeImportExportModal();
          this.showMessage(`Imported ${this.webhooks.length} webhooks successfully`, 'success');
        }
      } catch (error) {
        this.showMessage(`Import failed: ${error.message}`, 'error');
      }
    }
  }

  async resetCryptoKeys() {
    if (!confirm('Are you sure you want to reset encryption keys? This will clear all saved authentication data and you will need to reconfigure all webhooks.')) {
      return;
    }

    try {
      // Reset crypto keys using the crypto manager
      await this.cryptoManager.regenerateKey();
      
      // Clear all encrypted auth data from webhooks
      const data = await chrome.storage.sync.get(['webhooks']);
      if (data.webhooks) {
        const webhooks = data.webhooks.map(webhook => ({
          ...webhook,
          authData: { type: 'none' },
          encryptedAuth: null
        }));
        await chrome.storage.sync.set({ webhooks });
      }
      
      // Reload the page to refresh all data
      this.showMessage('Encryption keys reset successfully. All authentication data has been cleared.', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Failed to reset crypto keys:', error);
      this.showMessage('Failed to reset encryption keys. Please try again.', 'error');
    }
  }

  showMessage(text, type = 'success') {
    const container = document.getElementById('messageContainer');
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    
    container.appendChild(message);
    
    setTimeout(() => {
      message.remove();
    }, 5000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WebhookOptionsManager();
});