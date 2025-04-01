import { AtpAgent } from "@atproto/api";
import type { ChatBskyConvoDefs } from "@atproto/api";

// This is the background script for the Chrome extension
// It runs in the background and can interact with Chrome APIs

const CHECK_MESSAGES_ALARM_NAME = "checkUnreadMessagesAlarm";

// Define a more permissive type for the conversation data that includes participants
interface ExtendedConvoView extends ChatBskyConvoDefs.ConvoView {
  participants: Array<{
    did: string;
    handle: string;
    displayName?: string;
  }>;
}

// Function to convert ConvoView to ExtendedConvoView
function convertToExtendedConvoView(
  convo: ChatBskyConvoDefs.ConvoView
): ExtendedConvoView {
  return {
    ...convo,
    participants: [],
  };
}

// Function to check unread messages
async function checkUnreadMessages() {
  console.log("[SuperSky] Running checkUnreadMessages...");
  try {
    const result = await chrome.storage.local.get([
      "bskyHandle",
      "bskyAppPassword",
      "loggedIn",
    ]);

    console.log("[SuperSky] Login status:", result.loggedIn);
    // Don't log the actual password, just check if it exists
    console.log("[SuperSky] Have handle:", !!result.bskyHandle);
    console.log("[SuperSky] Have app password:", !!result.bskyAppPassword);

    if (result.loggedIn && result.bskyHandle && result.bskyAppPassword) {
      console.log(`[SuperSky] Attempting login for ${result.bskyHandle}...`);
      try {
        const agent = new AtpAgent({ service: "https://bsky.social" });
        await agent.login({
          identifier: result.bskyHandle,
          password: result.bskyAppPassword,
        });
        console.log("[SuperSky] Login successful for message check.");

        try {
          // Create a chat proxy
          console.log("[SuperSky] Creating chat proxy...");
          const chatProxy = agent.withProxy(
            "bsky_chat",
            "did:web:api.bsky.chat"
          );

          console.log("[SuperSky] Checking for conversations...");
          // Fetch conversations
          const convosRes = await chatProxy.chat.bsky.convo.listConvos({
            limit: 100,
          });

          if (!convosRes.data || !convosRes.data.convos) {
            console.error("[SuperSky] No conversations data returned from API");
            await chrome.storage.local.set({
              unreadMessageCount: 0,
              unreadConversations: [],
              lastCheckTime: new Date().toISOString(),
            });
            return;
          }

          console.log(
            "[SuperSky] Got conversations:",
            convosRes.data.convos?.length || 0
          );
          let totalUnreadCount = 0;

          // Store conversations with unread messages
          const unreadConvos: any[] = [];

          if (convosRes.data.convos) {
            // Process each conversation
            for (const convo of convosRes.data.convos) {
              try {
                if (!convo) {
                  console.warn(
                    "[SuperSky] Found null/undefined conversation item, skipping"
                  );
                  continue;
                }

                const extendedConvo = convertToExtendedConvoView(convo);
                console.log(
                  `[SuperSky] Processing convo: ${
                    extendedConvo.id || "unknown-id"
                  }, unread: ${extendedConvo.unreadCount || 0}, muted: ${
                    extendedConvo.muted || false
                  }`
                );

                // Only process unmuted conversations with unread messages
                if (!extendedConvo.muted && extendedConvo.unreadCount > 0) {
                  totalUnreadCount += extendedConvo.unreadCount;

                  try {
                    // First, try to get the conversation details to ensure we have participants
                    const convoDetailsRes =
                      await chatProxy.chat.bsky.convo.getConvo({
                        convoId: extendedConvo.id,
                      });

                    // Get the participants from the details response
                    const participants =
                      (convoDetailsRes.data?.convo as any)?.participants || [];
                    console.log(
                      `[SuperSky] Got ${participants.length} participants for convo ${extendedConvo.id}`
                    );

                    // Fetch messages for this conversation
                    const messagesRes =
                      await chatProxy.chat.bsky.convo.getMessages({
                        convoId: extendedConvo.id,
                        limit: 20,
                      });

                    if (!messagesRes.data || !messagesRes.data.messages) {
                      console.warn(
                        `[SuperSky] No messages returned for conversation ${extendedConvo.id}`
                      );
                      continue;
                    }

                    // Add to unread conversations list with the fetched participants
                    unreadConvos.push({
                      convo: {
                        ...extendedConvo,
                        participants: participants,
                      },
                      messages: messagesRes.data.messages || [],
                      latestMessage: messagesRes.data.messages?.[0] || null,
                    });

                    console.log(
                      `[SuperSky] Successfully processed conversation ${extendedConvo.id} with ${participants.length} participants`
                    );
                  } catch (messageError) {
                    console.error(
                      `[SuperSky] Error fetching messages/participants for conversation ${extendedConvo.id}:`,
                      messageError
                    );
                  }
                }
              } catch (convoError) {
                console.error(
                  "[SuperSky] Error processing conversation:",
                  convoError
                );
              }
            }
          }

          console.log(`[SuperSky] Total unread messages: ${totalUnreadCount}`);
          console.log(
            `[SuperSky] Unread conversations: ${unreadConvos.length}`
          );

          // Store the data for use by popup/content scripts
          await chrome.storage.local.set({
            unreadMessageCount: totalUnreadCount,
            unreadConversations: unreadConvos,
            lastCheckTime: new Date().toISOString(),
          });
        } catch (apiError) {
          console.error("[SuperSky] Error accessing chat API:", apiError);
          console.error(
            "[SuperSky] This might be caused by the app password not having chat access"
          );
          // Store 0 as the count to avoid showing stale data
          await chrome.storage.local.set({
            unreadMessageCount: 0,
            unreadConversations: [],
          });
        }
      } catch (loginError) {
        console.error("[SuperSky] Login failed:", loginError);
        // Clear count on login error
        await chrome.storage.local.remove("unreadMessageCount");
        await chrome.storage.local.remove("unreadConversations");
      }
    } else {
      console.log(
        "[SuperSky] User not logged in or missing credentials, skipping message check."
      );
      // Ensure count is cleared if user logs out
      await chrome.storage.local.remove("unreadMessageCount");
      await chrome.storage.local.remove("unreadConversations");
    }
  } catch (error: any) {
    console.error("[SuperSky] Error in checkUnreadMessages:", error);
    // Potentially handle specific errors, e.g., invalid credentials
    if (error.message?.includes("Authentication Required")) {
      console.warn(
        "[SuperSky] Authentication failed during message check. Clearing stored credentials might be needed if this persists."
      );
      // Consider clearing credentials or notifying the user
    }
    // Clear count on error to avoid displaying stale data
    await chrome.storage.local.remove("unreadMessageCount");
    await chrome.storage.local.remove("unreadConversations");
  }
}

