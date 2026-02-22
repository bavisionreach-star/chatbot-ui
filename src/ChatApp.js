import React, { useState, useRef, useEffect, useCallback } from "react";

/*
 * DeepRack Chatbot UI — Elegant, mobile-friendly chat interface
 *
 * Config via environment variables (baked at build time):
 *   REACT_APP_API_URL      — Backend chatbot API URL (required)
 *   REACT_APP_BOT_NAME     — Chatbot display name  (default: "AI Assistant")
 *   REACT_APP_BOT_TAGLINE  — Subtitle              (default: "Powered by DeepRack")
 *   REACT_APP_ORG_NAME     — Company / org name     (optional)
 *   REACT_APP_LOGO_URL     — Logo URL or data URI   (optional)
 *   REACT_APP_THEME_COLOR  — Accent hex             (default: "#6366f1")
 */

const API_URL   = process.env.REACT_APP_API_URL      || "http://localhost:8000";
const BOT_NAME  = process.env.REACT_APP_BOT_NAME     || "AI Assistant";
const BOT_TAG   = process.env.REACT_APP_BOT_TAGLINE  || "Powered by DeepRack";
const ORG_NAME  = process.env.REACT_APP_ORG_NAME     || "";
const LOGO_URL  = process.env.REACT_APP_LOGO_URL     || "";
const ACCENT    = process.env.REACT_APP_THEME_COLOR   || process.env.REACT_APP_ACCENT || "#6366f1";

/* ── Theme system ── */

const darkPalette = {
  bg: "#09090b", surface: "#111113", surfaceHover: "#18181b",
  border: "rgba(255,255,255,0.07)", borderHover: "rgba(255,255,255,0.12)",
  text: "#f4f4f5", textSecondary: "#a1a1aa", textMuted: "#71717a", textFaint: "#3f3f46",
  userBubble: ACCENT + "14", userBorder: ACCENT + "28",
  botBubble: "transparent", botBorder: "transparent",
  inputBg: "#18181b", codeBg: "rgba(255,255,255,0.03)", codeBorder: "rgba(255,255,255,0.06)",
  shadow: "0 1px 3px rgba(0,0,0,0.4)",
};

const lightPalette = {
  bg: "#F7F4F0", surface: "#FFFDF8", surfaceHover: "#F0ECE6",
  border: "rgba(0,0,0,0.08)", borderHover: "rgba(0,0,0,0.14)",
  text: "#18181b", textSecondary: "#52525b", textMuted: "#71717a", textFaint: "#a1a1aa",
  userBubble: ACCENT + "12", userBorder: ACCENT + "25",
  botBubble: "transparent", botBorder: "transparent",
  inputBg: "#F0ECE6", codeBg: "rgba(0,0,0,0.03)", codeBorder: "rgba(0,0,0,0.08)",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
};

function getTheme(dark) {
  const p = dark ? darkPalette : lightPalette;
  return { ...p, accent: ACCENT, accentLight: ACCENT + "18", green: "#22c55e", red: "#ef4444", radius: "20px", isDark: dark };
}

/* ── Icons ── */

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/* ── Style builder (dynamic, theme-aware) ── */

