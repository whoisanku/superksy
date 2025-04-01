import { useState } from "react";
import { AtpAgent } from "@atproto/api";

function Welcome() {
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!handle || !appPassword) {
      setError("Please enter both your handle and app password.");
      return;
    }

    try {
      const agent = new AtpAgent({ service: "https://bsky.social" });

      await agent.login({
        identifier: handle,
        password: appPassword,
      });

      chrome.storage.local.set(
        { bskyHandle: handle, bskyAppPassword: appPassword, loggedIn: true },
        () => {
          console.log(
            "Bluesky login successful. Handle and App Password stored."
          );
          setIsLoggedIn(true);

          setTimeout(() => {
            chrome.tabs.getCurrent((tab) => {
              if (tab?.id) {
                chrome.tabs.remove(tab.id);
              }
            });
          }, 1500);
        }
      );
    } catch (err: any) {
      console.error("Bluesky login failed:", err);
      setError(
        err.message ||
          "Login failed. Check your handle and app password (ensure it has DM/Chat access if needed later)."
      );
    }
  };

  if (isLoggedIn) {
    return (
      <div>
        <h1>Login Successful!</h1>
        <p>You can now use the extension popup. This tab will close shortly.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome to SuperSky!</h1>
      <p>Please log in with your Bluesky account.</p>
      <div>
        <label htmlFor="handle">Bluesky Handle:</label>
        <input
          type="text"
          id="handle"
          value={handle}
          placeholder="yourhandle.bsky.social"
          onChange={(e) => setHandle(e.target.value)}
        />
      </div>
      <div style={{ marginTop: "10px" }}>
        <label htmlFor="appPassword">App Password:</label>
        <input
          type="password"
          id="appPassword"
          value={appPassword}
          placeholder="xxxx-xxxx-xxxx-xxxx"
          onChange={(e) => setAppPassword(e.target.value)}
        />
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={handleLogin} style={{ marginTop: "15px" }}>
        Login with Bluesky
      </button>
    </div>
  );
}

export default Welcome;