// Function to send a message to a conversation
async function sendMessageToConversation(convoId: string, text: string) {
  console.log(
    `[SuperSky] Attempting to send message to conversation ${convoId}`
  );

  try {
    const result = await chrome.storage.local.get([
      "bskyHandle",
      "bskyAppPassword",
      "loggedIn",
    ]);

    if (result.loggedIn && result.bskyHandle && result.bskyAppPassword) {
      const agent = new AtpAgent({ service: "https://bsky.social" });
      await agent.login({
        identifier: result.bskyHandle,
        password: result.bskyAppPassword,
      });

      console.log("[SuperSky] Logged in for message sending");

      // Create chat proxy
      const chatProxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat");

      // The chat API expects a different parameter structure
      // We'll work around the type issue temporarily using 'as any'
      const sendResponse = await (chatProxy.chat.bsky.convo.sendMessage as any)(
        {
          convoId,
          text,
        }
      );

      console.log("[SuperSky] Message sent successfully:", sendResponse);

      // Force a refresh of conversations to update our stored data
      await checkUnreadMessages();

      return { success: true, response: sendResponse };
    } else {
      console.error("[SuperSky] User not logged in to send message");
      return { success: false, error: "Not logged in" };
    }
  } catch (error) {
    console.error("[SuperSky] Error sending message:", error);
    return { success: false, error };
  }
}

// Schedule the alarm when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log("[SuperSky] Extension installed/updated:", details.reason);

  // Initialize storage on first install
  if (details.reason === "install") {
    chrome.storage.local.set({
      isInitialized: true,
      installDate: new Date().toISOString(),
      stats: {
        pagesVisited: 0,
        actionsTaken: 0,
      },
      loggedIn: false, // Initialize loggedIn status
      unreadMessageCount: 0, // Initialize unread count
    });

    // Open the welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html"),
    });
  }

  // Verify alarms permission
  if (chrome.alarms) {
    console.log("[SuperSky] Alarms API is available");

    // Create the alarm (this will replace any existing alarm with the same name)
    // Run immediately and then very frequently
    try {
      chrome.alarms.create(CHECK_MESSAGES_ALARM_NAME, {
        delayInMinutes: 0.05, // Start check almost immediately
        periodInMinutes: 0.08, // Check every ~5 seconds
      });
      console.log("[SuperSky] Unread message check alarm created/updated.");
    } catch (alarmError) {
      console.error("[SuperSky] Error creating alarm:", alarmError);
    }
  } else {
    console.error(
      "[SuperSky] Alarms API is NOT available! Make sure 'alarms' permission is in manifest.json."
    );
  }

  // Perform an initial check right away if updating/reloading while logged in
  if (details.reason === "update" || details.reason === "chrome_update") {
    checkUnreadMessages();
  }
});

