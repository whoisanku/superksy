// Backup injection of critical styles in case external CSS fails
export const injectStyles = () => {
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
