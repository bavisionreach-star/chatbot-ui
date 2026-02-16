import React, { useState, useEffect } from "react";
import ChatApp from "./ChatApp";
import AgentApp from "./AgentApp";

/*
 * DeepRack Unified UI — Auto-detects mode from backend API.
 *
 * If the backend is in agent mode (ENABLED_TOOLS set), shows the Research Agent UI.
 * Otherwise, shows the regular Chatbot UI.
 *
 * Can be overridden with REACT_APP_MODE=agent|chatbot env var at build time.
 */

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
const FORCED_MODE = process.env.REACT_APP_MODE || "";

export default function App() {
  const [mode, setMode] = useState(FORCED_MODE || null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (FORCED_MODE) return; // Skip detection if mode is forced
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/`);
        const data = await res.json();
        if (!cancelled) setMode(data.mode === "agent" ? "agent" : "chatbot");
      } catch (e) {
        console.error("Mode detection failed, defaulting to chatbot:", e);
        if (!cancelled) { setMode("chatbot"); setError(true); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!mode) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", width: "100vw", background: "#0a0a0f", color: "#71717a",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 32, height: 32, border: "3px solid #333", borderTopColor: "#6366f1",
            borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
          }} />
          <p>Connecting...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return mode === "agent" ? <AgentApp /> : <ChatApp />;
}
