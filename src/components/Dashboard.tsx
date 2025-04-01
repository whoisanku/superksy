import { useState, useEffect } from "react";

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard = ({ onLogout }: DashboardProps) => {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Get the current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url);
      }
    });
  }, []);

  const handleAction = () => {
    setIsLoading(true);
    // Simulate an action with the current page
    setTimeout(() => {
      setIsLoading(false);
      alert("Action completed successfully!");
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">SuperSky</h1>
        <button
          onClick={onLogout}
          className="text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
        >
          Logout
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 overflow-auto">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Current Page</h2>
          <p className="text-gray-600 text-sm truncate">{currentUrl}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Actions</h2>
          <button
            onClick={handleAction}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex justify-center items-center disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              "Perform Action"
            )}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 p-3 rounded">
              <p className="text-sm text-gray-500">Pages Visited</p>
              <p className="text-xl font-bold">24</p>
            </div>
            <div className="bg-gray-100 p-3 rounded">
              <p className="text-sm text-gray-500">Actions Taken</p>
              <p className="text-xl font-bold">12</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 p-2 text-center text-xs text-gray-500">
        SuperSky v0.1.0
      </footer>
    </div>
  );
};

export default Dashboard;
