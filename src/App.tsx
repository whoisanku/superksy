import { useState, useEffect } from "react";
import "./App.css";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user is already logged in using Chrome storage
    chrome.storage.local.get(["authToken"], (result) => {
      if (result.authToken) {
        setIsLoggedIn(true);
      }
      setIsLoading(false);
    });
  }, []);

  const handleLogin = (token: string) => {
    // Save auth token to Chrome storage
    chrome.storage.local.set({ authToken: token }, () => {
      setIsLoggedIn(true);
    });
  };

  const handleLogout = () => {
    // Remove auth token from Chrome storage
    chrome.storage.local.remove(["authToken"], () => {
      setIsLoggedIn(false);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-100">
      {isLoggedIn ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
