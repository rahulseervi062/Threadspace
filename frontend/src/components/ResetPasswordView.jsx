import React from "react";

export function ResetPasswordView({ resetForm, setResetForm, handleResetPassword, resetStatus, setResetToken }) {
  return (
    <main className="page-shell">
      <section className="login-panel">
        <div className="brand-chip">Threadspace</div>
        <h1>Set a new password</h1>
        <p className="subtitle">Please enter and confirm your new security credentials below.</p>
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
            <span>Confirm New Password</span>
            <input
              type="password"
              placeholder="Repeat your new password"
              value={resetForm.confirm}
              onChange={(e) => setResetForm((f) => ({ ...f, confirm: e.target.value }))}
              required
            />
          </label>
          <button className="post-button" type="submit" disabled={resetStatus.loading} style={{ width: "100%", marginTop: 8 }}>
            {resetStatus.loading ? "Updating..." : "Secure My Account"}
          </button>
        </form>
        {resetStatus.message ? (
          <div className={`feedback ${resetStatus.type}`} style={{ marginTop: 20 }}>{resetStatus.message}</div>
        ) : null}
        <button
          type="button"
          style={{ marginTop: "1.5rem", background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", padding: 0, fontWeight: 600, width: "100%" }}
          onClick={() => { window.history.replaceState({}, "", window.location.pathname); setResetToken(""); }}
        >
          &larr; Back to login
        </button>
      </section>
    </main>
  );
}
