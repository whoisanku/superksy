import React, { useState, useEffect, useRef, CSSProperties } from "react";

// Backup injection of critical styles in case external CSS fails
const injectStyles = () => {
  try {
    const style = document.createElement("style");
    style.textContent = `
      #supersky-react-root {
        position: initial !important;
        all: initial !important;
      }
      
      #supersky-bubble-container {
        position: fixed !important;
        z-index: 2147483647 !important;
        font-family: system-ui, -apple-system, sans-serif !important;
      }
      
      .supersky-bubble {
        width: 60px !important;
        height: 60px !important;
        background-color: #ff4500 !important;
        color: white !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 28px !important;
        font-weight: bold !important;
        transition: transform 0.2s ease-out !important;
      }
      
      .supersky-bubble:hover {
        transform: scale(1.1) !important;
      }
      
      .supersky-chatbox {
        position: absolute !important;
        transition: opacity 0.2s ease-out, transform 0.2s ease-out !important;
        transform-origin: bottom right !important;
      }
      
      .supersky-chat-input {
        width: 100% !important;
        border: 1px solid #ccc !important;
        border-radius: 5px !important;
        padding: 8px !important;
        margin-top: 10px !important;
        font-family: inherit !important;
        resize: none !important;
      }
      
      .supersky-send-button {
        background-color: #ff4500 !important;
        color: white !important;
        border: none !important;
        border-radius: 5px !important;
        padding: 5px 15px !important;
        margin-top: 10px !important;
        cursor: pointer !important;
        font-weight: bold !important;
      }
      
      .supersky-send-button:hover {
        background-color: #e03e00 !important;
      }
    `;
    document.head.appendChild(style);
    console.log("SuperSky backup styles injected");
  } catch (e) {
    console.error("Failed to inject SuperSky backup styles:", e);
  }
};

