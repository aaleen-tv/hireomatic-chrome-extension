// background.js
console.log('Background script loaded');

// Import configuration
// Note: In Chrome extensions, we need to include this as a script tag in manifest.json
// For now, we'll define the config directly here
const CONFIG = {
  CHROME_EXT_TOKEN: 'ff2e159d88a600df5455b5f684e7f415', // Replace with your actual key
  API_ENDPOINT: 'https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate'
};

// Function to decrypt AES-GCM encrypted token
async function decryptToken(encryptedToken) {
  try {
    console.log('🔐 Attempting to decrypt AES-GCM token...');
    console.log('🔑 Token length:', encryptedToken.length);
    console.log('🔑 Secret key:', CONFIG.CHROME_EXT_TOKEN);
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedToken).split('').map(char => char.charCodeAt(0))
    );
    
    console.log('📦 Combined data length:', combined.length);
    
    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    console.log('🔑 IV length:', iv.length);
    console.log('📦 Encrypted data length:', encryptedData.length);
    
    // Import the secret key for decryption
    const secretKey = new TextEncoder().encode(CONFIG.CHROME_EXT_TOKEN);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    console.log('🔑 Crypto key imported successfully');
    
    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedData
    );
    
    console.log('✅ Data decrypted successfully');
    
    // Convert back to string
    const decryptedToken = new TextDecoder().decode(decryptedData);
    console.log('✅ Successfully decrypted token, length:', decryptedToken.length);
    
    return decryptedToken;
    
  } catch (error) {
    console.error('❌ Error decrypting AES-GCM token:', error);
    throw new Error('Failed to decrypt token: ' + error.message);
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'storeToken') {
    console.log('🔐 Storing encrypted token...');
    console.log('📋 Token received:', request.token);
    console.log('📏 Token length:', request.token.length);
    console.log('🔍 Token preview:', request.token.substring(0, 50) + '...');
    
    chrome.storage.sync.set({
      'hireomatic_token': request.token,
      'token_timestamp': Date.now()
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Failed to store token:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('✅ Token stored successfully in extension storage');
      sendResponse({ success: true });
      }
    });
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'getToken') {
    chrome.storage.sync.get(['hireomatic_token', 'token_timestamp'], (result) => {
      console.log('🔍 Token retrieved from storage:', {
        hasToken: !!result.hireomatic_token,
        tokenLength: result.hireomatic_token?.length || 0,
        timestamp: result.token_timestamp
      });
      sendResponse({ 
        token: result.hireomatic_token || null,
        timestamp: result.token_timestamp || null
      });
    });
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'clearToken') {
    chrome.storage.sync.remove(['hireomatic_token', 'token_timestamp'], () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Failed to clear token:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('✅ Token cleared successfully');
      sendResponse({ success: true });
      }
    });
    return true;
  }
  
  if (request.action === 'addProfile') {
    console.log('🚀 Processing addProfile request...');
    
    // Handle the profile addition asynchronously
    handleAddProfile(request.tabId, sendResponse);
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
  
  if (request.action === 'testDecryption') {
    console.log('🧪 Testing token decryption...');
    
    // Test decryption of the provided token
    testTokenDecryption(request.token, sendResponse);
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

// Function to handle profile addition
async function handleAddProfile(tabId, sendResponse) {
  try {
    let tab;
    
    // If no tabId provided, get the current active tab
    if (!tabId) {
      console.log("📍 No tabId provided, getting current active tab...");
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        sendResponse({ status: "❌ No active tab found" });
        return;
      }
      tab = tabs[0];
      console.log("✅ Using current active tab:", tab.id, tab.url);
    } else {
      tab = await chrome.tabs.get(tabId);
    }
    
    // Check if tab exists and is accessible
    if (!tab) {
      sendResponse({ status: "❌ Tab not found" });
      return;
    }
    
    // Check if we're on a LinkedIn profile page
    if (!tab.url || !tab.url.includes("linkedin.com/in/")) {
      sendResponse({ status: "❌ Please navigate to a LinkedIn profile page first" });
      return;
    }
    
    console.log("🎯 Processing profile for tab:", tab.id, "URL:", tab.url);
    
    // Check if content script is already running
    try {
      console.log("🔍 Checking if content script is running...");
      const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: "ping" });
      if (chrome.runtime.lastError) {
        console.log("⚠️ Content script not responding, injecting...");
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        console.log("✅ Content script injected successfully");
        // Wait a bit for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log("✅ Content script already running");
      }
    } catch (injectionError) {
      console.log("⚠️ Content script injection result:", injectionError.message);
    }
    
    console.log("📊 Sending scrapeProfile message to content script...");
    
    // Now send the scrapeProfile message
    const profile = await chrome.tabs.sendMessage(tab.id, { action: "scrapeProfile" });
    console.log("📥 Received response from content script:", profile);
    
    if (!profile || !profile.name) {
      console.error("❌ No profile data received");
      sendResponse({ status: "❌ No profile data found" });
      return;
    }
    
    console.log("✅ Profile scraped successfully:", {
      name: profile.name,
      headline: profile.headline,
      location: profile.location,
      company: profile.company
    });
    
    // Get stored encrypted token
    const result = await new Promise((resolve) => {
      chrome.storage.sync.get(['hireomatic_token'], resolve);
    });
    
    if (!result.hireomatic_token) {
      console.error("❌ No encrypted token found");
      sendResponse({ status: "❌ No token found. Please login to Hireomatic first." });
      return;
    }
    
    console.log("🔐 Encrypted token found, decrypting...");
    
    // Decrypt the token
    const decryptedToken = await decryptToken(result.hireomatic_token);
    if (!decryptedToken) {
      console.error("❌ Failed to decrypt token");
      sendResponse({ status: "❌ Failed to decrypt token" });
      return;
    }

    console.log("Decrypted token", decryptedToken)
    
    console.log("✅ Token decrypted successfully, proceeding with PDF capture and upload");
    
    // Trigger PDF download and upload
    try {
      console.log("🚀 Triggering LinkedIn PDF download...");
      
      // First, trigger PDF save via content script
      const pdfResponse = await chrome.tabs.sendMessage(tab.id, { action: "triggerPDFSave" });
      console.log("📥 PDF save response:", pdfResponse);
      
      if (!pdfResponse || !pdfResponse.success) {
        console.log("⚠️ PDF auto-download failed, proceeding with manual file selection...");
        console.log("🔧 User can manually download PDF and then select it");
        
        // Don't return here - proceed with file picker even if auto-download failed
        // The user can manually download the PDF first, then select it
      }
      
      console.log("✅ PDF download triggered, now requesting direct upload...");
      
      // Now request direct PDF upload via content script
      const uploadResponse = await chrome.tabs.sendMessage(tab.id, {
        action: "uploadPDFDirectly",
        profile: profile,
        config: {
          endpoint: CONFIG.API_ENDPOINT,
          token: decryptedToken
        }
      });
      
      console.log("📤 Upload response:", uploadResponse);
      
      if (uploadResponse && uploadResponse.success) {
        console.log("🎉 PDF uploaded successfully!");
        sendResponse({ 
          status: "✅ Profile PDF uploaded to Hireomatic successfully!", 
          profile: profile,
          apiResult: uploadResponse.result
        });
      } else {
        console.error("❌ PDF upload failed:", uploadResponse?.error);
        sendResponse({ 
          status: "❌ PDF upload failed: " + (uploadResponse?.error || "Unknown error"),
          profile: profile
        });
      }
      
      return; // Exit here since we're using the PDF upload flow
      
      if (apiResponse.ok) {
        const apiResult = await apiResponse.json();
        console.log("🎉 API call successful:", apiResult);
        sendResponse({ 
          status: "✅ Profile added to Hireomatic successfully!", 
          profile: profile,
          apiResult: apiResult
        });
      } else {
        const errorText = await apiResponse.text();
        console.error("❌ API call failed:", apiResponse.status, errorText);
        sendResponse({ 
          status: `❌ API call failed: ${apiResponse.status} ${apiResponse.statusText}`,
          profile: profile,
          error: errorText
        });
      }
      
    } catch (apiError) {
      console.error("❌ API call error:", apiError);
      sendResponse({ 
        status: "❌ API call failed: " + apiError.message,
        profile: profile
      });
    }
    
  } catch (error) {
    console.error("❌ Error in handleAddProfile:", error);
    sendResponse({ status: "❌ Failed to add profile: " + error.message });
  }
}

// Function to test token decryption
async function testTokenDecryption(token, sendResponse) {
  try {
    console.log('🧪 Testing decryption for token:', token);
    console.log('📏 Token length:', token.length);
    console.log('🔍 Token preview:', token.substring(0, 50) + '...');
    
    // Try to decrypt the token
    const decryptedToken = await decryptToken(token);
    
    if (decryptedToken) {
      console.log('✅ Token decryption successful!');
      console.log('🔑 Original token extracted:', decryptedToken);
      
      sendResponse({
        success: true,
        message: 'Token decryption successful',
        originalTokenLength: decryptedToken.length,
        originalTokenPreview: decryptedToken.substring(0, 50) + '...'
      });
    } else {
      console.log('❌ Token decryption failed');
      sendResponse({
        success: false,
        error: 'Failed to decrypt token'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in test decryption:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}