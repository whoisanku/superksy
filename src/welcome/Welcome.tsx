import { useState } from "react";
import { AtpAgent } from "@atproto/api";

function Welcome() {
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setError("");
    setIsLoading(true);

    if (!handle || !appPassword) {
      setError("Please enter both your handle and app password.");
      setIsLoading(false);
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
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (isLoggedIn) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-sky-300 to-blue-500 p-5 text-white text-center">
        <div className="bg-white rounded-xl p-12 w-full max-w-md shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 rounded-full p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Login Successful!
          </h1>
          <p className="text-gray-600 text-xl mb-6">
            You are now connected to Supersky. This tab will close shortly.
          </p>
        </div>
      </div>
    );
  }

  const isFormValid = handle.trim() !== "" && appPassword.trim() !== "";

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-sky-300 to-blue-500 p-5 font-nunito">
      <div className="bg-white rounded-xl p-10 w-full max-w-md shadow-lg">
        <h1 className="text-4xl text-center font-bold text-gray-800 mb-8">
          Supersky
        </h1>

        <div className="mb-5">
          <label
            htmlFor="handle"
            className="block font-semibold mb-2 text-gray-600 text-lg"
          >
            Username
          </label>
          <input
            type="text"
            id="handle"
            value={handle}
            placeholder="johndoe.bsky.social"
            onChange={(e) => setHandle(e.target.value)}
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            disabled={isLoading}
          />
        </div>

        <div className="mb-6 relative">
          <label
            htmlFor="appPassword"
            className="block mb-2 text-gray-600 font-semibold text-lg"
          >
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="appPassword"
              value={appPassword}
              placeholder="password"
              onChange={(e) => setAppPassword(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 focus:outline-none"
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                    clipRule="evenodd"
                  />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-5">{error}</p>}

        <button
          className={`w-full bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-2 flex justify-center items-center text-base ${
            isLoading || !isFormValid
              ? "opacity-60 cursor-not-allowed"
              : "hover:bg-blue-600"
          }`}
          onClick={handleLogin}
          disabled={isLoading || !isFormValid}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              Signing in...
            </>
          ) : (
            "Log in"
          )}
        </button>
      </div>
    </div>
  );
}

export default Welcome;
