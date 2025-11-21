import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { invoke } from "@tauri-apps/api/core";

// Global error handlers
window.onerror = (msg, url, lineNo, columnNo, error) => {
  const errorMsg = `Uncaught error: ${msg} at ${url}:${lineNo}:${columnNo}`;
  console.error(errorMsg, error);
  invoke('frontend_log', { message: `[GLOBAL ERROR]: ${errorMsg}` }).catch(console.error);
  return false;
};

window.onunhandledrejection = (event) => {
  const errorMsg = `Unhandled promise rejection: ${event.reason}`;
  console.error(errorMsg);
  invoke('frontend_log', { message: `[GLOBAL REJECTION]: ${errorMsg}` }).catch(console.error);
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
