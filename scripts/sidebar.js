// Webhook Quick Trigger Sidebar Script

class WebhookQuickTriggerSidebar {
  constructor() {
    this.webhooks = [];
    this.currentWebhook = null;
    this.init();
  }

  async init() {
    // Initialize crypto manager
    window.cryptoManager = new CryptoManager();
    await window.cryptoManager.init();
    
    await this.loadWebhooks();
    this.setupEventListeners();
    this.updateUI();
  }

  async loadWebhooks() {
    try {
      const result = await chrome.storage.sync.get(['webhooks']);
      this.webhooks = result.webhooks || [];
    } catch (error) {
      console.error('Failed to load webhooks:', error);
      this.webhooks = [];
    }
  }

  setupEventListeners() {
    // Webhook selection
    document.getElementById('webhookSelect').addEventListener('change', (e) => {
      this.selectWebhook(e.target.value);
    });

    // Add webhook buttons
    document.getElementById('addWebhookBtn').addEventListener('click', () => {
      this.openSettings();
    });
    document.getElementById('emptyAddBtn').addEventListener('click', () => {
      this.openSettings();
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.openSettings();
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refreshWebhooks();
    });

    // Payload controls
    document.getElementById('templateBtn').addEventListener('click', () => {
      this.loadTemplate();
    });
    document.getElementById('clearPayloadBtn').addEventListener('click', () => {
      this.clearPayload();
    });

    // Action buttons
    document.getElementById('testBtn').addEventListener('click', () => {
      this.testWebhook();
    });
    document.getElementById('triggerBtn').addEventListener('click', () => {
      this.triggerWebhook();
    });

    // Response tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Auto-save payload
    document.getElementById('payloadEditor').addEventListener('input', () => {
      this.savePayload();
    });

    // File upload
    document.getElementById('fileInput').addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files[0]);
    });

    // Drag and drop
    const fileLabel = document.getElementById('fileInputLabel');
    fileLabel.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileLabel.style.borderColor = '#ff6d6d';
      fileLabel.style.background = '#fff5f5';
    });

    fileLabel.addEventListener('dragleave', (e) => {
      e.preventDefault();
      fileLabel.style.borderColor = '#dee2e6';
      fileLabel.style.background = '#f8f9fa';
    });

    fileLabel.addEventListener('drop', (e) => {
      e.preventDefault();
      fileLabel.style.borderColor = '#dee2e6';
      fileLabel.style.background = '#f8f9fa';
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFileSelect(files[0]);
      }
    });
  }

  async refreshWebhooks() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.style.transform = 'rotate(360deg)';
    
    // Clear previous response, payload, and webhook selection
    this.clearResponse();
    this.clearPayload();
    this.currentWebhook = null;
    
    await this.loadWebhooks();
    this.updateUI();
    
    setTimeout(() => {
      refreshBtn.style.transform = 'rotate(0deg)';
    }, 300);
  }

  selectWebhook(webhookIndex) {
    if (!webhookIndex && webhookIndex !== 0) {
      this.currentWebhook = null;
      this.updateUI();
      return;
    }
    
    const index = parseInt(webhookIndex);
    this.currentWebhook = this.webhooks[index];
    this.updateUI();
    this.loadSavedPayload();
  }

  updateUI() {
    this.updateWebhookSelect();
    this.updateWebhookDetails();
    this.updateFileUploadSection();
    this.updateEmptyState();
  }

  updateWebhookSelect() {
    const select = document.getElementById('webhookSelect');
    select.innerHTML = '<option value="">Choose a webhook...</option>';
    
    this.webhooks.forEach((webhook, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = webhook.name;
      if (this.currentWebhook && this.webhooks.indexOf(this.currentWebhook) === index) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  updateWebhookDetails() {
    const detailsSection = document.getElementById('webhookDetails');
    
    if (this.currentWebhook) {
      detailsSection.style.display = 'block';
      document.getElementById('webhookMethod').textContent = this.currentWebhook.method || 'POST';
      document.getElementById('webhookMethod').className = `webhook-method ${(this.currentWebhook.method || 'POST').toUpperCase()}`;
      document.getElementById('webhookUrl').textContent = this.currentWebhook.url;
      document.getElementById('webhookDescription').textContent = this.currentWebhook.description || '';
    } else {
      detailsSection.style.display = 'none';
    }
  }

  updateFileUploadSection() {
    const fileUploadSection = document.getElementById('fileUploadSection');
    
    if (this.currentWebhook && this.currentWebhook.fileUpload && this.currentWebhook.fileUpload.enabled) {
      fileUploadSection.style.display = 'block';
    } else {
      fileUploadSection.style.display = 'none';
      this.selectedFile = null;
      this.updateFileInfo();
      this.hideFileError();
    }
  }

  updateEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const hasWebhooks = this.webhooks.length > 0;
    
    emptyState.style.display = hasWebhooks ? 'none' : 'block';
  }

  handleFileSelect(file) {
    if (!file) {
      this.selectedFile = null;
      this.updateFileInfo();
      return;
    }

    this.selectedFile = file;
    this.updateFileInfo();
    this.hideFileError();
  }



  updateFileInfo() {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileType = document.getElementById('fileType');

    if (this.selectedFile) {
      fileInfo.style.display = 'block';
      fileName.textContent = this.selectedFile.name;
      fileSize.textContent = this.formatFileSize(this.selectedFile.size);
      fileType.textContent = this.selectedFile.type || 'Unknown';
    } else {
      fileInfo.style.display = 'none';
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async loadTemplate() {
    if (!this.currentWebhook) return;
    
    // Only use the webhook's configured default payload - no hardcoded fallback
    if (this.currentWebhook.defaultPayload) {
      const template = this.currentWebhook.defaultPayload;
      document.getElementById('payloadEditor').value = JSON.stringify(template, null, 2);
      this.savePayload();
    } else {
      // Show message if no default payload is configured
      this.showError('No default payload configured for this webhook. Please configure one in settings.');
    }
  }

  clearPayload() {
    document.getElementById('payloadEditor').value = '';
    this.savePayload();
    this.hideError();
  }

  async savePayload() {
    if (!this.currentWebhook) return;
    
    const payload = document.getElementById('payloadEditor').value;
    const webhookIndex = this.webhooks.indexOf(this.currentWebhook);
    const key = `payload_${webhookIndex}`;
    
    try {
      await chrome.storage.local.set({ [key]: payload });
    } catch (error) {
      console.error('Failed to save payload:', error);
    }
  }

  async loadSavedPayload() {
    if (!this.currentWebhook) return;
    
    const webhookIndex = this.webhooks.indexOf(this.currentWebhook);
    const key = `payload_${webhookIndex}`;
    
    try {
      const result = await chrome.storage.local.get([key]);
      let payload = result[key];
      
      // If no saved payload exists, use the webhook's default payload
      if (!payload && this.currentWebhook.defaultPayload) {
        payload = JSON.stringify(this.currentWebhook.defaultPayload, null, 2);
      }
      
      document.getElementById('payloadEditor').value = payload || '';
    } catch (error) {
      console.error('Failed to load saved payload:', error);
    }
  }

  validatePayload(payload) {
    if (!payload.trim()) return { valid: true, data: null };
    
    try {
      const data = JSON.parse(payload);
      return { valid: true, data };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('payloadError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  hideError() {
    document.getElementById('payloadError').style.display = 'none';
  }

  hideFileError() {
    document.getElementById('fileError').style.display = 'none';
  }

  async testWebhook() {
    await this.executeWebhook(true);
  }

  async triggerWebhook() {
    await this.executeWebhook(false);
  }

  async executeWebhook(isTest = false) {
    if (!this.currentWebhook) {
      this.showError('Please select a webhook first');
      return;
    }

    const payload = document.getElementById('payloadEditor').value;
    const validation = this.validatePayload(payload);
    
    if (!validation.valid) {
      this.showError(`Invalid JSON: ${validation.error}`);
      return;
    }

    // Handle file upload if enabled and file is selected
    let fileData = null;
    if (this.currentWebhook.fileUpload && this.currentWebhook.fileUpload.enabled && this.selectedFile) {
      try {
        fileData = await this.processFile(this.selectedFile);
      } catch (error) {
        this.showError(`File processing failed: ${error.message}`);
        return;
      }
    }

    this.hideError();
    this.showLoading();
    
    try {
      // Use background script to handle authentication properly
      const response = await chrome.runtime.sendMessage({
        action: 'executeWebhook',
        webhook: this.currentWebhook,
        payload: validation.data,
        fileData: fileData,
        testMode: isTest
      });
      
      if (response.success) {
        this.showResponse(response.data);
        
        // Show notification
        const action = isTest ? 'tested' : 'triggered';
        this.showNotification(`Webhook ${action} successfully`, 'success');
      } else {
        this.showError(`Request failed: ${response.error}`);
      }
      
    } catch (error) {
      console.error('Webhook execution failed:', error);
      this.showError(`Request failed: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  async processFile(file) {
    const config = this.currentWebhook.fileUpload;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const fileData = {
          name: file.name,
          size: file.size,
          type: file.type,
          parameterName: config.parameterName || 'file'
        };

        // Include metadata if configured
        if (config.includeMetadata) {
          fileData.metadata = {
            lastModified: file.lastModified,
            webkitRelativePath: file.webkitRelativePath || ''
          };
        }

        // Convert ArrayBuffer to base64
        const bytes = new Uint8Array(reader.result);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        fileData.content = btoa(binary);
        fileData.encoding = 'base64';
        
        resolve(fileData);
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  showLoading() {
    document.getElementById('loadingIndicator').style.display = 'flex';
  }

  hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
  }

  clearResponse() {
    const responseSection = document.getElementById('responseSection');
    const statusElement = document.getElementById('responseStatus');
    const timeElement = document.getElementById('responseTime');
    const bodyElement = document.getElementById('responseBody');
    const headersElement = document.getElementById('responseHeaders');
    
    // Clear content
    statusElement.textContent = '';
    statusElement.className = 'status-code';
    timeElement.textContent = '';
    bodyElement.textContent = '';
    headersElement.textContent = '';
    
    // Hide response section
    responseSection.style.display = 'none';
  }

  showResponse(response) {
    const responseSection = document.getElementById('responseSection');
    const statusElement = document.getElementById('responseStatus');
    const timeElement = document.getElementById('responseTime');
    const bodyElement = document.getElementById('responseBody');
    const headersElement = document.getElementById('responseHeaders');
    
    // Update status
    statusElement.textContent = `${response.status} ${response.statusText}`;
    statusElement.className = `status-code ${response.status < 400 ? 'success' : 'error'}`;
    
    // Update response time
    timeElement.textContent = `${response.responseTime}ms`;
    
    // Update body
    bodyElement.textContent = typeof response.data === 'string' 
      ? response.data 
      : JSON.stringify(response.data, null, 2);
    
    // Update headers
    headersElement.textContent = JSON.stringify(response.headers, null, 2);
    
    // Show response section
    responseSection.style.display = 'block';
    
    // Scroll to response
    responseSection.scrollIntoView({ behavior: 'smooth' });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `response${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    });
  }

  async showNotification(message, type = 'info') {
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Webhook Quick Trigger',
        message: message
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }
}

// Initialize the sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WebhookQuickTriggerSidebar();
});