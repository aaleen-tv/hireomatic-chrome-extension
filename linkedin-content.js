// linkedin-content.js
console.log('LinkedIn content script loaded');

// Handle button click
function handleUploadClick() {
  console.log('Hireomatic upload button clicked');
  
  // Get token from background script
  chrome.runtime.sendMessage({
    action: 'getToken'
  }, (response) => {
    if (!response || !response.token) {
      showNotification('Please login to Hireomatic first to authenticate', 'error');
      return;
    }
    
    const token = response.token;
    console.log('Got token from background:', token);
    
    // Extract profile data
    const profileData = extractLinkedInProfile();
    
    if (!profileData.name) {
      showNotification('Could not extract profile data', 'error');
      return;
    }
    
    // Show loading state
    const button = document.getElementById('hireomatic-upload-btn');
    const originalText = button.innerHTML;
    button.innerHTML = 'Uploading...';
    button.disabled = true;
    
    // Call Hireomatic API
    uploadToHireomatic(token, profileData)
      .then(response => {
        showNotification('Profile uploaded successfully!', 'success');
      })
      .catch(error => {
        console.error('Upload error:', error);
        showNotification('Failed to upload profile', 'error');
      })
      .finally(() => {
        // Restore button state
        button.innerHTML = originalText;
        button.disabled = false;
      });
  });
}

// Function to create the Hireomatic button
function createHireomaticButton() {
  // Check if button already exists
  if (document.getElementById('hireomatic-upload-btn')) {
    return;
  }
  
  // Create the button
  const button = document.createElement('button');
  button.id = 'hireomatic-upload-btn';
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right: 8px;">
      <path d="M8 0L10 6H16L11 10L13 16L8 12L3 16L5 10L0 6H6L8 0Z" fill="currentColor"/>
    </svg>
    Upload to Hireomatic
  `;
  
  button.style.cssText = `
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    margin: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
    transition: all 0.2s ease;
    z-index: 1000;
    position: relative;
  `;
  
  // Add hover effects
  button.onmouseenter = () => {
    button.style.transform = 'translateY(-1px)';
    button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.35)';
  };
  
  button.onmouseleave = () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.25)';
  };
  
  // Find the best location to place the button
  const possibleLocations = [
    '.pv-top-card-v2-ctas',
    '.pvs-profile-actions',
    '.pv-top-card--photo',
    '.ph5.pb5',
    '.pv-top-card'
  ];
  
  let targetLocation = null;
  for (const selector of possibleLocations) {
    targetLocation = document.querySelector(selector);
    if (targetLocation) break;
  }
  
  if (!targetLocation) {
    // Fallback: create a floating button
    targetLocation = document.body;
    button.style.cssText += `
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 10000;
    `;
  }
  
  targetLocation.appendChild(button);
  
  // Add click event listener
  button.addEventListener('click', handleUploadClick);
}

// Extract LinkedIn profile data
function extractLinkedInProfile() {
  const profileData = {};
  
  try {
    // Name
    profileData.name = document.querySelector('h1')?.textContent?.trim() || '';
    
    // Headline/Title
    profileData.headline = document.querySelector('.text-body-medium.break-words')?.textContent?.trim() || '';
    
    // Location
    profileData.location = document.querySelector('.text-body-small.inline.t-black--light.break-words')?.textContent?.trim() || '';
    
    // Profile URL
    profileData.linkedinUrl = window.location.href;
    
    console.log('Extracted profile data:', profileData);
    
  } catch (error) {
    console.error('Error extracting profile data:', error);
  }
  
  return profileData;
}

// Upload to Hireomatic API
async function uploadToHireomatic(token, profileData) {
  const response = await fetch('https://dev-job-service.santosh-517.workers.dev/api/candidates', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...profileData,
      source: 'linkedin_extension'
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

// Show notification
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existingNotification = document.getElementById('hireomatic-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.id = 'hireomatic-notification';
  notification.textContent = message;
  
  const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    max-width: 300px;
    animation: slideIn 0.3s ease;
  `;
  
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.remove();
  }, 4000);
}

// Initialize button when page loads
function initializeButton() {
  setTimeout(() => {
    createHireomaticButton();
  }, 2000);
}

// Run when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeButton);
} else {
  initializeButton();
}

// Handle SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(initializeButton, 2000);
  }
}).observe(document, { subtree: true, childList: true });