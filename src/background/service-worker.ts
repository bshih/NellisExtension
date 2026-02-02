/**
 * Service worker for Nellis Auction Helper
 * Handles storage and messaging coordination
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Nellis Auction Helper installed:', details.reason);

  // Set default settings on install
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      nellisSettings: {
        hideUsed: false,
        hideMinorDamage: false,
        hideUnknownMissing: false,
        hideMissingParts: false,
        locationFilter: '',
        showAmazonLinks: true,
      },
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get('nellisSettings').then((result) => {
      sendResponse(result.nellisSettings || {});
    });
    return true; // Keep channel open for async response
  }
});
