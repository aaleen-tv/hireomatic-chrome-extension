// Global flag to prevent multiple upload attempts
let uploadInProgress = false;

// Rate limiting for API calls
let lastApiCall = 0;
const API_CALL_COOLDOWN = 5000; // 5 seconds between API calls

// Track active tab operations to prevent duplicate calls
let activeTabOperations = new Set();

// Function to safely send messages to tabs with error handling
async function safeSendMessage(tabId, message, timeout = 5000) {
  try {
    // Check if tab still exists
    const tab = await chrome.tabs.get(tabId);
    if (!tab) {
      console.log("Tab no longer exists, skipping message");
      return { error: "Tab no longer exists" };
    }
    
    // Check if tab is accessible
    if (!tab.url || !tab.url.includes("linkedin.com")) {
      console.log("Tab not accessible or not on LinkedIn, skipping message");
      return { error: "Tab not accessible" };
    }
    
    return new Promise((resolve, reject) => {
      const messageTimeout = setTimeout(() => {
        reject(new Error("Message timeout"));
      }, timeout);
      
      chrome.tabs.sendMessage(tabId, message, (response) => {
        clearTimeout(messageTimeout);
        
        if (chrome.runtime.lastError) {
          console.log("Runtime error in message:", chrome.runtime.lastError.message);
          resolve({ error: chrome.runtime.lastError.message });
        } else {
          resolve(response);
        }
      });
    });
  } catch (error) {
    console.log("Error in safeSendMessage:", error.message);
    return { error: error.message };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Background script received message:", msg);
  
  if (msg.action === "ping") {
    console.log("Background script responding to ping with pong");
    sendResponse({ status: "pong" });
    return true;
  }
  
  if (msg.action === "addProfile") {
    if (uploadInProgress) {
      console.log("Upload already in progress, ignoring request");
      sendResponse({ status: "❌ Upload already in progress, please wait" });
      return true;
    }
    
    // Rate limiting check
    const now = Date.now();
    if (now - lastApiCall < API_CALL_COOLDOWN) {
      console.log("API call rate limited, please wait");
      sendResponse({ status: "❌ Please wait a few seconds before trying again" });
      return true;
    }
    lastApiCall = now;
    
    console.log("Processing addProfile request for tab:", msg.tabId);
    
    // Handle the profile addition asynchronously
    handleAddProfile(msg.tabId, sendResponse);
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

async function handleAddProfile(tabId, sendResponse) {
  try {
    uploadInProgress = true; // Set flag to prevent multiple uploads
    
    let tab;
    
    // If no tabId provided, get the current active tab
    if (!tabId) {
      console.log("No tabId provided, getting current active tab...");
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        uploadInProgress = false;
        sendResponse({ status: "❌ No active tab found" });
        return;
      }
      tab = tabs[0];
      console.log("Using current active tab:", tab.id);
    } else {
      tab = await chrome.tabs.get(tabId);
    }
    
    if (!tab || !tab.url || !tab.url.includes("linkedin.com")) {
      uploadInProgress = false;
      sendResponse({ status: "❌ Invalid tab or not on LinkedIn" });
      return;
    }
    
    console.log("Processing profile for tab:", tab.id, "URL:", tab.url);
    
    // Check if content script is already running
    try {
      const pingResponse = await safeSendMessage(tab.id, { action: "ping" }, 3000);
      if (pingResponse.error) {
        console.log("Content script not responding, injecting...");
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        console.log("Content script injected successfully");
      } else {
        console.log("Content script already running, skipping injection");
      }
    } catch (injectionError) {
      console.log("Content script injection result:", injectionError.message);
    }
    
    console.log("Testing content script with ping...");
    
    // Test content script with ping using safe function
    try {
      const pingResponse = await safeSendMessage(tab.id, { action: "ping" }, 3000);
      if (pingResponse.error) {
        throw new Error(pingResponse.error);
      } else if (pingResponse && pingResponse.status === "pong") {
        console.log("Content script ping successful");
      } else {
        throw new Error("Invalid ping response");
      }
    } catch (pingError) {
      console.log("Ping failed:", pingError.message);
      // Don't try to re-inject, just continue with the current script
    }
    
    console.log("Sending scrapeProfile message to content script...");
    
    // Now send the scrapeProfile message using safe function
    const profile = await safeSendMessage(tab.id, { action: "scrapeProfile" }, 10000);
    console.log("Received response from content script:", profile);
    
    if (profile.error) {
      console.error("Profile scraping error:", profile.error);
      sendResponse({ status: "❌ Profile scraping failed: " + profile.error });
      return;
    }
    
    if (!profile || !profile.name) {
      console.error("No profile data received");
      sendResponse({ status: "❌ No profile data found" });
      return;
    }
    
    console.log("Profile scraped successfully:", profile);
    
    // Record the start time of profile processing for PDF matching
    const profileProcessingStartTime = Date.now();
    console.log("🕐 Profile processing started at:", new Date(profileProcessingStartTime).toLocaleTimeString());
    
    // Trigger LinkedIn's built-in PDF save
    try {
      console.log("Triggering LinkedIn's built-in PDF save...");
      
      // Verify tab still exists before proceeding
      const currentTab = await chrome.tabs.get(tab.id);
      if (!currentTab) {
        console.error("Tab no longer exists, skipping PDF save");
        throw new Error("Tab no longer exists");
      }
      
      // Send message to content script to trigger PDF save
      const pdfResult = await safeSendMessage(tab.id, { action: "triggerPDFSave" }, 10000);
      
      if (pdfResult && pdfResult.success) {
        console.log("✅ LinkedIn PDF save triggered successfully!");
      } else {
        console.log("⚠️ LinkedIn PDF save failed:", pdfResult?.message || "Unknown error");
      }
      
    } catch (pdfError) {
      console.error("PDF save failed:", pdfError);
      // Continue without PDF if it fails
    }
    
    console.log("Profile ready for Hireomatic:", {
      name: profile.name,
      headline: profile.headline,
      location: profile.location,
      company: profile.company,
      experienceCount: profile.experience?.length || 0,
      educationCount: profile.education?.length || 0,
      skillsCount: profile.skills?.length || 0,
      fallbackContent: profile.pageContent?.length || 0
    });
    
    // Upload PDF to your API endpoint
    try {
      console.log("🚀 Starting PDF upload process...");
      
      // Wait a moment for the download to start
      console.log("⏳ Waiting 3 seconds for PDF download to start...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get the most recently downloaded PDF files
      const downloads = await chrome.downloads.search({ 
        limit: 20, 
        orderBy: ['-startTime'],
        filenameRegex: '.*\\.pdf$' // Only PDF files
      });
      
      console.log("📁 Found downloads:", downloads.length);
      downloads.forEach((download, index) => {
        console.log(`  ${index + 1}. ${download.filename} - State: ${download.state} - Started: ${new Date(download.startTime).toLocaleTimeString()}`);
      });
      
      if (downloads.length > 0) {
        // SIMPLE STRATEGY: Find PDFs that started AFTER this profile processing began
        // This ensures we get the PDF from the current profile, not a previous one
        const recentDownloads = downloads.filter(download => 
          download.startTime && 
          download.startTime > profileProcessingStartTime
        );
        
        console.log("📅 Recent downloads (after profile processing):", recentDownloads.length);
        recentDownloads.forEach((download, index) => {
          console.log(`  ${index + 1}. ${download.filename} - Started: ${new Date(download.startTime).toLocaleTimeString()}`);
        });
        
        let pdfFile;
        
        if (recentDownloads.length > 0) {
          // Use the most recent PDF from this session
          pdfFile = recentDownloads[0];
          console.log("✅ Found recent PDF:", pdfFile.filename);
        } else {
          // Fallback: use the most recent overall PDF
          pdfFile = downloads[0];
          console.log("⚠️ No recent PDFs found, using most recent overall:", pdfFile.filename);
        }
        
        console.log("🎯 Selected PDF for upload:", pdfFile.filename);
        console.log("📊 Download state:", pdfFile.state);
        console.log("🕐 Download started:", new Date(pdfFile.startTime).toLocaleTimeString());
        
        // Check if download is already complete
        if (pdfFile.state === 'complete') {
          console.log("✅ PDF download already complete, proceeding with upload");
          uploadPDFToAPI(pdfFile.filename, profile, sendResponse);
        } else {
          console.log("⏳ PDF download in progress, setting up completion listener...");
          
          // Set up a listener for when the download completes
          const downloadId = pdfFile.id;
          let uploadAttempted = false;
          
          const downloadListener = (delta) => {
            console.log("📥 Download state change detected:", delta);
            if (delta.id === downloadId && delta.state && delta.state.current === 'complete' && !uploadAttempted) {
              console.log("🎉 PDF download completed, proceeding with upload");
              uploadAttempted = true;
              chrome.downloads.onChanged.removeListener(downloadListener);
              
              // Now try to upload the completed PDF
              uploadPDFToAPI(pdfFile.filename, profile, sendResponse);
            }
          };
          
          chrome.downloads.onChanged.addListener(downloadListener);
          console.log("👂 Download listener attached for ID:", downloadId);
          
          // Set a timeout and also check download status periodically
          setTimeout(() => {
            if (!uploadAttempted) {
              console.log("⏰ Download listener timeout reached, checking final status...");
              chrome.downloads.onChanged.removeListener(downloadListener);
              
              // Check current download status before giving up
              chrome.downloads.search({ id: downloadId }, (downloads) => {
                if (downloads.length > 0 && downloads[0].state === 'complete') {
                  console.log("✅ PDF download completed on timeout check, proceeding with upload");
                  uploadPDFToAPI(downloads[0].filename, profile, sendResponse);
                } else {
                  console.log("❌ Download listener timeout, PDF saved locally");
                  sendResponse({ 
                    status: "✅ Profile data extracted! PDF saved locally.", 
                    profile: profile,
                    uploadSuccess: false
                  });
                }
              });
            }
          }, 15000); // 15 second timeout
        }
      } else {
        console.log("❌ No PDF files found for upload");
        
        // Wait a bit more and try again in case the download is still in progress
        console.log("⏳ Waiting 5 seconds before retry...");
        setTimeout(async () => {
          console.log("🔄 Retrying PDF search...");
          const retryDownloads = await chrome.downloads.search({ 
            limit: 10, 
            orderBy: ['-startTime'],
            filenameRegex: '.*\\.pdf$'
          });
          
          console.log("📁 Retry found downloads:", retryDownloads.length);
          retryDownloads.forEach((download, index) => {
            console.log(`  ${index + 1}. ${download.filename} - State: ${download.state} - Started: ${new Date(download.startTime).toLocaleTimeString()}`);
          });
          
          if (retryDownloads.length > 0) {
            // Use the same time-based filtering for retry
            console.log("🕐 Retry: Looking for PDFs started after:", new Date(profileProcessingStartTime).toLocaleTimeString());
            
            const recentRetryDownloads = retryDownloads.filter(download => 
              download.startTime && 
              download.startTime > profileProcessingStartTime
            );
            
            console.log("📅 Recent retry downloads:", recentRetryDownloads.length);
            
            const retryPdfFile = recentRetryDownloads.find(download => 
              download.filename && 
              download.filename.toLowerCase().includes('.pdf') &&
              (download.filename.toLowerCase().includes('profile') || 
               download.filename.toLowerCase().includes('linkedin') ||
               download.filename.toLowerCase().includes('resume'))
            ) || recentRetryDownloads[0] || retryDownloads[0];
            
            console.log("🎯 Retry selected PDF:", retryPdfFile.filename);
            if (retryPdfFile.state === 'complete') {
              console.log("✅ Retry PDF is complete, proceeding with upload");
              uploadPDFToAPI(retryPdfFile.filename, profile, sendResponse);
              return;
            } else {
              console.log("⏳ Retry PDF still in progress");
              sendResponse({ 
                status: "✅ Profile data extracted! PDF download in progress.", 
                profile: profile,
                uploadSuccess: false
              });
              return;
            }
          } else {
            console.log("❌ No PDFs found on retry");
            sendResponse({ 
              status: "✅ Profile data extracted! PDF saved locally.", 
              profile: profile,
              uploadSuccess: false
            });
          }
        }, 5000); // Wait 5 seconds before retry
      }
    } catch (apiError) {
      console.error("❌ API upload failed:", apiError);
      sendResponse({ 
        status: "✅ Profile data extracted! PDF saved locally.", 
        profile: profile,
        uploadSuccess: false
      });
    }
    
  } catch (error) {
    console.error("Error in handleAddProfile:", error);
    sendResponse({ status: "❌ Failed to add profile: " + error.message });
  } finally {
    uploadInProgress = false; // Always clear the flag
  }
}

// Function to upload PDF to R2 via your API endpoint
async function uploadPDFToAPI(filename, profile, sendResponse) {
  try {
    console.log("🚀 Uploading LinkedIn PDF to R2 via your API endpoint...");
    
    // Get stored configuration
    const config = await new Promise((resolve) => {
      chrome.storage.sync.get(['jwtToken', 'clientId'], resolve);
    });
    
    if (!config.jwtToken || !config.clientId) {
      console.error("❌ JWT Token or Client ID not configured");
      sendResponse({ 
        status: "❌ JWT Token or Client ID not configured. Please configure in extension popup.", 
        profile: profile,
        uploadSuccess: false
      });
      return;
    }
    
    console.log("📤 Preparing to upload PDF to R2...");
    console.log("📁 PDF File:", filename);
    console.log("👤 Profile:", profile.name);
    console.log("🔑 Client ID:", config.clientId);
    
    // Since we can't read local files directly from the background script,
    // we'll use a different approach: create a download URL and fetch it
    // This bypasses the file:// restriction
    
    try {
      // Get the download item to access its URL
      const downloads = await chrome.downloads.search({ filename: filename });
      if (downloads.length === 0) {
        throw new Error("Download item not found");
      }
      
      const downloadItem = downloads[0];
      console.log("📥 Download item found:", downloadItem);
      
      // Try to get the download URL
      if (downloadItem.url) {
        console.log("🌐 Download URL available:", downloadItem.url);
        
        // Fetch the PDF data from the download URL
        const response = await fetch(downloadItem.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
        
        const pdfBlob = await response.blob();
        console.log("✅ PDF data fetched successfully, size:", pdfBlob.size);
        
        // Now upload the PDF blob to your R2 endpoint
        const formData = new FormData();
        formData.append('file', pdfBlob, `${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume.pdf`);
        formData.append('clientId', config.clientId);
        
        console.log("📤 Uploading PDF blob to R2 via your API...");
        
        const uploadResponse = await fetch('https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.jwtToken}`
          },
          body: formData
        });
        
        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          console.log("🎉 PDF uploaded successfully to R2:", result);
          
          sendResponse({ 
            status: "✅ Profile data extracted and PDF uploaded to R2 successfully!", 
            profile: profile,
            uploadSuccess: true,
            apiResult: result
          });
        } else {
          const errorText = await uploadResponse.text();
          console.error("❌ R2 upload failed:", uploadResponse.status, uploadResponse.statusText, errorText);
          throw new Error(`R2 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
        
      } else {
        throw new Error("Download URL not available");
      }
      
    } catch (directUploadError) {
      console.error("❌ Direct R2 upload failed:", directUploadError);
      
      // Fallback: provide manual upload information
      const justFilename = filename.split('/').pop();
      sendResponse({ 
        status: "✅ Profile data extracted! PDF ready for manual upload to R2.", 
        profile: profile,
        uploadSuccess: false,
        apiInfo: {
          endpoint: "https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate",
          clientId: config.clientId,
          filename: justFilename,
          curlCommand: `curl -X POST "https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate" -H "Authorization: Bearer ${config.jwtToken}" -F "file=@${justFilename}" -F "clientId=${config.clientId}`,
          manualUpload: true
        }
      });
    }
    
  } catch (error) {
    console.error("Error in uploadPDFToAPI:", error);
    sendResponse({ 
      status: "✅ Profile data extracted! PDF saved locally.", 
      profile: profile,
      uploadSuccess: false
    });
  }
}
  