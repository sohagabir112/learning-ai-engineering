import React, { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const fallbackResume = {
  name: "Candidate profile",
  email: null,
  phone: null,
  total_experience_years: null,
  skills: [],
  experiences: [],
  education: [],
  projects: [],
  certifications: [],
};

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed with status ${response.status}`);
  }
  return response.json();
}

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function App() {
  const [resume, setResume] = useState(fallbackResume);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingResume, setLoadingResume] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    request("/resume")
      .then(setResume)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoadingResume(false));
  }, []);

  const initials = useMemo(
    () => (resume.name || "C").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    [resume.name],
  );
  const experience = resume.total_experience_years
    ? `${resume.total_experience_years} years`
    : "Not specified";

  async function submitQuestion(event) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || sending) return;
    setError("");
    setMessages((current) => [...current, { role: "user", text: trimmedQuestion }]);
    setQuestion("");
    setSending(true);
    try {
      const result = await request("/chat", {
        method: "POST",
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      setMessages((current) => [...current, { role: "assistant", text: result.answer }]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div><strong>HireMeAI</strong><span>Talent workspace</span></div>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="active" href="#overview"><Icon>⌂</Icon>Overview</a>
          <a href="#experience"><Icon>▣</Icon>Experience</a>
          <a href="#skills"><Icon>✦</Icon>Skills</a>
          <a href="#assistant"><Icon>◌</Icon>AI assistant</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">?</span>
            <div><strong>Need a hand?</strong><small>Ask the AI assistant anything.</small></div>
          </div>
          <div className="user-row"><div className="mini-avatar">{initials}</div><span>Candidate view</span><button aria-label="More options">•••</button></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><p className="eyebrow">CANDIDATE PROFILE</p><h1>Good morning, {resume.name?.split(" ")[0] || "there"} <span className="wave">✦</span></h1></div>
          <div className="top-actions"><span className="status-dot"><i /> Live workspace</span><button className="outline-button" onClick={() => window.location.reload()}>↻ Refresh</button></div>
        </header>

        {error && <div className="alert" role="alert"><span>!</span>{error}<button onClick={() => setError("")}>×</button></div>}

        <section id="overview" className="profile-hero">
          <div className="profile-identity">
            <div className="avatar">{initials}</div>
            <div><p className="eyebrow">YOUR RESUME</p><h2>{loadingResume ? "Loading profile..." : resume.name || "Candidate profile"}</h2><p className="muted">{resume.email || "Resume insights at a glance"}</p></div>
          </div>
          <div className="hero-stats">
            <div><span>Experience</span><strong>{experience}</strong></div>
            <div><span>Skills detected</span><strong>{resume.skills.length}</strong></div>
            <div><span>Projects</span><strong>{resume.projects.length}</strong></div>
          </div>
        </section>

        <div className="content-grid">
          <div className="primary-column">
            <section id="skills" className="panel">
              <div className="section-heading"><div><p className="eyebrow">CAPABILITIES</p><h3>Skills & expertise</h3></div><span className="count-badge">{resume.skills.length} total</span></div>
              <div className="skill-cloud">
                {resume.skills.length ? resume.skills.map((skill) => <span className="skill-pill" key={skill}>{skill}</span>) : <p className="empty-state">Skills will appear here after the resume is parsed.</p>}
              </div>
            </section>

            <section id="experience" className="panel">
              <div className="section-heading"><div><p className="eyebrow">CAREER PATH</p><h3>Experience</h3></div><span className="count-badge">{resume.experiences.length} roles</span></div>
              {resume.experiences.length ? <div className="timeline">{resume.experiences.map((item, index) => <article className="timeline-item" key={`${item.company}-${index}`}><div className="timeline-marker" /><div><div className="role-line"><h4>{item.role || "Experience"}</h4><span>{item.duration || "Duration unavailable"}</span></div><p className="company">{item.company || "Company unavailable"}</p>{item.description && <p className="description">{item.description}</p>}{item.skills_used?.length > 0 && <div className="inline-tags">{item.skills_used.map((skill) => <span key={skill}>{skill}</span>)}</div>}</div></article>)}</div> : <p className="empty-state">No experience entries were found in the parsed resume.</p>}
            </section>
          </div>

          <section id="assistant" className="panel assistant-panel">
            <div className="assistant-header"><div className="assistant-icon">✦</div><div><p className="eyebrow">HIREMEAI ASSISTANT</p><h3>Ask about your resume</h3></div><span className="online-badge">● Online</span></div>
            <p className="assistant-intro">Get quick, grounded answers based on the information in your resume.</p>
            <div className="chat-window">
              {!messages.length && <div className="suggestions"><p>Try asking...</p><button onClick={() => setQuestion("What are my strongest skills?")}>What are my strongest skills?</button><button onClick={() => setQuestion("Summarize my experience")}>Summarize my experience</button></div>}
              {messages.map((message, index) => <div className={`message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "user" ? initials : "✦"}</span><p>{message.text}</p></div>)}
              {sending && <div className="message assistant"><span>✦</span><p className="typing"><i /><i /><i /></p></div>}
            </div>
            <form className="chat-form" onSubmit={submitQuestion}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question..." maxLength="2000" /><button disabled={!question.trim() || sending} aria-label="Send question">↑</button></form>
            <p className="disclaimer">AI responses are based only on the uploaded resume.</p>
          </section>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