function buildStyles(t) {
  return {
    container: {
      display: "flex", flexDirection: "column", height: "100dvh", width: "100vw",
      background: t.bg, color: t.text,
      fontFamily: "'Poppins', sans-serif", transition: "background 0.3s, color 0.3s",
    },
    header: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 20px", borderBottom: `1px solid ${t.userBorder}`, background: t.userBubble,
      flexShrink: 0, gap: 12, transition: "background 0.3s, border-color 0.3s",
    },
    headerLeft: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 },
    avatar: {
      width: 42, height: 42, borderRadius: 14, flexShrink: 0,
      background: LOGO_URL ? (t.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)") : `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, color: t.isDark ? "#fff" : t.text, fontWeight: 700, overflow: "hidden",
      boxShadow: `0 4px 14px ${ACCENT}25`, transition: "background 0.3s",
    },
    logoImg: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 },
    headerInfo: { minWidth: 0 },
    headerTitle: { fontSize: 16, fontWeight: 600, color: t.text, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    headerOrg: { fontSize: 11, color: t.textMuted, marginTop: 1, fontWeight: 500, letterSpacing: "0.02em" },
    headerSub: { fontSize: 11, color: t.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 6, fontWeight: 400 },
    statusDot: (on) => ({ width: 7, height: 7, borderRadius: "50%", background: on ? t.green : on === false ? t.red : t.textFaint, transition: "background 0.3s" }),
    headerRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
    iconBtn: {
      width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.border}`, cursor: "pointer",
      background: "transparent", color: t.textMuted, display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.2s",
    },
    chatArea: { flex: 1, overflowY: "auto", padding: "28px 16px", WebkitOverflowScrolling: "touch" },
    chatInner: { maxWidth: 760, margin: "0 auto", width: "100%" },
    msgRow: (isUser) => ({
      display: "flex", gap: 12, marginBottom: 24,
      justifyContent: isUser ? "flex-end" : "flex-start",
      alignItems: "flex-start",
    }),
    botAvatar: {
      width: 36, height: 36, borderRadius: 12, flexShrink: 0, marginTop: 2,
      background: LOGO_URL ? (t.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)") : `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, color: t.isDark ? "#fff" : t.text, fontWeight: 700, overflow: "hidden",
      transition: "background 0.3s",
    },
    botAvatarImg: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 },
    userBubble: {
      background: t.userBubble, border: `1px solid ${t.userBorder}`,
      borderRadius: "20px 20px 6px 20px", padding: "14px 20px",
      maxWidth: "78%", fontSize: 15, lineHeight: 1.7, color: t.text,
      fontWeight: 400, wordBreak: "break-word",
    },
    botBubble: {
      flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.75, color: t.textSecondary,
      fontWeight: 400,
    },
    inputBar: {
      flexShrink: 0, borderTop: `1px solid ${t.userBorder}`, background: t.userBubble,
      padding: "14px 16px", transition: "background 0.3s, border-color 0.3s",
    },
    inputWrap: {
      maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "flex-end",
      background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: t.radius,
      transition: "all 0.2s", boxShadow: t.shadow,
    },
    textarea: {
      flex: 1, background: "transparent", border: "none", outline: "none", resize: "none",
      color: t.text, fontSize: 15, padding: "14px 18px", maxHeight: 150,
      fontFamily: "'Poppins', sans-serif", lineHeight: 1.6, fontWeight: 400,
    },
    sendBtn: (active) => ({
      width: 40, height: 40, borderRadius: 12, border: "none", cursor: active ? "pointer" : "default",
      background: active ? ACCENT : t.inputBg,
      color: active ? "#fff" : t.textFaint,
      display: "flex", alignItems: "center", justifyContent: "center",
      margin: "0 6px 6px 0", transition: "all 0.25s", flexShrink: 0,
    }),
    footer: { textAlign: "center", fontSize: 11, color: t.textFaint, padding: "8px 0 12px", fontWeight: 400 },
    codeBlock: {
      background: t.codeBg, border: `1px solid ${t.codeBorder}`,
      borderRadius: 14, overflow: "hidden", margin: "12px 0",
    },
    codeHeader: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 16px", borderBottom: `1px solid ${t.codeBorder}`,
      background: t.codeBg,
    },
    codeLang: { fontSize: 12, color: t.textMuted, fontFamily: "'SF Mono', Monaco, Consolas, monospace", fontWeight: 500 },
    codePre: { padding: 16, overflowX: "auto", margin: 0 },
    codeText: { fontSize: 13, fontFamily: "'SF Mono', Monaco, Consolas, monospace", color: t.textSecondary, lineHeight: 1.6 },
    copyBtn: {
      background: "none", border: "none", color: t.textMuted, cursor: "pointer",
      fontSize: 12, display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
      borderRadius: 6, fontFamily: "'Poppins', sans-serif", fontWeight: 500,
      transition: "color 0.2s",
    },
    welcome: { textAlign: "center", padding: "clamp(40px, 10vh, 80px) 20px", display: "flex", flexDirection: "column", alignItems: "center" },
    welcomeAvatar: {
      width: 80, height: 80, borderRadius: 24, marginBottom: 24,
      background: LOGO_URL ? (t.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)") : `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 34, color: t.isDark ? "#fff" : t.text, fontWeight: 700, overflow: "hidden",
      boxShadow: `0 16px 48px ${ACCENT}20`, transition: "background 0.3s",
    },
    welcomeLogoImg: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 24 },
    welcomeTitle: { fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 700, color: t.text, marginBottom: 6, lineHeight: 1.2 },
    welcomeOrg: { fontSize: 14, color: t.accent, fontWeight: 600, marginBottom: 10, letterSpacing: "0.02em" },
    welcomeDesc: { fontSize: "clamp(14px, 3.5vw, 16px)", color: t.textMuted, maxWidth: 460, lineHeight: 1.7, fontWeight: 400 },
    welcomeChips: { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 28, maxWidth: 480 },
    chip: {
      padding: "10px 18px", borderRadius: 14, border: `1px solid ${t.border}`,
      background: t.surface, color: t.textSecondary, fontSize: 14, cursor: "pointer",
      transition: "all 0.2s", fontFamily: "'Poppins', sans-serif", fontWeight: 400,
      whiteSpace: "nowrap",
    },
    typing: { display: "flex", alignItems: "center", gap: 5, padding: "6px 0" },
    dot: (delay) => ({
      width: 7, height: 7, borderRadius: "50%", background: ACCENT,
      animation: "bounce 1.2s infinite", animationDelay: `${delay}ms`, opacity: 0.8,
    }),
  };
}

