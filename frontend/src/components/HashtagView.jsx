import React, { useMemo } from "react";

export function HashtagView({
  hashtag,
  posts,
  openPost,
  openUserProfile,
  accountEmail,
  handleReaction,
  handleSave,
  setView
}) {
  const tag = hashtag?.startsWith("#") ? hashtag : `#${hashtag}`;
  const tagLower = tag.toLowerCase();

  const taggedPosts = useMemo(() =>
    posts.filter(p => String(p.caption || "").toLowerCase().includes(tagLower)),
    [posts, tagLower]
  );

  const topPosts = useMemo(() =>
    [...taggedPosts].sort((a, b) => (b.likes || 0) - (a.likes || 0)),
    [taggedPosts]
  );

  const relatedTags = useMemo(() => {
    const counts = {};
    taggedPosts.forEach(p => {
      const tags = String(p.caption || "").match(/#[a-z0-9_]+/gi) || [];
      tags.forEach(t => {
        const tl = t.toLowerCase();
        if (tl !== tagLower) counts[tl] = (counts[tl] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);
  }, [taggedPosts, tagLower]);

  return (
    <div className="content-card">
      <button className="action-button" onClick={() => setView("feed")} style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back
      </button>

      {/* Hashtag header */}
      <div style={{
        background: "linear-gradient(135deg, #0ea5e9, var(--accent))",
        borderRadius: 16, padding: "32px", marginBottom: 24, textAlign: "center"
      }}>
        <h1 style={{ fontSize: "2.2rem", color: "white", margin: 0 }}>{tag}</h1>
        <p style={{ color: "rgba(255,255,255,0.8)", margin: "8px 0 0" }}>
          {taggedPosts.length} post{taggedPosts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Related tags */}
      {relatedTags.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 10 }}>Related tags</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {relatedTags.map(t => (
              <button
                key={t}
                className="subreddit-pill"
                type="button"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("openHashtag", { detail: { tag: t } }));
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Media grid */}
      {topPosts.some(p => p.imageUrl || (p.images && p.images.length)) && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Top Media</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 8 }}>
            {topPosts.filter(p => p.imageUrl || (p.images && p.images.length)).slice(0, 9).map(post => (
              <button
                key={post.id}
                onClick={() => openPost(post.id)}
                type="button"
                style={{ aspectRatio: "1", borderRadius: 6, overflow: "hidden", padding: 0, border: "none", cursor: "pointer" }}
              >
                <img src={post.imageUrl || post.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All posts */}
      <h3 style={{ marginBottom: 16 }}>All Posts</h3>
      {topPosts.length === 0 ? (
        <div className="empty-preview">No posts found for {tag}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {topPosts.map(post => (
            <button
              key={post.id}
              onClick={() => openPost(post.id)}
              type="button"
              style={{
                background: "var(--bg-dark)", borderRadius: 12, padding: 14,
                border: "1px solid var(--border)", cursor: "pointer", textAlign: "left",
                display: "flex", gap: 12, alignItems: "center"
              }}
            >
              {(post.imageUrl || (post.images && post.images[0])) && (
                <img src={post.imageUrl || post.images[0]} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 4px", fontWeight: 600, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {post.caption || "No caption"}
                </p>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  @{post.authorName} · #{post.subreddit} · {post.likes || 0} likes
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
