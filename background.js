// // Global flag to prevent multiple upload attempts
// let uploadInProgress = false;

// // Rate limiting for API calls
// let lastApiCall = 0;
// const API_CALL_COOLDOWN = 5000; // 5 seconds between API calls

// // Track active tab operations to prevent duplicate calls
// let activeTabOperations = new Set();

// // Track last processed profile URL to prevent wrong PDF uploads
// let lastProcessedProfileUrl = null;

// // Function to safely send messages to tabs with error handling
// async function safeSendMessage(tabId, message, timeout = 5000) {
//   try {
//     // Check if tab still exists
//     const tab = await chrome.tabs.get(tabId);
//     if (!tab) {
//       console.log("Tab no longer exists, skipping message");
//       return { error: "Tab no longer exists" };
//     }
    
//     // Check if tab is accessible
//     if (!tab.url || !tab.url.includes("linkedin.com")) {
//       console.log("Tab not accessible or not on LinkedIn, skipping message");
//       return { error: "Tab not accessible" };
//     }
    
//     return new Promise((resolve, reject) => {
//       const messageTimeout = setTimeout(() => {
//         reject(new Error("Message timeout"));
//       }, timeout);
      
//       chrome.tabs.sendMessage(tabId, message, (response) => {
//         clearTimeout(messageTimeout);
        
//         if (chrome.runtime.lastError) {
//           console.log("Runtime error in message:", chrome.runtime.lastError.message);
//           resolve({ error: chrome.runtime.lastError.message });
//         } else {
//           resolve(response);
//         }
//       });
//     });
//   } catch (error) {
//     console.log("Error in safeSendMessage:", error.message);
//     return { error: error.message };
//   }
// }

// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//   console.log("Background script received message:", msg);
  
//   if (msg.action === "ping") {
//     console.log("Background script responding to ping with pong");
//     sendResponse({ status: "pong" });
//     return true;
//   }
  
//   if (msg.action === "addProfile") {
//     if (uploadInProgress) {
//       console.log("Upload already in progress, ignoring request");
//       sendResponse({ status: "❌ Upload already in progress, please wait" });
//       return true;
//     }
    
//     // Rate limiting check
//     const now = Date.now();
//     if (now - lastApiCall < API_CALL_COOLDOWN) {
//       console.log("API call rate limited, please wait");
//       sendResponse({ status: "❌ Please wait a few seconds before trying again" });
//       return true;
//     }
//     lastApiCall = now;
    
//     console.log("Processing addProfile request for tab:", msg.tabId);
    
//     // Handle the profile addition asynchronously
//     handleAddProfile(msg.tabId, sendResponse);
    
//     // Return true to indicate we will send a response asynchronously
//     return true;
//   }
  
//   // Handle JWT token from Hireomatic app
//   if (msg.token) {
//     console.log("🎉 Received JWT token from Hireomatic app!");
//     console.log("🔑 Token length:", msg.token.length);
//     console.log("🔑 Token preview:", msg.token.substring(0, 20) + "...");
    
//     // Store the token in chrome.storage.sync for later use
//     chrome.storage.sync.set({ jwtToken: msg.token }, () => {
//       if (chrome.runtime.lastError) {
//         console.error("❌ Failed to store JWT token:", chrome.runtime.lastError.message);
//       } else {
//         console.log("✅ JWT token stored successfully in extension storage");
//       }
//     });
    
//     // Send confirmation back to the app
//     sendResponse({ status: "✅ JWT token received and stored successfully" });
//     return true;
//   }
// });

// async function handleAddProfile(tabId, sendResponse) {
//   try {
//     uploadInProgress = true; // Set flag to prevent multiple uploads
    
//     let tab;
    
