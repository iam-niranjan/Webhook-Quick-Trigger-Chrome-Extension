# Webhook Quick Trigger Chrome Extension

🚀 **Instantly trigger webhook endpoints from your browser without context switching**

A powerful Chrome extension that provides a browser-native UI to trigger any webhook endpoint—authenticated or public—in one click, eliminating the need to switch between applications for testing or routine automation triggers.

## ✨ Features

### Core Functionality
- 🔌 **Webhook Library** - Manage and organize your webhooks with names, URLs, and methods
- 🔑 **Authentication Management** - Securely store API tokens, Basic Auth, and API keys
- 📝 **Dynamic Payloads** - Define JSON templates with real-time editing and validation
- 📊 **Response Preview** - View HTTP status, headers, and response body inline
- 🛠 **Test Mode** - Validate request structure without executing side effects
- ⚙️ **Settings Management** - Comprehensive configuration options

### Advanced Features
- 🔒 **Secure Storage** - Credentials stored using Chrome's secure storage API
- 🎨 **Modern UI** - Clean, intuitive interface with responsive design
- 📱 **Cross-Device Sync** - Webhooks and settings sync across Chrome instances
- 🌙 **Theme Support** - Light, dark, and auto themes
- 📤 **Import/Export** - Backup and share webhook configurations
- 🔔 **Notifications** - Browser notifications for execution results

## 🚀 Installation

### Option 1: Chrome Web Store (Recommended)
*Coming soon - extension will be published to Chrome Web Store*

### Option 2: Developer Mode Installation

1. **Download the Extension**
   ```bash
   git clone https://github.com/iam-niranjan/Webhook-Quick-Trigger-Chrome-Extension.git
   cd Webhook-Quick-Trigger-Chrome-Extension
   ```

2. **Enable Developer Mode**
   - Open Chrome and navigate to `chrome://extensions/`
   - Toggle "Developer mode" in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the extension directory
   - The extension icon should appear in your toolbar

## 📖 Usage Guide

### Getting Started

1. **Click the Extension Icon**
   - The Webhook Quick Trigger sidebar will open
   - If no webhooks are configured, you'll see the empty state

2. **Add Your First Webhook**
   - Click "Add Your First Webhook" or the settings icon
   - Fill in the webhook details:
     - **Name**: Descriptive name for your webhook
     - **Method**: HTTP method (GET, POST, PUT, DELETE)
     - **URL**: Your webhook endpoint
     - **Description**: Optional description
     - **Authentication**: Choose from None, Bearer Token, Basic Auth, or API Key
     - **Default Payload**: Optional JSON template

3. **Trigger Webhooks**
   - Select a webhook from the dropdown
   - Edit the JSON payload if needed
   - Click "Test" for dry-run validation
   - Click "Trigger" to execute the webhook

### Authentication Setup

#### Bearer Token
```json
{
  "type": "bearer",
  "token": "your-bearer-token"
}
```

#### Basic Authentication
```json
{
  "type": "basic",
  "username": "your-username",
  "password": "your-password"
}
```

#### API Key
```json
{
  "type": "apikey",
  "apiKey": "your-api-key",
  "headerName": "X-API-Key"
}
```

### Payload Templates

Create reusable JSON templates for your webhooks:

