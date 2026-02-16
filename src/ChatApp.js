import React, { useState, useRef, useEffect, useCallback } from "react";

/*
 * DeepRack Chatbot UI
 * All config via environment variables at build time:
 *   REACT_APP_API_URL     — Backend chatbot API URL (required)
 *   REACT_APP_BOT_NAME    — Chatbot display name (default: "AI Assistant")
 *   REACT_APP_BOT_TAGLINE — Short description (default: "Powered by DeepRack")
 *   REACT_APP_ACCENT      — Accent color hex (default: "#6366f1")
 */

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
const BOT_NAME = process.env.REACT_APP_BOT_NAME || "AI Assistant";
const BOT_TAGLINE = process.env.REACT_APP_BOT_TAGLINE || "Powered by DeepRack";
const ACCENT = process.env.REACT_APP_ACCENT || "#6366f1";

/* ── Inline styles (no Tailwind dependency) ── */

const theme = {
  bg: "#0a0a0f",
  surface: "#12121a",
  border: "rgba(255,255,255,0.06)",
  text: "#e4e4e7",
  textMuted: "#71717a",
  textFaint: "#3f3f46",
  accent: ACCENT,
  accentLight: ACCENT + "22",
  userBubble: ACCENT + "18",
  userBorder: ACCENT + "30",
  green: "#22c55e",
  red: "#ef4444",
  radius: "16px",
};

const styles = {
  container: {
    display: "flex", flexDirection: "column", height: "100vh", width: "100vw",
    background: theme.bg, color: theme.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 20px", borderBottom: `1px solid ${theme.border}`, background: theme.surface,
    flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: {
    width: 36, height: 36, borderRadius: 12,
    background: `linear-gradient(135deg, ${ACCENT}, #8b5cf6)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, color: "#fff", fontWeight: 700,
  },
  headerTitle: { fontSize: 14, fontWeight: 700, color: "#fff" },
  headerSub: { fontSize: 10, color: theme.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 6 },
  statusDot: (online) => ({
    width: 6, height: 6, borderRadius: "50%",
    background: online ? theme.green : theme.red,
  }),
  chatArea: { flex: 1, overflowY: "auto", padding: "24px 16px" },
  chatInner: { maxWidth: 720, margin: "0 auto" },
  msgRow: (isUser) => ({
    display: "flex", gap: 10, marginBottom: 20,
    justifyContent: isUser ? "flex-end" : "flex-start",
  }),
  botAvatar: {
    width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 2,
    background: `linear-gradient(135deg, ${ACCENT}, #8b5cf6)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, color: "#fff", fontWeight: 700,
  },
  userBubble: {
    background: theme.userBubble, border: `1px solid ${theme.userBorder}`,
    borderRadius: "16px 16px 4px 16px", padding: "10px 16px",
    maxWidth: "80%", fontSize: 14, lineHeight: 1.6, color: "#e4e4e7",
  },
  botBubble: {
    flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.7, color: "#d4d4d8",
  },
  inputBar: {
    flexShrink: 0, borderTop: `1px solid ${theme.border}`, background: theme.surface,
    padding: "12px 16px",
  },
  inputWrap: {
    maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "flex-end",
    background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: theme.radius,
    transition: "border-color 0.2s",
  },
  textarea: {
    flex: 1, background: "transparent", border: "none", outline: "none", resize: "none",
    color: theme.text, fontSize: 14, padding: "12px 16px", maxHeight: 140,
    fontFamily: "inherit", lineHeight: 1.5,
  },
  sendBtn: (active) => ({
    width: 34, height: 34, borderRadius: 10, border: "none", cursor: active ? "pointer" : "default",
    background: active ? ACCENT : "rgba(255,255,255,0.05)",
    color: active ? "#fff" : theme.textFaint,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 6px 6px 0", transition: "all 0.2s", flexShrink: 0,
  }),
  footer: { textAlign: "center", fontSize: 10, color: theme.textFaint, padding: "6px 0 10px" },
  codeBlock: {
    background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`,
    borderRadius: 12, overflow: "hidden", margin: "10px 0",
  },
  codeHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "6px 14px", borderBottom: `1px solid ${theme.border}`,
    background: "rgba(255,255,255,0.02)",
  },
  codeLang: { fontSize: 11, color: theme.textMuted, fontFamily: "monospace" },
  codePre: { padding: 14, overflowX: "auto", margin: 0 },
  codeText: { fontSize: 13, fontFamily: "'SF Mono', Monaco, Consolas, monospace", color: "#d4d4d8", lineHeight: 1.5 },
  copyBtn: {
    background: "none", border: "none", color: theme.textMuted, cursor: "pointer",
    fontSize: 11, display: "flex", alignItems: "center", gap: 4, padding: "2px 6px",
    borderRadius: 4,
  },
  welcome: { textAlign: "center", padding: "60px 20px" },
  welcomeAvatar: {
    width: 64, height: 64, borderRadius: 20, margin: "0 auto 20px",
    background: `linear-gradient(135deg, ${ACCENT}, #8b5cf6)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 28, color: "#fff", fontWeight: 700, boxShadow: `0 12px 40px ${ACCENT}30`,
  },
  welcomeTitle: { fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 },
  welcomeDesc: { fontSize: 14, color: theme.textMuted, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 },
  newChatBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
    borderRadius: 8, border: "none", background: "transparent",
    color: theme.textMuted, cursor: "pointer", fontSize: 12,
  },
  typing: { display: "flex", alignItems: "center", gap: 4, padding: "4px 0" },
  dot: (delay) => ({
    width: 6, height: 6, borderRadius: "50%", background: ACCENT,
    animation: "bounce 1.2s infinite", animationDelay: `${delay}ms`,
  }),
};

/* ── Markdown renderer ── */

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      style={styles.copyBtn}
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Markdown({ text }) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    const m = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
    if (m) {
      return (
        <div key={i} style={styles.codeBlock}>
          <div style={styles.codeHeader}>
            <span style={styles.codeLang}>{m[1] || "code"}</span>
            <CopyBtn text={m[2].trim()} />
          </div>
          <pre style={styles.codePre}><code style={styles.codeText}>{m[2].trim()}</code></pre>
        </div>
      );
    }
    return (
      <div key={i}>
        {part.split("\n").map((line, j) => {
          if (line.startsWith("### ")) return <h3 key={j} style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "14px 0 6px" }}>{line.slice(4)}</h3>;
          if (line.startsWith("## ")) return <h2 key={j} style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "18px 0 8px" }}>{line.slice(3)}</h2>;
          if (line.match(/^[-*]\s/)) return (
            <div key={j} style={{ display: "flex", gap: 8, margin: "3px 0 3px 4px" }}>
              <span style={{ color: ACCENT, marginTop: 2, flexShrink: 0 }}>•</span>
              <span><Inline text={line.slice(2)} /></span>
            </div>
          );
          const num = line.match(/^(\d+)\.\s(.*)/);
          if (num) return (
            <div key={j} style={{ display: "flex", gap: 8, margin: "4px 0 4px 4px" }}>
              <span style={{ color: ACCENT, fontFamily: "monospace", fontSize: 12, marginTop: 3, flexShrink: 0, width: 16, textAlign: "right" }}>{num[1]}.</span>
              <span><Inline text={num[2]} /></span>
            </div>
          );
          if (!line.trim()) return <div key={j} style={{ height: 8 }} />;
          return <p key={j} style={{ margin: "3px 0", lineHeight: 1.7 }}><Inline text={line} /></p>;
        })}
      </div>
    );
  });
}