//     // If no tabId provided, get the current active tab
//     if (!tabId) {
//       console.log("No tabId provided, getting current active tab...");
//       const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
//       if (tabs.length === 0) {
//         uploadInProgress = false;
//         sendResponse({ status: "❌ No active tab found" });
//         return;
//       }
//       tab = tabs[0];
//       console.log("Using current active tab:", tab.id);
//     } else {
//       tab = await chrome.tabs.get(tabId);
//     }
    
//     // Check if tab exists and is accessible
//     if (!tab) {
//       uploadInProgress = false; // Clear flag
//       sendResponse({ status: "❌ Tab not found" });
//       return;
//     }
    
//     // Check if we're on a LinkedIn profile page
//     if (!tab.url || !tab.url.includes("linkedin.com/in/")) {
//       uploadInProgress = false; // Clear flag
//       sendResponse({ status: "❌ Please navigate to a LinkedIn profile page first" });
//       return;
//     }
    
//     console.log("Processing profile for tab:", tab.id, "URL:", tab.url);
    
//     // Check if content script is already running
//     try {
//       const pingResponse = await safeSendMessage(tab.id, { action: "ping" }, 3000);
//       if (pingResponse.error) {
//         console.log("Content script not responding, injecting...");
//         await chrome.scripting.executeScript({
//           target: { tabId: tab.id },
//           files: ['content.js']
//         });
//         console.log("Content script injected successfully");
//       } else {
//         console.log("Content script already running, skipping injection");
//       }
//     } catch (injectionError) {
//       console.log("Content script injection result:", injectionError.message);
//     }
    
//     console.log("Testing content script with ping...");
    
//     // Test content script with ping using safe function
//     try {
//       const pingResponse = await safeSendMessage(tab.id, { action: "ping" }, 3000);
//       if (pingResponse.error) {
//         throw new Error(pingResponse.error);
//       } else if (pingResponse && pingResponse.status === "pong") {
//         console.log("Content script ping successful");
//       } else {
//         throw new Error("Invalid ping response");
//       }
//     } catch (pingError) {
//       console.log("Ping failed:", pingError.message);
//       // Don't try to re-inject, just continue with the current script
//     }
    
//     console.log("Sending scrapeProfile message to content script...");
    
//     // Now send the scrapeProfile message using safe function
//     const profile = await safeSendMessage(tab.id, { action: "scrapeProfile" }, 10000);
//     console.log("Received response from content script:", profile);
    
//     if (profile.error) {
//       console.error("Profile scraping error:", profile.error);
//       sendResponse({ status: "❌ Profile scraping failed: " + profile.error });
//       return;
//     }
    
//     if (!profile || !profile.name) {
//       console.error("No profile data received");
//       sendResponse({ status: "❌ No profile data found" });
//       return;
//     }
    
//     console.log("Profile scraped successfully:", profile);
    
//     // Record the start time of profile processing for PDF matching
//     const profileProcessingStartTime = Date.now();
//     const currentProfileUrl = tab.url;
//     console.log("🕐 Profile processing started at:", new Date(profileProcessingStartTime).toLocaleTimeString());
//     console.log("🔗 Current profile URL:", currentProfileUrl);
    
//     // CRITICAL FIX: Track profile changes to prevent wrong PDF uploads
//     // This ensures we only see PDFs from the current profile session
//     console.log("🧹 Checking for profile change to prevent wrong PDF uploads...");
    
//     // Store the last processed profile URL to detect changes
//     if (!lastProcessedProfileUrl) {
//       lastProcessedProfileUrl = currentProfileUrl;
//       console.log("🆕 First profile processing, setting baseline");
//     } else if (lastProcessedProfileUrl !== currentProfileUrl) {
//       console.log("🔄 Profile changed from:", lastProcessedProfileUrl);
//       console.log("🔄 Profile changed to:", currentProfileUrl);
//       console.log("⚠️ Profile change detected - this should prevent wrong PDF uploads");
//       lastProcessedProfileUrl = currentProfileUrl;
//     } else {
//       console.log("🔄 Same profile as last time");
//     }
    
