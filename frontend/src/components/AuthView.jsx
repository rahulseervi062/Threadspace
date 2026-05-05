import React from "react";

export function AuthView({
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
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="login-panel" style={{ maxWidth: "360px", padding: "32px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Reset your password</h2>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px" }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "12px", textTransform: "uppercase" }}>Email address</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </label>
              <button className="post-button" type="submit" disabled={forgotStatus.loading}>
                {forgotStatus.loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
            {forgotStatus.message ? (
              <div className={`feedback ${forgotStatus.type}`} style={{ marginTop: "1rem" }}>{forgotStatus.message}</div>
            ) : null}
            <button
              type="button"
              style={{ marginTop: "1.5rem", background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", padding: 0, fontWeight: 600 }}
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