// Also run check on browser startup
chrome.runtime.onStartup.addListener(() => {
  console.log("[SuperSky] Browser startup detected.");

  // Verify alarms permission
  if (chrome.alarms) {
    // Ensure the alarm is set (it might have been cleared if the browser crashed)
    chrome.alarms.get(CHECK_MESSAGES_ALARM_NAME, (alarm) => {
      if (!alarm) {
        console.log("[SuperSky] Alarm not found on startup, creating it.");
        chrome.alarms.create(CHECK_MESSAGES_ALARM_NAME, {
          delayInMinutes: 0.05,
          periodInMinutes: 0.08, // Check every ~5 seconds
        });
      } else {
        console.log("[SuperSky] Alarm already exists:", alarm);
      }
    });
  } else {
    console.error(
      "[SuperSky] Alarms API is NOT available on startup! Check permissions."
    );
  }

  // Run a message check on startup
  checkUnreadMessages();
});

// Listen for the alarm
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("[SuperSky] Alarm triggered:", alarm.name);
    if (alarm.name === CHECK_MESSAGES_ALARM_NAME) {
      checkUnreadMessages();
    }
  });
} else {
  console.error(
    "[SuperSky] CRITICAL: chrome.alarms is not available at alarm listener setup time!"
  );
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[SuperSky] Received message:", message, "from:", sender);

  if (message.type === "ACTION_PERFORMED") {
    // Update stats when an action is performed
    chrome.storage.local.get(["stats"], (result) => {
      const stats = result.stats || { pagesVisited: 0, actionsTaken: 0 };
      stats.actionsTaken += 1;

      chrome.storage.local.set({ stats }, () => {
        console.log("[SuperSky] Stats updated:", stats);
        sendResponse({ success: true });
      });
    });
    // Return true to indicate we'll respond asynchronously
    return true;
  } else if (message.type === "REQUEST_UNREAD_COUNT") {
    // Handle request for unread count from content script/popup
    console.log("[SuperSky] Content script requested unread count");
    chrome.storage.local.get("unreadMessageCount", (result) => {
      const count = result.unreadMessageCount ?? 0;
      console.log("[SuperSky] Sending unread count response:", count);
      sendResponse({ unreadCount: count });
    });
    return true; // Indicate async response
  } else if (message.type === "REQUEST_UNREAD_CONVERSATIONS") {
    // Handle request for unread conversations from content script
    console.log("[SuperSky] Content script requested unread conversations");
    chrome.storage.local.get(
      ["unreadConversations", "lastCheckTime"],
      (result) => {
        sendResponse({
          conversations: result.unreadConversations || [],
          lastCheckTime: result.lastCheckTime || null,
        });
      }
    );
    return true; // Indicate async response
  } else if (message.type === "SEND_MESSAGE") {
    // Handle message sending request
    if (!message.convoId || !message.text) {
      sendResponse({ success: false, error: "Missing convoId or text" });
      return true;
    }

    // Process the message sending asynchronously
    sendMessageToConversation(message.convoId, message.text)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        console.error("[SuperSky] Error in message sending:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicate async response
  } else if (message.type === "FORCE_CHECK_MESSAGES") {
    // Added a way to force a check
    console.log("[SuperSky] Received request to force check messages");
    checkUnreadMessages()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("[SuperSky] Error in forced message check:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicate async response
  }
  // Ensure other message types are handled or ignored gracefully
  return false; // Indicate sync response or no response needed for other types
});

// Listen for tab updates to track visited pages
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  // Check if the tab update is complete and it's a web page
  if (
    changeInfo.status === "complete" &&
    tab?.url &&
    !tab.url.startsWith("chrome://") &&
    !tab.url.startsWith("about:") &&
    !tab.url.startsWith("file:") &&
    !tab.url.includes(chrome.runtime.id) // Don't track our own extension pages
  ) {
    chrome.storage.local.get(["stats", "loggedIn"], (result) => {
      // Check 'loggedIn' instead of 'authToken'
      // Only track if user is logged in
      if (result.loggedIn) {
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
  // Check if user is logged in
  chrome.storage.local.get(["loggedIn"], (result) => {
    // Check 'loggedIn' instead of 'authToken'
    if (result.loggedIn) {
      // Send message to content script to toggle bubble visibility
      if (tab && tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          { type: "TOGGLE_BUBBLE_VISIBILITY" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "Could not send message to content script:",
                chrome.runtime.lastError.message
              );
              // Maybe the content script isn't injected yet or the tab is special (e.g., chrome web store)
            } else {
              console.log(
                "Toggling bubble visibility in tab:",
                tab.id,
                "Response:",
                response
              );
            }
          }
        );
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
