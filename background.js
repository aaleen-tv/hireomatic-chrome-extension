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
    chrome.tabs.sendMessage(tabId, { action: "scrapeProfile" }, (profile) => {
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
      
      // Send success response
      sendResponse({ 
        status: "✅ Profile scraped successfully!", 
        profile: profile
      });
      
      console.log("Profile ready for Hireomatic:", {
        name: profile.name,
        headline: profile.headline,
        location: profile.location,
        company: profile.company,
        url: profile.url
      });
    });
    
  } catch (error) {
    console.error("Error in handleAddProfile:", error);
    sendResponse({ status: "❌ Failed to add profile: " + error.message });
  }
}
  