//     // Trigger LinkedIn's built-in PDF save
//     try {
//       console.log("Triggering LinkedIn's built-in PDF save...");
      
//       // Verify tab still exists before proceeding
//       const currentTab = await chrome.tabs.get(tab.id);
//       if (!currentTab) {
//         console.error("Tab no longer exists, skipping PDF save");
//         throw new Error("Tab no longer exists");
//       }
      
//       // Send message to content script to trigger PDF save
//       const pdfResult = await safeSendMessage(tab.id, { action: "triggerPDFSave" }, 10000);
      
//       if (pdfResult && pdfResult.success) {
//         console.log("✅ LinkedIn PDF save triggered successfully!");
//       } else {
//         console.log("⚠️ LinkedIn PDF save failed:", pdfResult?.message || "Unknown error");
//       }
      
//     } catch (pdfError) {
//       console.error("PDF save failed:", pdfError);
//       // Continue without PDF if it fails
//     }
    
//     console.log("Profile ready for Hireomatic:", {
//       name: profile.name,
//       headline: profile.headline,
//       location: profile.location,
//       company: profile.company,
//       experienceCount: profile.experience?.length || 0,
//       educationCount: profile.education?.length || 0,
//       skillsCount: profile.skills?.length || 0,
//       fallbackContent: profile.pageContent?.length || 0
//     });
    
//     // Upload PDF to your API endpoint
//     try {
//       console.log("🚀 Starting PDF upload process...");
      
//       // AGGRESSIVE STRATEGY: Only look for PDFs from this exact session
//       console.log("⏳ Waiting for new PDF download to start...");
      
//       let newPdfFound = false;
//       let pdfFile = null;
//       let attempts = 0;
//       const maxAttempts = 20; // Wait up to 20 seconds
      
//       while (!newPdfFound && attempts < maxAttempts) {
//         attempts++;
//         console.log(`🔍 Attempt ${attempts}/${maxAttempts}: Looking for new PDF...`);
        
//         // Get current downloads
//         const downloads = await chrome.downloads.search({ 
//           limit: 50, 
//           orderBy: ['-startTime'],
//           filenameRegex: '.*\\.pdf$'
//         });
        
//         console.log(`📁 Found ${downloads.length} total downloads`);
        
//         // AGGRESSIVE FILTERING: Only PDFs that started AFTER this profile processing began
//         // AND are very recent (within last 30 seconds) to prevent old PDF confusion
//         const thirtySecondsAgo = Date.now() - 30000;
//         const recentDownloads = downloads.filter(download => 
//           download.startTime && 
//           download.startTime > profileProcessingStartTime &&
//           download.startTime > thirtySecondsAgo
//         );
        
//         console.log(`📅 Recent downloads (after profile processing + within 30s): ${recentDownloads.length}`);
        
//         if (recentDownloads.length > 0) {
//           // Found a new PDF from this session!
//           pdfFile = recentDownloads[0];
//           newPdfFound = true;
//           console.log("🎉 Found new PDF:", pdfFile.filename);
//           console.log("🕐 Started at:", new Date(pdfFile.startTime).toLocaleTimeString());
//           console.log("⏱️ Time since profile start:", Math.round((pdfFile.startTime - profileProcessingStartTime) / 1000) + "s");
//           break;
//         }
        
//         // Wait 1 second before next attempt
//         console.log("⏳ No new PDF yet, waiting 1 second...");
//         await new Promise(resolve => setTimeout(resolve, 1000));
//       }
      
//       if (!newPdfFound) {
//         console.log("❌ No new PDF found after waiting, falling back to most recent...");
//         const downloads = await chrome.downloads.search({ 
//           limit: 20, 
//           orderBy: ['-startTime'],
//           filenameRegex: '.*\\.pdf$'
//         });
        
