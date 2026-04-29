function ResetPasswordView({ resetForm, setResetForm, handleResetPassword, resetStatus, setResetToken }) {
  return (
    <main className="page-shell">
      <section className="login-panel">
        <div className="brand-chip">Threadspace</div>
        <h1>Set a new password</h1>
        <p className="subtitle">Enter and confirm your new password below.</p>
        <form className="login-form" onSubmit={handleResetPassword}>
          <label>
            <span>New Password</span>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={resetForm.password}
              onChange={(e) => setResetForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          </label>
          <label>
            <span>Confirm Password</span>
            <input
              type="password"
              placeholder="Repeat your new password"
              value={resetForm.confirm}
              onChange={(e) => setResetForm((f) => ({ ...f, confirm: e.target.value }))}
              required
            />
          </label>
          <button type="submit" disabled={resetStatus.loading}>
            {resetStatus.loading ? "Saving..." : "Update Password"}
          </button>
        </form>
        {resetStatus.message ? (
          <div className={`feedback ${resetStatus.type}`}>{resetStatus.message}</div>
        ) : null}
        <button
          type="button"
          style={{ marginTop: "1rem", background: "none", border: "none", color: "var(--muted)", fontSize: "13px", cursor: "pointer", padding: 0 }}
          onClick={() => { window.history.replaceState({}, "", window.location.pathname); setResetToken(""); }}
        >
          Back to login
        </button>
      </section>
    </main>
  );
}

function AuthView({
  authMode,
  setAuthMode,
  form,
  handleAuthChange,
  handleAuthSubmit,
  status,
  showForgotPassword,
  setShowForgotPassword,
  forgotEmail,
  setForgotEmail,
  handleForgotPassword,
  forgotStatus,
  setForgotStatus
}) {
  return (
    <main className="page-shell" style={{ position: "relative" }}>
      <section className="login-panel">
        <div className="brand-chip">Threadspace</div>
        <div className="auth-tabs">
          <button
            className={authMode === "login" ? "auth-tab active" : "auth-tab"}
            type="button"
            onClick={() => setAuthMode("login")}
          >
            Login
          </button>
          <button
            className={authMode === "signup" ? "auth-tab active" : "auth-tab"}
            type="button"
            onClick={() => setAuthMode("signup")}
          >
            Sign Up
          </button>
        </div>
        <h1>{authMode === "login" ? "Join The Discussion" : "Create Your Account"}</h1>
        <p className="subtitle">
          {authMode === "login"
            ? "Log in to access your feed, communities, and member search."
            : "Create an account to start posting and building communities."}
        </p>
        {authMode === "login" ? (
          <div className="demo-box">
            <span>Demo email: demo@site.com</span>
            <span>Demo password: Password@123</span>
          </div>
        ) : null}
        <form className="login-form" onSubmit={handleAuthSubmit}>
          {authMode === "signup" ? (
            <label>
              <span>Full Name</span>
              <input
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleAuthChange}
                required
              />
            </label>
          ) : null}
          <label>
            <span>Email</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleAuthChange}
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              name="password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleAuthChange}
              required
            />
          </label>
          {authMode === "login" ? (
            <div style={{ textAlign: "right", marginTop: "-8px" }}>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "13px", cursor: "pointer", padding: 0 }}
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot password?
              </button>
            </div>
          ) : null}
          <button type="submit" disabled={status.loading}>
            {status.loading
              ? authMode === "login"
                ? "Signing in..."
                : "Creating account..."
              : authMode === "login"
                ? "Login"
                : "Sign Up"}
          </button>
        </form>
        {status.message ? (
          <div className={`feedback ${status.type}`}>{status.message}</div>
        ) : null}
      </section>

      {showForgotPassword ? (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--bg-2)", borderRadius: "12px", border: "1px solid var(--border)", padding: "2rem", width: "100%", maxWidth: "360px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 500, margin: "0 0 8px" }}>Reset your password</h2>
            <p style={{ fontSize: "14px", color: "var(--muted)", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px" }}>
                <span style={{ color: "var(--muted)" }}>Email address</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={forgotStatus.loading}>
                {forgotStatus.loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
            {forgotStatus.message ? (
              <div className={`feedback ${forgotStatus.type}`} style={{ marginTop: "1rem" }}>{forgotStatus.message}</div>
            ) : null}
            <button
              type="button"
              style={{ marginTop: "1rem", background: "none", border: "none", color: "var(--muted)", fontSize: "13px", cursor: "pointer", padding: 0 }}
              onClick={() => { setShowForgotPassword(false); setForgotStatus({ loading: false, type: "", message: "" }); setForgotEmail(""); }}
            >
              Back to login
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function FeedView({
  postsLoading,
  posts,
  postStatus,
  setView,
  accountEmail,
  openUserProfile,
  handleReaction,
  openComments,
  toggleComments,
  handleSave,
  handleShare,
  handleDelete,
  commentErrors,
  commentDrafts,
  setCommentDrafts,
  handleCommentSubmit
}) {
  return (
    <div className="content-card">
      <div className="section-head">
        <div>
          <h1>Home Feed</h1>
          <p>Browse recent posts from your communities.</p>
        </div>
        <button className="post-button" type="button" onClick={() => setView("create")}>
          Create Post
        </button>
      </div>
      {postStatus.message && postStatus.type !== "error" ? <div className={`feedback ${postStatus.type}`}>{postStatus.message}</div> : null}
      {postsLoading ? (
        <div className="empty-preview">Loading posts...</div>
      ) : posts.length ? (
        <div className="posts-feed">
          {(Array.isArray(posts) ? posts : []).map((item) => (
            <article className="feed-card" key={item.id} id={`post-${item.id}`}>
              <div className="post-header">
                <div className="post-community-avatar">
                  {item.subreddit?.charAt(0).toUpperCase()}
                </div>
                <div className="post-meta-col">
                  <div className="post-meta-top">
                    <span className="community-name">r/{item.subreddit}</span>
                  </div>
                  <div className="post-meta-bottom">
                    <span style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => void openUserProfile(item.authorEmail, item.authorName)}>u/{item.authorName}</span>
                  </div>
                </div>
              </div>
              <p className="post-caption">{item.caption}</p>
              {item.imageUrl ? <img className="post-image" src={item.imageUrl} alt="Post" /> : null}
              <div className="post-actions">
                <div className="vote-cluster">
                  <button
                    className={item.likedBy?.includes(accountEmail) ? "vote-btn upvoted" : "vote-btn"}
                    type="button"
                    onClick={() => void handleReaction(item.id, "like")}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V5.5C14 4.12 12.88 3 11.5 3L7 10v11h10.28c.92 0 1.72-.62 1.95-1.51l1.38-5.5A2 2 0 0 0 18.67 11H15a1 1 0 0 1-1-1Z"/><path d="M5 10H3v11h2V10Z"/></svg>
                    <span className="vote-count">{item.likes || 0}</span>
                  </button>
                  <div className="vote-divider" />
                  <button
                    className={item.dislikedBy?.includes(accountEmail) ? "vote-btn downvoted" : "vote-btn"}
                    type="button"
                    onClick={() => void handleReaction(item.id, "dislike")}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 15v3.5c0 1.38 1.12 2.5 2.5 2.5L17 14V3H6.72C5.8 3 5 3.62 4.77 4.51l-1.38 5.5A2 2 0 0 0 5.33 13H9a1 1 0 0 1 1 1Z"/><path d="M19 3h2v11h-2V3Z"/></svg>
                  </button>
                </div>
                <button
                  className={openComments[item.id] ? "action-button active" : "action-button"}
                  type="button"
                  onClick={() => toggleComments(item.id)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                  {item.comments?.length || 0}
                </button>
                <button
                  className={item.savedBy?.includes(accountEmail) ? "action-button active" : "action-button"}
                  type="button"
                  onClick={() => void handleSave(item.id)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 22a1 1 0 0 1-.5-.14L12 18.2l-5.5 3.66A1 1 0 0 1 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16a1 1 0 0 1-1 1z"/></svg>
                </button>
                <button className="action-button" type="button" onClick={() => void handleShare(item.id)}>
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 3 21 10l-7 7v-4c-5 0-8 1.5-11 5 1-6 4-11 11-12V3Z"/></svg>
                  Share
                </button>
                {item.authorEmail === accountEmail ? (
                  <button className="action-button delete" type="button" onClick={() => void handleDelete(item.id)}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z"/></svg>
                  </button>
                ) : null}
              </div>
              {openComments[item.id] ? (
                <>
                  <div className="comment-box">
                    {commentErrors[item.id] ? (
                      <div className="feedback error" style={{ marginTop: 0 }}>{commentErrors[item.id]}</div>
                    ) : null}
                    <textarea
                      placeholder="Write a comment"
                      value={commentDrafts[item.id] || ""}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [item.id]: event.target.value
                        }))
                      }
                    />
                    <button type="button" onClick={() => void handleCommentSubmit(item.id)}>
                      Add Comment
                    </button>
                  </div>
                  {item.comments?.length ? (
                    <div className="comment-list">
                      {(Array.isArray(item.comments) ? item.comments : []).map((comment) => (
                        <div className="comment-item" key={comment.id}>
                          <span className="comment-author">{comment.authorName}</span>
                          <span className="comment-text">{comment.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="comment-empty">No comments yet.</div>
                  )}
                </>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-preview">No posts yet. Create one to start your feed.</div>
      )}
    </div>
  );
}

function CreatePostView({ subreddits, post, handlePostSubmit, handlePostChange, handleImageChange, postStatus }) {
  return (
    <div className="content-card">
      <div className="section-head">
        <div>
          <h1>Create Post</h1>
          <p>Choose a subreddit, upload a photo, and publish it.</p>
        </div>
      </div>
      <form className="upload-grid" onSubmit={handlePostSubmit}>
        <label>
          <span>Subreddit</span>
          <select name="subreddit" value={post.subreddit} onChange={handlePostChange}>
            {(Array.isArray(subreddits) ? subreddits : []).map((item) => (
              <option key={item.id} value={item.name}>r/{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Caption</span>
          <textarea
            name="caption"
            placeholder="What's happening in your community?"
            value={post.caption}
            onChange={handlePostChange}
          />
        </label>
        <label>
          <span>Select Photo</span>
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </label>
        <button className="post-button" type="submit" disabled={postStatus.loading}>
          {postStatus.loading ? "Posting..." : "Post To Community"}
        </button>
      </form>
    </div>
  );
}

function SubredditsView({ subredditForm, handleCreateSubreddit, handleSubredditChange, subredditStatus, subreddits }) {
  return (
    <div className="content-card">
      <div className="section-head">
        <div>
          <h1>Subreddits</h1>
          <p>Create and browse communities for different topics.</p>
        </div>
      </div>
      <form className="subreddit-form" onSubmit={handleCreateSubreddit}>
        <label>
          <span>Subreddit Name</span>
          <input name="name" type="text" placeholder="example: developers" value={subredditForm.name} onChange={handleSubredditChange} />
        </label>
        <label>
          <span>Display Title</span>
          <input name="title" type="text" placeholder="Example Community" value={subredditForm.title} onChange={handleSubredditChange} />
        </label>
        <label>
          <span>Description</span>
          <textarea name="description" placeholder="What is this community about?" value={subredditForm.description} onChange={handleSubredditChange} />
        </label>
        <button className="post-button" type="submit" disabled={subredditStatus.loading}>
          {subredditStatus.loading ? "Creating..." : "Create Subreddit"}
        </button>
      </form>
      {subredditStatus.message ? <div className={`feedback ${subredditStatus.type}`}>{subredditStatus.message}</div> : null}
      <div className="subreddit-cards">
        {(Array.isArray(subreddits) ? subreddits : []).map((item) => (
          <article className="community-card" key={item.id}>
            <div className="community-handle">r/{item.name}</div>
            <h3>{item.title}</h3>
            <p>{item.description || "No description added yet."}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function SettingsView({ accountName, accountEmail, onSignOut }) {
  return (
    <div className="content-card">
      <div className="section-head">
        <div>
          <h1>Settings</h1>
          <p>View your current account information.</p>
        </div>
      </div>
      <div className="subreddit-cards">
        <article className="community-card">
          <div className="community-handle">Display Name</div>
          <h3>{accountName}</h3>
          <p>Your visible name across the app.</p>
        </article>
        <article className="community-card">
          <div className="community-handle">Email</div>
          <h3>{accountEmail}</h3>
          <p>Your login email for Threadspace.</p>
        </article>
      </div>
      <div style={{ marginTop: 18 }}>
        <button className="post-button" type="button" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export {
  AuthView,
  CreatePostView,
  FeedView,
  ResetPasswordView,
  SettingsView,
  SubredditsView
};
