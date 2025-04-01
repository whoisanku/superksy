import React from "react";
import ReactDOM from "react-dom/client";
import ContentBubble from "./ContentBubble";

console.log("SuperSky content script starting...");

// Global variable to reference the React component
let bubbleContainer: HTMLElement | null = null;
let bubbleRoot: ReactDOM.Root | null = null;

// Function to ensure the container is added and rendered into
function ensureBubbleExists() {
  try {
    // Check if the container already exists
    bubbleContainer = document.getElementById("supersky-react-root");

    // If it doesn't exist, create it
    if (!bubbleContainer) {
      console.log("Creating SuperSky container");
      bubbleContainer = document.createElement("div");
      bubbleContainer.id = "supersky-react-root";
      document.body.appendChild(bubbleContainer);
      console.log("SuperSky container added to DOM:", bubbleContainer);
    }

    // Only create a new root if we don't already have one
    if (!bubbleRoot) {
      // Render the React component into the container
      bubbleRoot = ReactDOM.createRoot(bubbleContainer);
      bubbleRoot.render(
        <React.StrictMode>
          <ContentBubble />
        </React.StrictMode>
      );
      console.log("SuperSky ContentBubble rendered to root");
    }
  } catch (error) {
    console.error("Error initializing SuperSky content script:", error);
  }
}

// Call the function to ensure the bubble exists on script load
ensureBubbleExists();

// Try again in 1 second, in case the DOM wasn't fully loaded
setTimeout(ensureBubbleExists, 1000);

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("SuperSky content script received message:", message);

  if (message.type === "PAGE_INFO_REQUEST") {
    // Example: Collect page information
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    sendResponse({ type: "PAGE_INFO_RESPONSE", data: pageInfo });
  }

  // Handle bubble visibility toggle command from extension icon click
  if (message.type === "TOGGLE_BUBBLE_VISIBILITY") {
    console.log("Toggle bubble visibility message received");

    // Make sure bubble exists
    ensureBubbleExists();

    if (bubbleContainer) {
      if (bubbleContainer.style.display === "none") {
        bubbleContainer.style.display = "block";
        console.log("Bubble shown");
      } else {
        bubbleContainer.style.display = "none";
        console.log("Bubble hidden");
      }
    } else {
      console.error("Failed to find or create bubble container");
    }

    sendResponse({ success: true });
  }

  // Return true to indicate we'll respond asynchronously
  return true;
});

// Ensure the bubble is added even when the DOM is modified
const observer = new MutationObserver((_mutations) => {
  // Check if our container still exists
  if (!document.getElementById("supersky-react-root")) {
    console.log("SuperSky container was removed, re-adding it");
    ensureBubbleExists();
  }
});

// Start observing after a short delay to ensure initial render completes
setTimeout(() => {
  observer.observe(document.body, { childList: true, subtree: true });
  console.log("SuperSky mutation observer started");
}, 1000);

// Force a check for unread messages when content script loads
console.log("SuperSky requesting a forced check of unread messages");
chrome.runtime.sendMessage({ type: "FORCE_CHECK_MESSAGES" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error(
      "SuperSky error forcing message check:",
      chrome.runtime.lastError
    );
  } else {
    console.log("SuperSky forced message check result:", response);

    // Try again after a short delay to ensure we get the latest data
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: "FORCE_CHECK_MESSAGES" });
    }, 2000);
  }
});

// Add another forced check after 5 seconds to handle any race conditions
setTimeout(() => {
  chrome.runtime.sendMessage({ type: "FORCE_CHECK_MESSAGES" });
}, 5000);