// Define styles here for inline application
const styles: Record<string, CSSProperties> = {
  bubble: {
    width: "60px",
    height: "60px",
    backgroundColor: "transparent",
    color: "white",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    fontWeight: "bold",
    cursor: "grab",
    userSelect: "none",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
    border: "3px solid white",
    transition: "transform 0.2s ease-out",
    position: "relative",
    overflow: "hidden",
  },
  bubbleImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
  },
  chatbox: {
    width: "300px",
    height: "400px",
    backgroundColor: "white",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    cursor: "default",
    position: "absolute",
    transformOrigin: "bottom right",
    animation: "fadeIn 0.2s ease-out",
    // Position will be dynamically calculated
  },
  chatboxHeader: {
    backgroundColor: "#f1f1f1",
    padding: "10px",
    borderBottom: "1px solid #ccc",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: "bold",
  },
  chatboxContent: {
    padding: "15px",
    flexGrow: 1,
    overflowY: "auto" as const,
  },
  chatboxFooter: {
    padding: "10px",
    borderTop: "1px solid #ccc",
    backgroundColor: "#f9f9f9",
  },
  chatInput: {
    width: "100%",
    border: "1px solid #ccc",
    borderRadius: "5px",
    padding: "8px",
    marginTop: "5px",
    fontFamily: "inherit",
    resize: "none",
  },
  sendButton: {
    backgroundColor: "#ff4500",
    color: "white",
    border: "none",
    borderRadius: "5px",
    padding: "5px 15px",
    marginTop: "5px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
    padding: "2px 5px",
    lineHeight: 1,
  },
  chatMessage: {
    margin: "10px 0",
    padding: "8px 12px",
    borderRadius: "8px",
    maxWidth: "80%",
    wordBreak: "break-word",
  },
  userMessage: {
    backgroundColor: "#f0f0f0",
    alignSelf: "flex-end",
    marginLeft: "auto",
  },
  botMessage: {
    backgroundColor: "#e0f7fa",
    alignSelf: "flex-start",
  },
  messagesContainer: {
    display: "flex",
    flexDirection: "column-reverse" as const,
    padding: "10px",
    flexGrow: 1,
    overflowY: "auto" as const,
    scrollbarWidth: "thin",
    scrollBehavior: "smooth" as const,
  },
  messageBadge: {
    position: "absolute",
    top: "0",
    right: "0",
    backgroundColor: "#0088ff",
    color: "white",
    borderRadius: "50%",
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "bold",
    border: "2px solid white",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
    transform: "translate(30%, -30%)",
    zIndex: 10,
  },
  conversationHeader: {
    backgroundColor: "#f1f1f1",
    padding: "10px 15px",
    borderBottom: "1px solid #ddd",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  conversationTitleContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  conversationAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  conversationTitle: {
    fontWeight: "bold",
    fontSize: "16px",
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  conversationClose: {
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    padding: "0 5px",
  },
  timeAgo: {
    fontSize: "11px",
    color: "#777",
    marginTop: "3px",
  },
  emptyState: {
    padding: "20px",
    textAlign: "center" as const,
    color: "#666",
    fontSize: "14px",
  },
};

interface Message {
  text: string;
  isUser: boolean;
  id: number;
}

interface Conversation {
  convo: {
    id: string;
    unreadCount: number;
    updated: string;
    participants: Array<{
      did: string;
      handle: string;
      displayName?: string;
    }>;
    members?: Array<{
      did: string;
      handle: string;
      displayName?: string;
      avatar?: string;
    }>;
  };
  messages: Array<{
    id: string;
    text: string;
    createdAt: string;
    authorDid: string;
    sender: {
      did: string;
    };
  }>;
  latestMessage: {
    id: string;
    text: string;
    createdAt: string;
    authorDid: string;
  };
}

const ContentBubble: React.FC = () => {
  console.log("ContentBubble component rendering");

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({
    x: window.innerWidth - 80,
    y: window.innerHeight - 80,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const mouseDownTime = useRef(0);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const chatboxRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadConversations, setUnreadConversations] = useState<
    Conversation[]
  >([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [senderAvatar, setSenderAvatar] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");

  // Calculate chatbox position to keep it within viewport
  const getChatboxPosition = () => {
    const chatWidth = 300;
    const chatHeight = 400;

    // Start with default position (above the bubble)
    let positionStyle: CSSProperties = {
      bottom: "70px",
      right: "0px",
    };

    // Check if we're too close to the top of the viewport
    if (position.y < chatHeight + 20) {
      // Place below the bubble instead
      positionStyle = {
        top: "70px",
        right: "0px",
      };
    }

    // Check if we're too close to the left edge
    if (position.x < chatWidth / 2) {
      delete positionStyle.right;
      positionStyle.left = "0px";
    }

    // Check if we're too close to the right edge
    if (window.innerWidth - position.x < chatWidth) {
      if (!positionStyle.right) {
        delete positionStyle.left;
        positionStyle.right = "0px";
      }
    }

    return positionStyle;
  };

  // Fetch unread conversations
  const fetchUnreadConversations = () => {
    chrome.runtime.sendMessage(
      { type: "REQUEST_UNREAD_CONVERSATIONS" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error requesting unread conversations:",
            chrome.runtime.lastError
          );
          return;
        }

        if (response && Array.isArray(response.conversations)) {
          console.log("Got unread conversations:", response.conversations);
          setUnreadConversations(response.conversations);

          // Get the first conversation's sender info
          if (response.conversations.length > 0) {
            const conversation = response.conversations[0];
            const sender = conversation.convo.members?.find(
              (member: { did: string }) =>
                member.did === conversation.messages[0]?.sender.did
            );

            if (sender) {
              setSenderAvatar(sender.avatar || "");
              setSenderName(
                sender.displayName || sender.handle || "Unknown User"
              );
            }
          }
        } else {
          console.warn(
            "Received invalid unread conversations response:",
            response
          );
          setUnreadConversations([]);
        }
      }
    );
  };

  // Open a specific conversation
  const openConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);

    // Update sender info
    const sender = conversation.convo.members?.find(
      (member: { did: string }) =>
        member.did === conversation.messages[0]?.sender.did
    );

    if (sender) {
      setSenderAvatar(sender.avatar || "");
      setSenderName(sender.displayName || sender.handle || "Unknown User");
    }

    // Ensure we have messages to display
    if (!conversation.messages || conversation.messages.length === 0) {
      setMessages([
        { text: "No messages in this conversation yet", isUser: false, id: 1 },
      ]);
      setIsOpen(true);
      return;
    }

    // Convert the conversation messages to our Message format
    const conversationMessages = conversation.messages.map((msg, index) => ({
      text: msg.text || "Empty message",
      isUser: false,
      id: index + 1,
    }));

    // Get current user's DID from the first participant that isn't in the conversation messages
    const userDidPromise = new Promise<string>((resolve) => {
      chrome.storage.local.get(["bskyHandle", "bskyAppPassword"], (result) => {
        if (result.bskyHandle) {
          console.log("Current user handle:", result.bskyHandle);
          const userParticipant = conversation.convo.participants?.find(
            (p) => p.handle === result.bskyHandle
          );
          resolve(userParticipant?.did || "");
        } else {
          resolve("");
        }
      });
    });

    userDidPromise.then((userDid) => {
      console.log("Current user DID:", userDid);

      const updatedMessages = conversationMessages.map((msg, index) => {
        if (index < conversation.messages.length) {
          const originalMsg = conversation.messages[index];
          return {
            ...msg,
            isUser: originalMsg.authorDid === userDid,
          };
        }
        return msg;
      });

      setMessages(updatedMessages);
      setIsOpen(true);

      // Focus the chat input and scroll to show latest messages
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
        }
        if (messagesEndRef.current) {
          messagesEndRef.current.parentElement?.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }
      }, 100);
    });
  };

  // Send a message to the active conversation
  const sendMessage = () => {
    if (!inputText.trim() || !activeConversation) return;

    const newMessage: Message = {
      text: inputText,
      isUser: true,
      id: messages.length + 1,
    };

    setMessages([...messages, newMessage]);
    setInputText("");

    // Scroll to show latest messages
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.parentElement?.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    }, 100);

    // Send the message through the background script
    chrome.runtime.sendMessage(
      {
        type: "SEND_MESSAGE",
        convoId: activeConversation.convo.id,
        text: inputText,
      },
      (response) => {
        if (chrome.runtime.lastError || !response.success) {
          console.error(
            "Error sending message:",
            chrome.runtime.lastError || response.error
          );
          // Could add failure UI feedback here
          return;
        }

        console.log("Message sent successfully:", response);

        // Reload conversations to get the latest state
        fetchUnreadConversations();
      }
    );
  };

  // Effect to inject backup styles
  useEffect(() => {
    injectStyles();
  }, []);

  // Effect to fetch unread message count
  useEffect(() => {
    console.log("Setting up unread message count checker");

    // Function to request unread count from background script
    const checkUnreadCount = () => {
      chrome.runtime.sendMessage(
        { type: "REQUEST_UNREAD_COUNT" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error requesting unread count:",
              chrome.runtime.lastError
            );
            return;
          }

          if (response && typeof response.unreadCount === "number") {
            console.log("Got unread count:", response.unreadCount);
            setUnreadCount(response.unreadCount);

            // If we have unread messages, also fetch the conversations
            if (response.unreadCount > 0) {
              fetchUnreadConversations();
            }
          } else {
            console.warn("Received invalid unread count response:", response);
          }
        }
      );
    };

    // Check immediately on mount
    checkUnreadCount();

    // Set up interval to check very frequently (every 2 seconds)
    const intervalId = setInterval(checkUnreadCount, 2000);

    // Force a check for unread messages more aggressively
    const forceCheckMessages = () => {
      chrome.runtime.sendMessage(
        { type: "FORCE_CHECK_MESSAGES" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error forcing message check:",
              chrome.runtime.lastError
            );
          } else {
            console.log("Forced message check result:", response);
            // After forced check, immediately get the count
            checkUnreadCount();
          }
        }
      );
    };

    // Force check every 10 seconds for more real-time updates
    const forceCheckIntervalId = setInterval(forceCheckMessages, 10000);

    // Also check when the tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, checking messages");
        forceCheckMessages();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      clearInterval(forceCheckIntervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Handle mouse down event for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isOpen) return; // Don't allow dragging when chat is open

    e.preventDefault();
    setIsDragging(true);
    mouseDownTime.current = Date.now();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  // Handle mouse move event for dragging
  const handleMouseMove = (e: React.MouseEvent<Document>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;

    // Only set hasMoved if we've moved a significant amount
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setHasMoved(true);
    }

    setPosition({
      x: Math.min(Math.max(30, position.x + deltaX), window.innerWidth - 30),
      y: Math.min(Math.max(30, position.y + deltaY), window.innerHeight - 30),
    });

    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  // Handle mouse up event for dragging
  const handleMouseUp = () => {
    setIsDragging(false);

    // If it was a short click and we haven't moved, treat it as a click
    if (!hasMoved && Date.now() - mouseDownTime.current < 200) {
      handleClick();
    }

    setHasMoved(false);
  };

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      // For reversed flex direction, we scroll to top to see latest messages
      messagesEndRef.current.parentElement?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [messages, isOpen]);

  // Handle click on the bubble
  const handleClick = () => {
    // If there's an active conversation already or we have unread conversations
    if (activeConversation) {
      setIsOpen(!isOpen);
    } else if (unreadConversations.length > 0) {
      // Open the first unread conversation
      openConversation(unreadConversations[0]);
    } else {
      // Just toggle the default chat interface
      setIsOpen(!isOpen);

      // Reset messages if we don't have an active conversation
      if (!isOpen && messages.length === 0) {
        setMessages([
          { text: "Hi there! How can I help you today?", isUser: false, id: 1 },
        ]);
      }
    }
  };

  // Handle window resize
  const handleResize = () => {
    setPosition((prevPos) => ({
      x: Math.min(prevPos.x, window.innerWidth - 30),
      y: Math.min(prevPos.y, window.innerHeight - 30),
    }));
  };

  // Set up event listeners for drag and resize
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove as any);
    document.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove as any);
      document.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", handleResize);
    };
  }, [isDragging, position]);

  // Handle input change for the chat
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  // Handle key press for sending messages with Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Provide a way to go back to the conversation list
  const closeConversation = () => {
    setActiveConversation(null);
    setIsOpen(false);
  };

  return (
    <div
      id="supersky-bubble-container"
      style={{
        position: "fixed",
        top: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: 2147483647,
      }}
    >
      {/* Chat Bubble */}
      <div
        ref={bubbleRef}
        className="supersky-bubble"
        style={{
          ...styles.bubble,
          position: "relative", // Ensure position is relative for badge positioning
        }}
        onMouseDown={handleMouseDown}
      >
        {senderAvatar ? (
          <img src={senderAvatar} alt="Profile" style={styles.bubbleImage} />
        ) : (
          <span style={{ zIndex: 0 }}>S</span>
        )}
      </div>

      {/* Separate badge container for better positioning */}
      {unreadCount > 0 && (
        <div
          style={{
            ...styles.messageBadge,
            position: "absolute",
            top: "0",
            right: "0",
          }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </div>
      )}

      {/* Chat Box */}
      {isOpen && (
        <div
          ref={chatboxRef}
          className="supersky-chatbox"
          style={{
            ...styles.chatbox,
            ...getChatboxPosition(),
            opacity: 1,
            transform: "scale(1)",
          }}
        >
          <div style={styles.conversationHeader}>
            <div style={styles.conversationTitleContainer}>
              {senderAvatar && (
                <img
                  src={senderAvatar}
                  alt="Profile"
                  style={styles.conversationAvatar}
                />
              )}
              <div style={styles.conversationTitle}>{senderName}</div>
            </div>
            <button
              style={styles.conversationClose}
              onClick={closeConversation}
            >
              ×
            </button>
          </div>

          <div style={styles.messagesContainer}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.chatMessage,
                  ...(msg.isUser ? styles.userMessage : styles.botMessage),
                }}
              >
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.chatboxFooter}>
            <textarea
              ref={chatInputRef}
              style={styles.chatInput}
              placeholder="Type a message..."
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
            />
            <button style={styles.sendButton} onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentBubble;