//         if (downloads.length > 0) {
//           pdfFile = downloads[0];
//           console.log("⚠️ Using fallback PDF:", pdfFile.filename);
//         } else {
//           console.log("❌ No PDFs found at all");
//           sendResponse({ 
//             status: "✅ Profile data extracted! No PDF found for upload.", 
//             profile: profile,
//             uploadSuccess: false
//           });
//           return;
//         }
//             }
      
//       console.log("🎯 Selected PDF for upload:", pdfFile.filename);
//       console.log("📊 Download state:", pdfFile.state);
//       console.log("🕐 Download started:", new Date(pdfFile.startTime).toLocaleTimeString());
      
//       // Check if download is already complete
//       if (pdfFile.state === 'complete') {
//         console.log("✅ PDF download already complete, proceeding with upload");
//         uploadPDFToAPI(pdfFile.filename, profile, sendResponse);
//       } else {
//         console.log("⏳ PDF download in progress, setting up completion listener...");
        
//         // Set up a listener for when the download completes
//         const downloadId = pdfFile.id;
//         let uploadAttempted = false;
        
//         const downloadListener = (delta) => {
//           console.log("📥 Download state change detected:", delta);
//           if (delta.id === downloadId && delta.state && delta.state.current === 'complete' && !uploadAttempted) {
//             console.log("🎉 PDF download completed, proceeding with upload");
//             uploadAttempted = true;
//             chrome.downloads.onChanged.removeListener(downloadListener);
            
//             // Now try to upload the completed PDF
//             uploadPDFToAPI(pdfFile.filename, profile, sendResponse);
//           }
//         };
        
//         chrome.downloads.onChanged.addListener(downloadListener);
//         console.log("👂 Download listener attached for ID:", downloadId);
        
//         // Set a timeout and also check download status periodically
//         setTimeout(() => {
//           if (!uploadAttempted) {
//             console.log("⏰ Download listener timeout reached, checking final status...");
//             chrome.downloads.onChanged.removeListener(downloadListener);
            
//             // Check current download status before giving up
//             chrome.downloads.search({ id: downloadId }, (downloads) => {
//               if (downloads.length > 0 && downloads[0].state === 'complete') {
//                 console.log("✅ PDF download completed on timeout check, proceeding with upload");
//                 uploadPDFToAPI(downloads[0].filename, profile, sendResponse);
//               } else {
//                 console.log("❌ Download listener timeout, PDF saved locally");
//                 sendResponse({ 
//                   status: "✅ Profile data extracted! PDF saved locally.", 
//                   profile: profile,
//                   uploadSuccess: false
//                 });
//               }
//             });
//           }
//         }, 15000); // 15 second timeout
//       }
//     } catch (apiError) {
//       console.error("❌ API upload failed:", apiError);
//       sendResponse({ 
//         status: "✅ Profile data extracted! PDF saved locally.", 
//         profile: profile,
//         uploadSuccess: false
//       });
//     }
    
//   } catch (error) {
//     console.error("Error in handleAddProfile:", error);
//     sendResponse({ status: "❌ Failed to add profile: " + error.message });
//   } finally {
//     uploadInProgress = false; // Always clear the flag
//   }
// }

// // Function to upload PDF to R2 via your API endpoint
// async function uploadPDFToAPI(filename, profile, sendResponse) {
//   try {
//     console.log("🚀 Uploading LinkedIn PDF to R2 via your API endpoint...");
    
//     // Get stored configuration
//     const config = await new Promise((resolve) => {
//       chrome.storage.sync.get(['jwtToken', 'clientId'], resolve);
//     });
    
//     if (!config.jwtToken || !config.clientId) {
//       console.error("❌ JWT Token or Client ID not configured");
//       sendResponse({ 
//         status: "❌ JWT Token or Client ID not configured. Please configure in extension popup.", 
//         profile: profile,
//         uploadSuccess: false
//       });
//       return;
//     }
    
