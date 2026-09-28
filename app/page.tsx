"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, BrainCircuit, CircleAlert, Clock3, Command, Database, ChevronRight, Mail, MessageSquareText, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, UserRound, Wifi, Zap } from "lucide-react";
import { useState } from "react";

type Log = { id: number; type: "RECALL" | "RETAIN" | "REFLECT" | "SYSTEM"; text: string; time: string };
type Prospect = { name: string; title: string; company: string };
const initialProspect = { name: "Maya Chen", title: "VP of Engineering", company: "Northstar Labs" };
const initialLogs: Log[] = [
  { id: 1, type: "SYSTEM", text: "Memory layer connected · workspace ready", time: "09:41:02" },
  { id: 2, type: "RECALL", text: "3 winning hooks found for VP Engineering", time: "09:41:03" },
  { id: 3, type: "SYSTEM", text: "Playbook v2.4 loaded · 128 interactions", time: "09:41:03" },
];
const fallbackDraft = `Hi Maya,\n\nI noticed Northstar is scaling its engineering org while keeping product velocity high. Teams we work with often find that their biggest hidden tax is not headcount, but the handoffs that make every release feel heavier than the last.\n\nWe helped one VP Engineering cut release coordination time by 34% without changing their stack. Is reducing that drag on your roadmap this quarter?\n\nBest,\nAlex`;

