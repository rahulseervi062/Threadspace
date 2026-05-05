import React from "react";

export function ProfileView({
  profileUser,
  accountEmail,
  setView,
  openConversation,
  isOwnProfile,
  isFollowing,
  handleToggleUserFollow,
  isOnline
}) {
  if (!profileUser) return <div className="content-card">Loading profile...</div>;

  return (
    <div className="content-card">
      <div className="section-head" style={{ marginBottom: 24 }}>
        <button className="action-button" type="button" onClick={() => setView("feed")}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Back to Feed
        </button>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "20px 0" }}>
        <div style={{ position: "relative", marginBottom: 20 }}>
          {profileUser.avatar ? (
            <img src={profileUser.avatar} alt={profileUser.name} style={{ width: 120, height: 120, borderRadius: "30px", objectFit: "cover", border: "4px solid var(--bg-dark)", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }} />
          ) : (
            <div className="post-community-avatar" style={{ width: 120, height: 120, borderRadius: "30px", fontSize: "3rem" }}>{profileUser.name?.charAt(0).toUpperCase()}</div>
          )}
          {isOnline && <div style={{ position: "absolute", bottom: 8, right: 8, width: 20, height: 20, borderRadius: "50%", background: "var(--success)", border: "4px solid var(--bg-card)" }} />}
        </div>
        
        <h1 style={{ fontSize: "1.8rem", marginBottom: 4 }}>{profileUser.name}</h1>
        {profileUser.username && <div style={{ color: "var(--accent)", fontSize: "1.1rem", fontWeight: 700, marginBottom: 8 }}>u/{profileUser.username}</div>}
        <div style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: 16 }}>{profileUser.email}</div>
        
        {profileUser.bio && <p style={{ color: "var(--text-main)", fontSize: "1rem", maxWidth: 500, lineHeight: 1.6, marginBottom: 24 }}>{profileUser.bio}</p>}
        
        <div style={{ display: "flex", gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{(profileUser.followers || []).length}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Followers</div>
          </div>
          <div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{(profileUser.following || []).length}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Following</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {!isOwnProfile && (
            <>
              <button className={isFollowing ? "action-button active" : "post-button"} type="button" onClick={() => void handleToggleUserFollow(profileUser)} style={{ padding: "12px 24px" }}>
                {isFollowing ? "Unfollow" : "Follow User"}
              </button>
              <button
                className="post-button"
                type="button"
                onClick={() => void openConversation(profileUser.email, profileUser.name)}
                style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-elevated)", color: "var(--text-main)", border: "1px solid var(--border)", padding: "12px 24px" }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                Message
              </button>
            </>
          )}
        </div>
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
        <h1 style={{ fontSize: "1.8rem" }}>Global Search</h1>
      </div>
      <div className="search-box" style={{ marginBottom: 32 }}>
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input
            type="text"
            placeholder="Search for people, posts, or communities..."
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            style={{ paddingLeft: 48, height: 54, fontSize: "1.05rem" }}
            autoFocus
          />
        </div>
      </div>

      {headerSearch.trim() ? (
        searchLoading ? (
          <div className="search-empty" style={{ padding: "40px 0" }}>Searching Threadspace...</div>
        ) : searchError ? (
          <div className="feedback error">{searchError}</div>
        ) : hasPosts || hasSubreddits || hasUsers ? (
          <div className="feed-page" style={{ gap: 32 }}>
            {hasPosts && (
              <section>
                <div className="rail-title" style={{ marginBottom: 16 }}>Posts</div>
                <div style={{ display: "grid", gap: 12 }}>
                  {searchResults.posts.map((item) => (
                    <article className="feed-card" key={`post-${item.id}`} onClick={() => openPost(item.id)} style={{ cursor: "pointer", padding: "16px" }}>
                      <div className="post-header" style={{ marginBottom: 12 }}>
                        <div className="post-community-avatar" style={{ width: 32, height: 32, borderRadius: "8px" }}>{item.subreddit?.charAt(0).toUpperCase()}</div>
                        <div className="post-meta-col">
                          <span className="community-name" style={{ fontSize: "0.85rem" }}>r/{item.subreddit}</span>
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
                <div className="rail-title" style={{ marginBottom: 16 }}>Communities</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {searchResults.subreddits.map((item) => (
                    <article className="community-card" key={`subreddit-${item.id}`} onClick={() => openCommunity(item.name)} style={{ cursor: "pointer", padding: "16px", margin: 0 }}>
                      <div className="community-handle" style={{ fontSize: "0.85rem" }}>r/{item.name}</div>
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
           <p>Type something to explore Threadspace</p>
        </div>
      )}
    </div>
  );
}

export function MemberSearchRail({ memberSearch, setMemberSearch, searchMembers, membersLoading, members, openUserProfile }) {
  return (
    <aside className="right-rail">
      <div className="rail-card" style={{ padding: "24px" }}>
        <div className="rail-title">Find Members</div>
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
