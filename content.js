(() => {
  console.log("Hireomatic content script loading...");
  
  function getProfileInfo() {
    try {
      console.log("Attempting to scrape profile data...");
      
      // Name: first <h1> on the page
      const name = document.querySelector("h1")?.innerText?.trim() || "";
      console.log("Found name:", name);
      
      // Headline: look for various possible selectors
      let headline = "";
      const headlineSelectors = [
        "div.text-body-medium",
        "div.text-body-large",
        "div[data-section='headline']",
        "div[class*='headline']",
        "div[class*='text-body']",
        "div[class*='pv-text-details__left-panel'] div[class*='text-body-medium']",
        "div[class*='pv-text-details__left-panel'] div[class*='text-body-large']"
      ];
      
      for (const selector of headlineSelectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText?.trim()) {
          headline = element.innerText.trim();
          console.log("Found headline with selector:", selector, headline);
          break;
        }
      }
      
      // Location: look for various possible selectors
      let location = "";
      const locationSelectors = [
        "span.text-body-small",
        "span[class*='location']",
        "div[class*='location']",
        "span[class*='text-body']",
        "div[class*='pv-text-details__left-panel'] span[class*='text-body-small']"
      ];
      
      for (const selector of locationSelectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText?.trim()) {
          location = element.innerText.trim();
          console.log("Found location with selector:", selector, location);
          break;
        }
      }
      
      // Company/Current role: look for current position
      let company = "";
      const companySelectors = [
        "div[class*='experience']",
        "div[class*='position']",
        "div[class*='company']",
        "div[class*='pv-text-details__left-panel'] div[class*='experience']",
        "div[class*='pv-text-details__left-panel'] div[class*='position']"
      ];
      
      for (const selector of companySelectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText?.trim()) {
          company = element.innerText.trim();
          console.log("Found company with selector:", selector, company);
          break;
        }
      }
      
      const profileData = { 
        name, 
        headline, 
        location, 
        company,
        url: window.location.href,
        scrapedAt: new Date().toISOString()
      };
      
      console.log("Final scraped profile data:", profileData);
      return profileData;
      
    } catch (error) {
      console.error("Error scraping profile:", error);
      return null;
    }
  }

  // Set up message listener immediately
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("Content script received message:", msg);
    
    if (msg.action === "ping") {
      console.log("Responding to ping with pong");
      sendResponse({ status: "pong" });
      return true;
    }
    
    if (msg.action === "scrapeProfile") {
      try {
        console.log("Processing scrapeProfile request...");
        
        // Respond quickly to prevent timeout
        const profile = getProfileInfo();
        
        if (profile && profile.name) {
          console.log("Sending profile data back:", profile);
          sendResponse(profile);
        } else {
          console.error("Failed to scrape profile - no valid data found");
          sendResponse({ 
            error: "No profile data found",
            url: window.location.href,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Error in message listener:", error);
        sendResponse({ 
          error: error.message,
          url: window.location.href,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Return true to indicate we will send a response asynchronously
    return true;
  });
  
  // Also try to scrape immediately when the script loads to test functionality
  setTimeout(() => {
    console.log("Testing profile scraping on load...");
    const testProfile = getProfileInfo();
    console.log("Test scrape result:", testProfile);
  }, 1000);
  
  console.log("Hireomatic content script loaded successfully for LinkedIn profile:", window.location.href);
})();
