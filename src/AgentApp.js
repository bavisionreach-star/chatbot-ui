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
  { key: "understanding", label: "Understanding", icon: "brain", desc: "AI is analyzing the research topic and scope", phase: "Prepare" },
  { key: "planning", label: "Planning", icon: "route", desc: "Preparing search queries for sub-agents", phase: "Prepare" },
  { key: "searching", label: "Searching", icon: "search", desc: "Sub-agents are searching across multiple sources", phase: "Gather" },
  { key: "collecting", label: "Collecting", icon: "download", desc: "Reading and extracting data from web pages", phase: "Gather" },
  { key: "analyzing", label: "Analyzing", icon: "bolt", desc: "AI is processing all collected information", phase: "Analyze" },
  { key: "generating", label: "Generating", icon: "pen", desc: "Writing a comprehensive research report", phase: "Output" },
  { key: "complete", label: "Complete", icon: "check", desc: "Research ready for preview", phase: "Output" },
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
    @keyframes ripple { 0% { box-shadow: 0 0 0 0 ${ACCENT}30; } 100% { box-shadow: 0 0 0 12px ${ACCENT}00; } }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes breathe { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
    @keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes expandIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
    @keyframes tickerSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
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


// ════════════════════════  SVG ICONS  ════════════════════════

const StepIcon = ({ name, size = 18, color = "#fff" }) => {
  const icons = {
    brain: <><path d="M12 2a6 6 0 0 0-6 6c0 1.5.5 2.8 1.4 3.9L12 18l4.6-6.1A6 6 0 0 0 12 2z" fill="none" stroke={color} strokeWidth="1.5"/><circle cx="10" cy="8" r="1" fill={color}/><circle cx="14" cy="8" r="1" fill={color}/><path d="M9 11c0 0 1.5 2 3 2s3-2 3-2" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round"/></>,
    route: <><path d="M3 17h2a4 4 0 0 0 4-4V7a4 4 0 0 1 4-4h4" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><path d="M15 5l3-2-3-2" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="4" cy="17" r="2" fill="none" stroke={color} strokeWidth="1.5"/></>,
    search: <><circle cx="11" cy="11" r="6" fill="none" stroke={color} strokeWidth="1.5"/><path d="M21 21l-4.35-4.35" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    download: <><path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
    bolt: <><path d="M13 2L4.09 12.83a1 1 0 0 0 .78 1.62H11l-1 7.45L19.91 11.17a1 1 0 0 0-.78-1.62H13l1-7.55z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></>,
    pen: <><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></>,
    check: <><path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none">{icons[name] || null}</svg>;
};

// ════════════════════════  PIPELINE VIEW (Redesigned)  ════════════════════════

function PipelineView({ steps, detail, topic, error, onBack }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const activeStep = steps.length > 0 ? steps[steps.length - 1].step : null;
  const completedSteps = new Set(steps.filter((s) => s.status === "done").map((s) => s.step));
  const completedCount = completedSteps.size;
  const totalSteps = PIPELINE_STEPS.length;
  const pct = completedCount / totalSteps;

  // Build activity log from step events
  const activityLog = steps.filter(s => s.detail).slice(-5);

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={S.viewContainer}>
      {/* Top bar */}
      <div style={P.topBar}>
        <button style={S.backBtn} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span style={{ marginLeft: 6 }}>Cancel</span>
        </button>
        <div style={P.timer}>
          <div style={P.timerDot} />
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtTime(elapsed)}</span>
        </div>
      </div>

      <div style={{ ...P.wrapper, animation: "expandIn 0.4s ease" }}>
        {/* Header */}
        <div style={P.header}>
          <div style={P.headerOrb}>
            <div style={P.orbRing} />
            <div style={P.orbCore}>
              {completedCount === totalSteps
                ? <StepIcon name="check" size={24} color="#22c55e" />
                : <div style={P.orbSpinner} />}
            </div>
          </div>
          <div style={P.headerTextBlock}>
            <span style={P.headerLabel}>
              {completedCount === totalSteps ? "Research Complete" : "Researching"}
            </span>
            <h2 style={P.headerTopic}>{topic}</h2>
          </div>
        </div>

        {/* Horizontal progress dots */}
        <div style={P.progressRow}>
          {PIPELINE_STEPS.map((step, i) => {
            const isDone = completedSteps.has(step.key);
            const isActive = activeStep === step.key && !isDone;
            return (
              <React.Fragment key={step.key}>
                {i > 0 && <div style={P.progressLine(isDone || isActive)} />}
                <div style={P.progressDotWrap}>
                  <div style={P.progressDot(isDone, isActive)} title={step.label}>
                    {isDone && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {isActive && <div style={{width:6,height:6,borderRadius:"50%",background:"#fff",animation:"pulse 1s infinite"}} />}
                  </div>
                  <span style={P.progressLabel(isDone, isActive)}>{step.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Overall progress bar */}
        <div style={P.barOuter}>
          <div style={P.barInner(pct)} />
        </div>
        <div style={P.barLabel}>{Math.round(pct * 100)}% complete</div>

        {/* Step cards */}
        <div style={P.cardsContainer}>
          {PIPELINE_STEPS.map((step, i) => {
            const isDone = completedSteps.has(step.key);
            const isActive = activeStep === step.key && !isDone;
            const isPending = !isDone && !isActive;

            if (isPending && completedCount === 0 && i > 2) return null; // hide far-future steps initially

            return (
              <div key={step.key} style={{ ...P.card(isDone, isActive), animation: `fadeInUp 0.35s ease ${i * 0.06}s both` }}>
                <div style={P.cardLeft}>
                  <div style={P.cardIcon(isDone, isActive)}>
                    {isDone ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : isActive ? (
                      <div style={P.cardSpinner} />
                    ) : (
                      <StepIcon name={step.icon} size={16} color={isPending ? "#52525b" : "#a5b4fc"} />
                    )}
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && <div style={P.cardConnector(isDone)} />}
                </div>
                <div style={P.cardBody}>
                  <div style={P.cardHeader}>
                    <span style={P.cardPhase(isDone, isActive)}>{step.phase}</span>
                    <span style={P.cardLabel(isDone, isActive)}>{step.label}</span>
                  </div>
                  <p style={P.cardDesc(isPending)}>
                    {isActive ? (detail || step.desc) : step.desc}
                  </p>
                  {/* Query tags for search step */}
                  {(isDone || isActive) && steps.filter(s => s.step === step.key && s.data && s.data.queries).map((s, j) => (
                    <div key={j} style={P.tagRow}>
                      {s.data.queries.map((q, qi) => (
                        <span key={qi} style={P.tag}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{marginRight:4,flexShrink:0}}>
                            <circle cx="11" cy="11" r="6" stroke="#818cf8" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          {q}
                        </span>
                      ))}
                    </div>
                  ))}
                  {/* Result count for search/collecting steps */}
                  {isDone && steps.filter(s => s.step === step.key && s.data).map((s, j) => (
                    s.data.result_count != null && (
                      <span key={j} style={P.resultBadge}>{s.data.result_count} results found</span>
                    )
                  ))}
                  {isDone && steps.filter(s => s.step === step.key && s.data).map((s, j) => (
                    s.data.pages_read != null && (
                      <span key={j} style={P.resultBadge}>{s.data.pages_read} pages extracted</span>
                    )
                  ))}
                </div>
                {isDone && <div style={P.cardCheck}>✓</div>}
                {isActive && <div style={P.cardPulse} />}
              </div>
            );
          })}
        </div>

        {/* Live activity feed */}
        {activityLog.length > 0 && (
          <div style={P.activitySection}>
            <div style={P.activityHeader}>
              <div style={P.liveDot} />
              <span style={P.activityTitle}>Live Activity</span>
            </div>
            <div style={P.activityList}>
              {activityLog.map((entry, i) => (
                <div key={i} style={{ ...P.activityItem, animation: `tickerSlide 0.3s ease ${i * 0.05}s both` }}>
                  <span style={P.activityTime}>
                    {new Date(entry.timestamp).toLocaleTimeString("en-US", {hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}
                  </span>
                  <span style={P.activityText}>{entry.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
    display: "flex", alignItems: "center",
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

  // ── Pipeline (old styles kept for compat) ──
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

// ════════════════════════  PIPELINE STYLES  ════════════════════════

const P = {
  topBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 24,
  },
  timer: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 13, fontWeight: 600, color: "#a1a1aa",
    background: "rgba(255,255,255,0.04)", padding: "6px 14px",
    borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)",
    fontFamily: "'SF Mono', 'Fira Code', monospace",
  },
  timerDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#22c55e", animation: "pulse 1.5s infinite",
  },

  wrapper: {
    maxWidth: 640, margin: "0 auto",
    background: "linear-gradient(180deg, #111118 0%, #0c0c14 100%)",
    borderRadius: 24, padding: "36px 32px",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: `0 0 80px ${ACCENT}08, 0 0 0 1px rgba(255,255,255,0.03) inset`,
    position: "relative", overflow: "hidden",
  },

  header: {
    display: "flex", alignItems: "center", gap: 20, marginBottom: 32,
    paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  headerOrb: {
    width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
    position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
  },
  orbRing: {
    position: "absolute", inset: 0, borderRadius: "50%",
    border: `2px solid ${ACCENT}30`,
    animation: "orbitSpin 3s linear infinite",
    background: `conic-gradient(from 0deg, transparent, ${ACCENT}40, transparent 70%)`,
    WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 2px))",
    mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 2px))",
  },
  orbCore: {
    width: 40, height: 40, borderRadius: "50%",
    background: `linear-gradient(135deg, ${ACCENT}20, ${ACCENT}08)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: `1px solid ${ACCENT}30`,
  },
  orbSpinner: {
    width: 20, height: 20, borderRadius: "50%",
    border: `2px solid ${ACCENT}30`, borderTopColor: ACCENT,
    animation: "spin 0.8s linear infinite",
  },

  headerTextBlock: { flex: 1, overflow: "hidden" },
  headerLabel: {
    fontSize: 11, fontWeight: 600, color: ACCENT,
    textTransform: "uppercase", letterSpacing: 2, marginBottom: 4,
    display: "block",
  },
  headerTopic: {
    fontSize: 20, fontWeight: 700, color: "#fff", margin: 0,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },

  // ── Horizontal progress dots ──
  progressRow: {
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    marginBottom: 24, gap: 0, overflowX: "auto",
    padding: "0 4px",
  },
  progressLine: (active) => ({
    width: 28, height: 2, alignSelf: "center",
    marginTop: -10,
    background: active
      ? `linear-gradient(90deg, ${ACCENT}, ${ACCENT}80)`
      : "rgba(255,255,255,0.06)",
    transition: "background 0.4s ease",
    borderRadius: 1,
    flexShrink: 0,
  }),
  progressDotWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 6, flexShrink: 0,
  },
  progressDot: (done, active) => ({
    width: 20, height: 20, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: done ? ACCENT : active ? `${ACCENT}30` : "rgba(255,255,255,0.04)",
    border: done ? `2px solid ${ACCENT}` : active ? `2px solid ${ACCENT}80` : "2px solid rgba(255,255,255,0.08)",
    transition: "all 0.3s ease",
    ...(active ? { boxShadow: `0 0 12px ${ACCENT}40`, animation: "breathe 2s ease infinite" } : {}),
    ...(done ? { boxShadow: `0 0 8px ${ACCENT}30` } : {}),
  }),
  progressLabel: (done, active) => ({
    fontSize: 9, fontWeight: 600, color: done ? ACCENT : active ? "#e4e4e7" : "#52525b",
    textTransform: "uppercase", letterSpacing: 0.5,
    maxWidth: 54, textAlign: "center", lineHeight: 1.2,
    transition: "color 0.3s",
  }),

  // ── Progress bar ──
  barOuter: {
    height: 3, borderRadius: 2, background: "rgba(255,255,255,0.04)",
    overflow: "hidden", marginBottom: 6,
  },
  barInner: (pct) => ({
    width: `${Math.max(pct * 100, 3)}%`, height: "100%", borderRadius: 2,
    background: `linear-gradient(90deg, ${ACCENT}, #a78bfa, ${ACCENT})`,
    backgroundSize: "200% 100%",
    animation: "progressFlow 2s linear infinite",
    transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
  }),
  barLabel: {
    fontSize: 11, color: "#52525b", textAlign: "right", marginBottom: 28,
    fontWeight: 500,
  },

  // ── Step cards ──
  cardsContainer: {
    display: "flex", flexDirection: "column", gap: 2, marginBottom: 28,
  },
  card: (isDone, isActive) => ({
    display: "flex", gap: 14, padding: "14px 16px",
    borderRadius: 14, position: "relative",
    background: isActive
      ? `linear-gradient(135deg, ${ACCENT}08, ${ACCENT}03)`
      : isDone
        ? "rgba(34,197,94,0.03)"
        : "transparent",
    border: isActive
      ? `1px solid ${ACCENT}25`
      : isDone
        ? "1px solid rgba(34,197,94,0.08)"
        : "1px solid transparent",
    transition: "all 0.3s ease",
    overflow: "hidden",
  }),

  cardLeft: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 0, flexShrink: 0,
  },
  cardIcon: (isDone, isActive) => ({
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: isDone
      ? "linear-gradient(135deg, #22c55e, #16a34a)"
      : isActive
        ? `linear-gradient(135deg, ${ACCENT}25, ${ACCENT}12)`
        : "rgba(255,255,255,0.03)",
    border: isDone
      ? "none"
      : isActive
        ? `1px solid ${ACCENT}40`
        : "1px solid rgba(255,255,255,0.06)",
    transition: "all 0.3s ease",
    ...(isActive ? { boxShadow: `0 0 16px ${ACCENT}20` } : {}),
  }),
  cardSpinner: {
    width: 16, height: 16, border: `2px solid ${ACCENT}30`,
    borderTopColor: ACCENT, borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  cardConnector: (isDone) => ({
    width: 2, flex: 1, minHeight: 12,
    background: isDone
      ? `linear-gradient(180deg, #22c55e, #22c55e40)`
      : "rgba(255,255,255,0.06)",
    borderRadius: 1, marginTop: 4,
    transition: "background 0.4s",
  }),

  cardBody: { flex: 1, minWidth: 0, paddingTop: 2 },
  cardHeader: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
  },
  cardPhase: (isDone, isActive) => ({
    fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5,
    color: isDone ? "#22c55e" : isActive ? ACCENT : "#3f3f46",
    padding: "2px 6px", borderRadius: 4,
    background: isDone ? "rgba(34,197,94,0.1)" : isActive ? `${ACCENT}12` : "transparent",
    transition: "all 0.3s",
  }),
  cardLabel: (isDone, isActive) => ({
    fontSize: 13, fontWeight: 600,
    color: isDone ? "#d4d4d8" : isActive ? "#fff" : "#52525b",
    transition: "color 0.3s",
  }),
  cardDesc: (isPending) => ({
    fontSize: 12, color: isPending ? "#2a2a35" : "#71717a",
    lineHeight: 1.5, transition: "color 0.3s", margin: 0,
  }),

  tagRow: {
    display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8,
  },
  tag: {
    display: "inline-flex", alignItems: "center",
    fontSize: 10, fontWeight: 500,
    background: `${ACCENT}10`, color: "#a5b4fc",
    padding: "3px 10px", borderRadius: 6,
    border: `1px solid ${ACCENT}15`,
  },
  resultBadge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 11, fontWeight: 600, color: "#22c55e",
    marginTop: 6,
  },

  cardCheck: {
    color: "#22c55e", fontWeight: 700, fontSize: 14,
    flexShrink: 0, alignSelf: "center",
    animation: "expandIn 0.3s ease",
  },
  cardPulse: {
    position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
    width: 8, height: 8, borderRadius: "50%",
    background: ACCENT, animation: "breathe 1.5s ease infinite",
    boxShadow: `0 0 12px ${ACCENT}50`,
  },

  // ── Activity feed ──
  activitySection: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: 14, padding: "16px 18px",
    marginBottom: 16,
  },
  activityHeader: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#22c55e", animation: "pulse 1.5s infinite",
  },
  activityTitle: {
    fontSize: 11, fontWeight: 700, color: "#71717a",
    textTransform: "uppercase", letterSpacing: 1.5,
  },
  activityList: {
    display: "flex", flexDirection: "column", gap: 6,
  },
  activityItem: {
    display: "flex", gap: 10, alignItems: "flex-start",
    padding: "6px 10px", borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
  },
  activityTime: {
    fontSize: 10, fontWeight: 600, color: "#52525b",
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    flexShrink: 0, marginTop: 1,
  },
  activityText: {
    fontSize: 12, color: "#a1a1aa", lineHeight: 1.4,
  },
};
