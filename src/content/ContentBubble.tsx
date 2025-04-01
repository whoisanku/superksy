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
    backgroundColor: "#ff4500",
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
    flexDirection: "column" as const,
    padding: "10px",
    flexGrow: 1,
    overflowY: "auto" as const,
  },
};

interface Message {
  text: string;
  isUser: boolean;
  id: number;
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

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hi there! How can I help you today?", isUser: false, id: 1 },
  ]);

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

  // Inject backup styles on mount
  useEffect(() => {
    injectStyles();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus on input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle window resize
  useEffect(() => {
    console.log("ContentBubble mounted");

    const handleResize = () => {
      setPosition((current) => {
        return {
          x: Math.min(current.x, window.innerWidth - 80),
          y: Math.min(current.y, window.innerHeight - 80),
        };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only allow dragging on the bubble itself or header, not the chatbox content
    if (
      e.target === bubbleRef.current ||
      (bubbleRef.current?.contains(e.target as Node) && !isOpen) ||
      e.currentTarget
        .querySelector(".supersky-chatbox-header")
        ?.contains(e.target as Node)
    ) {
      setIsDragging(true);
      setHasMoved(false);
      mouseDownTime.current = Date.now();
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    // Set hasMoved flag if cursor moves more than a small threshold
    if (!hasMoved) {
      const moveX = Math.abs(e.clientX - dragStartPos.current.x - position.x);
      const moveY = Math.abs(e.clientY - dragStartPos.current.y - position.y);
      if (moveX > 5 || moveY > 5) {
        setHasMoved(true);
      }
    }

    let newX = e.clientX - dragStartPos.current.x;
    let newY = e.clientY - dragStartPos.current.y;

    // Boundary checks
    const bubbleWidth = bubbleRef.current?.offsetWidth || 60;
    const bubbleHeight = bubbleRef.current?.offsetHeight || 60;
    newX = Math.max(0, Math.min(newX, window.innerWidth - bubbleWidth));
    newY = Math.max(0, Math.min(newY, window.innerHeight - bubbleHeight));

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (isDragging) {
      const dragDuration = Date.now() - mouseDownTime.current;

      // Only treat as click if:
      // 1. Mouse hasn't moved significantly (hasMoved is false)
      // 2. The interaction was short (less than 200ms)
      if (!hasMoved && dragDuration < 200) {
        const target = e.target as Node;

        // Don't toggle on buttons or textarea
        if (
          !(target instanceof HTMLButtonElement) &&
          !(target instanceof HTMLTextAreaElement)
        ) {
          // Toggle only if clicked on bubble when closed, or on header when open
          if (
            !isOpen ||
            (bubbleRef.current?.contains(target) &&
              document
                .querySelector(".supersky-chatbox-header")
                ?.contains(target))
          ) {
            setIsOpen(!isOpen);
            console.log(
              "Treating mouseup as click, chat is now:",
              !isOpen ? "open" : "closed"
            );
          }
        }
      }

      setIsDragging(false);
      setHasMoved(false);
    }
  };

  // We're replacing onClick with our own mouse down/up handling
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent default click handling - we'll handle it in mouseup
    e.stopPropagation();
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    // Add user message
    const newMessage: Message = {
      text: inputText,
      isUser: true,
      id: Date.now(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");

    // Simulate bot response after a delay
    setTimeout(() => {
      const botResponse: Message = {
        text: `Thanks for your message: "${inputText}".\nThis is a sample response.`,
        isUser: false,
        id: Date.now(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, hasMoved, isOpen]);

  // Get dynamic chatbox positioning styles
  const chatboxPosition = getChatboxPosition();

  return (
    <div
      ref={bubbleRef}
      id="supersky-bubble-container"
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 2147483647,
        cursor: isDragging ? "grabbing" : "grab",
        transition: isDragging
          ? "none"
          : "left 0.1s ease-out, top 0.1s ease-out",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "14px",
        lineHeight: 1.5,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* The Bubble itself */}
      {!isOpen && (
        <div className="supersky-bubble" style={styles.bubble}>
          S
        </div>
      )}

      {/* The Chatbox (visible when open) */}
      {isOpen && (
        <div
          ref={chatboxRef}
          className="supersky-chatbox"
          style={{ ...styles.chatbox, ...chatboxPosition }}
        >
          <div
            className="supersky-chatbox-header"
            style={styles.chatboxHeader}
            onMouseDown={handleMouseDown} // Allow dragging from header
          >
            <span>SuperSky Chat</span>
            <button
              style={styles.closeButton}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            >
              X
            </button>
          </div>

          <div
            className="supersky-chatbox-content"
            style={styles.chatboxContent}
            onClick={(e) => e.stopPropagation()} // Prevent clicks in content from closing
          >
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
          </div>

          <div
            className="supersky-chatbox-footer"
            style={styles.chatboxFooter}
            onClick={(e) => e.stopPropagation()} // Prevent clicks in footer from closing
          >
            <textarea
              ref={chatInputRef}
              className="supersky-chat-input"
              style={styles.chatInput}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={2}
            />
            <button
              className="supersky-send-button"
              style={styles.sendButton}
              onClick={handleSendMessage}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentBubble;