export default function Home() {
  const [prospect, setProspect] = useState<Prospect>(initialProspect);
  const [draft, setDraft] = useState("");
  const [logs, setLogs] = useState<Log[]>(initialLogs);
  const [memoryOn, setMemoryOn] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "objection" | null>(null);
  const [strategy, setStrategy] = useState("Your playbook is waiting for a fresh reflection.");
  const addLog = (type: Log["type"], text: string) => setLogs((current) => [...current, { id: Date.now(), type, text, time: new Date().toLocaleTimeString([], { hour12: false }) }]);
  const updateProspect = (field: keyof Prospect, value: string) => setProspect((current) => ({ ...current, [field]: value }));
  const generateDraft = async () => {
    setIsGenerating(true); setFeedback(null);
    if (memoryOn) addLog("RECALL", `Fetching past hooks for ${prospect.title}...`); else addLog("SYSTEM", "Memory bypassed · generating from base model");
    try { const response = await fetch("/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prospect, useMemory: memoryOn }) }); const data = await response.json(); setDraft(data.draft || fallbackDraft); if (data.context?.length) addLog("RECALL", `${data.context.length} memory signals threaded into draft`); addLog("SYSTEM", data.source === "demo" ? "Demo draft ready · add API keys for live generation" : "Draft synthesized from Groq + Hindsight"); } catch { setDraft(fallbackDraft); addLog("SYSTEM", "Offline draft ready · API route unavailable"); } finally { setIsGenerating(false); }
  };
  const sendFeedback = async (outcome: "Meeting Booked" | "Objection / Spam") => { setFeedback(outcome === "Meeting Booked" ? "success" : "objection"); addLog("RETAIN", `Logging ${outcome.toLowerCase()} for ${prospect.title}...`); await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prospect, draft, outcome }) }).catch(() => undefined); addLog("SYSTEM", "Interaction retained · playbook signal updated"); };
  const reflect = async () => { addLog("REFLECT", "Synthesizing 30-day strategy..."); const response = await fetch("/api/strategy").catch(() => null); const data = response ? await response.json() : null; setStrategy(data?.strategy || "Engineering leaders respond to concrete velocity wins. Keep leading with release coordination, not generic cost savings."); addLog("REFLECT", "Strategy refreshed from campaign memory"); };
  const seedMemory = async () => { addLog("RETAIN", "Seeding 10 synthetic campaign outcomes..."); const response = await fetch("/api/seed", { method: "POST" }).catch(() => null); const data = response ? await response.json() : null; addLog("SYSTEM", data?.seeded ? "Demo memory seeded · playbook has signal" : "Demo mode active · add Hindsight key to persist seed data"); };

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Zap size={17} fill="currentColor" /></div><span>rev<span className="brand-accent">pulse</span></span><span className="brand-beta">BETA</span></div><div className="topbar-status"><span className="status-dot" /> SYSTEM OPERATIONAL <span className="status-divider" /> <span className="mono">WORKSPACE / ACME-01</span></div><button className="icon-button" aria-label="Open command menu"><Command size={18} /></button></header>
    <section className="hero-row"><div><p className="eyebrow"><Sparkles size={14} /> AUTONOMOUS OUTBOUND INTELLIGENCE</p><h1>Make every outreach<br /><span>smarter than the last.</span></h1><p className="hero-copy">RevPulse turns campaign feedback into a living sales advantage.</p></div><div className="hero-metrics"><div><strong>128</strong><span>interactions learned</span></div><div><strong>+34%</strong><span>reply lift this month</span></div></div></section>
    <section className="workspace-grid">
      <div className="arena panel-glass"><div className="panel-heading"><div><p className="section-label">01 / ACTION ARENA</p><h2>Compose an outreach</h2></div><div className="live-badge"><span className="status-dot" /> LIVE</div></div>
        <div className="prospect-card"><div className="card-label"><UserRound size={14} /> PROSPECT PROFILE</div><div className="input-grid"><label>FULL NAME<input value={prospect.name} onChange={(e) => updateProspect("name", e.target.value)} /></label><label>ROLE / TITLE<input value={prospect.title} onChange={(e) => updateProspect("title", e.target.value)} /></label><label className="company-field">COMPANY<input value={prospect.company} onChange={(e) => updateProspect("company", e.target.value)} /></label></div></div>
        <div className="memory-toggle-row"><div className="toggle-copy"><div className="memory-icon"><BrainCircuit size={17} /></div><div><strong>Hindsight context</strong><span>Let memory shape the angle</span></div></div><button className={`toggle ${memoryOn ? "on" : ""}`} onClick={() => setMemoryOn((current) => !current)} aria-label="Toggle Hindsight context"><span /></button><span className="toggle-state">{memoryOn ? "ON" : "OFF"}</span></div>
        <button className="generate-button" onClick={generateDraft} disabled={isGenerating}>{isGenerating ? <RefreshCw className="spin" size={18} /> : <Sparkles size={18} />}{isGenerating ? "Mining memory..." : "Generate intelligent draft"}<ArrowUpRight size={17} /></button>
        <div className="draft-area"><div className="draft-heading"><span><Mail size={15} /> DRAFT OUTPUT</span><span className={draft ? "draft-ready" : "draft-empty"}>{draft ? "READY TO REVIEW" : "AWAITING INPUT"}</span></div><div className="draft-paper">{draft ? <p>{draft}</p> : <div className="empty-draft"><MessageSquareText size={22} /><span>Your personalized outreach will appear here.</span><small>Powered by your living playbook</small></div>}</div><div className="draft-footer"><span><Clock3 size={13} /> {draft ? "Generated just now" : "Typical generation: 8 sec"}</span><span className="mono">{draft.length ? `${draft.length} chars` : "--"}</span></div></div>
        <div className="feedback-row"><span>How did this land?</span><button className={`feedback success ${feedback === "success" ? "selected" : ""}`} onClick={() => sendFeedback("Meeting Booked")} disabled={!draft}><ThumbsUp size={15} /> Meeting booked</button><button className={`feedback objection ${feedback === "objection" ? "selected" : ""}`} onClick={() => sendFeedback("Objection / Spam")} disabled={!draft}><ThumbsDown size={15} /> Objection / spam</button></div>
      </div>
      <aside className="stream panel-glass"><div className="panel-heading"><div><p className="section-label">02 / MEMORY STREAM</p><h2>Learning in real time</h2></div><Wifi size={18} className="wifi" /></div><div className="stream-meta"><span><span className="status-dot" /> HINDSIGHT CLOUD</span><span className="mono">LIVE FEED</span></div><div className="logs"><AnimatePresence initial={false}>{logs.map((log) => <motion.div className={`log log-${log.type.toLowerCase()}`} key={log.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}><div className="log-line"><span className="log-type">[{log.type}]</span><span className="log-time">{log.time}</span></div><p>{log.text}</p></motion.div>)}</AnimatePresence></div><div className="reflection-box"><div className="reflection-title"><Database size={14} /> CURRENT PLAYBOOK SIGNAL</div><p>{strategy}</p><button onClick={reflect}>Reflect on campaign <ChevronRight size={14} /></button></div><button className="seed-button" onClick={seedMemory}>Seed demo memory <Database size={13} /></button><div className="stream-footer"><CircleAlert size={13} /> Every outcome makes the next message sharper.</div></aside>
    </section>
    <footer className="page-footer"><span><span className="status-dot" /> MEMORY PERSISTENCE ACTIVE</span><span className="mono">REV / 2.4.0</span><span>Built for the next conversation.</span></footer>
  </main>;
}