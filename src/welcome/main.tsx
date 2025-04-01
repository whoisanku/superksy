import React from "react";
import ReactDOM from "react-dom/client";
import Welcome from "./Welcome";
import "./index.css"; // Assuming you might want global styles

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Welcome />
  </React.StrictMode>
);
