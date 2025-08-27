# Hireomatic LinkedIn Connector Chrome Extension

A Chrome extension that allows HR managers to easily capture LinkedIn profiles and add them to the Hireomatic platform for AI-powered resume evaluation and candidate assessment.

## Features

- **Profile Scraping**: Automatically extracts candidate information from LinkedIn profiles
- **PDF Capture**: Captures the profile page as a PDF for record-keeping
- **Data Extraction**: Collects name, headline, location, company, and profile URL
- **Hireomatic Integration**: Ready for API integration with your Hireomatic backend

## Installation

### Developer Mode Installation

1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

## Usage

### Basic Profile Capture

1. **Navigate** to any LinkedIn profile page (e.g., `https://www.linkedin.com/in/username`)
2. **Click the Hireomatic extension icon** in your toolbar
3. **Click "Add Profile to Hireomatic"** button
4. **Wait for processing** - the extension will:
   - Scrape profile information
   - Capture the page as a PDF
   - Download the PDF to your default downloads folder
   - Display success/error status

### What Gets Captured

- **Name**: Profile holder's full name
- **Headline**: Professional title/headline
- **Location**: Geographic location
- **Company**: Current company/position
- **Profile URL**: Direct link to the profile
- **PDF**: Complete profile page as downloadable PDF

## Technical Details

### Architecture

- **Manifest V3**: Modern Chrome extension architecture
- **Service Worker**: Background script for PDF capture and downloads
- **Content Script**: Runs on LinkedIn pages to extract data
- **Popup Interface**: Simple UI for user interaction

### Permissions Required

- `activeTab`: Access to current tab
- `scripting`: Execute scripts on pages
- `storage`: Store extension data
- `downloads`: Download captured PDFs
- `tabs`: Access tab information

### Host Permissions

- `https://www.linkedin.com/*`: Access LinkedIn profiles
- `https://*.linkedin.com/*`: Access all LinkedIn subdomains
- `https://your-hireomatic-api.com/*`: Your API endpoint (update this)

## API Integration

The extension is designed to integrate with your Hireomatic backend. To complete the integration:

1. **Update the API endpoint** in `background.js` (line ~80)
2. **Uncomment the fetch code** in the background script
3. **Test the API integration** with your backend

### Example API Payload

```json
{
  "name": "John Doe",
  "headline": "Senior Software Engineer at Tech Corp",
  "location": "San Francisco, CA",
  "company": "Tech Corp",
  "profileUrl": "https://www.linkedin.com/in/johndoe",
  "resume": "[PDF file data]"
}
```

## Troubleshooting

### Common Issues

1. **"Could not establish connection"**
   - Refresh the LinkedIn page
   - Reload the extension
   - Check if the page is a valid LinkedIn profile

2. **"No profile data found"**
   - Ensure you're on a LinkedIn profile page
   - LinkedIn may have changed their HTML structure
   - Check browser console for detailed errors

3. **PDF capture fails**
   - Ensure the page is fully loaded
   - Check if the profile is public/accessible
   - Verify extension permissions

### Debug Mode

1. **Right-click** the extension icon
2. **Select "Inspect popup"** to open DevTools
3. **Check the Console tab** for detailed logs
4. **Use the Network tab** to monitor API calls

## Development

### File Structure

```
hireomatic-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (PDF capture, downloads)
├── content.js            # Content script (profile scraping)
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── icons/                # Extension icons
└── README.md             # This file
```

### Key Functions

- **`getProfileInfo()`** (content.js): Extracts profile data using multiple selectors
- **`chrome.tabs.captureVisibleTab()`** (background.js): Captures page as PDF
- **`chrome.downloads.download()`** (background.js): Downloads captured PDF
- **Message passing**: Communication between popup, background, and content scripts

### Customization

- **Profile selectors**: Update CSS selectors in `content.js` if LinkedIn changes
- **API endpoint**: Modify the fetch URL in `background.js`
- **UI styling**: Customize `popup.html` and CSS
- **Data fields**: Add/remove fields in the profile extraction

## Security Notes

- The extension only runs on LinkedIn profile pages
- No data is sent to external services without your API integration
- All profile data is processed locally before any network requests
- PDF downloads are saved to your default downloads folder

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify all permissions are granted
3. Ensure you're on a valid LinkedIn profile page
4. Reload the extension if needed

## Future Enhancements

- [ ] Batch profile processing
- [ ] Custom data field extraction
- [ ] Profile comparison tools
- [ ] Integration with other job platforms
- [ ] Advanced filtering and search
- [ ] Export to multiple formats
