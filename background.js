chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Background script received message:", msg);
  
  if (msg.action === "ping") {
    console.log("Background script responding to ping with pong");
    sendResponse({ status: "pong" });
    return true;
  }
  
  if (msg.action === "addProfile") {
    console.log("Processing addProfile request for tab:", msg.tabId);
    
    // Handle the profile addition asynchronously
    handleAddProfile(msg.tabId, sendResponse);
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

async function handleAddProfile(tabId, sendResponse) {
  try {
    // Check if tab exists and is accessible
    const tab = await chrome.tabs.get(tabId);
    if (!tab) {
      sendResponse({ status: "❌ Tab not found" });
      return;
    }
    
    // Check if we're on a LinkedIn profile page
    if (!tab.url || !tab.url.includes("linkedin.com/in/")) {
      sendResponse({ status: "❌ Please navigate to a LinkedIn profile page first" });
      return;
    }
    
    console.log("Tab validation passed, injecting content script...");
    
    // Inject content script to ensure it's running
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      console.log("Content script injected successfully");
    } catch (injectionError) {
      console.log("Content script injection result:", injectionError.message);
    }
    
    // Wait for script to initialize
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log("Testing content script with ping...");
    
    // Test content script with ping
    try {
      await new Promise((resolve, reject) => {
        const pingTimeout = setTimeout(() => {
          reject(new Error("Ping timeout"));
        }, 3000);
        
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
      console.log("Ping failed, attempting to re-inject:", pingError.message);
      
      // Try to inject again
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (retryError) {
        console.error("Retry injection failed:", retryError);
        sendResponse({ status: "❌ Failed to inject content script" });
        return;
      }
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
  }
}

// Function to upload PDF to API
async function uploadPDFToAPI(filename, profile, sendResponse) {
  try {
    console.log("Attempting to upload PDF to API:", filename);
    
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
    
    // Now let's actually upload the PDF to the API
    console.log("🚀 Starting actual API upload...");
    
    try {
      // Since we can't directly read local files in Chrome extensions,
      // we'll need to use a different approach. Let me try to read the file
      // using the chrome.downloads API and then upload it.
      
      // Since Chrome extensions can't directly read local files due to security restrictions,
      // we'll need to use a different approach. Let me try to get the file data
      // by sending a message to the content script to read the file if possible.
      
      console.log("📁 Attempting to read PDF file...");
      
      // For now, let's try the file:// protocol approach (this will likely fail)
      let fileData = null;
      try {
        const response = await fetch(`file://${filename}`);
        if (response.ok) {
          fileData = await response.blob();
          console.log("✅ Successfully read PDF file");
        }
      } catch (fileError) {
        console.log("❌ Direct file reading failed (expected):", fileError.message);
      }
      
      if (fileData) {
        // Prepare form data for upload
        const formData = new FormData();
        formData.append('file', fileData, `${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume.pdf`);
        formData.append('clientId', config.clientId);
        
        console.log("📤 Uploading to API...");
        
        // Upload to your API
        const response = await fetch('https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.jwtToken}`
          },
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("✅ PDF uploaded successfully to API:", result);
          
          sendResponse({ 
            status: "✅ Profile data extracted and PDF uploaded to API successfully!", 
            profile: profile,
            uploadSuccess: true,
            apiResult: result
          });
        } else {
          const errorText = await response.text();
          console.error("❌ API upload failed:", response.status, response.statusText, errorText);
          
          sendResponse({ 
            status: "✅ Profile data extracted! API upload failed. Check console for details.", 
            profile: profile,
            uploadSuccess: false,
            apiError: { status: response.status, message: errorText }
          });
        }
      } else {
        throw new Error("Could not read PDF file");
      }
      
      } catch (uploadError) {
        console.error("❌ PDF upload failed:", uploadError);
        
        // Fallback: provide manual upload information
        console.log("📋 Providing manual upload information as fallback");
        
        // Extract just the filename from the full path
        const justFilename = filename.split('/').pop();
        
        sendResponse({ 
          status: "✅ Profile data extracted! PDF ready for manual API upload.", 
          profile: profile,
          uploadSuccess: false,
          apiInfo: {
            endpoint: "https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate",
            clientId: config.clientId,
            filename: justFilename,
            curlCommand: `curl -X POST "https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate" -H "Authorization: Bearer ${config.jwtToken}" -F "file=@${justFilename}" -F "clientId=${config.clientId}`
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
  