function Inline({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color: "#fff", fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} style={{ padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: ACCENT, fontSize: 13, fontFamily: "monospace" }}>{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}

function Typing() {
  return (
    <div style={styles.typing}>
      <div style={styles.dot(0)} /><div style={styles.dot(150)} /><div style={styles.dot(300)} />
      <style>{`@keyframes bounce { 0%,80%,100% { transform: translateY(0) } 40% { transform: translateY(-6px) } }`}</style>
    </div>
  );
}

/* ── Send icon ── */
function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

/* ── Main ChatApp ── */

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [online, setOnline] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // Health check
  useEffect(() => {
    fetch(`${API_URL}/health`).then(r => r.json()).then(d => setOnline(d.status === "healthy")).catch(() => setOnline(false));
  }, []);

  // Auto-scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Focus input
  useEffect(() => { inputRef.current?.focus(); }, []);

  const send = useCallback(async (text) => {
    if (!text.trim() || streaming) return;
    const userMsg = { role: "user", content: text.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setStreaming(true);
    setMessages([...newMsgs, { role: "assistant", content: "" }]);

    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const resp = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })), stream: true }),
        signal: ctrl.signal,
      });
      if (!resp.ok) throw new Error("Failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n").filter(l => l.trim())) {
          try {
            const d = JSON.parse(line);
            if (d.error) { full = `⚠️ ${d.error}`; break; }
            if (d.message?.content) {
              full += d.message.content;
              setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: full }; return u; });
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "⚠️ Connection failed. Please try again." }; return u; });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming]);

  const handleSubmit = (e) => { e.preventDefault(); send(input); };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.avatar}>{BOT_NAME[0]}</div>
          <div>
            <div style={styles.headerTitle}>{BOT_NAME}</div>
            <div style={styles.headerSub}>
              <div style={styles.statusDot(online)} />
              {online === true ? "Online" : online === false ? "Starting up..." : "Checking..."}
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button style={styles.newChatBtn} onClick={() => setMessages([])}>↻ New chat</button>
        )}
      </div>

      {/* Chat */}
      <div style={styles.chatArea}>
        <div style={styles.chatInner}>
          {messages.length === 0 && (
            <div style={styles.welcome}>
              <div style={styles.welcomeAvatar}>{BOT_NAME[0]}</div>
              <h1 style={styles.welcomeTitle}>{BOT_NAME}</h1>
              <p style={styles.welcomeDesc}>{BOT_TAGLINE}. Ask me anything to get started.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={styles.msgRow(msg.role === "user")}>
              {msg.role === "assistant" && <div style={styles.botAvatar}>{BOT_NAME[0]}</div>}
              {msg.role === "user" ? (
                <div style={styles.userBubble}>{msg.content}</div>
              ) : msg.content ? (
                <div style={styles.botBubble}><Markdown text={msg.content} /></div>
              ) : (
                <Typing />
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div style={styles.inputBar}>
        <form onSubmit={handleSubmit} style={styles.inputWrap}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
            placeholder={`Ask ${BOT_NAME} anything...`}
            rows={1}
            style={styles.textarea}
            disabled={streaming}
          />
          <button type="submit" disabled={!input.trim()} style={styles.sendBtn(!!input.trim())}>
            {streaming ? <div style={{ width: 10, height: 10, borderRadius: 2, background: "#ef4444" }} /> : <SendIcon />}
          </button>
        </form>
        <p style={styles.footer}>{BOT_NAME} — {BOT_TAGLINE}</p>
      </div>
    </div>
  );
}
