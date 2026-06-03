import React, { useState, useEffect, useRef } from "react";

export function StoriesViewer({ stories, initialIndex = 0, onClose, accountEmail }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const STORY_DURATION = 5000;

  const story = stories[currentIndex];

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setProgress(0);
    }
  };

  useEffect(() => {
    setProgress(0);
    clearInterval(intervalRef.current);
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(intervalRef.current);
        goNext();
      }
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, [currentIndex]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex]);

  if (!story) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative", width: "min(420px, 100vw)", height: "min(740px, 100vh)",
          background: "var(--bg-card)", borderRadius: 20, overflow: "hidden",
          display: "flex", flexDirection: "column"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div style={{ display: "flex", gap: 4, padding: "12px 12px 0" }}>
          {stories.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2, background: "white",
                width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
                transition: i === currentIndex ? "none" : undefined
              }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: "0.9rem", overflow: "hidden", flexShrink: 0
          }}>
            {story.authorAvatar
              ? <img src={story.authorAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : story.authorName?.charAt(0)
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>@{story.authorName}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>#{story.subreddit}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, fontSize: "1.2rem" }}>✕</button>
        </div>

        {/* Media */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {story.mediaType === "video"
            ? <video src={story.imageUrl} autoPlay loop muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : story.imageUrl
              ? <img src={story.imageUrl} alt="Story" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, var(--accent), var(--accent2,#7c3aed))", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
                  <p style={{ fontSize: "1.4rem", fontWeight: 600, textAlign: "center", color: "white" }}>{story.caption}</p>
                </div>
          }

          {/* Caption overlay */}
          {story.caption && story.imageUrl && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
              padding: "32px 16px 16px", color: "white"
            }}>
              <p style={{ fontSize: "0.95rem", margin: 0 }}>{story.caption}</p>
            </div>
          )}

          {/* Tap zones */}
          <div style={{ position: "absolute", left: 0, top: 0, width: "40%", height: "100%", cursor: "pointer" }} onClick={goPrev} />
          <div style={{ position: "absolute", right: 0, top: 0, width: "40%", height: "100%", cursor: "pointer" }} onClick={goNext} />
        </div>
      </div>
    </div>
  );
}