//     console.log("📤 Preparing to upload PDF to R2...");
//     console.log("📁 PDF File:", filename);
//     console.log("👤 Profile:", profile.name);
//     console.log("🔑 Client ID:", config.clientId);
    
//     // Since we can't read local files directly from the background script,
//     // we'll use a different approach: create a download URL and fetch it
//     // This bypasses the file:// restriction
    
//     try {
//       // Get the download item to access its URL
//       const downloads = await chrome.downloads.search({ filename: filename });
//       if (downloads.length === 0) {
//         throw new Error("Download item not found");
//       }
      
//       const downloadItem = downloads[0];
//       console.log("📥 Download item found:", downloadItem);
      
//       // Try to get the download URL
//       if (downloadItem.url) {
//         console.log("🌐 Download URL available:", downloadItem.url);
        
//         // Fetch the PDF data from the download URL
//         const response = await fetch(downloadItem.url);
//         if (!response.ok) {
//           throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
//         }
        
//         const pdfBlob = await response.blob();
//         console.log("✅ PDF data fetched successfully, size:", pdfBlob.size);
        
//         // Now upload the PDF blob to your R2 endpoint
//         const formData = new FormData();
//         formData.append('file', pdfBlob, `${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume.pdf`);
//         formData.append('clientId', config.clientId);
        
//         console.log("📤 Uploading PDF blob to R2 via your API...");
        
//         const uploadResponse = await fetch('https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate', {
//           method: 'POST',
//           headers: {
//             // 'Authorization': `Bearer ${config.jwtToken}`
//             "Content-Type": "application/json"
//           },
//           body: formData,
//           credentials: "include" // 🔑 this sends the cookie
//         });
        
//         if (uploadResponse.ok) {
//           const result = await uploadResponse.json();
//           console.log("🎉 PDF uploaded successfully to R2:", result);
          
//           sendResponse({ 
//             status: "✅ Profile data extracted and PDF uploaded to R2 successfully!", 
//             profile: profile,
//             uploadSuccess: true,
//             apiResult: result
//           });
//         } else {
//           const errorText = await uploadResponse.text();
//           console.error("❌ R2 upload failed:", uploadResponse.status, uploadResponse.statusText, errorText);
//           throw new Error(`R2 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
//         }
        
//       } else {
//         throw new Error("Download URL not available");
//       }
      
//     } catch (directUploadError) {
//       console.error("❌ Direct R2 upload failed:", directUploadError);
      
//       // Fallback: provide manual upload information
//       const justFilename = filename.split('/').pop();
//       sendResponse({ 
//         status: "✅ Profile data extracted! PDF ready for manual upload to R2.", 
//         profile: profile,
//         uploadSuccess: false,
//         apiInfo: {
//           endpoint: "https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate",
//           clientId: config.clientId,
//           filename: justFilename,
//           curlCommand: `curl -X POST "https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate" -H "Authorization: Bearer ${config.jwtToken}" -F "file=@${justFilename}" -F "clientId=${config.clientId}`,
//           manualUpload: true
//         }
//       });
//     }
    
//   } catch (error) {
//     console.error("Error in uploadPDFToAPI:", error);
//     sendResponse({ 
//       status: "✅ Profile data extracted! PDF saved locally.", 
//       profile: profile,
//       uploadSuccess: false
//     });
//   }
// }
  

// background.js
console.log('Background script loaded');

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'storeToken') {
    chrome.storage.sync.set({
      'hireomatic_token': request.token,
      'token_timestamp': Date.now()
    }, () => {
      console.log('Token stored in background');
      sendResponse({ success: true });
    });
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'getToken') {
    chrome.storage.sync.get(['hireomatic_token', 'token_timestamp'], (result) => {
      console.log('Token retrieved in background:', result);
      sendResponse({ 
        token: result.hireomatic_token || null,
        timestamp: result.token_timestamp || null
      });
    });
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'clearToken') {
    chrome.storage.sync.remove(['hireomatic_token', 'token_timestamp'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});