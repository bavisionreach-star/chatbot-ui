import React, { useState, useEffect, useRef, useCallback } from "react";

/*
 * DeepRack Agent UI — Research Interface
 *
 * A modern research agent UI with:
 *   - Landing page with "New Research" + history
 *   - Animated pipeline visualization
 *   - Research result preview with markdown
 *   - Research history with SQLite-backed persistence
 *
 * Config via env vars at build time:
 *   REACT_APP_API_URL   — Backend agent API URL
 *   REACT_APP_BOT_NAME  — Agent display name
 */

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
const BOT_NAME = process.env.REACT_APP_BOT_NAME || "Research Agent";
const ACCENT = process.env.REACT_APP_ACCENT || "#6366f1";

// ─── Pipeline step definitions ───
const PIPELINE_STEPS = [
  { key: "understanding", label: "Understanding Topic", icon: "🧠", desc: "AI is analyzing the research topic and scope" },
  { key: "planning", label: "Planning Strategy", icon: "📋", desc: "Preparing search queries for sub-agents" },
  { key: "searching", label: "Searching the Web", icon: "🔍", desc: "Sub-agents are searching across multiple sources" },
  { key: "collecting", label: "Collecting Data", icon: "📥", desc: "Reading and extracting data from web pages" },
  { key: "analyzing", label: "Analyzing Data", icon: "⚡", desc: "AI is processing all collected information" },
  { key: "generating", label: "Generating Report", icon: "✍️", desc: "Writing a comprehensive research report" },
  { key: "complete", label: "Research Complete", icon: "✅", desc: "Research ready for preview" },
];

// ─── Simple Markdown renderer ───
function renderMarkdown(text) {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 style="margin:20px 0 8px;font-size:16px;color:#e4e4e7;font-weight:600">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:24px 0 10px;font-size:18px;color:#e4e4e7;font-weight:700">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin:28px 0 12px;font-size:22px;color:#fff;font-weight:700">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e4e4e7">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:rgba(99,102,241,0.15);padding:2px 6px;border-radius:4px;font-size:13px;color:#a5b4fc">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#818cf8;text-decoration:underline">$1</a>')
    .replace(/(https?:\/\/[^\s<]+)/g, (m, url) => {
      if (m.includes('href="')) return m;
      return `<a href="${url}" target="_blank" rel="noopener" style="color:#818cf8;text-decoration:underline;word-break:break-all">${url}</a>`;
    })
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin:4px 0;padding-left:4px;list-style:decimal">$2</li>')
    .replace(/\n{2,}/g, '<div style="height:12px"></div>')
    .replace(/\n/g, "<br/>");
  return html;
}

// ─── CSS Keyframes (injected once) ───
const injectStyles = () => {
  if (document.getElementById("agent-styles")) return;
  const style = document.createElement("style");
  style.id = "agent-styles";
  style.textContent = `
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes glow { 0%, 100% { box-shadow: 0 0 8px ${ACCENT}40; } 50% { box-shadow: 0 0 20px ${ACCENT}60; } }
    @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 200px; } }
    @keyframes dotPulse { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    @keyframes progressFlow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
    @keyframes borderGlow { 0%, 100% { border-color: ${ACCENT}30; } 50% { border-color: ${ACCENT}80; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; color: #e4e4e7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #555; }
  `;
  document.head.appendChild(style);
};

// ─── Views ───
const VIEW = { HOME: "home", NEW: "new", PIPELINE: "pipeline", RESULT: "result" };

