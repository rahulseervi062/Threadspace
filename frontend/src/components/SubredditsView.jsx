import React from "react";

export function SubredditsView({
  subredditForm,
  handleCreateSubreddit,
  handleSubredditChange,
  subredditStatus,
  subreddits,
  followingSubreddits,
  handleToggleSubredditFollow,
  openCommunity
}) {
  return (
    <div className="content-card">
      <div className="section-head" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem" }}>Communities</h1>
          <p style={{ color: "var(--text-muted)" }}>Discover and create communities for any interest.</p>
        </div>
      </div>
      
      <form className="subreddit-form" onSubmit={handleCreateSubreddit} style={{ marginBottom: 32, padding: "20px", background: "var(--bg-dark)", borderRadius: "14px", border: "1px solid var(--border)" }}>
        <h3 style={{ marginBottom: 16, fontSize: "1.1rem" }}>Create a New Community</h3>
        <label>
          <span>Community Name</span>
          <input name="name" type="text" placeholder="e.g. photography" value={subredditForm.name} onChange={handleSubredditChange} />
        </label>
        <label>
          <span>Display Title</span>
          <input name="title" type="text" placeholder="The Photography Club" value={subredditForm.title} onChange={handleSubredditChange} />
        </label>
        <label>
          <span>Description</span>
          <textarea name="description" placeholder="What should people expect here?" value={subredditForm.description} onChange={handleSubredditChange} />
        </label>
        <button className="post-button" type="submit" disabled={subredditStatus.loading} style={{ marginTop: 8 }}>
          {subredditStatus.loading ? "Creating..." : "Launch Community"}
        </button>
        {subredditStatus.message ? <div className={`feedback ${subredditStatus.type}`} style={{ marginTop: 16 }}>{subredditStatus.message}</div> : null}
      </form>

      <div className="subreddit-cards">
        <h3 style={{ marginBottom: 16, fontSize: "1.1rem" }}>All Communities</h3>
        {(Array.isArray(subreddits) ? subreddits : []).map((item) => (
          <article className="community-card" key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div style={{ flex: 1 }}>
              <div className="community-handle" style={{ cursor: "pointer", color: "var(--accent)", fontWeight: 700 }} onClick={() => openCommunity(item.name)}>r/{item.name}</div>
              <h3 style={{ fontSize: "1.1rem", margin: "4px 0" }}>{item.title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{item.description || "No description added yet."}</p>
            </div>
            <button 
              className={followingSubreddits?.includes(item.name) ? "action-button active" : "post-button"} 
              type="button" 
              onClick={() => void handleToggleSubredditFollow(item.name)}
              style={{ padding: "8px 16px", fontSize: "0.85rem" }}
            >
              {followingSubreddits?.includes(item.name) ? "Joined" : "Join"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
