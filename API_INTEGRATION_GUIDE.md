# API Integration Guide for Hireomatic Extension

## Overview

The extension now integrates with your API endpoint to automatically upload PDFs after LinkedIn profile extraction. Here's how it works:

## How It Works

### 1. **Profile Extraction**
- Extracts profile data using simple, reliable selectors
- Captures structured data (name, headline, location, company)
- Provides fallback content for AI processing

### 2. **PDF Generation**
- Triggers LinkedIn's built-in "More → Save to PDF" feature
- Automatically downloads the PDF to your local machine
- Monitors download completion

### 3. **API Upload Preparation**
- Detects when PDF download completes
- Provides API endpoint information
- Ready for manual or automated upload

## Configuration

### 1. **JWT Token**
- Enter your JWT token in the extension popup
- Token is stored securely in Chrome's sync storage
- Required for API authentication

### 2. **Client ID**
- Enter your client ID (default: 123)
- Also stored securely in Chrome's sync storage
- Used in API requests

### 3. **Saving Configuration**
- Click "Save Configuration" button
- Configuration is automatically loaded on extension startup
- Stored across browser sessions

## API Endpoint

```
POST https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate
```

### Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Form Data
```
file: @resume.pdf
clientId: 123
```

## Usage Flow

### 1. **Configure Extension**
- Open extension popup
- Enter JWT Token and Client ID
- Click "Save Configuration"

### 2. **Extract Profile**
- Navigate to LinkedIn profile
- Click "Add Profile to Hireomatic"
- Extension extracts data and triggers PDF save

### 3. **PDF Download**
- LinkedIn generates and downloads PDF
- Extension monitors download completion
- PDF saved to your Downloads folder

### 4. **API Upload Ready**
- Extension displays API information
- Shows endpoint, client ID, and PDF filename
- Ready for manual upload or automation

## Manual Upload

Use the provided curl command with your downloaded PDF:

```bash
curl -X POST "https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@YOUR_DOWNLOADED_PDF.pdf" \
  -F "clientId=YOUR_CLIENT_ID"
```

## Automation Options

### 1. **Browser Extension**
- Currently provides API information
- Ready for manual upload
- Can be extended for automatic upload

### 2. **Server-Side Integration**
- Implement webhook to extension
- Automatic file processing
- Real-time upload status

### 3. **Local Script**
- Monitor Downloads folder
- Auto-upload new PDFs
- Batch processing capability

## Security Features

- JWT tokens stored securely in Chrome sync storage
- No hardcoded credentials in code
- Configuration persists across sessions
- User controls their own API credentials

## Troubleshooting

### Common Issues

1. **JWT Token Not Configured**
   - Check extension popup configuration
   - Ensure token is valid and not expired

2. **Client ID Missing**
   - Verify client ID is entered correctly
   - Check for typos or extra spaces

3. **PDF Download Issues**
   - Ensure LinkedIn profile is accessible
   - Check browser download permissions
   - Verify "More → Save to PDF" option exists

4. **API Upload Failures**
   - Verify endpoint URL is correct
   - Check JWT token validity
   - Ensure client ID matches your system

### Debug Information

- Use "Show Debug Info" button in extension
- Check browser console for detailed logs
- Monitor network requests in DevTools

## Future Enhancements

### 1. **Automatic Upload**
- Direct file reading capability
- Real-time upload status
- Error handling and retry logic

### 2. **Batch Processing**
- Multiple profile extraction
- Queue management
- Progress tracking

### 3. **Advanced Configuration**
- Multiple API endpoints
- Environment switching
- Custom headers support

## Support

For technical issues or questions:
1. Check browser console logs
2. Verify configuration settings
3. Test API endpoint manually
4. Review this documentation

---

**Note**: The extension currently provides API information for manual upload. Full automation requires additional implementation based on your specific needs.
