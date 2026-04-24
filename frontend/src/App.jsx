 import { useEffect, useState } from "react";

const API_BASE =
"https://threadspace-e2sj.onrender.com"

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error("Backend is not returning JSON. Make sure the backend server is running.");
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Received an invalid JSON response from the server.");
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [accountName, setAccountName] = useState("Demo User");
  const [accountEmail, setAccountEmail] = useState("demo@site.com");
  const [authMode, setAuthMode] = useState("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState({ loading: false, type: "", message: "" });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get("reset") || "");
  const [resetForm, setResetForm] = useState({ password: "", confirm: "" });
  const [resetStatus, setResetStatus] = useState({ loading: false, type: "", message: "" });
  const [view, setView] = useState("feed");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [post, setPost] = useState({
    caption: "",
    imageUrl: "",
    subreddit: "announcements"
  });
  const [subredditForm, setSubredditForm] = useState({
    name: "",
    title: "",
    description: ""
  });
  const [posts, setPosts] = useState([]);
  const [subreddits, setSubreddits] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [members, setMembers] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [status, setStatus] = useState({ loading: false, type: "", message: "" });
  const [postStatus, setPostStatus] = useState({
    loading: false,
    type: "",
    message: ""
  });
  const [subredditStatus, setSubredditStatus] = useState({
    loading: false,
    type: "",
    message: ""
  });
  const [postsLoading, setPostsLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadSubreddits();
    void loadPosts();
    void searchMembers("");
  }, [isAuthenticated]);

  async function loadPosts() {
    setPostsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/posts`);
      const data = await readJsonResponse(response);
      if (response.ok) setPosts(data.posts || []);
    } catch {
      setPostStatus({ loading: false, type: "error", message: "Could not load posts." });
    } finally {
      setPostsLoading(false);
    }
  }

  async function loadSubreddits() {
    try {
      const response = await fetch(`${API_BASE}/api/subreddits`);
      const data = await readJsonResponse(response);
      if (response.ok) {
        const next = data.subreddits || [];
        setSubreddits(next);
        if (next.length && !next.find((item) => item.name === post.subreddit)) {
          setPost((current) => ({ ...current, subreddit: next[0].name }));
        }
      }
    } catch {
      setSubredditStatus({
        loading: false,
        type: "error",
        message: "Could not load subreddits."
      });
    }
  }

  async function searchMembers(query) {
    setMembersLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/users?q=${encodeURIComponent(query)}`);
      const data = await readJsonResponse(response);
      if (response.ok) setMembers(data.users || []);
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, type: "", message: "" });

    try {
      const endpoint = authMode === "login" ? "/api/login" : "/api/signup";
      const payload =
        authMode === "login"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password };

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Authentication failed.");

      setStatus({
        loading: false,
        type: "success",
        message:
          authMode === "login"
            ? `Welcome back, ${data.user.name}.`
            : `Account created for ${data.user.name}.`
      });
      setAccountName(data.user.name);
      setAccountEmail(data.user.email);
      setIsAuthenticated(true);
      setView("feed");
    } catch (error) {
      setStatus({
        loading: false,
        type: "error",
        message: error.message || "Something went wrong."
      });
    }
  }

  function handleAuthChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotStatus({ loading: false, type: "error", message: "Please enter your email address." });
      return;
    }
    setForgotStatus({ loading: true, type: "", message: "" });
    try {
      const response = await fetch(`${API_BASE}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Request failed.");
      setForgotStatus({ loading: false, type: "success", message: data.message || "If that email exists, a reset link has been sent." });
      setForgotEmail("");
    } catch (error) {
      setForgotStatus({ loading: false, type: "error", message: error.message || "Something went wrong." });
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    if (resetForm.password !== resetForm.confirm) {
      setResetStatus({ loading: false, type: "error", message: "Passwords do not match." });
      return;
    }
    if (resetForm.password.length < 6) {
      setResetStatus({ loading: false, type: "error", message: "Password must be at least 6 characters." });
      return;
    }
    setResetStatus({ loading: true, type: "", message: "" });
    try {
      const response = await fetch(`${API_BASE}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: resetForm.password })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Reset failed.");
      setResetStatus({ loading: false, type: "success", message: data.message });
      setResetForm({ password: "", confirm: "" });
      // Clear token from URL and redirect to login after 2 seconds
      setTimeout(() => {
        window.history.replaceState({}, "", window.location.pathname);
        setResetToken("");
      }, 2000);
    } catch (error) {
      setResetStatus({ loading: false, type: "error", message: error.message || "Something went wrong." });
    }
  }

  function handlePostChange(event) {
    const { name, value } = event.target;
    setPost((current) => ({ ...current, [name]: value }));
  }

  function handleSubredditChange(event) {
    const { name, value } = event.target;
    setSubredditForm((current) => ({ ...current, [name]: value }));
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPost((current) => ({ ...current, imageUrl: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  }

  async function handlePostSubmit(event) {
    event.preventDefault();
    if (!post.caption.trim() || !post.imageUrl || !post.subreddit) {
      setPostStatus({
        loading: false,
        type: "error",
        message: "Caption, image and subreddit are required."
      });
      return;
    }

    setPostStatus({ loading: true, type: "", message: "" });

    try {
      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: post.caption.trim(),
          imageUrl: post.imageUrl,
          subreddit: post.subreddit,
          authorName: accountName,
          authorEmail: accountEmail
        })
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Post failed.");

      setPosts((current) => [data.post, ...current]);
      setPost((current) => ({ ...current, caption: "", imageUrl: "" }));
      setPostStatus({
        loading: false,
        type: "success",
        message: "Post published successfully."
      });
      setView("feed");
    } catch (error) {
      setPostStatus({
        loading: false,
        type: "error",
        message: error.message || "Unable to save post."
      });
    }
  }

  async function handleCreateSubreddit(event) {
    event.preventDefault();
    if (!subredditForm.name.trim() || !subredditForm.title.trim()) {
      setSubredditStatus({
        loading: false,
        type: "error",
        message: "Subreddit name and title are required."
      });
      return;
    }

    setSubredditStatus({ loading: true, type: "", message: "" });

    try {
      const response = await fetch(`${API_BASE}/api/subreddits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subredditForm)
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Could not create subreddit.");

      setSubreddits((current) => [data.subreddit, ...current]);
      setSubredditForm({ name: "", title: "", description: "" });
      setPost((current) => ({ ...current, subreddit: data.subreddit.name }));
      setSubredditStatus({
        loading: false,
        type: "success",
        message: `r/${data.subreddit.name} created.`
      });
    } catch (error) {
      setSubredditStatus({
        loading: false,
        type: "error",
        message: error.message || "Unable to create subreddit."
      });
    }
  }

  async function handleReaction(postId, reaction) {
    try {
      const response = await fetch(`${API_BASE}/api/posts/${postId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction, userEmail: accountEmail })
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Reaction failed.");

      setPosts((current) =>
        current.map((item) => (item.id === postId ? data.post : item))
      );
    } catch (error) {
      setPostStatus({
        loading: false,
        type: "error",
        message: error.message || "Unable to react to post."
      });
    }
  }

  async function handleCommentSubmit(postId) {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;

    try {
      const response = await fetch(`${API_BASE}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          authorName: accountName
        })
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Comment failed.");

      setPosts((current) =>
        current.map((item) => (item.id === postId ? data.post : item))
      );
      setCommentDrafts((current) => ({
        ...current,
        [postId]: ""
      }));
    } catch (error) {
      setPostStatus({
        loading: false,
        type: "error",
        message: error.message || "Unable to add comment."
      });
    }
  }

  async function handleSave(postId) {
    try {
      const response = await fetch(`${API_BASE}/api/posts/${postId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: accountEmail })
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Save failed.");

      setPosts((current) =>
        current.map((item) => (item.id === postId ? data.post : item))
      );
    } catch (error) {
      setPostStatus({
        loading: false,
        type: "error",
        message: error.message || "Unable to save post."
      });
    }
  }

  async function handleDelete(postId) {
    try {
      const response = await fetch(
        `${API_BASE}/api/posts/${postId}?userEmail=${encodeURIComponent(accountEmail)}`,
        {
          method: "DELETE"
        }
      );

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Delete failed.");

      setPosts((current) => current.filter((item) => item.id !== postId));
    } catch (error) {
      setPostStatus({
        loading: false,
        type: "error",
        message: error.message || "Unable to delete post."
      });
    }
  }

  async function handleShare(postId) {
    const shareUrl = `${window.location.origin}${window.location.pathname}#post-${postId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setPostStatus({
        loading: false,
        type: "success",
        message: "Post link copied to clipboard."
      });
    } catch {
      setPostStatus({
        loading: false,
        type: "error",
        message: "Unable to copy post link."
      });
    }
  }

  function renderIcon(name) {
    const icons = {
      like: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 9V5.5C14 4.12 12.88 3 11.5 3L7 10v11h10.28c.92 0 1.72-.62 1.95-1.51l1.38-5.5A2 2 0 0 0 18.67 11H15a1 1 0 0 1-1-1ZM5 10H3v11h2V10Z" fill="currentColor" />
        </svg>
      ),
      dislike: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 15v3.5c0 1.38 1.12 2.5 2.5 2.5L17 14V3H6.72C5.8 3 5 3.62 4.77 4.51l-1.38 5.5A2 2 0 0 0 5.33 13H9a1 1 0 0 1 1 1ZM19 3h2v11h-2V3Z" fill="currentColor" />
        </svg>
      ),
      comment: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h16v11H7l-3 3V4Zm4 5h8v2H8V9Zm0-4h8v2H8V5Z" fill="currentColor" />
        </svg>
      ),
      save: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" fill="currentColor" />
        </svg>
      ),
      share: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 3 21 10l-7 7v-4c-5 0-8 1.5-11 5 1-6 4-11 11-12V3Z" fill="currentColor" />
        </svg>
      ),
      delete: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z" fill="currentColor" />
        </svg>
      )
    };

    return icons[name] || null;
  }

  function toggleComments(postId) {
    setOpenComments((current) => ({
      ...current,
      [postId]: !current[postId]
    }));
  }

  if (resetToken && !isAuthenticated) {
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
            style={{ marginTop: "1rem", background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: "13px", cursor: "pointer", padding: 0 }}
            onClick={() => { window.history.replaceState({}, "", window.location.pathname); setResetToken(""); }}
          >
            ← Back to login
          </button>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
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
                  style={{ background: "none", border: "none", color: "var(--color-text-info)", fontSize: "13px", cursor: "pointer", padding: 0 }}
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
            <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "2rem", width: "100%", maxWidth: "360px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 500, margin: "0 0 8px" }}>Reset your password</h2>
              <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
                Enter your email and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Email address</span>
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
                style={{ marginTop: "1rem", background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: "13px", cursor: "pointer", padding: 0 }}
                onClick={() => { setShowForgotPassword(false); setForgotStatus({ loading: false, type: "", message: "" }); setForgotEmail(""); }}
              >
                ← Back to login
              </button>
            </div>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="reddit-shell">
      <header className="site-header">
        <div className="site-brand">threadspace</div>
        <div className="header-search">
          <span className="header-search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input type="text" placeholder="Search Threadspace" value={headerSearch} onChange={(e) => setHeaderSearch(e.target.value)} />
        </div>
        <nav className="site-nav">
          <button className={view === "feed" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("feed")}>Home</button>
          <button className={view === "create" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("create")}>Post</button>
          <button className={view === "subreddits" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("subreddits")}>Communities</button>
        </nav>
        <div className="account-menu-wrap">
          <button className="account-icon" type="button" onClick={() => setShowAccountMenu((v) => !v)}>
            {accountName.charAt(0)}
          </button>
          {showAccountMenu ? (
            <div className="account-menu">
              <div className="account-menu-label">Signed in as</div>
              <div className="account-menu-value">{accountName}</div>
              <div className="account-menu-label" style={{ marginTop: 4, fontSize: "0.75rem" }}>{accountEmail}</div>
              <div className="account-menu-actions">
                <button type="button" onClick={() => { setShowAccountMenu(false); setView("settings"); }}>Settings</button>
                <button type="button" onClick={() => { setShowAccountMenu(false); setIsAuthenticated(false); }}>Sign Out</button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        <button className={view === "feed" ? "bottom-nav-btn active" : "bottom-nav-btn"} type="button" onClick={() => setView("feed")}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          Home
        </button>
        <button className={view === "search" ? "bottom-nav-btn active" : "bottom-nav-btn"} type="button" onClick={() => setView("search")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          Search
        </button>
        <button className="bottom-nav-btn" type="button" onClick={() => setView("create")}>
          <div className="create-circle">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </div>
        </button>
        <button className={view === "notifications" ? "bottom-nav-btn active" : "bottom-nav-btn"} type="button" onClick={() => setView("notifications")}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
          Inbox
        </button>
        <button className={view === "settings" ? "bottom-nav-btn active" : "bottom-nav-btn"} type="button" onClick={() => setView("settings")}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          You
        </button>
      </nav>

      <section className="app-grid">
        <aside className="left-rail">
          <div className="rail-card">
            <div className="rail-title">Communities</div>
            <div className="subreddit-list">
              {subreddits.map((item) => (
                <button
                  key={item.id}
                  className={post.subreddit === item.name ? "subreddit-pill active" : "subreddit-pill"}
                  type="button"
                  onClick={() => setPost((current) => ({ ...current, subreddit: item.name }))}
                >
                  r/{item.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="main-column">
          {view === "feed" ? (
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
              {postStatus.message ? <div className={`feedback ${postStatus.type}`}>{postStatus.message}</div> : null}
              {postsLoading ? (
                <div className="empty-preview">Loading posts...</div>
              ) : posts.length ? (
                <div className="posts-feed">
                  {posts.map((item) => (
                    <article className="feed-card" key={item.id} id={`post-${item.id}`}>
                      {/* Post header: avatar + community + author */}
                      <div className="post-header">
                        <div className="post-community-avatar">
                          {item.subreddit?.charAt(0).toUpperCase()}
                        </div>
                        <div className="post-meta-col">
                          <div className="post-meta-top">
                            <span className="community-name">r/{item.subreddit}</span>
                          </div>
                          <div className="post-meta-bottom">
                            <span>Posted by u/{item.authorName}</span>
                          </div>
                        </div>
                      </div>
                      <p className="post-caption">{item.caption}</p>
                      {item.imageUrl ? <img className="post-image" src={item.imageUrl} alt="Post" /> : null}
                      <div className="post-actions">
                        {/* Vote cluster */}
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
                        {/* Comments */}
                        <button
                          className={openComments[item.id] ? "action-button active" : "action-button"}
                          type="button"
                          onClick={() => toggleComments(item.id)}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                          {item.comments?.length || 0}
                        </button>
                        {/* Save / Bell */}
                        <button
                          className={item.savedBy?.includes(accountEmail) ? "action-button active" : "action-button"}
                          type="button"
                          onClick={() => void handleSave(item.id)}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 22a1 1 0 0 1-.5-.14L12 18.2l-5.5 3.66A1 1 0 0 1 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16a1 1 0 0 1-1 1z"/></svg>
                        </button>
                        {/* Share */}
                        <button
                          className="action-button"
                          type="button"
                          onClick={() => void handleShare(item.id)}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 3 21 10l-7 7v-4c-5 0-8 1.5-11 5 1-6 4-11 11-12V3Z"/></svg>
                          Share
                        </button>
                        {/* Delete if own post */}
                        {item.authorEmail === accountEmail ? (
                          <button className="action-button delete" type="button" onClick={() => void handleDelete(item.id)}>
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z"/></svg>
                          </button>
                        ) : null}
                      </div>
                      {openComments[item.id] ? (
                        <>
                          <div className="comment-box">
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
                            <button
                              type="button"
                              onClick={() => void handleCommentSubmit(item.id)}
                            >
                              Add Comment
                            </button>
                          </div>
                          {item.comments?.length ? (
                            <div className="comment-list">
                              {item.comments.map((comment) => (
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
          ) : null}

          {view === "create" ? (
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
                    {subreddits.map((item) => (
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
          ) : null}

          {view === "subreddits" ? (
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
                {subreddits.map((item) => (
                  <article className="community-card" key={item.id}>
                    <div className="community-handle">r/{item.name}</div>
                    <h3>{item.title}</h3>
                    <p>{item.description || "No description added yet."}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {view === "search" ? (
            <div className="content-card">
              <div className="section-head" style={{ padding: 0, marginBottom: 14 }}>
                <h1>Search</h1>
              </div>
              <div className="search-box" style={{ marginBottom: 14 }}>
                <input
                  type="text"
                  placeholder="Search posts, communities..."
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {headerSearch.trim() ? (
                <div className="posts-feed">
                  {posts.filter(p =>
                    p.caption?.toLowerCase().includes(headerSearch.toLowerCase()) ||
                    p.subreddit?.toLowerCase().includes(headerSearch.toLowerCase())
                  ).map(item => (
                    <article className="feed-card" key={item.id}>
                      <div className="post-header">
                        <div className="post-community-avatar">{item.subreddit?.charAt(0).toUpperCase()}</div>
                        <div className="post-meta-col">
                          <div className="post-meta-top"><span className="community-name">r/{item.subreddit}</span></div>
                          <div className="post-meta-bottom"><span>u/{item.authorName}</span></div>
                        </div>
                      </div>
                      <p className="post-caption">{item.caption}</p>
                      {item.imageUrl ? <img className="post-image" src={item.imageUrl} alt="Post" /> : null}
                    </article>
                  ))}
                  {posts.filter(p =>
                    p.caption?.toLowerCase().includes(headerSearch.toLowerCase()) ||
                    p.subreddit?.toLowerCase().includes(headerSearch.toLowerCase())
                  ).length === 0 && <div className="search-empty">No results for "{headerSearch}"</div>}
                </div>
              ) : (
                <div className="search-empty">Type something to search...</div>
              )}
            </div>
          ) : null}
        </section>

        <aside className="right-rail">
          <div className="rail-card">
            <div className="rail-title">Member Search</div>
            <label className="search-box">
              <input
                type="text"
                placeholder="Search members"
                value={memberSearch}
                onChange={(event) => {
                  const value = event.target.value;
                  setMemberSearch(value);
                  void searchMembers(value);
                }} 
              />
            </label>
            {membersLoading ? (
              <div className="search-empty">Searching members...</div>
            ) : members.length ? (
              <div className="member-list">
                {members.map((member) => (
                  <div className="member-card" key={member.id}>
                    <div className="member-avatar">{member.name.charAt(0)}</div>
                    <div>
                      <div className="member-name">{member.name}</div>
                      <div className="member-email">{member.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="search-empty">No matching members found.</div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
