# 🔐 Encrypted Token Chrome Extension

## Overview
This Chrome extension receives encrypted JWT tokens from your Hireomatic web app, decrypts them, and uses them to make authenticated API calls when processing LinkedIn profiles.

## 🔑 How It Works

### 1. Token Flow
1. **User logs into Hireomatic web app**
2. **Web app sends encrypted JWT token** via `window.postMessage`
3. **Extension stores encrypted token** in `chrome.storage.sync`
4. **User clicks "Add to Hireomatic"** on LinkedIn profile
5. **Extension decrypts token** and makes API call with original token

### 2. Token Encryption/Decryption
- **Encryption**: Your server encrypts the JWT token using `CHROME_EXT_TOKEN` secret
- **Decryption**: Extension decodes the JWT and extracts the original token from `sub` claim
- **Security**: Token is stored encrypted in extension storage

## 📁 Files

### Core Files
- `background.js` - Handles token storage, decryption, and API calls
- `content.js` - LinkedIn profile scraping and button injection
- `hireomatic-content.js` - Receives tokens from web app
- `manifest.json` - Extension configuration

### Configuration
- `config.js` - Contains decryption key and API endpoint

## ⚙️ Setup

### 1. Update Decryption Key
In `config.js`, replace `CHROME_EXT_TOKEN` with your actual secret:
```javascript
const CONFIG = {
  CHROME_EXT_TOKEN: 'your_actual_secret_key_here',
  // ... other config
};
```

### 2. Web App Integration
Your web app should send tokens like this:
```javascript
// After successful login
window.postMessage({
  type: "STORE_TOKEN",
  token: encryptedJWTToken
}, "*");
```

### 3. API Endpoint
The extension makes POST requests to:
```
https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate
```

**Headers:**
- `Authorization: Bearer {decrypted_token}`
- `Content-Type: application/json`

**Body:**
```json
{
  "profile": {
    "name": "John Doe",
    "headline": "Software Engineer",
    "location": "San Francisco, CA",
    "company": "Tech Corp",
    "url": "https://linkedin.com/in/johndoe",
    "scrapedAt": "2024-01-01T00:00:00.000Z"
  },
  "source": "chrome_extension",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🚀 Usage

### 1. Install Extension
1. Load the extension in Chrome
2. Navigate to your Hireomatic web app
3. Login to get the encrypted token
4. Extension automatically stores the token

### 2. Process LinkedIn Profiles
1. Go to any LinkedIn profile page
2. Click the "Add to Hireomatic" button
3. Extension scrapes profile data
4. Makes authenticated API call
5. Shows success/failure status

## 🔍 Debugging

### Check Token Storage
Open extension popup or check console for:
- Token storage confirmation
- Decryption logs
- API call results

### Common Issues
- **No token found**: Make sure user is logged into Hireomatic
- **Decryption failed**: Check `CHROME_EXT_TOKEN` in config
- **API call failed**: Verify token is valid and not expired

## 🛡️ Security Features

- **Encrypted storage**: Tokens stored encrypted in extension
- **Origin validation**: Only accepts tokens from your domain
- **Secure API calls**: Uses HTTPS with proper headers
- **Token isolation**: Stored separately from web page

## 📝 Notes

- The extension automatically handles token decryption
- No manual token management required
- Tokens are refreshed on each login
- Profile data is extracted using accessibility-friendly selectors
