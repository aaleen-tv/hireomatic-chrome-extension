document.addEventListener('DOMContentLoaded', () => {
  const addProfileBtn = document.getElementById("addProfile");
  const testConnectionBtn = document.getElementById("testConnection");
  const toggleDebugBtn = document.getElementById("toggleDebug");
  const statusDiv = document.getElementById("status");
  const debugInfo = document.getElementById("debugInfo");
  const debugContent = document.getElementById("debugContent");
  
  // Toggle debug info
  toggleDebugBtn.addEventListener("click", () => {
    debugInfo.classList.toggle("show");
    if (debugInfo.classList.contains("show")) {
      toggleDebugBtn.textContent = "Hide Debug Info";
      updateDebugInfo();
    } else {
      toggleDebugBtn.textContent = "Show Debug Info";
    }
  });
  
  // Update debug information
  async function updateDebugInfo() {
    try {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const debugData = {
        "Current Tab ID": tab ? tab.id : "N/A",
        "Current URL": tab ? tab.url : "N/A",
        "Is LinkedIn Profile": tab && tab.url ? tab.url.includes("linkedin.com/in/") : false,
        "Extension Version": chrome.runtime.getManifest().version,
        "Extension ID": chrome.runtime.id,
        "Timestamp": new Date().toLocaleString()
      };
      
      debugContent.innerHTML = Object.entries(debugData)
        .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
        .join('<br>');
        
    } catch (error) {
      debugContent.innerHTML = `<strong>Error:</strong> ${error.message}`;
    }
  }
  
  // Test connection button
  testConnectionBtn.addEventListener("click", async () => {
    try {
      testConnectionBtn.disabled = true;
      testConnectionBtn.textContent = "Testing...";
      statusDiv.innerText = "🔄 Testing connection...";
      
      // Get current active tab
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error("No active tab found");
      }
      
      console.log("Testing connection for tab:", tab.id);
      
      // Test if we can send a message to the background script
      chrome.runtime.sendMessage({ action: "ping" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Background script error:", chrome.runtime.lastError);
          statusDiv.innerText = "❌ Background script error: " + chrome.runtime.lastError.message;
        } else if (response && response.status === "pong") {
          statusDiv.innerText = "✅ Background script connection successful";
          
          // Now test content script connection
          if (tab.url && tab.url.includes("linkedin.com/in/")) {
            chrome.tabs.sendMessage(tab.id, { action: "ping" }, (contentResponse) => {
              if (chrome.runtime.lastError) {
                console.error("Content script error:", chrome.runtime.lastError);
                statusDiv.innerText = "⚠️ Background OK, but content script not responding. Try refreshing the page.";
              } else if (contentResponse && contentResponse.status === "pong") {
                statusDiv.innerText = "✅ All connections successful! Extension is working properly.";
              } else {
                statusDiv.innerText = "⚠️ Background OK, but content script response invalid.";
              }
            });
          } else {
            statusDiv.innerText = "⚠️ Background OK, but not on a LinkedIn profile page.";
          }
        } else {
          statusDiv.innerText = "❌ Unexpected background script response";
        }
        
        testConnectionBtn.disabled = false;
        testConnectionBtn.textContent = "Test Connection";
      });
      
    } catch (error) {
      console.error("Error testing connection:", error);
      statusDiv.innerText = "❌ Test failed: " + error.message;
      testConnectionBtn.disabled = false;
      testConnectionBtn.textContent = "Test Connection";
    }
  });
  
  // Add profile button
  addProfileBtn.addEventListener("click", async () => {
    try {
      // Disable button and show loading state
      addProfileBtn.disabled = true;
      addProfileBtn.textContent = "Processing...";
      statusDiv.innerText = "🔄 Processing profile...";
      
      // Get current active tab
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error("No active tab found");
      }
      
      // Check if we're on a LinkedIn profile page
      if (!tab.url || !tab.url.includes("linkedin.com/in/")) {
        statusDiv.innerText = "❌ Please navigate to a LinkedIn profile page first";
        addProfileBtn.disabled = false;
        addProfileBtn.textContent = "Add Profile to Hireomatic";
        return;
      }
      
      console.log("Sending message to background script for tab:", tab.id);
      statusDiv.innerText = "🔄 Sending request to background script...";
      
      // Set a timeout for the entire operation
      const operationTimeout = setTimeout(() => {
        statusDiv.innerText = "❌ Operation timed out. Please try again.";
        addProfileBtn.disabled = false;
        addProfileBtn.textContent = "Add Profile to Hireomatic";
      }, 20000); // 20 second timeout
      
      // Send message to background script
      chrome.runtime.sendMessage({ action: "addProfile", tabId: tab.id }, (response) => {
        clearTimeout(operationTimeout);
        
        console.log("Received response from background script:", response);
        
        try {
          if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError);
            statusDiv.innerText = "❌ Extension error: " + chrome.runtime.lastError.message;
            return;
          }
          
          if (response && response.status) {
            console.log("Response status:", response.status);
            statusDiv.innerText = response.status;
            
            if (response.profile) {
              console.log("Profile data received:", response.profile);
              
              // Show profile details in status
              const profile = response.profile;
              if (profile.name) {
                statusDiv.innerHTML = `
                  <div style="text-align: left;">
                    <strong>✅ Profile Scraped Successfully!</strong><br>
                    <strong>Name:</strong> ${profile.name}<br>
                    <strong>Headline:</strong> ${profile.headline || 'N/A'}<br>
                    <strong>Location:</strong> ${profile.location || 'N/A'}<br>
                    <strong>Company:</strong> ${profile.company || 'N/A'}<br>
                    <strong>URL:</strong> <a href="${profile.url}" target="_blank">View Profile</a>
                  </div>
                `;
              }
            }
          } else {
            console.error("Unexpected response format:", response);
            statusDiv.innerText = "❌ Unexpected response format";
          }
        } catch (error) {
          console.error("Error handling response:", error);
          statusDiv.innerText = "❌ Error processing response: " + error.message;
        } finally {
          // Re-enable button
          addProfileBtn.disabled = false;
          addProfileBtn.textContent = "Add Profile to Hireomatic";
        }
      });
      
    } catch (error) {
      console.error("Error in popup:", error);
      statusDiv.innerText = "❌ Error: " + error.message;
      addProfileBtn.disabled = false;
      addProfileBtn.textContent = "Add Profile to Hireomatic";
    }
  });
  
  console.log("Hireomatic popup loaded");
});
  