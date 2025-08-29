
// hireomatic-content.js
console.log('Hireomatic content script loaded');

// Listen for messages from your web app
window.addEventListener("message", function(event) {
  // Verify origin for security
  if (event.origin !== "http://localhost:5173") return;
  
  if (event.data.type === "STORE_TOKEN") {
    console.log('Storing token via background script:', event.data.token);
    
    // Send message to background script to store token
    chrome.runtime.sendMessage({
      action: 'storeToken',
      token: event.data.token
    }, (response) => {
      if (response && response.success) {
        console.log('Token stored successfully');
        
        // Send confirmation back to web app
        window.postMessage({
          type: "TOKEN_STORED_SUCCESS"
        }, "*");
      } else {
        console.error('Failed to store token');
        window.postMessage({
          type: "TOKEN_STORE_ERROR"
        }, "*");
      }
    });
  }
  
  if (event.data.type === "GET_TOKEN") {
    // Request token from background script
    chrome.runtime.sendMessage({
      action: 'getToken'
    }, (response) => {
      window.postMessage({
        type: "TOKEN_RESPONSE",
        token: response.token || null,
        timestamp: response.timestamp || null
      }, "*");
    });
  }
});

// Auto-send token if available when page loads
chrome.runtime.sendMessage({
  action: 'getToken'
}, (response) => {
  if (response && response.token) {
    window.postMessage({
      type: "TOKEN_AVAILABLE",
      token: response.token
    }, "*");
  }
});