import React from "react";

function getFirstPostMedia(post) {
  const images = Array.isArray(post?.images) && post.images.length ? post.images : post?.imageUrl ? [post.imageUrl] : [];
  return images[0] || "";
}

export function ProfileView({
  profileUser,
  accountEmail,
  setView,
  openConversation,
  isOwnProfile,
  isFollowing,
  handleToggleUserFollow,
  isOnline,
  userPosts = [],
  savedPosts = [],
  blockedUsers = [],
  handleBlockUser
}) {
  const [tab, setTab] = React.useState("posts");

  // Compute heatmap (last 30 days)
  const heatmapDays = React.useMemo(() => {
    const days = [];
    const now = new Date();
    // Normalize to midnight
    now.setHours(0,0,0,0);
    
    // Group posts by date string "YYYY-MM-DD"
    const postCounts = {};
    userPosts.forEach(post => {
      if (post.createdAt) {
        const d = new Date(post.createdAt);
        const key = d.toISOString().split('T')[0];
        postCounts[key] = (postCounts[key] || 0) + 1;
      }
    });

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ date: key, count: postCounts[key] || 0 });
    }
    return days;
  }, [userPosts]);

  if (!profileUser) return <div className="profile-empty-state"><div className="profile-empty-text">Loading profile...</div></div>;
  const isBlocked = blockedUsers.includes(profileUser.email);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header action bar */}
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <button className="action-button" type="button" onClick={() => setView("feed")} style={{ gap: 8, padding: "8px 16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Feed
        </button>
      </div>

      {/* Profile banner */}
      <div className="profile-banner-container">
        {profileUser.banner ? (
          <img src={profileUser.banner} alt="Profile banner" className="profile-banner-img" />
        ) : null}
      </div>

      {/* Grid Layout */}
      <div className="profile-layout-grid">
        {/* Left column: Sidebar Card */}
        <aside className="profile-sidebar-card">
          {/* Avatar with Status badge */}
          <div className="profile-avatar-wrap">
            {profileUser.avatar ? (
              <img src={profileUser.avatar} alt={profileUser.name} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-fallback">
                {profileUser.name?.charAt(0).toUpperCase()}
              </div>
            )}
            {isOnline && <div className="profile-status-badge pulse" title="Online" />}
          </div>

          {/* User basic details */}
          <div className="profile-info-section">
            <h1 className="profile-info-name">{profileUser.name}</h1>
            {profileUser.username && <div className="profile-info-username">@{profileUser.username}</div>}
            <div className="profile-info-email">{profileUser.email}</div>
          </div>

          {/* Bio */}
          {profileUser.bio ? (
            <p className="profile-bio">{profileUser.bio}</p>
          ) : (
            <p className="profile-bio" style={{ opacity: 0.5, fontStyle: "italic" }}>No bio added yet.</p>
          )}

          {/* Follower stats */}
          <div className="profile-stats-row">
            <div className="profile-stat-col">
              <div className="profile-stat-value">{(profileUser.followers || []).length}</div>
              <div className="profile-stat-label">Followers</div>
            </div>
            <div className="profile-stat-col">
              <div className="profile-stat-value">{(profileUser.following || []).length}</div>
              <div className="profile-stat-label">Following</div>
            </div>
          </div>

          {/* Actions */}
          <div className="profile-actions-wrap">
            {!isOwnProfile ? (
              <>
                <button
                  className={`profile-action-btn ${isFollowing ? "secondary" : "primary"}`}
                  type="button"
                  onClick={() => void handleToggleUserFollow(profileUser)}
                >
                  {isFollowing ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 11h6"/></svg>
                      Unfollow
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M17 11h6"/></svg>
                      Follow
                    </>
                  )}
                </button>
                <button
                  className="profile-action-btn secondary"
                  type="button"
                  onClick={() => void openConversation(profileUser.email, profileUser.name)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Send Message
                </button>
                <button
                  className="profile-action-btn danger-outline"
                  type="button"
                  onClick={() => void handleBlockUser?.(profileUser.email)}
                >
                  {isBlocked ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
                      Unblock User
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
                      Block User
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                className="profile-action-btn secondary"
                type="button"
                onClick={() => setView("settings")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Edit Settings
              </button>
            )}
          </div>
        </aside>

        {/* Right column: Main Area */}
        <main className="profile-main-area">
          {/* Activity Heatmap Card */}
          <div className="profile-heatmap-card">
            <div className="profile-heatmap-title">30-Day Activity</div>
            <div className="profile-heatmap-grid">
              {heatmapDays.map((day, i) => {
                let bg = "var(--bg-dark)";
                if (day.count > 0) bg = "hsla(172, 78%, 50%, 0.3)";
                if (day.count > 2) bg = "hsla(172, 78%, 50%, 0.6)";
                if (day.count > 4) bg = "hsla(172, 78%, 50%, 1)";
                return (
                  <div 
                    key={i} 
                    className="profile-heatmap-cell"
                    title={`${day.count} posts on ${day.date}`} 
                    style={{ backgroundColor: bg }} 
                  />
                );
              })}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="profile-tabs-nav">
            <button
              className={`profile-tab-pill ${tab === "posts" ? "active" : ""}`}
              type="button"
              onClick={() => setTab("posts")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
              Grid
            </button>
            {isOwnProfile && (
              <button
                className={`profile-tab-pill ${tab === "saved" ? "active" : ""}`}
                type="button"
                onClick={() => setTab("saved")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                Saved
              </button>
            )}
            <button
              className={`profile-tab-pill ${tab === "about" ? "active" : ""}`}
              type="button"
              onClick={() => setTab("about")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              About
            </button>
            <button
              className={`profile-tab-pill ${tab === "followers" ? "active" : ""}`}
              type="button"
              onClick={() => setTab("followers")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Followers
            </button>
            <button
              className={`profile-tab-pill ${tab === "following" ? "active" : ""}`}
              type="button"
              onClick={() => setTab("following")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 9l-3 3-2-2"/></svg>
              Following
            </button>
          </nav>

          {/* Tab Content */}
          <div style={{ animation: "cardFadeIn 0.3s ease-out both" }}>
            {tab === "posts" && (
              <div className="profile-grid-list">
                {userPosts.length ? (
                  <div className="profile-media-grid">
                    {userPosts.map((post) => {
                      const media = getFirstPostMedia(post);
                      return (
                        <article className="profile-media-tile" key={post.id}>
                          {media ? (
                            post.mediaType === "video" ? <video src={media} muted /> : <img src={media} alt="" />
                          ) : (
                            <div className="profile-text-tile">{post.caption}</div>
                          )}
                          <div className="profile-tile-overlay">
                            <span>#{post.subreddit}</span>
                            <span>{post.likes || 0} likes</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="profile-empty-state">
                    <svg className="profile-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                    <div className="profile-empty-text">No posts yet</div>
                    <div className="profile-empty-subtext">This creator has not shared any drops.</div>
                  </div>
                )}
              </div>
            )}

            {tab === "saved" && isOwnProfile && (
              <div className="profile-grid-list">
                {savedPosts.length ? (
                  savedPosts.map((post) => (
                    <article className="profile-feed-card" key={post.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className="community-name">#{post.subreddit}</div>
                        {post.createdAt && (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {new Date(post.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <p className="post-caption" style={{ marginBottom: 0 }}>{post.caption}</p>
                    </article>
                  ))
                ) : (
                  <div className="profile-empty-state">
                    <svg className="profile-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    <div className="profile-empty-text">No saved posts</div>
                    <div className="profile-empty-subtext">Bookmarks you save will show up here.</div>
                  </div>
                )}
              </div>
            )}

            {tab === "about" && (
              <div className="profile-sub-grid">
                <div className="profile-about-card">
                  <div className="profile-about-val">{profileUser.karma || 0}</div>
                  <div className="profile-about-lbl">Pulse Score</div>
                </div>
                <div className="profile-about-card">
                  <div className="profile-about-val">{(profileUser.followingSubreddits || []).length}</div>
                  <div className="profile-about-lbl">Joined Circles</div>
                </div>
                <div className="profile-about-card">
                  <div className="profile-about-val">
                    {profileUser.createdAt ? new Date(profileUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "Recently"}
                  </div>
                  <div className="profile-about-lbl">Member Since</div>
                </div>
              </div>
            )}

            {tab === "followers" && (
              <div className="profile-sub-grid">
                {(profileUser.followers || []).length ? (
                  profileUser.followers.map((follower) => (
                    <div className="profile-member-card" key={follower}>
                      <div className="member-avatar">
                        {String(follower).charAt(0).toUpperCase()}
                      </div>
                      <div className="member-name" style={{ fontSize: "0.92rem", wordBreak: "break-all" }}>
                        {follower}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="profile-empty-state" style={{ gridColumn: "1 / -1" }}>
                    <svg className="profile-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <div className="profile-empty-text">No followers yet</div>
                    <div className="profile-empty-subtext">When other users follow this profile, they will list here.</div>
                  </div>
                )}
              </div>
            )}

            {tab === "following" && (
              <div className="profile-sub-grid">
                {(profileUser.following || []).length ? (
                  profileUser.following.map((following) => (
                    <div className="profile-member-card" key={following}>
                      <div className="member-avatar">
                        {String(following).charAt(0).toUpperCase()}
                      </div>
                      <div className="member-name" style={{ fontSize: "0.92rem", wordBreak: "break-all" }}>
                        {following}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="profile-empty-state" style={{ gridColumn: "1 / -1" }}>
                    <svg className="profile-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 9l-3 3-2-2"/></svg>
                    <div className="profile-empty-text">Not following anyone</div>
                    <div className="profile-empty-subtext">Users this account follows will display here.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export function SearchView({ headerSearch, setHeaderSearch, searchLoading, searchError, searchResults, openUserProfile, openPost, openCommunity }) {
  const hasPosts = searchResults.posts.length > 0;
  const hasSubreddits = searchResults.subreddits.length > 0;
  const hasUsers = searchResults.users.length > 0;

  return (
    <div className="content-card">
      <div className="section-head" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.8rem" }}>Explore</h1>
      </div>
      <div className="search-box" style={{ marginBottom: 32 }}>
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input
            type="text"
            placeholder="Search people, drops, circles, or channels..."
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            style={{ paddingLeft: 48, height: 54, fontSize: "1.05rem" }}
            autoFocus
          />
        </div>
      </div>

      {headerSearch.trim() ? (
        searchLoading ? (
          <div className="search-empty" style={{ padding: "40px 0" }}>Searching Pulse...</div>
        ) : searchError ? (
          <div className="feedback error">{searchError}</div>
        ) : hasPosts || hasSubreddits || hasUsers ? (
          <div className="feed-page" style={{ gap: 32 }}>
            {hasPosts && (
              <section>
                <div className="rail-title" style={{ marginBottom: 16 }}>Drops</div>
                <div style={{ display: "grid", gap: 12 }}>
                  {searchResults.posts.map((item) => (
                    <article className="feed-card" key={`post-${item.id}`} onClick={() => openPost(item.id)} style={{ cursor: "pointer", padding: "16px" }}>
                      <div className="post-header" style={{ marginBottom: 12 }}>
                        <div className="post-community-avatar" style={{ width: 32, height: 32, borderRadius: "8px" }}>{item.subreddit?.charAt(0).toUpperCase()}</div>
                        <div className="post-meta-col">
                          <span className="community-name" style={{ fontSize: "0.85rem" }}>#{item.subreddit}</span>
                        </div>
                      </div>
                      <p className="post-caption" style={{ fontSize: "0.95rem", marginBottom: 0 }}>{item.caption}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {hasSubreddits && (
              <section>
                <div className="rail-title" style={{ marginBottom: 16 }}>Circles</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {searchResults.subreddits.map((item) => (
                    <article className="community-card" key={`subreddit-${item.id}`} onClick={() => openCommunity(item.name)} style={{ cursor: "pointer", padding: "16px", margin: 0 }}>
                      <div className="community-handle" style={{ fontSize: "0.85rem" }}>#{item.name}</div>
                      <h3 style={{ fontSize: "1rem", margin: "4px 0" }}>{item.title}</h3>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {hasUsers && (
              <section>
                <div className="rail-title" style={{ marginBottom: 16 }}>People</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {searchResults.users.map((user) => (
                    <div
                      className="member-card"
                      key={`user-${user.id}`}
                      style={{ cursor: "pointer", padding: "12px", background: "var(--bg-dark)", border: "1px solid var(--border)" }}
                      onClick={() => void openUserProfile(user.email, user.name)}
                    >
                      <div className="member-avatar" style={{ width: 40, height: 40 }}>{user.name?.charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div className="member-name" style={{ fontSize: "0.95rem" }}>{user.name}</div>
                        <div className="member-email" style={{ fontSize: "0.8rem" }}>{user.email}</div>
                      </div>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--accent)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="search-empty" style={{ padding: "40px 0" }}>No results found for "{headerSearch}"</div>
        )
      ) : (
        <div className="search-empty" style={{ padding: "60px 0", opacity: 0.5 }}>
           <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style={{ marginBottom: 16 }}><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
           <p>Type something to explore Pulse</p>
        </div>
      )}
    </div>
  );
}

export function MemberSearchRail({ memberSearch, setMemberSearch, searchMembers, membersLoading, members, openUserProfile }) {
  return (
    <aside className="right-rail">
      <div className="rail-card" style={{ padding: "24px" }}>
        <div className="rail-title">People</div>
        <div className="search-box" style={{ marginBottom: 20 }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search people..."
              value={memberSearch}
              onChange={(event) => {
                const value = event.target.value;
                setMemberSearch(value);
                void searchMembers(value);
              }}
              style={{ paddingLeft: 38, height: 42, fontSize: "0.9rem", borderRadius: "12px" }}
            />
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </div>
        </div>
        
        {membersLoading ? (
          <div className="search-empty" style={{ fontSize: "0.85rem" }}>Loading...</div>
        ) : members.length ? (
          <div className="member-list" style={{ gap: 8 }}>
            {(Array.isArray(members) ? members : []).map((member) => (
              <div 
                className="member-card" 
                key={member.id} 
                style={{ cursor: "pointer", padding: "10px", borderRadius: "10px", border: "1px solid transparent" }} 
                onClick={() => void openUserProfile(member.email, member.name)}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}
              >
                <div className="member-avatar" style={{ width: 34, height: 34, fontSize: "0.85rem" }}>{member.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div className="member-name" style={{ fontSize: "0.88rem" }}>{member.name}</div>
                </div>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--text-muted)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
              </div>
            ))}
          </div>
        ) : (
          <div className="search-empty" style={{ fontSize: "0.85rem" }}>No results.</div>
        )}
      </div>
    </aside>
  );
}

export function ModerationView({ reports = [], loading, loadReports, openPost }) {
  React.useEffect(() => {
    void loadReports?.();
  }, [loadReports]);

  return (
    <div className="content-card">
      <div className="section-head">
        <div>
          <h1 style={{ fontSize: "1.8rem" }}>Moderation</h1>
          <p style={{ color: "var(--text-muted)" }}>Review reported posts and comments.</p>
        </div>
        <button className="action-button" type="button" onClick={() => void loadReports?.()}>Refresh</button>
      </div>

      {loading ? (
        <div className="search-empty">Loading reports...</div>
      ) : reports.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {reports.map((report) => (
            <article className="feed-card" key={`${report.postId}-${report.commentId || "post"}-${report.id}`} style={{ padding: 16 }}>
              <div className="community-name">#{report.subreddit}</div>
              <p className="post-caption" style={{ margin: "8px 0" }}>{report.commentText || report.postCaption}</p>
              <div style={{ color: "var(--text-muted)", fontSize: "0.86rem" }}>
                Reported by {report.userEmail} · {report.reason}
              </div>
              <button className="post-button" type="button" onClick={() => openPost?.(report.postId)} style={{ marginTop: 12 }}>
                Open reported post
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-preview">No reports waiting for review.</div>
      )}
    </div>
  );
}