export default function AgentApp() {
  const [view, setView] = useState(VIEW.HOME);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [currentResearch, setCurrentResearch] = useState(null);
  const [pipelineSteps, setPipelineSteps] = useState([]);
  const [pipelineDetail, setPipelineDetail] = useState("");
  const [researchResult, setResearchResult] = useState(null);
  const [error, setError] = useState("");
  const eventSourceRef = useRef(null);

  useEffect(() => { injectStyles(); fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/research?limit=50`);
      const data = await res.json();
      setHistory(data.items || []);
    } catch (e) {
      console.error("Failed to fetch history:", e);
    } finally {
      setLoading(false);
    }
  };

  const startResearch = useCallback(async () => {
    if (!topic.trim()) return;
    setError("");
    setView(VIEW.PIPELINE);
    setPipelineSteps([]);
    setPipelineDetail("");

    try {
      const res = await fetch(`${API}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!data.research_id) throw new Error("Failed to start research");
      setCurrentResearch(data.research_id);

      // Connect to SSE stream
      const es = new EventSource(`${API}/research/${data.research_id}/stream`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "step") {
            setPipelineSteps((prev) => {
              const exists = prev.find((s) => s.step === msg.step && s.status === msg.status && s.detail === msg.detail);
              if (exists) return prev;
              return [...prev, msg];
            });
            setPipelineDetail(msg.detail || "");
          } else if (msg.type === "complete") {
            es.close();
            setResearchResult(msg);
            // Small delay before showing result for the animation to complete
            setTimeout(() => setView(VIEW.RESULT), 1500);
            fetchHistory();
          } else if (msg.type === "error") {
            es.close();
            setError(msg.message || "Research failed");
          }
        } catch (e) {
          console.error("SSE parse error:", e);
        }
      };

      es.onerror = () => {
        es.close();
        // After close, try to fetch the result directly
        setTimeout(async () => {
          try {
            const r = await fetch(`${API}/research/${data.research_id}`);
            const d = await r.json();
            if (d.status === "completed") {
              setResearchResult({
                response: d.llm_response,
                sources: d.sources,
                search_results: d.search_results,
                pages_read: d.pages_read,
                duration_seconds: d.duration_seconds,
              });
              setView(VIEW.RESULT);
              fetchHistory();
            } else if (d.status === "failed") {
              setError(d.error || "Research failed");
            }
          } catch (e) {
            console.error("Fallback fetch failed:", e);
          }
        }, 2000);
      };
    } catch (e) {
      setError(e.message);
      setView(VIEW.HOME);
    }
  }, [topic, description]);

  const viewResearch = useCallback(async (id) => {
    try {
      const res = await fetch(`${API}/research/${id}`);
      const data = await res.json();
      setCurrentResearch(id);
      setTopic(data.topic);
      setDescription(data.description || "");
      setResearchResult({
        response: data.llm_response,
        sources: data.sources || [],
        search_results: data.search_results || [],
        pages_read: data.pages_read || [],
        duration_seconds: data.duration_seconds,
      });
      setPipelineSteps(data.pipeline_log || []);
      setView(VIEW.RESULT);
    } catch (e) {
      console.error("Failed to load research:", e);
    }
  }, []);

  const deleteResearch = useCallback(async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this research?")) return;
    try {
      await fetch(`${API}/research/${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }, []);

  const goHome = useCallback(() => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    setView(VIEW.HOME);
    setTopic("");
    setDescription("");
    setCurrentResearch(null);
    setResearchResult(null);
    setPipelineSteps([]);
    setError("");
    fetchHistory();
  }, []);

  // ─── Render ───
  return (
    <div style={S.app}>
      {/* Ambient background */}
      <div style={S.ambientOrb1} />
      <div style={S.ambientOrb2} />

      {view === VIEW.HOME && <HomeView onNew={() => setView(VIEW.NEW)} history={history} loading={loading} onView={viewResearch} onDelete={deleteResearch} />}
      {view === VIEW.NEW && <NewResearchView topic={topic} setTopic={setTopic} desc={description} setDesc={setDescription} onStart={startResearch} onBack={goHome} />}
      {view === VIEW.PIPELINE && <PipelineView steps={pipelineSteps} detail={pipelineDetail} topic={topic} error={error} onBack={goHome} />}
      {view === VIEW.RESULT && <ResultView result={researchResult} topic={topic} desc={description} steps={pipelineSteps} onBack={goHome} onNew={() => { goHome(); setTimeout(() => setView(VIEW.NEW), 100); }} />}
    </div>
  );
}


// ════════════════════════  HOME VIEW  ════════════════════════

function HomeView({ onNew, history, loading, onView, onDelete }) {
  return (
    <div style={S.viewContainer}>
      {/* Header */}
      <div style={S.homeHeader}>
        <div style={S.logoContainer}>
          <div style={S.logo}>
            <span style={{ fontSize: 28 }}>🔬</span>
          </div>
          <div>
            <h1 style={S.title}>{BOT_NAME}</h1>
            <p style={S.subtitle}>Powered by DeepRack Agentic AI</p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={S.hero}>
        <div style={S.heroGlow} />
        <h2 style={S.heroTitle}>AI-Powered Research</h2>
        <p style={S.heroDesc}>
          Start a research task and watch our AI agents search the web, collect data,
          and generate comprehensive reports — all in real-time.
        </p>
        <button style={S.primaryBtn} onClick={onNew}
          onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = `0 8px 30px ${ACCENT}50`; }}
          onMouseLeave={(e) => { e.target.style.transform = ""; e.target.style.boxShadow = ""; }}>
          <span style={{ fontSize: 20 }}>+</span> New Research
        </button>
      </div>

      {/* History */}
      <div style={S.section}>
        <div style={S.sectionHeader}>
          <h3 style={S.sectionTitle}>
            <span style={{ marginRight: 8 }}>📚</span>Research History
          </h3>
          {history.length > 0 && <span style={S.badge}>{history.length}</span>}
        </div>

        {loading ? (
          <div style={S.emptyState}>
            <div style={S.spinner} />
            <p style={{ color: "#71717a", marginTop: 12 }}>Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div style={S.emptyState}>
            <span style={{ fontSize: 48, opacity: 0.3 }}>🔬</span>
            <p style={{ color: "#71717a", marginTop: 12 }}>No research yet. Start your first one!</p>
          </div>
        ) : (
          <div style={S.historyGrid}>
            {history.map((item, i) => (
              <div key={item.id} style={{ ...S.historyCard, animationDelay: `${i * 0.05}s` }}
                onClick={() => item.status === "completed" && onView(item.id)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${ACCENT}50`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = ""; }}>
                <div style={S.cardTop}>
                  <span style={S.statusDot(item.status)} />
                  <span style={S.cardDate}>{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <button style={S.deleteBtn} onClick={(e) => onDelete(item.id, e)}>×</button>
                </div>
                <h4 style={S.cardTitle}>{item.topic}</h4>
                {item.description && <p style={S.cardDesc}>{item.description.substring(0, 80)}{item.description.length > 80 ? "..." : ""}</p>}
                <div style={S.cardBottom}>
                  <span style={S.cardStatus(item.status)}>
                    {item.status === "completed" ? "✓ Completed" : item.status === "running" ? "⟳ Running" : item.status === "failed" ? "✕ Failed" : "Pending"}
                  </span>
                  {item.duration_seconds && <span style={S.cardDuration}>{item.duration_seconds}s</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ════════════════════════  NEW RESEARCH VIEW  ════════════════════════

function NewResearchView({ topic, setTopic, desc, setDesc, onStart, onBack }) {
  return (
    <div style={S.viewContainer}>
      <button style={S.backBtn} onClick={onBack}>← Back</button>

      <div style={{ ...S.formCard, animation: "fadeInUp 0.5s ease" }}>
        <div style={S.formHeader}>
          <span style={{ fontSize: 32 }}>🔬</span>
          <h2 style={S.formTitle}>New Research</h2>
          <p style={S.formSubtitle}>Define what you want to research and our AI agents will do the rest.</p>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Research Topic *</label>
          <input
            style={S.input}
            placeholder="e.g., AI chip manufacturers in 2025"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && topic.trim() && onStart()}
            autoFocus
          />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Description <span style={{ color: "#71717a", fontWeight: 400 }}>(optional)</span></label>
          <textarea
            style={S.textarea}
            placeholder="Provide additional context, specific areas to focus on, or what kind of data you need..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
          />
        </div>

        <button
          style={{ ...S.primaryBtn, width: "100%", marginTop: 8, opacity: topic.trim() ? 1 : 0.5 }}
          onClick={onStart}
          disabled={!topic.trim()}>
          🚀 Start Research
        </button>
      </div>
    </div>
  );
}


// ════════════════════════  PIPELINE VIEW  ════════════════════════

function PipelineView({ steps, detail, topic, error, onBack }) {
  const activeStep = steps.length > 0 ? steps[steps.length - 1].step : null;
  const completedSteps = new Set(steps.filter((s) => s.status === "done").map((s) => s.step));

  return (
    <div style={S.viewContainer}>
      <button style={S.backBtn} onClick={onBack}>← Cancel</button>

      <div style={{ ...S.pipelineContainer, animation: "fadeInUp 0.5s ease" }}>
        <div style={S.pipelineHeader}>
          <h2 style={S.pipelineTitle}>Researching</h2>
          <p style={S.pipelineTopic}>"{topic}"</p>
        </div>

        {/* Pipeline steps */}
        <div style={S.stepsContainer}>
          {PIPELINE_STEPS.map((step, i) => {
            const isDone = completedSteps.has(step.key);
            const isActive = activeStep === step.key && !isDone;
            const isPending = !isDone && !isActive;

            return (
              <div key={step.key} style={{ animation: `fadeInUp 0.4s ease ${i * 0.1}s both` }}>
                {/* Connector line */}
                {i > 0 && (
                  <div style={S.connector(isDone || isActive)} />
                )}
                <div style={S.stepRow(isDone, isActive)}>
                  {/* Status indicator */}
                  <div style={S.stepIcon(isDone, isActive)}>
                    {isDone ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 8l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : isActive ? (
                      <div style={S.spinnerSmall} />
                    ) : (
                      <span style={{ fontSize: 16 }}>{step.icon}</span>
                    )}
                  </div>

                  {/* Step content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.stepLabel(isDone, isActive)}>{step.label}</div>
                    <div style={S.stepDesc(isPending)}>
                      {isActive ? (detail || step.desc) : step.desc}
                    </div>
                    {/* Show data for search step */}
                    {isActive && steps.filter((s) => s.step === step.key).map((s, j) => (
                      s.data && s.data.queries && (
                        <div key={j} style={S.stepData}>
                          {s.data.queries.map((q, qi) => (
                            <div key={qi} style={S.queryTag}>🔎 {q}</div>
                          ))}
                        </div>
                      )
                    ))}
                  </div>

                  {/* Timing badge */}
                  {isDone && <div style={S.checkBadge}>✓</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={S.progressBarBg}>
          <div style={S.progressBarFill(completedSteps.size / PIPELINE_STEPS.length)} />
        </div>

        {error && (
          <div style={S.errorBox}>
            <span>⚠️</span> {error}
          </div>
        )}
      </div>
    </div>
  );
}


// ════════════════════════  RESULT VIEW  ════════════════════════

function ResultView({ result, topic, desc, steps, onBack, onNew }) {
  const [showSources, setShowSources] = useState(false);

  if (!result) return null;

  return (
    <div style={S.viewContainer}>
      <div style={S.resultHeader}>
        <button style={S.backBtn} onClick={onBack}>← Back</button>
        <button style={{ ...S.secondaryBtn, marginLeft: "auto" }} onClick={onNew}>+ New Research</button>
      </div>

      <div style={{ ...S.resultCard, animation: "fadeInUp 0.5s ease" }}>
        {/* Result header */}
        <div style={S.resultTitle}>
          <span style={{ fontSize: 28 }}>📄</span>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>{topic}</h2>
            {desc && <p style={{ color: "#71717a", fontSize: 13, marginTop: 4 }}>{desc}</p>}
          </div>
        </div>

        {/* Stats bar */}
        <div style={S.statsBar}>
          {result.duration_seconds && (
            <div style={S.stat}>
              <span style={S.statIcon}>⏱</span>
              <span>{result.duration_seconds}s</span>
            </div>
          )}
          {result.sources && (
            <div style={S.stat}>
              <span style={S.statIcon}>🔗</span>
              <span>{result.sources.length} sources</span>
            </div>
          )}
          {result.pages_read && (
            <div style={S.stat}>
              <span style={S.statIcon}>📄</span>
              <span>{Array.isArray(result.pages_read) ? result.pages_read.length : 0} pages read</span>
            </div>
          )}
        </div>

        {/* Sources toggle */}
        {result.sources && result.sources.length > 0 && (
          <div>
            <button style={S.sourcesToggle} onClick={() => setShowSources((v) => !v)}>
              <span>{showSources ? "▾" : "▸"} Sources ({result.sources.length})</span>
            </button>
            {showSources && (
              <div style={S.sourcesList}>
                {result.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={S.sourceItem}>
                    <span style={S.sourceNum}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={S.sourceTitle}>{s.title}</div>
                      <div style={S.sourceUrl}>{s.url}</div>
                    </div>
                    <span style={{ color: "#71717a", fontSize: 12 }}>↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div style={S.divider} />

        {/* Report content */}
        <div style={S.reportContent} dangerouslySetInnerHTML={{ __html: renderMarkdown(result.response) }} />
      </div>
    </div>
  );
}


// ════════════════════════  STYLES  ════════════════════════

const S = {
  app: {
    minHeight: "100vh", width: "100%", background: "#0a0a0f",
    position: "relative", overflow: "hidden",
  },
  ambientOrb1: {
    position: "fixed", top: "-20%", right: "-10%", width: "600px", height: "600px",
    borderRadius: "50%", background: `radial-gradient(circle, ${ACCENT}08 0%, transparent 70%)`,
    pointerEvents: "none", zIndex: 0,
  },
  ambientOrb2: {
    position: "fixed", bottom: "-20%", left: "-10%", width: "500px", height: "500px",
    borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  viewContainer: {
    maxWidth: 800, margin: "0 auto", padding: "24px 20px 60px",
    position: "relative", zIndex: 1,
  },

  // ── Home ──
  homeHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 32,
  },
  logoContainer: { display: "flex", alignItems: "center", gap: 14 },
  logo: {
    width: 48, height: 48, borderRadius: 14,
    background: `linear-gradient(135deg, ${ACCENT}, #8b5cf6)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: `0 4px 20px ${ACCENT}30`,
  },
  title: { fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 },
  subtitle: { fontSize: 12, color: "#71717a", margin: 0, marginTop: 2 },

  hero: {
    textAlign: "center", padding: "48px 24px",
    borderRadius: 20, position: "relative",
    background: "linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 100%)",
    border: "1px solid rgba(99,102,241,0.1)",
    marginBottom: 40,
  },
  heroGlow: {
    position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
    width: "60%", height: 1,
    background: `linear-gradient(90deg, transparent, ${ACCENT}60, transparent)`,
  },
  heroTitle: { fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 12 },
  heroDesc: { fontSize: 15, color: "#a1a1aa", lineHeight: 1.6, maxWidth: 500, margin: "0 auto 28px" },

  primaryBtn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "14px 32px", borderRadius: 12, border: "none",
    background: `linear-gradient(135deg, ${ACCENT}, #8b5cf6)`,
    color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: `0 4px 20px ${ACCENT}30`,
  },
  secondaryBtn: {
    padding: "10px 20px", borderRadius: 10, border: `1px solid ${ACCENT}40`,
    background: "transparent", color: ACCENT, fontSize: 13, fontWeight: 500,
    cursor: "pointer", transition: "all 0.2s",
  },

  section: { marginBottom: 40 },
  sectionHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: "#e4e4e7", display: "flex", alignItems: "center" },
  badge: {
    background: `${ACCENT}20`, color: ACCENT, fontSize: 12, fontWeight: 600,
    padding: "2px 10px", borderRadius: 20,
  },

  emptyState: {
    textAlign: "center", padding: "48px 20px",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  spinner: {
    width: 32, height: 32, border: `3px solid #333`,
    borderTopColor: ACCENT, borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },

  historyGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 12,
  },
  historyCard: {
    background: "#12121a", borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.06)",
    padding: 16, cursor: "pointer",
    transition: "all 0.2s ease",
    animation: "fadeInUp 0.4s ease both",
  },
  cardTop: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
  },
  statusDot: (status) => ({
    width: 8, height: 8, borderRadius: "50%",
    background: status === "completed" ? "#22c55e" : status === "running" ? ACCENT : status === "failed" ? "#ef4444" : "#71717a",
    ...(status === "running" ? { animation: "pulse 1.5s infinite" } : {}),
  }),
  cardDate: { fontSize: 11, color: "#71717a", flex: 1 },
  deleteBtn: {
    background: "none", border: "none", color: "#71717a", fontSize: 16,
    cursor: "pointer", padding: "0 4px", lineHeight: 1,
    opacity: 0.5, transition: "opacity 0.2s",
  },
  cardTitle: {
    fontSize: 14, fontWeight: 600, color: "#e4e4e7",
    marginBottom: 4, lineHeight: 1.4,
    overflow: "hidden", textOverflow: "ellipsis",
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
  },
  cardDesc: { fontSize: 12, color: "#71717a", lineHeight: 1.4, marginBottom: 10 },
  cardBottom: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardStatus: (status) => ({
    fontSize: 11, fontWeight: 500,
    color: status === "completed" ? "#22c55e" : status === "running" ? ACCENT : "#ef4444",
  }),
  cardDuration: { fontSize: 11, color: "#71717a" },

  // ── New Research Form ──
  backBtn: {
    background: "none", border: "none", color: "#71717a", fontSize: 14,
    cursor: "pointer", padding: "8px 0", marginBottom: 16,
    transition: "color 0.2s",
  },
  formCard: {
    background: "#12121a", borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.06)",
    padding: 32, maxWidth: 560, margin: "0 auto",
  },
  formHeader: { textAlign: "center", marginBottom: 32 },
  formTitle: { fontSize: 22, fontWeight: 700, color: "#fff", margin: "12px 0 8px" },
  formSubtitle: { fontSize: 14, color: "#71717a" },
  formGroup: { marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#a1a1aa", marginBottom: 8 },
  input: {
    width: "100%", padding: "14px 16px", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)", background: "#0a0a0f",
    color: "#e4e4e7", fontSize: 15, outline: "none",
    transition: "border-color 0.2s",
  },
  textarea: {
    width: "100%", padding: "14px 16px", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)", background: "#0a0a0f",
    color: "#e4e4e7", fontSize: 14, outline: "none", resize: "vertical",
    lineHeight: 1.6, fontFamily: "inherit",
    transition: "border-color 0.2s",
  },

  // ── Pipeline ──
  pipelineContainer: {
    maxWidth: 560, margin: "0 auto",
    background: "#12121a", borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.06)", padding: 32,
  },
  pipelineHeader: { textAlign: "center", marginBottom: 32 },
  pipelineTitle: { fontSize: 14, fontWeight: 500, color: "#71717a", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 },
  pipelineTopic: { fontSize: 18, fontWeight: 600, color: "#fff", fontStyle: "italic" },

  stepsContainer: { marginBottom: 28 },
  connector: (active) => ({
    width: 2, height: 20, marginLeft: 19,
    background: active ? `linear-gradient(180deg, ${ACCENT}, ${ACCENT}40)` : "rgba(255,255,255,0.06)",
    transition: "background 0.5s ease",
  }),
  stepRow: (done, active) => ({
    display: "flex", alignItems: "flex-start", gap: 14, padding: "10px 12px",
    borderRadius: 12,
    background: active ? `${ACCENT}08` : "transparent",
    border: active ? `1px solid ${ACCENT}20` : "1px solid transparent",
    transition: "all 0.3s ease",
    ...(active ? { animation: "borderGlow 2s ease infinite" } : {}),
  }),
  stepIcon: (done, active) => ({
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: done ? ACCENT : active ? `${ACCENT}20` : "rgba(255,255,255,0.04)",
    border: done ? "none" : active ? `1px solid ${ACCENT}40` : "1px solid rgba(255,255,255,0.06)",
    transition: "all 0.3s ease",
    ...(active ? { animation: "glow 2s ease infinite" } : {}),
  }),
  spinnerSmall: {
    width: 18, height: 18, border: `2px solid ${ACCENT}30`,
    borderTopColor: ACCENT, borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  stepLabel: (done, active) => ({
    fontSize: 14, fontWeight: 600,
    color: done ? "#22c55e" : active ? "#fff" : "#71717a",
    marginBottom: 2, transition: "color 0.3s",
  }),
  stepDesc: (pending) => ({
    fontSize: 12, color: pending ? "#3f3f46" : "#71717a",
    lineHeight: 1.4, transition: "color 0.3s",
  }),
  stepData: {
    display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8,
  },
  queryTag: {
    fontSize: 11, background: `${ACCENT}15`, color: "#a5b4fc",
    padding: "4px 10px", borderRadius: 8, border: `1px solid ${ACCENT}20`,
  },
  checkBadge: {
    fontSize: 12, color: "#22c55e", fontWeight: 700,
    flexShrink: 0, marginTop: 4,
  },

  progressBarBg: {
    height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)",
    overflow: "hidden", marginBottom: 16,
  },
  progressBarFill: (pct) => ({
    width: `${Math.max(pct * 100, 5)}%`, height: "100%", borderRadius: 2,
    background: `linear-gradient(90deg, ${ACCENT}, #8b5cf6, ${ACCENT})`,
    backgroundSize: "200% 100%",
    animation: "progressFlow 2s linear infinite",
    transition: "width 0.5s ease",
  }),

  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "12px 16px", borderRadius: 10,
    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
    color: "#fca5a5", fontSize: 13,
  },

  // ── Result ──
  resultHeader: {
    display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
  },
  resultCard: {
    background: "#12121a", borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.06)", padding: 32,
  },
  resultTitle: {
    display: "flex", alignItems: "center", gap: 14, marginBottom: 20,
  },
  statsBar: {
    display: "flex", gap: 20, padding: "12px 16px", borderRadius: 10,
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
    marginBottom: 16,
  },
  stat: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#a1a1aa" },
  statIcon: { fontSize: 14 },

  sourcesToggle: {
    background: "none", border: "none", color: ACCENT, fontSize: 13,
    fontWeight: 500, cursor: "pointer", padding: "8px 0",
    transition: "color 0.2s",
  },
  sourcesList: {
    maxHeight: 300, overflowY: "auto", margin: "8px 0",
    borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)",
  },
  sourceItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", textDecoration: "none",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    transition: "background 0.2s",
  },
  sourceNum: {
    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: `${ACCENT}15`, color: ACCENT, fontSize: 11, fontWeight: 600,
  },
  sourceTitle: { fontSize: 13, color: "#e4e4e7", lineHeight: 1.3, marginBottom: 2 },
  sourceUrl: {
    fontSize: 11, color: "#71717a", whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis",
  },

  divider: {
    height: 1, background: "rgba(255,255,255,0.06)", margin: "20px 0",
  },

  reportContent: {
    fontSize: 14, color: "#d4d4d8", lineHeight: 1.8,
  },
};