/* ── Markdown renderer ── */

function CopyBtn({ text, t }) {
  const [copied, setCopied] = useState(false);
  const s = buildStyles(t);
  return (
    <button
      style={s.copyBtn}
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Markdown({ text, t }) {
  if (!text) return null;
  const s = buildStyles(t);
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    const m = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
    if (m) {
      return (
        <div key={i} style={s.codeBlock}>
          <div style={s.codeHeader}>
            <span style={s.codeLang}>{m[1] || "code"}</span>
            <CopyBtn text={m[2].trim()} t={t} />
          </div>
          <pre style={s.codePre}><code style={s.codeText}>{m[2].trim()}</code></pre>
        </div>
      );
    }
    return (
      <div key={i}>
        {part.split("\n").map((line, j) => {
          if (line.startsWith("### ")) return <h3 key={j} style={{ fontSize: 16, fontWeight: 600, color: t.text, margin: "16px 0 8px" }}>{line.slice(4)}</h3>;
          if (line.startsWith("## ")) return <h2 key={j} style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: "20px 0 10px" }}>{line.slice(3)}</h2>;
          if (line.match(/^[-*]\s/)) return (
            <div key={j} style={{ display: "flex", gap: 10, margin: "4px 0 4px 4px" }}>
              <span style={{ color: ACCENT, marginTop: 3, flexShrink: 0, fontSize: 8 }}>●</span>
              <span><Inline text={line.slice(2)} t={t} /></span>
            </div>
          );
          const num = line.match(/^(\d+)\.\s(.*)/);
          if (num) return (
            <div key={j} style={{ display: "flex", gap: 10, margin: "5px 0 5px 4px" }}>
              <span style={{ color: ACCENT, fontFamily: "'SF Mono', monospace", fontSize: 13, marginTop: 3, flexShrink: 0, width: 18, textAlign: "right", fontWeight: 600 }}>{num[1]}.</span>
              <span><Inline text={num[2]} t={t} /></span>
            </div>
          );
          if (!line.trim()) return <div key={j} style={{ height: 10 }} />;
          return <p key={j} style={{ margin: "4px 0", lineHeight: 1.75 }}><Inline text={line} t={t} /></p>;
        })}
      </div>
    );
  });
}

function Inline({ text, t }) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color: t.text, fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} style={{ padding: "2px 8px", borderRadius: 6, background: t.codeBg, border: `1px solid ${t.codeBorder}`, color: ACCENT, fontSize: 13, fontFamily: "'SF Mono', monospace", fontWeight: 500 }}>{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}

