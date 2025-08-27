// Global flag to prevent multiple upload attempts
let uploadInProgress = false;

// Rate limiting for API calls
let lastApiCall = 0;
const API_CALL_COOLDOWN = 5000; // 5 seconds between API calls

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
    
    // Check if tab exists and is accessible
    const tab = await chrome.tabs.get(tabId);
    if (!tab) {
      uploadInProgress = false; // Clear flag
      sendResponse({ status: "❌ Tab not found" });
      return;
    }
    
    // Check if we're on a LinkedIn profile page
    if (!tab.url || !tab.url.includes("linkedin.com/in/")) {
      uploadInProgress = false; // Clear flag
      sendResponse({ status: "❌ Please navigate to a LinkedIn profile page first" });
      return;
    }
    
    console.log("Tab validation passed, injecting content script...");
    
    // Inject content script only if not already injected
    try {
      // Check if content script is already running
      const isRunning = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
          if (chrome.runtime.lastError) {
            resolve(false); // Not running
          } else {
            resolve(true); // Already running
          }
        });
      });
      
      if (!isRunning) {
        console.log("Content script not running, injecting...");
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        console.log("Content script injected successfully");
        
        // Wait for script to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log("Content script already running, skipping injection");
      }
    } catch (injectionError) {
      console.log("Content script injection result:", injectionError.message);
    }
    
    console.log("Testing content script with ping...");
    
    // Test content script with ping
    try {
      await new Promise((resolve, reject) => {
        const pingTimeout = setTimeout(() => {
          reject(new Error("Ping timeout"));
        }, 5000); // Increased timeout
        
        chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
          clearTimeout(pingTimeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.status === "pong") {
            resolve();
          } else {
            reject(new Error("Invalid ping response"));
          }
        });
      });
      console.log("Content script ping successful");
    } catch (pingError) {
      console.log("Ping failed:", pingError.message);
      // Don't try to re-inject, just continue with the current script
    }
    
    console.log("Sending scrapeProfile message to content script...");
    
    // Now send the scrapeProfile message
    chrome.tabs.sendMessage(tabId, { action: "scrapeProfile" }, async (profile) => {
      console.log("Received response from content script:", profile);
      
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError);
        sendResponse({ status: "❌ Failed to communicate with page content: " + chrome.runtime.lastError.message });
        return;
      }
      
      if (!profile) {
        console.error("No profile data received");
        sendResponse({ status: "❌ No profile data found" });
        return;
      }
      
      if (profile.error) {
        console.error("Profile scraping error:", profile.error);
        sendResponse({ status: "❌ Profile scraping failed: " + profile.error });
        return;
      }
      
      console.log("Profile scraped successfully:", profile);
      
      // Trigger LinkedIn's built-in PDF save
      try {
        console.log("Triggering LinkedIn's built-in PDF save...");
        
        // Verify tab still exists before proceeding
        const currentTab = await chrome.tabs.get(tabId);
        if (!currentTab) {
          console.error("Tab no longer exists, skipping PDF save");
          throw new Error("Tab no longer exists");
        }
        
        // Send message to content script to trigger PDF save
        const pdfResult = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("PDF save timeout")), 10000);
          
          chrome.tabs.sendMessage(tabId, { action: "triggerPDFSave" }, (response) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
        
        if (pdfResult && pdfResult.success) {
          console.log("✅ LinkedIn PDF save triggered successfully!");
        } else {
          console.log("⚠️ LinkedIn PDF save failed:", pdfResult?.message || "Unknown error");
        }
        
      } catch (pdfError) {
        console.error("PDF save failed:", pdfError);
        // Continue without PDF if it fails
      }
      
      // Send success response
      sendResponse({ 
        status: "✅ Profile data extracted successfully! LinkedIn PDF save triggered.", 
        profile: profile
      });
      
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
        console.log("Uploading PDF to API endpoint...");
        
        // Get the most recently downloaded PDF file with better filtering
        const downloads = await chrome.downloads.search({ 
          limit: 5, 
          orderBy: ['-startTime'],
          filenameRegex: '.*\\.pdf$' // Only PDF files
        });
        
        if (downloads.length > 0) {
          // Find the most recent PDF that's likely from LinkedIn
          const pdfFile = downloads.find(download => 
            download.filename && 
            download.filename.toLowerCase().includes('.pdf') &&
            (download.filename.toLowerCase().includes('profile') || 
             download.filename.toLowerCase().includes('linkedin') ||
             download.filename.toLowerCase().includes('resume'))
          ) || downloads[0];
          
          console.log("Found downloaded PDF:", pdfFile.filename);
          console.log("Download state:", pdfFile.state);
          
          // Check if download is already complete
          if (pdfFile.state === 'complete') {
            console.log("PDF download already complete, proceeding with upload");
            uploadPDFToAPI(pdfFile.filename, profile, sendResponse);
          } else {
            // Set up a listener for when the download completes
            const downloadId = pdfFile.id;
            let uploadAttempted = false;
            
            const downloadListener = (delta) => {
              if (delta.id === downloadId && delta.state && delta.state.current === 'complete' && !uploadAttempted) {
                uploadAttempted = true;
                chrome.downloads.onChanged.removeListener(downloadListener);
                
                // Now try to upload the completed PDF
                uploadPDFToAPI(pdfFile.filename, profile, sendResponse);
              }
            };
            
            chrome.downloads.onChanged.addListener(downloadListener);
            
            // Set a shorter timeout and also check download status periodically
            setTimeout(() => {
              if (!uploadAttempted) {
                chrome.downloads.onChanged.removeListener(downloadListener);
                
                // Check current download status before giving up
                chrome.downloads.search({ id: downloadId }, (downloads) => {
                  if (downloads.length > 0 && downloads[0].state === 'complete') {
                    console.log("PDF download completed, proceeding with upload");
                    uploadPDFToAPI(downloads[0].filename, profile, sendResponse);
                  } else {
                    console.log("Download listener timeout, PDF saved locally");
                    sendResponse({ 
                      status: "✅ Profile data extracted! PDF saved locally.", 
                      profile: profile,
                      uploadSuccess: false
                    });
                  }
                });
              }
            }, 10000); // 10 second timeout
          }
        } else {
          console.log("No PDF file found for upload");
          
          // Wait a bit more and try again in case the download is still in progress
          setTimeout(async () => {
            const retryDownloads = await chrome.downloads.search({ 
              limit: 5, 
              orderBy: ['-startTime'],
              filenameRegex: '.*\\.pdf$'
            });
            
            if (retryDownloads.length > 0) {
              const retryPdfFile = retryDownloads.find(download => 
                download.filename && 
                download.filename.toLowerCase().includes('.pdf') &&
                (download.filename.toLowerCase().includes('profile') || 
                 download.filename.toLowerCase().includes('linkedin') ||
                 download.filename.toLowerCase().includes('resume'))
              ) || retryDownloads[0];
              
              console.log("Found PDF on retry:", retryPdfFile.filename);
              if (retryPdfFile.state === 'complete') {
                uploadPDFToAPI(retryPdfFile.filename, profile, sendResponse);
              } else {
                sendResponse({ 
                  status: "✅ Profile data extracted! PDF download in progress.", 
                  profile: profile,
                  uploadSuccess: false
                });
              }
            } else {
              sendResponse({ 
                status: "✅ Profile data extracted! PDF saved locally.", 
                profile: profile,
                uploadSuccess: false
              });
            }
          }, 3000); // Wait 3 seconds before retry
        }
      } catch (apiError) {
        console.error("API upload failed:", apiError);
        sendResponse({ 
          status: "✅ Profile data extracted! PDF saved locally.", 
          profile: profile,
          uploadSuccess: false
        });
      }
    });
    
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
        status: "✅ Profile data extracted! Please configure JWT Token and Client ID in extension popup.", 
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
  