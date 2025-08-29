// config.js - Configuration for the Chrome extension
// IMPORTANT: Replace this with your actual decryption key
const CONFIG = {
  // Decryption key for the encrypted JWT token
  // This should match the CHROME_EXT_TOKEN from your server environment
  CHROME_EXT_TOKEN: 'CHROME_EXT_TOKEN', // Replace with your actual key
  
  // API endpoint for uploading candidate profiles
  API_ENDPOINT: 'https://dev-job-service.santosh-517.workers.dev/api/v1/jobs/upload/candidate',
  
  // Extension settings
  EXTENSION_NAME: 'Hireomatic LinkedIn Connector',
  VERSION: '1.0.0'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  // For browser environment
  window.HIREOMATIC_CONFIG = CONFIG;
}
