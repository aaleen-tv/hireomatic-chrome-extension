(() => {
  // Prevent multiple executions of the content script
  if (window.hireomaticScriptLoaded) {
    console.log("Hireomatic content script already loaded, skipping...");
    return;
  }
  window.hireomaticScriptLoaded = true;
  
  console.log("Hireomatic content script loading...");
  
  // Function to capture LinkedIn profile as PDF data directly
  async function captureLinkedInProfileAsPDF() {
    try {
      console.log("🚀 Capturing LinkedIn profile as PDF data directly...");
      
      // Since we can't easily intercept LinkedIn's PDF generation,
      // we'll use a different approach: trigger the download and then
      // immediately capture the file data for upload
      
      console.log("📄 Triggering LinkedIn's Save to PDF...");
      const success = await triggerLinkedInPDFSave();
      
      if (success) {
        console.log("✅ LinkedIn PDF generation triggered successfully");
        // The PDF will be downloaded, and the background script will handle the upload
        return true;
      } else {
        console.log("❌ LinkedIn PDF generation failed");
        return false;
      }
      
    } catch (error) {
      console.error("Error capturing LinkedIn profile as PDF:", error);
      return false;
    }
  }
  

  
  // Function to trigger LinkedIn's built-in PDF save (fallback method)
  async function triggerLinkedInPDFSave() {
    try {
      console.log("Attempting to trigger LinkedIn's built-in PDF save...");
      
      // Look for the "More" button
      const moreButton = document.querySelector('button[aria-label*="More"], button[aria-label*="more"], button[class*="more"]');
      if (!moreButton) {
        console.log("More button not found, trying alternative selectors...");
        // Try alternative selectors for the More button
        const alternativeMoreButtons = document.querySelectorAll('button');
        for (const button of alternativeMoreButtons) {
          const text = button.innerText?.toLowerCase() || '';
          if (text.includes('more') || text.includes('⋯') || text.includes('...')) {
            console.log("Found More button via text content:", button.innerText);
            moreButton = button;
            break;
          }
        }
      }
      
      if (moreButton) {
        console.log("Found More button, clicking it...");
        moreButton.click();
        
        // Wait for dropdown to appear
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Look for "Save to PDF" option in the dropdown
        const saveToPDFOption = document.querySelector('div[aria-label*="Save to PDF"], div[class*="save"], div[class*="pdf"], span[class*="save"], span[class*="pdf"]');
        
        if (!saveToPDFOption) {
          // Try to find by text content
          const allDropdownItems = document.querySelectorAll('div[role="menuitem"], div[class*="menu-item"], div[class*="dropdown-item"]');
          for (const item of allDropdownItems) {
            const text = item.innerText?.toLowerCase() || '';
            if (text.includes('save to pdf') || text.includes('save as pdf') || text.includes('download pdf')) {
              console.log("Found Save to PDF option via text content:", item.innerText);
              saveToPDFOption = item;
              break;
            }
          }
        }
        
        if (saveToPDFOption) {
          console.log("Found Save to PDF option, clicking it...");
          saveToPDFOption.click();
          console.log("✅ LinkedIn PDF save triggered successfully!");
          return true;
        } else {
          console.log("❌ Save to PDF option not found in dropdown");
          return false;
        }
      } else {
        console.log("❌ More button not found");
        return false;
      }
    } catch (error) {
      console.error("Error triggering LinkedIn PDF save:", error);
      return false;
    }
  }

  function getProfileInfo() {
    try {
      console.log("Attempting to scrape profile data using accessibility features...");
      
      // Get basic info that's easy to extract
      const name = document.querySelector("h1")?.innerText?.trim() || "";
      const url = window.location.href;
      
            // Use simple, reliable selectors instead of complex accessibility features
      let profileData = {
        name,
        url,
        headline: "",
        location: "",
        company: "",
        experience: [],
        education: [],
        skills: [],
        scrapedAt: new Date().toISOString()
      };
      
      // Get headline using simple selectors
      const headlineElement = document.querySelector('div.text-body-medium, div.text-body-large, div[class*="headline"]');
      if (headlineElement) {
        profileData.headline = headlineElement.innerText.trim();
        console.log("Found headline:", profileData.headline);
      }
      
      // Get location using simple pattern matching (no hardcoding)
      const allTextElements = document.querySelectorAll('span.text-body-small, div.text-body-small');
      for (const element of allTextElements) {
        const text = element.innerText?.trim();
        if (text && text.length > 0 && text.length < 100) {
          // Look for geographic patterns (city, state format) without hardcoding
          if (text.includes(',') && text.length < 50 && text.length > 5) {
            // Filter out company names and other non-location text
            if (!text.includes('Tech') && 
                !text.includes('Solutions') && 
                !text.includes('Corp') && 
                !text.includes('Inc') && 
                !text.includes('LLC') &&
                !text.includes('He/Him') && 
                !text.includes('She/Her') && 
                !text.includes('They/Them') &&
                !text.includes('1st') && 
                !text.includes('2nd') && 
                !text.includes('3rd') &&
                !text.includes('connection') &&
                !text.includes('followers') &&
                !text.includes('logo')) {
              profileData.location = text;
              console.log("Found location via pattern matching:", profileData.location);
              break;
            }
          }
        }
      }
      
      // Get company from experience section using simple selectors
      const experienceSection = document.querySelector('section#experience, section[data-section="experience"]');
      if (experienceSection) {
        const firstExperience = experienceSection.querySelector('li.artdeco-list__item:first-child, li:first-child');
        if (firstExperience) {
          // Look for company name in the first experience entry
          const companyElements = firstExperience.querySelectorAll('span.t-14.t-normal > span[aria-hidden="true"], span[class*="company"], div[class*="company"]');
          for (const element of companyElements) {
            const text = element.innerText?.trim();
            if (text && text.length > 0 && text.length < 100) {
              // Look for pattern like "Company Name · Full-time" or "Company Name · Part-time"
              if (text.includes('·')) {
                profileData.company = text.split('·')[0].trim();
              } else if (!text.includes('School') && 
                         !text.includes('College') && 
                         !text.includes('University') &&
                         !text.includes('logo') &&
                         !text.includes('He/Him') &&
                         !text.includes('She/Her') &&
                         !text.includes('They/Them')) {
                profileData.company = text;
              }
              
              if (profileData.company) {
                console.log("Found company:", profileData.company);
                break;
              }
            }
          }
        }
      }
      
      // Get main profile content for AI processing (fallback approach)
      let pageContent = "";
      const mainProfileSection = document.querySelector('main, [role="main"], .scaffold-finite-scroll');
      if (mainProfileSection) {
        pageContent = mainProfileSection.innerText || mainProfileSection.textContent || "";
      } else {
        pageContent = document.body.innerText || document.body.textContent || "";
      }
      
      // Clean and limit the content
      pageContent = pageContent
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim()
        .substring(0, 8000); // Reasonable size for AI processing
      
      profileData.pageContent = pageContent;
      
      // Debug logging for location extraction
      if (profileData.location) {
        console.log("✅ Location successfully extracted:", profileData.location);
      } else {
        console.log("❌ No location found - this might indicate an issue with the selectors");
      }
      
      console.log("Final scraped profile data using accessibility:", profileData);
      return profileData;
      
    } catch (error) {
      console.error("Error scraping profile:", error);
      return null;
    }
  }

  // Flag to prevent multiple PDF downloads
  let pdfSaveInProgress = false;
  
  // Flag to prevent multiple message listeners
  if (window.hireomaticMessageListenerSet) {
    console.log("Message listener already set, skipping...");
    return;
  }
  window.hireomaticMessageListenerSet = true;
  
  // Set up message listener immediately
  chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    console.log("Content script received message:", msg);
    
    if (msg.action === "ping") {
      console.log("Responding to ping with pong");
      sendResponse({ status: "pong" });
      return true;
    }
    
    if (msg.action === "triggerPDFSave") {
      if (pdfSaveInProgress) {
        console.log("PDF save already in progress, ignoring request");
        sendResponse({ success: false, message: "PDF save already in progress" });
        return true;
      }
      
      try {
        pdfSaveInProgress = true;
        console.log("Received triggerPDFSave request...");
        const success = await captureLinkedInProfileAsPDF();
        console.log("PDF capture result:", success);
        sendResponse({ success, message: success ? "PDF capture triggered" : "PDF capture failed" });
      } catch (error) {
        console.error("Error in triggerPDFSave:", error);
        sendResponse({ success: false, error: error.message });
      } finally {
        pdfSaveInProgress = false;
      }
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
  
  console.log("Hireomatic content script loaded successfully for LinkedIn profile:", window.location.href);
})();


