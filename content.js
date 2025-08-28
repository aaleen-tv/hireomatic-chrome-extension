(() => {
  console.log("🚀 HIREOMATIC: Content script starting...");
  console.log("🚀 HIREOMATIC: Current URL:", window.location.href);
  
  // Test alert to verify script is running
  if (window.location.href.includes('linkedin.com')) {
    console.log("🎯 HIREOMATIC: LinkedIn detected - script is working!");
    // Uncomment the line below if you want to see a visible alert
    // alert("Hireomatic extension is loaded and working!");
  }
  
  // Prevent multiple executions of the content script
  if (window.hireomaticScriptLoaded) {
    console.log("Hireomatic content script already loaded, skipping...");
    return;
  }
  window.hireomaticScriptLoaded = true;
  
  console.log("Hireomatic content script loading...");
  console.log("📍 Current URL:", window.location.href);
  console.log("🔍 Referrer:", document.referrer);
  console.log("📱 User Agent:", navigator.userAgent);
  
  // Track if this is a page reload or external navigation
  let isPageReload = false;
  let isExternalNavigation = false;
  
  // Check if this is a page reload by looking at performance navigation type
  if (performance.navigation.type === 1) {
    isPageReload = true;
    console.log("🔄 Page reload detected");
  }
  
  // Check if this is a page reload by looking at page visibility API
  if (document.visibilityState === 'visible' && !document.hidden) {
    // Additional check: if the page was previously loaded, this might be a reload
    if (sessionStorage.getItem('hireomatic_page_loaded')) {
      isPageReload = true;
      console.log("🔄 Page reload detected via session storage");
    }
    sessionStorage.setItem('hireomatic_page_loaded', 'true');
  }
  
  // Check if this is external navigation (coming from Google, etc.)
  if (document.referrer && !document.referrer.includes('linkedin.com')) {
    isExternalNavigation = true;
    console.log("🌐 External navigation detected from:", document.referrer);
  }
  
  // Also check if we're on a profile page and this is the first time
  if (window.location.href.includes('linkedin.com/in/') && !sessionStorage.getItem('hireomatic_profile_visited')) {
    isExternalNavigation = true;
    console.log("🆕 First time profile visit detected");
    sessionStorage.setItem('hireomatic_profile_visited', 'true');
  }
  
  // Function to check if we're on a LinkedIn profile page
  function isLinkedInProfilePage() {
    const url = window.location.href;
    
    // Check if we're on a specific profile page (not just any LinkedIn page)
    if (url.includes('linkedin.com/in/')) {
      // Additional check: make sure it's a real profile, not a search or other page
      const pathParts = window.location.pathname.split('/');
      if (pathParts.length >= 3 && pathParts[1] === 'in' && pathParts[2]) {
        // Check if there's a profile identifier (not empty and not a common non-profile path)
        const profileId = pathParts[2];
        if (profileId && 
            !profileId.includes('?') && 
            !profileId.includes('&') && 
            !profileId.includes('search') &&
            !profileId.includes('company') &&
            !profileId.includes('school') &&
            profileId.length > 2) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Function to check if we're browsing vs visiting a profile
  function isBrowsingLinkedIn() {
    const url = window.location.href;
    
    // Check if we're on pages that indicate browsing/searching
    if (url.includes('linkedin.com/search/') ||
        url.includes('linkedin.com/feed/') ||
        url.includes('linkedin.com/mynetwork/') ||
        url.includes('linkedin.com/messaging/') ||
        url.includes('linkedin.com/notifications/') ||
        url.includes('linkedin.com/jobs/') ||
        url.includes('linkedin.com/learning/') ||
        url.includes('linkedin.com/sales/') ||
        url.includes('linkedin.com/talent/') ||
        url.includes('linkedin.com/company/') ||
        url.includes('linkedin.com/school/') ||
        url.includes('linkedin.com/groups/') ||
        url.includes('linkedin.com/events/') ||
        url.includes('linkedin.com/posts/') ||
        url.includes('linkedin.com/articles/') ||
        url.includes('linkedin.com/pulse/')) {
      return true;
    }
    
    // Check if we're on the main LinkedIn homepage
    if (url === 'https://www.linkedin.com/' || 
        url === 'https://www.linkedin.com' ||
        url.match(/^https:\/\/www\.linkedin\.com\/\?.*$/)) {
      return true;
    }
    
    return false;
  }
  
  // Function to check if we should show the overlay
  function shouldShowOverlay() {
    console.log("🔍 shouldShowOverlay() called");
    console.log("🔍 Current URL:", window.location.href);
    console.log("🔍 isBrowsingLinkedIn():", isBrowsingLinkedIn());
    console.log("🔍 isLinkedInProfilePage():", isLinkedInProfilePage());
    console.log("🔍 Overlay exists:", !!document.getElementById('hireomatic-overlay'));
    console.log("🔍 isPageReload:", isPageReload);
    console.log("🔍 isExternalNavigation:", isExternalNavigation);
    
    // Don't show if we're browsing LinkedIn (not on a specific profile)
    if (isBrowsingLinkedIn()) {
      console.log("❌ Not showing overlay - browsing LinkedIn, not on a profile");
      return false;
    }
    
    // Only show on LinkedIn profile pages
    if (!isLinkedInProfilePage()) {
      console.log("❌ Not showing overlay - not a LinkedIn profile page");
      return false;
    }
    
    // Check if overlay already exists
    if (document.getElementById('hireomatic-overlay')) {
      console.log("❌ Overlay already exists, not showing another");
      return false;
    }
    
    // Show if it's a page reload or external navigation
    if (isPageReload || isExternalNavigation) {
      console.log("✅ Showing overlay - page reload or external navigation detected");
      return true;
    }
    
    console.log("✅ Should show overlay - fresh profile visit");
    // Return true for fresh visits so the main logic can handle it
    return true;
  }
  
  // Create and inject the overlay based on conditions
  console.log("🔍 Initial overlay check - shouldShowOverlay():", shouldShowOverlay());
  console.log("🔍 isPageReload:", isPageReload);
  console.log("🔍 isExternalNavigation:", isExternalNavigation);
  
  if (shouldShowOverlay()) {
    // For immediate cases (reload, external navigation), show overlay right away
    if (isPageReload || isExternalNavigation) {
      console.log("🚀 Showing overlay immediately (reload or external navigation)");
      createHireomaticOverlay();
    } else {
      console.log("⏳ Waiting for profile content to load before showing overlay");
      // For other cases, wait for content to load
      waitForProfileContent();
    }
  } else {
    console.log("❌ Initial overlay check failed - not showing overlay");
    
    // If we're on LinkedIn but not on a profile page, set up navigation monitoring
    if (window.location.href.includes('linkedin.com') && !window.location.href.includes('linkedin.com/in/')) {
      console.log("🌐 On LinkedIn but not on profile page - setting up navigation monitoring");
      // The navigation detection methods below will handle profile navigation
    }
  }
  
  // Function to wait for profile content to load before showing overlay
  function waitForProfileContent() {
    console.log("⏳ Waiting for profile content to load...");
    
    // Check if content is already available
    if (isProfileContentReady()) {
      console.log("✅ Profile content already ready, showing overlay");
      createHireomaticOverlay();
      return;
    }
    
    // Wait for content to load with multiple checks
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds total (20 * 500ms)
    
    const checkContent = () => {
      attempts++;
      console.log(`⏳ Checking profile content (attempt ${attempts}/${maxAttempts})`);
      
      if (isProfileContentReady()) {
        console.log("✅ Profile content ready, showing overlay");
        createHireomaticOverlay();
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkContent, 500);
      } else {
        console.log("❌ Profile content not ready after maximum attempts");
      }
    };
    
    // Start checking after a short delay
    setTimeout(checkContent, 500);
  }
  
  // Function to check if profile content is ready
  function isProfileContentReady() {
    const hasName = document.querySelector('h1') && 
                   document.querySelector('h1').innerText && 
                   document.querySelector('h1').innerText.trim().length > 0;
    
    const hasHeadline = document.querySelector('div.text-body-medium, div.text-body-large, div[class*="headline"]') &&
                       document.querySelector('div.text-body-medium, div.text-body-large, div[class*="headline"]').innerText &&
                       document.querySelector('div.text-body-medium, div.text-body-large, div[class*="headline"]').innerText.trim().length > 0;
    
    const hasExperience = document.querySelector('section#experience, section[data-section="experience"]') !== null;
    
    console.log("🔍 Content check - Name:", hasName, "Headline:", hasHeadline, "Experience:", hasExperience);
    
    // Require at least name and one other element
    return hasName && (hasHeadline || hasExperience);
  }
  
  // Listen for navigation changes (for SPA navigation)
  let currentUrl = window.location.href;
  let lastProfileUrl = null;
  
  // Function to handle navigation to a new profile
  function handleProfileNavigation(newUrl, previousUrl) {
    console.log("🎯 Profile navigation detected:", { from: previousUrl, to: newUrl });
    
    // Remove existing overlay if any
    const existingOverlay = document.getElementById('hireomatic-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
      console.log("🗑️ Removed existing overlay");
    }
    
    // Reset external navigation flag for this new profile
    isExternalNavigation = false;
    
    // Wait a bit for the new page content to load, then check if we should show overlay
    setTimeout(() => {
      console.log("🔍 Checking if overlay should be shown for new profile...");
      if (shouldShowOverlay()) {
        console.log("✅ Should show overlay, calling waitForProfileContent...");
        waitForProfileContent();
      } else {
        console.log("❌ Should not show overlay");
      }
    }, 1000);
  }
  
  // Function to handle navigation away from profile pages
  function handleProfileExit(newUrl, previousUrl) {
    console.log("🚪 Profile exit detected:", { from: previousUrl, to: newUrl });
    
    // Remove existing overlay if any
    const existingOverlay = document.getElementById('hireomatic-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
      console.log("🗑️ Removed overlay - no longer on profile page");
    }
    
    // Reset profile-related flags
    isExternalNavigation = false;
    
    console.log("✅ Overlay cleanup completed for non-profile page");
  }
  
  // Set up multiple navigation detection methods
  
  // Method 1: Polling for URL changes (most reliable for LinkedIn)
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      const previousUrl = currentUrl;
      currentUrl = window.location.href;
      console.log("🔄 URL changed (polling) from:", previousUrl, "to:", currentUrl);
      
      // Check if we navigated to a profile page
      if (currentUrl.includes('linkedin.com/in/') && !previousUrl.includes('linkedin.com/in/')) {
        console.log("🎯 Navigated to profile page from:", previousUrl);
        handleProfileNavigation(currentUrl, previousUrl);
      } else if (currentUrl.includes('linkedin.com/in/') && previousUrl.includes('linkedin.com/in/')) {
        // Navigating between different profiles
        console.log("🔄 Navigated between profiles");
        handleProfileNavigation(currentUrl, previousUrl);
      } else if (previousUrl.includes('linkedin.com/in/') && !currentUrl.includes('linkedin.com/in/')) {
        // Navigated away from profile page to non-profile page
        console.log("🚪 Navigated away from profile page to:", currentUrl);
        handleProfileExit(currentUrl, previousUrl);
      }
    }
  }, 500); // Check every 500ms
  
  // Method 2: MutationObserver for DOM changes
  const observer = new MutationObserver((mutations) => {
    // Look for navigation indicators in DOM changes
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // Check if this looks like a navigation change
        const addedNodes = Array.from(mutation.addedNodes);
        const hasNavigationIndicator = addedNodes.some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Look for elements that typically appear during navigation
            return node.querySelector && (
              node.querySelector('h1') || 
              node.querySelector('[data-section="experience"]') ||
              node.querySelector('.profile-background')
            );
          }
          return false;
        });
        
        if (hasNavigationIndicator) {
          console.log("🔍 DOM change suggests navigation, checking URL...");
          if (window.location.href !== currentUrl) {
            const previousUrl = currentUrl;
            currentUrl = window.location.href;
            console.log("🔄 URL changed (DOM) from:", previousUrl, "to:", currentUrl);
            
            if (currentUrl.includes('linkedin.com/in/')) {
              handleProfileNavigation(currentUrl, previousUrl);
            } else if (previousUrl.includes('linkedin.com/in/')) {
              handleProfileExit(currentUrl, previousUrl);
            }
          }
        }
      }
    });
  });
  
  // Start observing for DOM changes
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Method 3: History API events
  window.addEventListener('popstate', () => {
    console.log("🔄 Popstate event detected");
    setTimeout(() => {
      if (window.location.href !== currentUrl) {
        const previousUrl = currentUrl;
        currentUrl = window.location.href;
        console.log("🔄 URL changed (popstate) from:", previousUrl, "to:", currentUrl);
        
        if (currentUrl.includes('linkedin.com/in/')) {
          handleProfileNavigation(currentUrl, previousUrl);
        } else if (previousUrl.includes('linkedin.com/in/')) {
          handleProfileExit(currentUrl, previousUrl);
        }
      }
    }, 500);
  });
  
  // Method 4: Override history methods
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    console.log("🔄 PushState event detected");
    setTimeout(() => {
      if (window.location.href !== currentUrl) {
        const previousUrl = currentUrl;
        currentUrl = window.location.href;
        console.log("🔄 URL changed (pushState) from:", previousUrl, "to:", currentUrl);
        
        if (currentUrl.includes('linkedin.com/in/')) {
          handleProfileNavigation(currentUrl, previousUrl);
        } else if (previousUrl.includes('linkedin.com/in/')) {
          handleProfileExit(currentUrl, previousUrl);
        }
      }
    }, 500);
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    console.log("🔄 ReplaceState event detected");
    setTimeout(() => {
      if (window.location.href !== currentUrl) {
        const previousUrl = currentUrl;
        currentUrl = window.location.href;
        console.log("🔄 URL changed (replaceState) from:", previousUrl, "to:", currentUrl);
        
        if (currentUrl.includes('linkedin.com/in/')) {
          handleProfileNavigation(currentUrl, previousUrl);
        } else if (previousUrl.includes('linkedin.com/in/')) {
          handleProfileExit(currentUrl, previousUrl);
        }
      }
    }, 500);
  };
  
  // Method 6: Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    console.log("🚪 Page unloading, cleaning up overlay...");
    const existingOverlay = document.getElementById('hireomatic-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
      console.log("🗑️ Removed overlay on page unload");
    }
  });
  
  // Method 5: Listen for LinkedIn-specific navigation events
  document.addEventListener('click', (event) => {
    // Check if the clicked element is a profile link
    const profileLink = event.target.closest('a[href*="/in/"]');
    if (profileLink) {
      console.log("🔗 Profile link clicked:", profileLink.href);
      // Set a flag to expect navigation
      window.expectingProfileNavigation = true;
      
      // Check for navigation after a delay
      setTimeout(() => {
        if (window.expectingProfileNavigation && window.location.href !== currentUrl) {
          const previousUrl = currentUrl;
          currentUrl = window.location.href;
          console.log("🔄 URL changed (link click) from:", previousUrl, "to:", currentUrl);
          
          if (currentUrl.includes('linkedin.com/in/')) {
            window.expectingProfileNavigation = false;
            handleProfileNavigation(currentUrl, previousUrl);
          } else if (previousUrl.includes('linkedin.com/in/')) {
            window.expectingProfileNavigation = false;
            handleProfileExit(currentUrl, previousUrl);
          }
        }
      }, 1500);
    }
    
    // Also check for non-profile links (like home, feed, etc.)
    const nonProfileLink = event.target.closest('a[href*="/feed/"], a[href*="/mynetwork/"], a[href*="/jobs/"], a[href*="/messaging/"], a[href="/"]');
    if (nonProfileLink && window.location.href.includes('linkedin.com/in/')) {
      console.log("🔗 Non-profile link clicked:", nonProfileLink.href);
      // Set a flag to expect navigation away from profile
      window.expectingProfileExit = true;
      
      // Check for navigation after a delay
      setTimeout(() => {
        if (window.expectingProfileExit && window.location.href !== currentUrl) {
          const previousUrl = currentUrl;
          currentUrl = window.location.href;
          console.log("🔄 URL changed (non-profile link) from:", previousUrl, "to:", currentUrl);
          
          if (!currentUrl.includes('linkedin.com/in/')) {
            window.expectingProfileExit = false;
            handleProfileExit(currentUrl, previousUrl);
          }
        }
      }, 1000);
    }
  });
  
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
  
  // Function to create and inject the Hireomatic overlay
  function createHireomaticOverlay() {
    try {
      console.log("🎨 Creating Hireomatic overlay...");
      
      // Check if overlay already exists
      if (document.getElementById('hireomatic-overlay')) {
        console.log("Overlay already exists, skipping...");
        return;
      }
      
      // Create overlay container
      const overlay = document.createElement('div');
      overlay.id = 'hireomatic-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: white;
        border: 2px solid #FF7233;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        padding: 16px;
        min-width: 200px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(-20px);
        animation: slideIn 0.5s ease forwards;
      `;
      
      // Add CSS animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
      
      // Create header
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e0e0e0;
      `;
      
      const logo = document.createElement('div');
      logo.innerHTML = '🚀';
      logo.style.cssText = `
        font-size: 20px;
        margin-right: 8px;
      `;
      
      const title = document.createElement('div');
      title.textContent = 'Hireomatic';
      title.style.cssText = `
        font-weight: 600;
        color: #FF7233;
        font-size: 16px;
      `;
      
      header.appendChild(logo);
      header.appendChild(title);
      
      // Create button
      const button = document.createElement('button');
      button.textContent = 'Add to Hireomatic';
      button.style.cssText = `
        width: 100%;
        padding: 12px 16px;
        background: #FF7233;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      `;
      
      // Add hover effects
      button.addEventListener('mouseenter', () => {
        button.style.background = '#005a8b';
        button.style.transform = 'translateY(-1px)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.background = '#FF7233';
        button.style.transform = 'translateY(0)';
      });
      
      // Add click handler
      button.addEventListener('click', async () => {
        try {
          button.disabled = true;
          button.textContent = 'Processing...';
          button.style.background = '#666';
          
          console.log("🚀 Add to Hireomatic button clicked!");
          
          // Send message to background script
          const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              action: 'addProfile',
              tabId: null // Background script will get current tab
            }, (response) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          });
          
          if (response && response.uploadSuccess) {
            button.textContent = '✅ Added!';
            button.style.background = '#28a745';
            setTimeout(() => {
              button.textContent = 'Add to Hireomatic';
              button.style.background = '#FF7233';
              button.disabled = false;
            }, 3000);
          } else {
            button.textContent = '⚠️ Check Popup';
            button.style.background = '#ffc107';
            setTimeout(() => {
              button.textContent = 'Add to Hireomatic';
              button.style.background = '#FF7233';
              button.disabled = false;
            }, 3000);
          }
          
        } catch (error) {
          console.error("Error processing Add to Hireomatic:", error);
          button.textContent = '❌ Error';
          button.style.background = '#dc3545';
          setTimeout(() => {
            button.textContent = 'Add to Hireomatic';
            button.style.background = '#FF7233';
            button.disabled = false;
          }, 3000);
        }
      });
      
      // Add close button
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '×';
      closeButton.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        color: #666;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
        border-radius: 4px;
        transition: all 0.2s ease;
      `;
      
      closeButton.addEventListener('mouseenter', () => {
        closeButton.style.background = '#f0f0f0';
        closeButton.style.color = '#333';
      });
      
      closeButton.addEventListener('mouseleave', () => {
        closeButton.style.background = 'none';
        closeButton.style.color = '#666';
      });
      
      closeButton.addEventListener('click', () => {
        overlay.remove();
      });
      
      // Assemble overlay
      overlay.appendChild(closeButton);
      overlay.appendChild(header);
      overlay.appendChild(button);
      
      // Add to page
      document.body.appendChild(overlay);
      
      console.log("✅ Hireomatic overlay created successfully");
      
      // Auto-hide after 30 seconds of inactivity
      let hideTimeout;
      const resetHideTimeout = () => {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          if (overlay && document.body.contains(overlay)) {
            overlay.style.opacity = '0.3';
            overlay.style.transform = 'scale(0.95)';
          }
        }, 30000);
      };
      
      // Reset timeout on user interaction
      overlay.addEventListener('mouseenter', resetHideTimeout);
      overlay.addEventListener('click', resetHideTimeout);
      
      // Initial timeout
      resetHideTimeout();
      
      // Reposition overlay on scroll/resize
      const repositionOverlay = () => {
        if (overlay && document.body.contains(overlay)) {
          // Keep overlay in viewport
          const rect = overlay.getBoundingClientRect();
          if (rect.right > window.innerWidth - 20) {
            overlay.style.right = '20px';
          }
          if (rect.top < 20) {
            overlay.style.top = '20px';
          }
        }
      };
      
      window.addEventListener('scroll', repositionOverlay);
      window.addEventListener('resize', repositionOverlay);
      
    } catch (error) {
      console.error("Error creating Hireomatic overlay:", error);
    }
  }

})();


