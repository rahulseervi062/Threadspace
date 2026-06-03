import React, { useMemo } from "react";

export function CommunityView({
  communityName,
  subreddits,
  posts,
  followingSubreddits,
  handleToggleSubredditFollow,
  openPost,
  accountEmail,
  setView,
  setSelectedCommunity
}) {
  const community = subreddits.find(s => s.name === communityName);
  const communityPosts = useMemo(() =>
    posts.filter(p => p.subreddit === communityName), [posts, communityName]
  );

  const isFollowing = followingSubreddits?.includes(communityName);
  const memberCount = community?.memberCount || communityPosts.length * 3 + 12;
  const topPosts = useMemo(() =>
    [...communityPosts].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3),
    [communityPosts]
  );

  const mediaPosts = useMemo(() =>
    communityPosts.filter(p => p.imageUrl || (Array.isArray(p.images) && p.images.length)),
    [communityPosts]
  );

  return (
    <div className="content-card">
      <button className="action-button" onClick={() => setView("subreddits")} style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Circles
      </button>

      {/* Community Banner */}
      <div style={{
        background: "linear-gradient(135deg, var(--accent), #7c3aed)",
        borderRadius: 16, padding: "40px 32px", marginBottom: 24, position: "relative", overflow: "hidden"
      }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.8rem", fontWeight: 800, color: "white", flexShrink: 0
          }}>
            #{communityName?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: "white", fontSize: "1.8rem", margin: 0 }}>#{communityName}</h1>
            {community?.title && <p style={{ color: "rgba(255,255,255,0.8)", margin: "4px 0 0", fontSize: "1rem" }}>{community.title}</p>}
          </div>
          <button
            className={isFollowing ? "action-button" : "post-button"}
            onClick={() => void handleToggleSubredditFollow(communityName)}
            style={{ padding: "10px 24px", background: isFollowing ? "rgba(255,255,255,0.15)" : "white", color: isFollowing ? "white" : "var(--accent)", border: "none" }}
          >
            {isFollowing ? "✓ Joined" : "Join Circle"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Members", value: memberCount },
          { label: "Posts", value: communityPosts.length },
          { label: "Media", value: mediaPosts.length }
        ].map(stat => (
          <div key={stat.label} style={{ background: "var(--bg-dark)", borderRadius: 12, padding: "16px", textAlign: "center", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--accent)" }}>{stat.value}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {community?.description && (
        <div style={{ background: "var(--bg-dark)", borderRadius: 12, padding: 16, marginBottom: 24, border: "1px solid var(--border)" }}>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>{community.description}</p>
        </div>
      )}

      {/* Top Posts */}
      {topPosts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            🔥 Top Posts
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topPosts.map((post, i) => (
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
                <span style={{ fontWeight: 800, fontSize: "1.3rem", color: "var(--text-muted)", width: 28, flexShrink: 0 }}>#{i+1}</span>
                {(post.imageUrl || (post.images && post.images[0])) && (
                  <img src={post.imageUrl || post.images[0]} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {post.caption || "No caption"}
                  </p>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>@{post.authorName} · {post.likes || 0} likes</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Media Grid */}
      {mediaPosts.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 12 }}>📸 Media</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
            {mediaPosts.slice(0, 12).map(post => (
              <button
                key={post.id}
                onClick={() => openPost(post.id)}
                type="button"
                style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", padding: 0, border: "none", cursor: "pointer" }}
              >
                <img
                  src={post.imageUrl || (post.images && post.images[0])}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {communityPosts.length === 0 && (
        <div className="empty-preview">No posts in #{communityName} yet. Be the first to drop something!</div>
      )}
    </div>
  );
}
