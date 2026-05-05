import React from "react";

export function SettingsView({
  accountName,
  accountEmail,
  onSignOut,
  profileForm,
  setProfileForm,
  handleProfileSave,
  handleAvatarUpload,
  profileStatus,
  accountProfile
}) {
  return (
    <div className="content-card">
      <div className="section-head" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem" }}>Settings</h1>
          <p style={{ color: "var(--text-muted)" }}>Manage your account and profile information.</p>
        </div>
        <button className="action-button" style={{ color: "var(--danger)", border: "1px solid var(--danger)" }} type="button" onClick={onSignOut}>
          Sign Out
        </button>
      </div>

      <div style={{ display: "grid", gap: 24 }}>
        <section style={{ padding: "24px", background: "var(--bg-dark)", borderRadius: "14px", border: "1px solid var(--border)" }}>
          <h3 style={{ marginBottom: 20, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 10 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            Public Profile
          </h3>
          
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
            <div style={{ position: "relative" }}>
              {accountProfile.avatar ? (
                <img src={accountProfile.avatar} alt="avatar" style={{ width: 80, height: 80, borderRadius: "20px", objectFit: "cover", border: "2px solid var(--accent)" }} />
              ) : (
                <div className="post-community-avatar" style={{ width: 80, height: 80, borderRadius: "20px", fontSize: "2rem" }}>
                  {accountName?.charAt(0).toUpperCase()}
                </div>
              )}
              <label style={{ position: "absolute", bottom: -8, right: -8, background: var(--accent), width: 32, height: 32, borderRadius: "10px", display: "grid", placeItems: "center", cursor: "pointer", border: "3px solid var(--bg-card)" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-3.2-5c0 1.77 1.43 3.2 3.2 3.2s3.2-1.43 3.2-3.2-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2z"/></svg>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
              </label>
            </div>
            <div>
              <h4 style={{ fontSize: "1.1rem", marginBottom: 4 }}>{accountName}</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{accountEmail}</p>
            </div>
          </div>

          <form className="settings-grid" onSubmit={handleProfileSave}>
            <label>
              <span>Full Name</span>
              <input value={profileForm.name} onChange={(e) => setProfileForm((current) => ({ ...current, name: e.target.value }))} />
            </label>
            <label>
              <span>Username</span>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--accent)", fontWeight: 700 }}>u/</span>
                <input style={{ paddingLeft: 34 }} value={profileForm.username} onChange={(e) => setProfileForm((current) => ({ ...current, username: e.target.value }))} />
              </div>
            </label>
            <label>
              <span>Phone Number</span>
              <input value={profileForm.phone} onChange={(e) => setProfileForm((current) => ({ ...current, phone: e.target.value }))} />
            </label>
            <label>
              <span>Bio</span>
              <textarea placeholder="Tell us about yourself..." value={profileForm.bio} onChange={(e) => setProfileForm((current) => ({ ...current, bio: e.target.value }))} style={{ minHeight: 100 }} />
            </label>
            <button className="post-button" type="submit" disabled={profileStatus.loading} style={{ width: "fit-content", marginTop: 8 }}>
              {profileStatus.loading ? "Saving Changes..." : "Update Profile"}
            </button>
            {profileStatus.message ? <div className={`feedback ${profileStatus.type}`} style={{ marginTop: 16 }}>{profileStatus.message}</div> : null}
          </form>
        </section>

        <section style={{ padding: "24px", background: "var(--bg-dark)", borderRadius: "14px", border: "1px solid var(--border)" }}>
          <h3 style={{ marginBottom: 16, fontSize: "1.1rem", color: "var(--danger)" }}>Danger Zone</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 20 }}>Once you sign out or delete your account, you will need to log back in to access your data.</p>
          <button className="action-button" style={{ background: "hsla(355, 100%, 65%, 0.1)", color: "var(--danger)", border: "1px solid var(--danger)" }} type="button" onClick={onSignOut}>
            Sign Out of Account
          </button>
        </section>
      </div>
    </div>
  );
}