function Typing() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 0" }}>
      {[0, 150, 300].map((d) => (
        <div key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: ACCENT, animation: "bounce 1.2s infinite", animationDelay: `${d}ms`, opacity: 0.7 }} />
      ))}
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}`}</style>
    </div>
  );
}

/* ── Main App ── */

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [online, setOnline] = useState(null);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("chatbot-theme") !== "light"; } catch { return true; }
  });
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const t = getTheme(dark);
  const s = buildStyles(t);

  const toggleTheme = () => {
    setDark((prev) => {
      const next = !prev;
      try { localStorage.setItem("chatbot-theme", next ? "dark" : "light"); } catch {}
      return next;
    });
  };

  // Health check
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      fetch(`${API_URL}/health`).then(r => r.json()).then(d => { if (!cancelled) setOnline(d.status === "healthy"); }).catch(() => { if (!cancelled) setOnline(false); });
    };
    check();
    const iv = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  // Auto-scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Focus input on desktop
  useEffect(() => {
    if (window.innerWidth > 768) inputRef.current?.focus();
  }, []);

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

  const suggestions = [`What can you do?`, `Tell me about ${ORG_NAME || BOT_NAME}`, `Help me get started`];

  return (
    <div style={s.container}>
      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.avatar}>
            {LOGO_URL ? <img src={LOGO_URL} alt={BOT_NAME} style={s.logoImg} /> : BOT_NAME[0]}
          </div>
          <div style={s.headerInfo}>
            <div style={s.headerTitle}>{BOT_NAME}</div>
            {ORG_NAME && <div style={s.headerOrg}>{ORG_NAME}</div>}
            <div style={s.headerSub}>
              <div style={s.statusDot(online)} />
              {online === true ? "Online" : online === false ? "Connecting..." : "Checking..."}
            </div>
          </div>
        </div>
        <div style={s.headerRight}>
          {messages.length > 0 && (
            <button style={s.iconBtn} onClick={() => setMessages([])} title="New chat"><PlusIcon /></button>
          )}
          <button style={s.iconBtn} onClick={toggleTheme} title={dark ? "Light mode" : "Dark mode"}>
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={s.chatArea}>
        <div style={s.chatInner}>
          {messages.length === 0 && (
            <div style={s.welcome}>
              <div style={s.welcomeAvatar}>
                {LOGO_URL ? <img src={LOGO_URL} alt={BOT_NAME} style={s.welcomeLogoImg} /> : BOT_NAME[0]}
              </div>
              <h1 style={s.welcomeTitle}>{BOT_NAME}</h1>
              {ORG_NAME && <p style={s.welcomeOrg}>{ORG_NAME}</p>}
              <p style={s.welcomeDesc}>{BOT_TAG}. Ask me anything to get started.</p>
              <div style={s.welcomeChips}>
                {suggestions.map((q) => (
                  <button
                    key={q}
                    style={s.chip}
                    onClick={() => send(q)}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textSecondary; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={s.msgRow(msg.role === "user")}>
              {msg.role === "assistant" && (
                <div style={s.botAvatar}>
                  {LOGO_URL ? <img src={LOGO_URL} alt="" style={s.botAvatarImg} /> : BOT_NAME[0]}
                </div>
              )}
              {msg.role === "user" ? (
                <div style={s.userBubble}>{msg.content}</div>
              ) : msg.content ? (
                <div style={s.botBubble}>
                  <Markdown text={msg.content} t={t} />
                  {/* End-of-response indicator — only show when not actively streaming this message */}
                  {!(streaming && i === messages.length - 1) && (
                    <span style={{ display: "block", marginTop: 12, paddingTop: 8, borderTop: `1px solid ${t.border}`, fontSize: 11, color: t.textFaint, fontWeight: 400, letterSpacing: "0.02em" }}>
                      end of response
                    </span>
                  )}
                </div>
              ) : (
                <Typing />
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* ── Input bar ── */}
      <div style={s.inputBar}>
        <form onSubmit={handleSubmit} style={s.inputWrap}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px"; }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
            placeholder={`Message ${BOT_NAME}...`}
            rows={1}
            style={s.textarea}
            disabled={streaming}
          />
          <button type="submit" disabled={!input.trim()} style={s.sendBtn(!!input.trim())}>
            {streaming ? <div style={{ width: 12, height: 12, borderRadius: 3, background: t.red }} /> : <SendIcon />}
          </button>
        </form>
        <p style={s.footer}>{ORG_NAME ? `${BOT_NAME} by ${ORG_NAME}` : BOT_NAME} — {BOT_TAG}</p>
      </div>
    </div>
  );
}
