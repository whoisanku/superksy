import React, { useState, useEffect, useRef } from "react";
import { injectStyles } from "../utils/styleUtils";
import styles from "../styles/bubbleStyles";

// Backup injection of critical styles in case external CSS fails
injectStyles();

interface Message {
  text: string;
  isUser: boolean;
  id: number;
  timestamp?: string; // Add timestamp property for displaying when the message was sent
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
    createdAt?: string;
    sentAt?: string; // Added sentAt field based on API response
    authorDid: string;
    sender: {
      did: string;
    };
  }>;
  latestMessage: {
    id: string;
    text: string;
    createdAt?: string;
    sentAt?: string; // Added sentAt field based on API response
    authorDid: string;
  };
}

// Format timestamp into a readable format
const formatMessageTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
    // Format time as HH:MM AM/PM
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
};

const ContentBubble = () => {
  console.log("ContentBubble component rendering");

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({
    x: window.innerWidth - 80,
    y: window.innerHeight - 80,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [isActiveChat, setIsActiveChat] = useState(false); // Add state for active chat session
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const mouseDownTime = useRef(0);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const chatboxRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showBubble, setShowBubble] = useState(false); // Added state for bubble visibility
  const [displayUnreadCount, setDisplayUnreadCount] = useState(0); // Separate display count
  const previousUnreadCountRef = useRef(0); // To track changes for sound effect
  const soundEffectRef = useRef<HTMLAudioElement | null>(null); // Reference for sound effect

  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [senderAvatar, setSenderAvatar] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");

  // Track explicitly closed conversations to prevent reappearing
  const [recentlyClosedIds, setRecentlyClosedIds] = useState<Set<string>>(new Set());
  const pollingSuspendedUntilRef = useRef<number>(0); // Timestamp to resume polling updates

  // Initialize sound effect audio element
  useEffect(() => {
    try {
      // Reference the audio file directly - manifest.json has been updated to include it
      const audioUrl = chrome.runtime.getURL('chatbubble.mp3');
      console.log('Loading sound effect from URL:', audioUrl);
      
      // Create audio element
      const audio = new Audio();
      
      // Set up error handler before setting source
      audio.onerror = (e) => {
        console.error('Audio loading error:', e);
      };
      
      // Log when audio is loaded successfully
      audio.oncanplaythrough = () => {
        console.log('Audio file loaded successfully and can play');
      };
      
      // Set the source
      audio.src = audioUrl;
      soundEffectRef.current = audio;
      
      // Try to preload
      audio.load();
    } catch (err) {
      console.error('Error initializing audio:', err);
    }
  }, []);

  // Effect to track unread count changes and play sound
  useEffect(() => {
    console.log('Unread count changed:', unreadCount, 'Previous:', previousUnreadCountRef.current);
    // If unread count increases from zero, play the sound
    if (unreadCount > 0 && previousUnreadCountRef.current === 0) {
      console.log('Playing chat bubble sound effect');
      if (soundEffectRef.current) {
        // Reset audio to beginning
        soundEffectRef.current.currentTime = 0;
        // Play with error handling
        const playPromise = soundEffectRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error('Error playing sound effect:', err);
          });
        }
      }
    }
    
    // Update the display count
    setDisplayUnreadCount(unreadCount);
    
    // Update the ref for next comparison
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Calculate chatbox position to keep it within viewport
  const getChatboxPosition = () => {
    const chatWidth = 300;
    const chatHeight = 400;

    // Start with default position classes (above the bubble)
    let positionClasses = "bottom-[70px] right-0";

    // Check if we're too close to the top of the viewport
    if (position.y < chatHeight + 20) {
      // Place below the bubble instead
      positionClasses = "top-[70px] right-0";
    }

    // Check if we're too close to the left edge
    if (position.x < chatWidth / 2) {
      positionClasses = positionClasses.replace("right-0", "left-0");
    }

    // Check if we're too close to the right edge
    if (window.innerWidth - position.x < chatWidth) {
      if (positionClasses.includes("left-0")) {
        positionClasses = positionClasses.replace("left-0", "right-0");
      }
    }

    return positionClasses;
  };

  // Fetch unread conversations
  const fetchUnreadConversations = () => {
    // Skip if we're in a suspended polling period
    if (Date.now() < pollingSuspendedUntilRef.current) {
      console.log(
        `Polling suspended until ${new Date(pollingSuspendedUntilRef.current).toLocaleTimeString()}`
      );
      return;
    }

    // Don't fetch if we're sending a message to avoid race conditions
    if (isSendingMessage) {
      console.log("Skipping conversation fetch while sending message");
      return;
    }

    // Don't disrupt active experience if chat is open
    if (isOpen && activeConversation) {
      console.log("Skipping background fetch while chat is active");
      return;
    }

    console.log("Fetching unread conversations");
    chrome.runtime.sendMessage(
      { type: "REQUEST_UNREAD_CONVERSATIONS" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error fetching unread conversations:",
            chrome.runtime.lastError
          );
          return;
        }

        if (response && response.conversations) {
          const convos = response.conversations;
          console.log("Got unread conversations:", convos);
          
          // Filter out any conversations that were recently closed by the user
          const filteredConvos = convos.filter((convo: Conversation) => 
            !recentlyClosedIds.has(convo.convo?.id)
          );
          
          if (filteredConvos.length > 0) {
            // Get the first conversation's sender info for the chat bubble
            const firstConvo = filteredConvos[0];

            // Find the other member (not the current user)
            if (
              firstConvo.convo?.members &&
              firstConvo.convo.members.length > 0
            ) {
              // We'll use the first member's avatar for now
              // In a more complete implementation, we should filter out the current user
              const otherMember = firstConvo.convo.members[0];
              if (otherMember.avatar) {
                setSenderAvatar(otherMember.avatar);
                setSenderName(
                  otherMember.displayName ||
                    otherMember.handle ||
                    "Unknown User"
                );
              }
            }
          }

          // Calculate total unread count from filtered conversations
          const totalUnreadCount = filteredConvos.reduce(
            (total: number, convo: Conversation) => {
              // Use the unreadCount property from the conversation object
              // Ensure we handle if it's undefined
              const count = convo.convo?.unreadCount || 0;
              console.log(
                `Convo id: ${convo.convo?.id}, unread count: ${count}`
              );
              return total + count;
            },
            0
          );

          console.log(
            "Total unread count (after filtering closed convos):",
            totalUnreadCount
          );
          setUnreadCount(totalUnreadCount);
          
          // Store all conversations for potential use
          setConversations(filteredConvos);

          // Show or hide bubble based on unread count or if chatbox is open
          // Only update if we're not actively viewing a conversation
          if (!isOpen) {
            setShowBubble(totalUnreadCount > 0);
          }

          // Display latest conversation if we were already open and have no active conversation
          if (filteredConvos.length > 0 && isOpen && !activeConversation) {
            openConversation(filteredConvos[0]);
          }
        } else {
          console.warn(
            "Received invalid unread conversations response:",
            response
          );
          // Hide bubble if no conversations and chatbox is closed
          if (!isOpen) {
            setShowBubble(false);
          }
        }
      }
    );
  };

  // Open a specific conversation
  const openConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setIsOpen(true);
    setShowBubble(true); // Always show bubble when conversation is open
    setIsActiveChat(true); // Set active chat when opening conversation

    // Update sender info based on the conversation members
    // Try to find the other member (not the current user)
    console.log(
      "Opening conversation with members:",
      conversation.convo?.members
    );

    if (conversation.convo.members && conversation.convo.members.length > 0) {
      // We'll show the first member's info for now
      // In a real app, we'd filter out the current user
      const firstMember = conversation.convo.members[0];
      if (firstMember) {
        console.log("Using member info:", firstMember);
        setSenderAvatar(firstMember.avatar || "");
        setSenderName(
          firstMember.displayName || firstMember.handle || "Unknown User"
        );
      }
    }

    // Ensure we have messages to display
    if (!conversation.messages || conversation.messages.length === 0) {
      setMessages([
        { 
          text: "No messages in this conversation yet", 
          isUser: false, 
          id: 1,
          timestamp: new Date().toISOString()
        },
      ]);
      setIsOpen(true);
      console.log("No messages in conversation");
      return;
    }

    console.log("Processing conversation messages:", conversation.messages);

    // Get the current user's DID to determine message ownership
    chrome.runtime.sendMessage({ type: "GET_USER_INFO" }, (result) => {
      if (result && result.bskyDid) {
        const userDid = result.bskyDid;
        console.log("Current user DID from handler:", userDid);

        // Convert conversation messages to our Message format
        // Note: Reverse to display newest messages at the bottom
        const convertedMessages = [...conversation.messages] // Create a copy to avoid mutating original
          .map((msg, index) => {
            // Check both authorDid and sender.did to determine if message is from current user
            const senderDid = msg.sender?.did || msg.authorDid;
            const messageIsFromUser = senderDid === userDid;
            console.log(
              `Message ${index}, authorDid: ${msg.authorDid}, senderDid: ${senderDid}, userDid: ${userDid}, isUser: ${messageIsFromUser}`
            );
            return {
              text: msg.text || "(Empty message)",
              isUser: messageIsFromUser,
              id: index + 1,
              timestamp: msg.sentAt || msg.createdAt, // Use sentAt for the timestamp (fallback to createdAt)
            };
          });

        setMessages(convertedMessages);
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
      } else {
        console.error("Could not determine user DID");
        setMessages([{ 
          text: "Error loading messages", 
          isUser: false, 
          id: 1,
          timestamp: new Date().toISOString()
        }]);
        setIsOpen(true);
      }
    });
  };

  // Send a message to the active conversation
  const sendMessage = () => {
    if (!inputText.trim() || !activeConversation) return; // Don't send empty messages

    // Create new message immediately for local display
    const newMessage: Message = {
      text: inputText,
      isUser: true,
      id: messages.length + 1,
      timestamp: new Date().toISOString(),
    };

    // Store the message text before clearing input
    const messageText = inputText;
    
    // Update UI immediately
    setMessages((prevMessages) => [newMessage, ...prevMessages]);
    setInputText("");
    setShowBubble(true);
    setIsActiveChat(true);
    setIsSendingMessage(true);

    // Disable automatic fetching/refreshing during sending
    pollingSuspendedUntilRef.current = Date.now() + 5000; // Suspend polling for 5 seconds

    // Send the message to the API via the background script
    chrome.runtime.sendMessage(
      { type: "SEND_MESSAGE", convoId: activeConversation.convo.id, text: messageText },
      (response) => {
        console.log("Message sent response:", response);
        
        // Re-enable bubble visibility and keep chat active regardless of response
        setShowBubble(true);
        setIsActiveChat(true);
        
        // Set a timeout before allowing polling again to prevent race conditions
        setTimeout(() => {
          setIsSendingMessage(false);
        }, 1000);

        if (response && response.success) {
          console.log("Message sent successfully");
        } else {
          console.error("Failed to send message");
          // You might want to show an error to the user
        }
      }
    );

    // Auto-scroll to the latest message
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.parentElement?.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  // Effect to inject backup styles
  useEffect(() => {
    injectStyles();
  }, []);

  // Effect to load the saved position from Chrome storage
  useEffect(() => {
    chrome.storage.local.get(['bubblePosition'], (result) => {
      if (result.bubblePosition) {
        // Ensure we don't position off-screen
        const savedPosition = result.bubblePosition;
        const boundedX = Math.max(0, Math.min(window.innerWidth - 70, savedPosition.x));
        const boundedY = Math.max(0, Math.min(window.innerHeight - 70, savedPosition.y));
        
        setPosition({
          x: boundedX,
          y: boundedY
        });
      }
    });
  }, []);

  // Save the position whenever it changes
  useEffect(() => {
    // Only save position if the user has moved it (not on initial load)
    if (hasMoved) {
      chrome.storage.local.set({ bubblePosition: position });
      console.log('Saved bubble position to storage:', position);
    }
  }, [position, hasMoved]);

  // Effect to fetch unread message count
  useEffect(() => {
    console.log("Setting up unread message count checker");

    // Function to request unread count by fetching conversations directly
    const checkUnreadCount = () => {
      // Don't update if we're in the middle of sending a message
      if (isSendingMessage) {
        console.log("Skipping unread check while sending message");
        return;
      }
      console.log("Checking unread conversations directly");
      // Instead of requesting just the count, we fetch the full conversations list
      // and calculate the unread count from there
      fetchUnreadConversations();
    };

    // Check immediately on mount
    checkUnreadCount();

    // Set up interval to check less frequently (every 3 seconds instead of 30 seconds)
    // This significantly reduces API calls but we're testing if rate limits are handled properly
    const intervalId = setInterval(checkUnreadCount, 3000);

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

    // Force check less frequently (every 2 minutes instead of 10 seconds)
    // This further reduces API calls to avoid rate limiting
    const forceCheckIntervalId = setInterval(forceCheckMessages, 120000);

    // Also check when the tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, checking messages");
        // Add a small delay to prevent immediate API call when switching tabs rapidly
        setTimeout(forceCheckMessages, 1000);
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

  // Effect to maintain bubble visibility based on conversation state
  useEffect(() => {
    if (isActiveChat || activeConversation || isOpen || unreadCount > 0 || isSendingMessage) {
      setShowBubble(true);
    }
  }, [isActiveChat, activeConversation, isOpen, unreadCount, isSendingMessage]);

  // Handle mouse down event for dragging - works on both bubble and chatbox header
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left mouse button

    setIsDragging(true);

    // Calculate drag offset from initial click position
    const offsetX = e.clientX - position.x;
    const offsetY = e.clientY - position.y;

    dragStartPos.current = { x: offsetX, y: offsetY };
    mouseDownTime.current = Date.now();

    // Prevent text selection during dragging
    e.preventDefault();
  };

  // Handle mouse move event for dragging
  const handleMouseMove = (e: React.MouseEvent<Document, MouseEvent>) => {
    if (!isDragging) return;

    // Calculate new position based on mouse position and initial drag offset
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;

    // Set bounds to keep bubble within viewport
    const boundedX = Math.max(0, Math.min(window.innerWidth - 70, newX));
    const boundedY = Math.max(0, Math.min(window.innerHeight - 70, newY));

    // Only set hasMoved if we've moved a significant amount
    if (
      Math.abs(boundedX - position.x) > 5 ||
      Math.abs(boundedY - position.y) > 5
    ) {
      setHasMoved(true);
    }

    // Update position
    setPosition({
      x: boundedX,
      y: boundedY,
    });
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
    console.log("Handle click - Active conversation:", activeConversation?.convo?.id);
    console.log("Handle click - Available conversations:", conversations.length);
    
    // Immediately clear the display count when clicked
    setDisplayUnreadCount(0);
    
    // First, check if we have unread conversations from the API
    if (conversations.length > 0) {
      console.log("Opening first unread conversation:", conversations[0]);
      // Open the first unread conversation
      openConversation(conversations[0]);
      return;
    }
    
    // If there's an active conversation already, toggle it
    if (activeConversation) {
      setIsOpen(!isOpen);
      setShowBubble(true); // Show when opening
      return;
    }
    
    // If we reach here, we have no active conversation and no unread conversations
    // Just toggle the default chat interface
    setIsOpen(!isOpen);
    // Always show bubble when chat is open
    setShowBubble(!isOpen || unreadCount > 0);

    // Reset messages if we don't have an active conversation
    if (!isOpen && messages.length === 0) {
      setMessages([
        { text: "Hi there! How can I help you today?", isUser: false, id: 1 },
      ]);
    }
  };

  // Click handler for the close button
  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    e.preventDefault();
    
    // Force close everything immediately
    setIsOpen(false);
    setActiveConversation(null);
    setIsActiveChat(false);
    setIsSendingMessage(false);
    setShowBubble(false);
    
    // Clear any active conversation
    if (activeConversation?.convo?.id) {
      const convoId = activeConversation.convo.id;
      
      // Mark as read and add to recently closed
      chrome.runtime.sendMessage({ type: "MARK_CONVERSATION_READ", convoId });
      
      // Add to recently closed set
      setRecentlyClosedIds(prev => {
        const newSet = new Set(prev);
        newSet.add(convoId);
        return newSet;
      });
      
      // Suspend polling for 10 seconds
      pollingSuspendedUntilRef.current = Date.now() + 10000;
    }
    
    // Reset counts
    setUnreadCount(0);
    setDisplayUnreadCount(0);
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
  }, [isDragging]);

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

  return (
    <div
      id="supersky-bubble-container"
      style={{
        position: "fixed",
        top: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: 2147483647,
        display: showBubble ? 'block' : 'none' // Hide or show based on showBubble state
      }}
    >
      {/* Chat Bubble */}
      <div
        ref={bubbleRef}
        className="supersky-bubble"
        style={styles.bubble}
        onMouseDown={handleMouseDown}
      >
        {senderAvatar ? (
          <img src={senderAvatar} alt="Profile" style={styles.bubbleImage} />
        ) : (
          <span style={{ zIndex: 0 }}>S</span>
        )}
      </div>

      {/* Separate badge container for better positioning */}
      {displayUnreadCount > 0 && (
        <div style={styles.messageBadge}>
          {displayUnreadCount > 99 ? "99+" : displayUnreadCount}
        </div>
      )}

      {/* Chat Box */}
      {isOpen && (
        <div
          ref={chatboxRef}
          className={`supersky-chatbox ${getChatboxPosition()}`}
          style={{
            ...styles.chatbox,
          }}
        >
          <div style={styles.conversationHeader} onMouseDown={handleMouseDown}>
            <div style={styles.conversationTitleContainer}>
              {senderAvatar && (
                <img
                  src={senderAvatar}
                  alt="Profile"
                  style={styles.conversationAvatar}
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={styles.conversationTitle}>{senderName}</div>
              </div>
            </div>
            <button
              style={{
                ...styles.conversationClose,
                padding: '8px', // Add padding to make the close button larger
              }}
              onClick={handleCloseClick}
              aria-label="Close conversation"
            >
              ×
            </button>
          </div>

          <div style={styles.messagesContainer}>
            {messages.map((msg, index) => (
              <div key={msg.id} style={{ 
                marginBottom: msg.isUser && index > 0 && messages[index-1].isUser ? '2px' : '4px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: msg.isUser ? 'flex-end' : 'flex-start' 
              }}>
                <div
                  style={{
                    ...styles.chatMessage,
                    ...(msg.isUser ? styles.userMessage : styles.botMessage),
                  }}
                >
                  {msg.text}
                </div>
                {msg.timestamp && (
                  <div style={{
                    fontSize: '0.65rem',
                    opacity: 0.7,
                    marginTop: '0px', 
                    marginBottom: '2px', 
                    color: '#666',
                    padding: '0',
                    lineHeight: '1'
                  }}>
                    {formatMessageTime(msg.timestamp)}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.chatboxFooter}>
            <textarea
              ref={chatInputRef}
              style={{
                ...styles.chatInput, 
                borderRadius: '18px',
                height: '32px',
                minHeight: '32px',
                padding: '6px 10px',
                marginRight: '8px',
                fontSize: '13px'
              }}
              placeholder="Type a message..."
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
            />
            <button
              style={{
                ...styles.sendButton,
                backgroundColor: inputText.trim() ? '#3b82f6' : '#ccc',
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                color: 'white',
                fontSize: '18px',
              }}
              onClick={sendMessage}
              disabled={!inputText.trim()}
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentBubble;
