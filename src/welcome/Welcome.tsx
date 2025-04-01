import { useState } from "react";

function Welcome() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false); // State to show success message

  const handleLogin = () => {
    setError(""); // Clear previous errors
    // --- Dummy Login Check ---
    if (username === "user" && password === "password") {
      // Simulate successful login by storing a dummy token
      chrome.storage.local.set({ authToken: "dummy-token" }, () => {
        console.log("Auth token stored.");
        setIsLoggedIn(true);
        // Optional: Close the welcome tab after a short delay
        setTimeout(() => {
          chrome.tabs.getCurrent((tab) => {
            if (tab?.id) {
              chrome.tabs.remove(tab.id);
            }
          });
        }, 1500); // Close after 1.5 seconds
      });
    } else {
      setError("Invalid username or password.");
    }
    // --- End Dummy Login Check ---
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
      <p>Please log in to continue.</p>
      <div>
        <label htmlFor="username">Username:</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div style={{ marginTop: "10px" }}>
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={handleLogin} style={{ marginTop: "15px" }}>
        Login
      </button>
    </div>
  );
}

export default Welcome;
