document.addEventListener('DOMContentLoaded', () => {
  const addProfileBtn = document.getElementById("addProfile");
  const testConnectionBtn = document.getElementById("testConnection");
  const testDecryptionBtn = document.getElementById("testDecryption");
  const toggleDebugBtn = document.getElementById("toggleDebug");
  const saveConfigBtn = document.getElementById("saveConfig");
  const statusDiv = document.getElementById("status");
  const debugInfo = document.getElementById("debugInfo");
  const debugContent = document.getElementById("debugContent");
  const configStatus = document.getElementById("configStatus");
  
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
  
  // Test decryption button
  testDecryptionBtn.addEventListener("click", async () => {
    try {
      testDecryptionBtn.disabled = true;
      testDecryptionBtn.textContent = "Testing...";
      statusDiv.innerText = "🔄 Testing token decryption...";
      
      // Get stored token
      chrome.storage.sync.get(['hireomatic_token', 'token_timestamp'], async (result) => {
        try {
          if (!result.hireomatic_token) {
            statusDiv.innerText = "❌ No token found in storage. Please login to Hireomatic first.";
            return;
          }
          
          console.log("🔍 Testing decryption for stored token:");
          console.log("📋 Token:", result.hireomatic_token);
          console.log("📏 Length:", result.hireomatic_token.length);
          console.log("🔍 Preview:", result.hireomatic_token.substring(0, 50) + "...");
          console.log("⏰ Stored at:", new Date(result.token_timestamp).toLocaleString());
          
          // Test the decryption by sending a message to background script
          chrome.runtime.sendMessage({ 
            action: "testDecryption",
            token: result.hireomatic_token
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Decryption test error:", chrome.runtime.lastError);
              statusDiv.innerText = "❌ Decryption test failed: " + chrome.runtime.lastError.message;
            } else if (response && response.success) {
              statusDiv.innerText = "✅ Token decryption successful! Original token extracted.";
              console.log("🎉 Decryption successful:", response);
            } else {
              statusDiv.innerText = "❌ Token decryption failed: " + (response?.error || "Unknown error");
              console.error("Decryption failed:", response);
            }
            
            testDecryptionBtn.disabled = false;
            testDecryptionBtn.textContent = "🧪 Test Token Decryption";
          });
          
        } catch (error) {
          console.error("Error in decryption test:", error);
          statusDiv.innerText = "❌ Decryption test error: " + error.message;
          testDecryptionBtn.disabled = false;
          testDecryptionBtn.textContent = "🧪 Test Token Decryption";
        }
      });
      
    } catch (error) {
      console.error("Error testing decryption:", error);
      statusDiv.innerText = "❌ Test failed: " + error.message;
      testDecryptionBtn.disabled = false;
      testDecryptionBtn.textContent = "🧪 Test Token Decryption";
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
                let statusHTML = `
                  <div style="text-align: left;">
                    <strong>✅ Profile Data Extracted Successfully!</strong><br>
                    <strong>Name:</strong> ${profile.name}<br>
                    <strong>URL:</strong> <a href="${profile.url}" target="_blank">View Profile</a><br>
                `;
                
                if (profile.headline) {
                  statusHTML += `<strong>Headline:</strong> ${profile.headline}<br>`;
                }
                
                if (profile.location) {
                  statusHTML += `<strong>Location:</strong> ${profile.location}<br>`;
                }
                
                if (profile.company) {
                  statusHTML += `<strong>Company:</strong> ${profile.company}<br>`;
                }
                
                if (profile.experience && profile.experience.length > 0) {
                  statusHTML += `<strong>Experience:</strong> ${profile.experience.length} positions<br>`;
                }
                
                if (profile.education && profile.education.length > 0) {
                  statusHTML += `<strong>Education:</strong> ${profile.education.length} institutions<br>`;
                }
                
                if (profile.skills && profile.skills.length > 0) {
                  statusHTML += `<strong>Skills:</strong> ${profile.skills.length} skills<br>`;
                }
                
                if (profile.pageContent) {
                  statusHTML += `<strong>Fallback Content:</strong> ${profile.pageContent.length.toLocaleString()} characters<br>`;
                }
                
                // Add API upload information if available
                if (response.apiInfo) {
                  if (response.apiInfo.manualUpload) {
                    statusHTML += `
                      <br><strong>📤 Manual PDF Upload Required:</strong><br>
                      <small style="color: #7C3AED;">
                        Use the "Select PDF for Upload" button above, or this command:<br>
                        <code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-size: 10px;">
                          ${response.apiInfo.curlCommand}
                        </code>
                      </small>
                    `;
                  } else {
                    statusHTML += `
                      <br><strong>📤 API Upload Ready:</strong><br>
                      <small style="color: #059669;">
                        Endpoint: ${response.apiInfo.endpoint}<br>
                        Client ID: ${response.apiInfo.clientId}<br>
                        PDF: ${response.apiInfo.filename}<br>
                        Use the curl command in your terminal to upload
                      </small>
                    `;
                  }
                }
                
                // Add API upload success information if available
                if (response.apiResult) {
                  statusHTML += `
                    <br><strong>🎉 API Upload Successful!</strong><br>
                    <small style="color: #059669;">
                      PDF uploaded to your API endpoint<br>
                      Response: ${JSON.stringify(response.apiResult)}
                    </small>
                  `;
                }
                
                // Add API upload error information if available
                if (response.apiError) {
                  statusHTML += `
                    <br><strong>❌ API Upload Failed:</strong><br>
                    <small style="color: #DC2626;">
                      Status: ${response.apiError.status}<br>
                      Error: ${response.apiError.message}
                    </small>
                  `;
                }
                
                statusHTML += `
                    <br><strong>Data Source:</strong> Simple Selectors + AI Processing ✅<br>
                    <small style="color: #666;">Clean data extraction with fallback content for AI</small>
                  </div>
                `;
                
                statusDiv.innerHTML = statusHTML;
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
  
  // Load saved configuration
  loadConfiguration();
  
  // Save configuration button
  saveConfigBtn.addEventListener("click", saveConfiguration);
  
  console.log("Hireomatic popup loaded");
});

// Configuration functions
function loadConfiguration() {
  chrome.storage.sync.get(['jwtToken', 'clientId'], (result) => {
    if (result.jwtToken) {
      document.getElementById('jwtToken').value = result.jwtToken;
    }
    if (result.clientId) {
      document.getElementById('clientId').value = result.clientId;
    }
  });
}

function saveConfiguration() {
  const jwtToken = document.getElementById('jwtToken').value;
  const clientId = document.getElementById('clientId').value;
  
  if (!jwtToken || !clientId) {
    configStatus.textContent = "❌ Please fill in both JWT Token and Client ID";
    configStatus.style.color = "#DC2626";
    return;
  }
  
  chrome.storage.sync.set({
    jwtToken: jwtToken,
    clientId: clientId
  }, () => {
    configStatus.textContent = "✅ Configuration saved successfully!";
    configStatus.style.color = "#059669";
    
    // Clear status after 3 seconds
    setTimeout(() => {
      configStatus.textContent = "";
    }, 3000);
  });
}


  