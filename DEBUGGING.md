# Debugging Guide for Hireomatic Extension

## Quick Fix Steps

1. **Reload the Extension**
   - Go to `chrome://extensions/`
   - Find "Hireomatic LinkedIn Connector"
   - Click the reload button (🔄)

2. **Refresh the LinkedIn Page**
   - Navigate to any LinkedIn profile page
   - Press `Ctrl+F5` (or `Cmd+Shift+R` on Mac) to hard refresh

3. **Test the Connection**
   - Click the extension icon
   - Click "Test Connection" button
   - Check the status message

## Common Issues & Solutions

### "Could not establish connection. Receiving end does not exist."

**Cause**: Content script isn't running on the page
**Solutions**:
- Refresh the LinkedIn page
- Reload the extension
- Check if you're on a LinkedIn profile page (`linkedin.com/in/username`)

### "No profile data found"

**Cause**: LinkedIn changed their HTML structure
**Solutions**:
- Check browser console for detailed logs
- The extension uses multiple selectors as fallbacks
- Try on different LinkedIn profiles

### Extension not responding

**Cause**: Background script or content script crashed
**Solutions**:
- Reload the extension
- Check browser console for errors
- Restart Chrome browser

## Debug Mode

### 1. Open Extension DevTools
- Right-click the extension icon
- Select "Inspect popup"
- Check the Console tab for logs

### 2. Check Background Script
- Go to `chrome://extensions/`
- Find your extension
- Click "service worker" link
- Check the Console tab

### 3. Check Content Script
- Open LinkedIn profile page
- Press F12 to open DevTools
- Check the Console tab for "Hireomatic" logs

## Expected Log Messages

### Content Script Loading
```
Hireomatic content script loading...
Hireomatic content script loaded successfully for LinkedIn profile: [URL]
```

### Profile Scraping
```
Attempting to scrape profile data...
Found name: [Name]
Found headline with selector: [Selector] [Text]
Found location with selector: [Selector] [Text]
Found company with selector: [Selector] [Text]
Final scraped profile data: [Object]
```

### Message Passing
```
Content script received message: [Message]
Processing scrapeProfile request...
Sending profile data back: [Object]
```

## Testing the Extension

### Step 1: Basic Connection Test
1. Click extension icon
2. Click "Test Connection"
3. Should see "✅ All connections successful!"

### Step 2: Profile Scraping Test
1. Navigate to LinkedIn profile
2. Click "Add Profile to Hireomatic"
3. Check status message and console logs

### Step 3: PDF Capture Test
1. After successful scraping
2. Check downloads folder for PDF
3. Verify PDF contains profile page

## Troubleshooting Checklist

- [ ] Extension is loaded and enabled
- [ ] On a LinkedIn profile page (`linkedin.com/in/...`)
- [ ] Page is fully loaded
- [ ] No browser console errors
- [ ] Extension permissions granted
- [ ] LinkedIn page is accessible (not private/restricted)

## Still Having Issues?

1. **Check Chrome Version**: Ensure you're using Chrome 88+
2. **Clear Browser Data**: Clear cookies and cache for LinkedIn
3. **Disable Other Extensions**: Some extensions may interfere
4. **Try Incognito Mode**: Test without other extensions
5. **Check Network**: Ensure LinkedIn is accessible

## Contact Support

If issues persist:
1. Note the exact error message
2. Check browser console logs
3. Note Chrome version and OS
4. Describe the steps that led to the error
