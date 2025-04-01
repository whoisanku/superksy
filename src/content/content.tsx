import React from "react";
import ReactDOM from "react-dom/client";
import ContentBubble from "./ContentBubble";

console.log("SuperSky content script starting...");

// Global variable to reference the React component
let bubbleContainer: HTMLElement | null = null;
let bubbleRoot: ReactDOM.Root | null = null;

try {
  // Create a div to mount the React component
  bubbleContainer = document.createElement("div");
  bubbleContainer.id = "supersky-react-root";
  document.body.appendChild(bubbleContainer);
  console.log("SuperSky container added to DOM:", bubbleContainer);

  // Render the React component into the container
  bubbleRoot = ReactDOM.createRoot(bubbleContainer);
  bubbleRoot.render(
    <React.StrictMode>
      <ContentBubble />
    </React.StrictMode>
  );
  console.log("SuperSky ContentBubble rendered to root");
} catch (error) {
  console.error("Error initializing SuperSky content script:", error);
}

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

    if (bubbleContainer) {
      if (bubbleContainer.style.display === "none") {
        bubbleContainer.style.display = "block";
        console.log("Bubble shown");
      } else {
        bubbleContainer.style.display = "none";
        console.log("Bubble hidden");
      }
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
    // Re-create the container if it was removed
    bubbleContainer = document.createElement("div");
    bubbleContainer.id = "supersky-react-root";
    document.body.appendChild(bubbleContainer);

    // Re-render the component
    bubbleRoot = ReactDOM.createRoot(bubbleContainer);
    bubbleRoot.render(
      <React.StrictMode>
        <ContentBubble />
      </React.StrictMode>
    );
  }
});

// Start observing after a short delay to ensure initial render completes
setTimeout(() => {
  observer.observe(document.body, { childList: true, subtree: true });
  console.log("SuperSky mutation observer started");
}, 1000);

// Example: Send message to background script when page loads
// Avoid sending this if the user isn't logged in? Consider checking storage first.
// chrome.storage.local.get(["authToken"], (result) => {
//   if (result.authToken) {
//     chrome.runtime.sendMessage({
//       type: "PAGE_LOADED",
//       data: {
//         url: window.location.href,
//         timestamp: new Date().toISOString(),
//       },
//     });
//   }
// });
