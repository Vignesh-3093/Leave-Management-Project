import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/Authcontext.jsx";
const container = document.getElementById("root");

const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    {/* The single Router is now expected to be within App.tsx */}
    {/* Removed: <BrowserRouter> */}
    {/* Wrap the entire application with AuthProvider so context is available */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
