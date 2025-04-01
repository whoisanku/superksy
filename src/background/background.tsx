// This is the background script for the Chrome extension
// It runs in the background and can interact with Chrome APIs

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason);

  // Initialize storage on install and open welcome page
  if (details.reason === "install") {
    chrome.storage.local.set({
      isInitialized: true,
      installDate: new Date().toISOString(),
      stats: {
        pagesVisited: 0,
        actionsTaken: 0,
      },
    });

    // Open the welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html"),
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message, "from:", sender);

  if (message.type === "ACTION_PERFORMED") {
    // Update stats when an action is performed
    chrome.storage.local.get(["stats"], (result) => {
      const stats = result.stats || { pagesVisited: 0, actionsTaken: 0 };
      stats.actionsTaken += 1;

      chrome.storage.local.set({ stats }, () => {
        console.log("Stats updated:", stats);
        sendResponse({ success: true });
      });
    });

    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

// Listen for tab updates to track visited pages
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    !tab.url.startsWith("chrome://")
  ) {
    chrome.storage.local.get(["stats", "authToken"], (result) => {
      // Only track if user is logged in
      if (result.authToken) {
        const stats = result.stats || { pagesVisited: 0, actionsTaken: 0 };
        stats.pagesVisited += 1;

        chrome.storage.local.set({ stats }, () => {
          console.log("Page visit recorded:", tab.url);
          console.log("Updated stats:", stats);
        });
      }
    });
  }
});

// Listen for clicks on the extension icon
chrome.action.onClicked.addListener((tab) => {
  // Check if user is logged in (has authToken)
  chrome.storage.local.get(["authToken"], (result) => {
    if (result.authToken) {
      // Send message to content script to toggle bubble visibility
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_BUBBLE_VISIBILITY" });
        console.log("Toggling bubble visibility in tab:", tab.id);
      }
    } else {
      // If not logged in, open the welcome/login page
      chrome.tabs.create({
        url: chrome.runtime.getURL("welcome.html"),
      });
      console.log("User not logged in. Opening welcome page.");
    }
  });
});
