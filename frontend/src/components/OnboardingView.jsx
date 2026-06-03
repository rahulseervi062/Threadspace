import React, { useState } from "react";

const INTEREST_OPTIONS = [
  { id: "photography", icon: "📷", label: "Photography" },
  { id: "music", icon: "🎵", label: "Music" },
  { id: "tech", icon: "💻", label: "Technology" },
  { id: "gaming", icon: "🎮", label: "Gaming" },
  { id: "food", icon: "🍜", label: "Food & Cooking" },
  { id: "travel", icon: "✈️", label: "Travel" },
  { id: "fitness", icon: "💪", label: "Fitness" },
  { id: "art", icon: "🎨", label: "Art & Design" },
  { id: "movies", icon: "🎬", label: "Movies & TV" },
  { id: "books", icon: "📚", label: "Books" },
  { id: "science", icon: "🔬", label: "Science" },
  { id: "announcements", icon: "📢", label: "Announcements" },
  { id: "campuslife", icon: "🎓", label: "Campus Life" },
  { id: "sports", icon: "⚽", label: "Sports" },
];

export function OnboardingView({ accountName, subreddits, handleToggleSubredditFollow, followingSubreddits, onFinish }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(new Set());

  const toggleInterest = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleJoin = async () => {
    // Auto-follow selected circles that exist, create ones that don't
    const toFollow = [...selected].filter(id =>
      subreddits.some(s => s.name === id) && !followingSubreddits.includes(id)
    );
    for (const name of toFollow) {
      await handleToggleSubredditFollow(name);
    }
    onFinish();
  };

  const steps = [
    // Step 0: Welcome
    <div key="welcome" style={{ textAlign: "center", padding: "40px 24px" }}>
      <div style={{ fontSize: "4rem", marginBottom: 16 }}>👋</div>
      <h1 style={{ fontSize: "2rem", marginBottom: 12 }}>Welcome, {accountName}!</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", marginBottom: 32, maxWidth: 380, margin: "0 auto 32px" }}>
        Pulse is your space to share, connect, and discover. Let's get you set up in 2 quick steps.
      </p>
      <button className="post-button" onClick={() => setStep(1)} style={{ padding: "14px 40px", fontSize: "1rem" }}>
        Get Started →
      </button>
    </div>,

    // Step 1: Pick interests
    <div key="interests" style={{ padding: "32px 24px" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: 8 }}>What are you into?</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Pick topics to auto-join matching circles.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 32 }}>
        {INTEREST_OPTIONS.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggleInterest(opt.id)}
            style={{
              padding: "14px 10px", borderRadius: 12, border: "2px solid",
              borderColor: selected.has(opt.id) ? "var(--accent)" : "var(--border)",
              background: selected.has(opt.id) ? "hsla(172,78%,50%,0.12)" : "var(--bg-card)",
              cursor: "pointer", textAlign: "center", transition: "all 0.15s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6
            }}
          >
            <span style={{ fontSize: "1.6rem" }}>{opt.icon}</span>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: selected.has(opt.id) ? "var(--accent)" : "var(--text-main)" }}>
              {opt.label}
            </span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="action-button" onClick={() => setStep(0)} style={{ flex: 1 }}>← Back</button>
        <button className="post-button" onClick={() => setStep(2)} style={{ flex: 2 }}>
          Next → {selected.size > 0 ? `(${selected.size} selected)` : ""}
        </button>
      </div>
    </div>,

    // Step 2: Ready
    <div key="ready" style={{ textAlign: "center", padding: "40px 24px" }}>
      <div style={{ fontSize: "4rem", marginBottom: 16 }}>🚀</div>
      <h2 style={{ fontSize: "1.6rem", marginBottom: 12 }}>You're all set!</h2>
      {selected.size > 0 && (
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
          We'll join you to {selected.size} circle{selected.size !== 1 ? "s" : ""} based on your interests.
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 32 }}>
        {[...selected].map(id => {
          const opt = INTEREST_OPTIONS.find(o => o.id === id);
          return opt ? (
            <span key={id} style={{ padding: "6px 14px", borderRadius: 20, background: "hsla(172,78%,50%,0.15)", color: "var(--accent)", fontSize: "0.85rem", fontWeight: 600 }}>
              {opt.icon} {opt.label}
            </span>
          ) : null;
        })}
      </div>
      <button className="post-button" onClick={handleJoin} style={{ padding: "14px 40px", fontSize: "1rem" }}>
        Enter Pulse 🎉
      </button>
    </div>
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9998,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }}>
      <div style={{
        background: "var(--bg-card)", borderRadius: 20, width: "100%", maxWidth: 500,
        border: "1px solid var(--border)", overflow: "hidden"
      }}>
        {/* Step indicator */}
        <div style={{ display: "flex", padding: "16px 24px 0", gap: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= step ? "var(--accent)" : "var(--border)",
              transition: "background 0.3s"
            }} />
          ))}
        </div>
        {steps[step]}
      </div>
    </div>
  );
}