```json
{
  "event": "user_signup",
  "user": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## ⚙️ Configuration

### General Settings

- **Default Timeout**: Maximum time to wait for webhook responses (1-60 seconds)
- **Show Notifications**: Enable/disable browser notifications for results
- **Theme**: Choose between Light, Dark, or Auto themes

### Import/Export

**Export Configuration**
```json
{
  "webhooks": [...],
  "settings": {...},
  "exportDate": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
}
```

**Import Configuration**
- Paste exported JSON into the import dialog
- Review and confirm the import
- Existing webhooks will be replaced

## 🔧 Development

### Project Structure
```
webhook-quick-trigger/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker for background tasks
├── sidebar.html          # Main sidebar interface
├── options.html          # Settings/options page
├── styles/
│   ├── sidebar.css       # Sidebar styles
│   └── options.css       # Options page styles
├── scripts/
│   ├── sidebar.js        # Sidebar functionality
│   ├── options.js        # Options page functionality
│   ├── crypto.js         # Encryption utilities
│   └── crypto-worker.js  # Crypto worker for secure operations
├── icons/
│   ├── icon16.png        # 16x16 icon
│   ├── icon32.png        # 32x32 icon
│   ├── icon48.png        # 48x48 icon
│   └── icon128.png       # 128x128 icon
└── README.md
```

### Technical Stack

- **Manifest Version**: V3 (latest Chrome extension standard)
- **Storage**: Chrome Storage Sync API for cross-device synchronization
- **Security**: Content Security Policy compliant
- **UI Framework**: Vanilla JavaScript with modern CSS
- **Icons**: PNG-based scalable icons
- **Encryption**: Client-side encryption for sensitive data using Web Crypto API

### Key Features Implementation

- **Secure Storage**: Uses `chrome.storage.sync` for encrypted credential storage
- **Background Processing**: Service worker handles webhook execution
- **CORS Handling**: Proper headers and permissions for cross-origin requests
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Responsive Design**: Works on various screen sizes and sidebar dimensions
- **Client-side Encryption**: Sensitive data encrypted before storage using crypto workers

## 🎯 Use Cases

### Development & Testing
- **Quick Testing**: Fire webhooks during development without switching tools
- **API Validation**: Test webhook endpoints with different payloads
- **Integration Testing**: Validate workflow triggers

### Operations & Monitoring
- **Incident Response**: Trigger remediation workflows during outages
- **Manual Triggers**: Execute scheduled workflows on-demand
- **System Administration**: Trigger maintenance or cleanup workflows

### Demonstrations & Training
- **Live Demos**: Show workflows to stakeholders without sharing credentials
- **Training Sessions**: Demonstrate automation capabilities
- **Proof of Concepts**: Quick workflow validation for new use cases

## 🔒 Security & Privacy

### Data Storage
- All credentials are stored using Chrome's secure storage API
- Data is encrypted and synced across your Chrome instances
- No data is sent to external servers (except your configured webhooks)

### Permissions
- **Storage**: For saving webhooks and settings
- **Active Tab**: For context-aware features
- **Host Permissions**: For making requests to your webhook endpoints
- **Notifications**: For execution result notifications

### Best Practices
- Use environment-specific webhooks (dev/staging/production)
- Regularly rotate API keys and tokens
- Review webhook configurations periodically
- Use test mode for validation before execution

## 🐛 Troubleshooting

### Common Issues

**Webhook Not Triggering**
- Verify the webhook URL is correct and accessible
- Check authentication credentials
- Ensure your webhook service allows CORS requests
- Verify the HTTP method matches your webhook configuration

**CORS Errors**
- Enable CORS in your webhook service settings
- Add your Chrome extension origin to allowed origins
- Consider using a proxy if CORS cannot be enabled

**Authentication Failures**
- Double-check token/credential format
- Verify the authentication method matches your webhook setup
- Test credentials directly with your webhook service

**Storage Issues**
- Ensure Chrome sync is enabled
- Check available storage quota
- Try clearing extension data and reconfiguring

### Debug Mode

1. Open Chrome DevTools
2. Navigate to the Extensions tab
3. Find "Webhook Quick Trigger" and click "Inspect views"
4. Check console for error messages

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/iam-niranjan/Webhook-Quick-Trigger-Chrome-Extension.git
cd Webhook-Quick-Trigger-Chrome-Extension

# Load in Chrome for development
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select this directory
```

## 📝 Changelog

### Version 1.0.0
- Initial release
- Webhook library management
- Authentication support (Bearer, Basic, API Key)
- JSON payload editor with validation
- Test mode for safe validation
- Response preview with status and headers
- Settings management
- Import/export functionality
- Cross-device synchronization
- Modern responsive UI

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [n8n](https://n8n.io/) - The amazing workflow automation platform
- Chrome Extensions team for the excellent APIs
- The open-source community for inspiration and feedback

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/iam-niranjan/Webhook-Quick-Trigger-Chrome-Extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/iam-niranjan/Webhook-Quick-Trigger-Chrome-Extension/discussions)
- **Documentation**: [Wiki](https://github.com/iam-niranjan/Webhook-Quick-Trigger-Chrome-Extension/wiki)

---

**Made with ❤️ for the automation community**

*Originally inspired by and compatible with [n8n](https://n8n.io/) - The amazing workflow automation platform*
