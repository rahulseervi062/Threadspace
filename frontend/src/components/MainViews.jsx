function MessagesView({ conversations, openConversation, getMessagePreview, unreadConversationCount }) {
  return (
    <div className="content-card">
      <div className="section-head" style={{ marginBottom: 14 }}>
        <div>
          <h1>Messages</h1>
          <p>{unreadConversationCount ? `${unreadConversationCount} unread conversation${unreadConversationCount === 1 ? "" : "s"}` : "All caught up for now."}</p>
        </div>
      </div>
      {conversations.length === 0 ? (
        <div className="search-empty">No conversations yet. Find someone and send a message!</div>
      ) : (
        <div className="member-list">
          {(Array.isArray(conversations) ? conversations : []).map((conv) => (
            <div
              key={conv.otherEmail}
              className="member-card"
              style={{ cursor: "pointer", borderLeft: conv.unread > 0 ? "3px solid var(--accent)" : "none" }}
              onClick={() => void openConversation(conv.otherEmail, conv.otherName)}
            >
              <div className="member-avatar">{conv.otherName?.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div className="member-name">{conv.otherName}</div>
                <div className="member-email">{getMessagePreview(conv.messages?.[conv.messages.length - 1] || conv).slice(0, 40)}</div>
              </div>
              {conv.unread > 0 ? (
                <div style={{ background: "var(--accent)", color: "#fff", borderRadius: "999px", padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700 }}>
                  {conv.unread}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadView({
  activeConvName,
  accountEmail,
  threadMessages,
  loadConversations,
  setView,
  messagesEndRef,
  msgError,
  mediaPreview,
  mediaFile,
  clearMedia,
  fileInputRef,
  handleMediaSelect,
  msgLoading,
  mediaUploading,
  msgDraft,
  setMsgDraft,
  sendMessage
}) {
  return (
    <div className="content-card" style={{ display: "flex", flexDirection: "column", minHeight: "80vh" }}>
      <div className="section-head" style={{ marginBottom: 14 }}>
        <button className="action-button" type="button" onClick={() => { void loadConversations(); setView("messages"); }}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Back
        </button>
        <h1 style={{ fontSize: "1rem", display: "flex", flexDirection: "column", gap: 2 }}>
          <span>
            <div className="member-avatar" style={{ display: "inline-grid", width: 28, height: 28, fontSize: "0.8rem", marginRight: 8, verticalAlign: "middle" }}>
              {activeConvName?.charAt(0).toUpperCase()}
            </div>
            {activeConvName}
          </span>
          <span style={{ fontSize: "11px", color: "#22c55e", display: "flex", alignItems: "center", gap: 4, marginLeft: 36 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Online
          </span>
        </h1>
      </div>
      <div style={{ flex: 1, display: "grid", gap: 10, marginBottom: 14, maxHeight: "60vh", overflowY: "auto", padding: "4px 0" }}>
        {threadMessages.length === 0 ? (
          <div className="search-empty">No messages yet. Say hi!</div>
        ) : (
          (Array.isArray(threadMessages) ? threadMessages : []).map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.fromEmail === accountEmail ? "flex-end" : "flex-start"
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: msg.mediaUrl && !msg.text ? "4px" : "10px 14px",
                  borderRadius: msg.fromEmail === accountEmail ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.fromEmail === accountEmail ? "var(--accent)" : "var(--bg-3)",
                  color: msg.fromEmail === accountEmail ? "#fff" : "var(--text)",
                  fontSize: "0.92rem",
                  lineHeight: 1.4,
                  overflow: "hidden"
                }}
              >
                {msg.mediaUrl && msg.mediaType === "video" ? (
                  <video
                    src={msg.mediaUrl}
                    controls
                    style={{ display: "block", maxWidth: "100%", maxHeight: 280, borderRadius: 14 }}
                  />
                ) : msg.mediaUrl ? (
                  <img
                    src={msg.mediaUrl}
                    alt="media"
                    style={{ display: "block", maxWidth: "100%", maxHeight: 280, borderRadius: 14, cursor: "pointer" }}
                    onClick={() => window.open(msg.mediaUrl, "_blank")}
                  />
                ) : null}
                {msg.text ? <span style={{ display: msg.mediaUrl ? "block" : "inline", marginTop: msg.mediaUrl ? 6 : 0 }}>{msg.text}</span> : null}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 3, padding: "0 4px" }}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        {msgError ? (
          <div className="feedback error" style={{ marginBottom: 8 }}>{msgError}</div>
        ) : null}
        {mediaPreview ? (
          <div style={{ position: "relative", display: "inline-block", marginBottom: 8 }}>
            {mediaFile?.type.startsWith("video") ? (
              <video src={mediaPreview} style={{ maxHeight: 120, maxWidth: 200, borderRadius: 12 }} />
            ) : (
              <img src={mediaPreview} alt="preview" style={{ maxHeight: 120, maxWidth: 200, borderRadius: 12, objectFit: "cover" }} />
            )}
            <button
              type="button"
              onClick={clearMedia}
              style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", border: 0, background: "#ff4444", color: "#fff", cursor: "pointer", fontSize: 14, display: "grid", placeItems: "center", lineHeight: 1 }}
            >
              x
            </button>
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,image/gif,video/*"
            style={{ display: "none" }}
            onChange={handleMediaSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={msgLoading || mediaUploading}
            title="Attach image, GIF or video"
            style={{
              width: 44, height: 44, border: "1px solid var(--border)", borderRadius: "999px",
              background: "var(--bg-3)", color: "var(--muted)",
              display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
          </button>
          <textarea
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 20,
              border: "1px solid var(--border)", background: "var(--bg-3)",
              color: "var(--text)", resize: "none", minHeight: 44, maxHeight: 120,
              fontSize: "0.92rem", outline: "none"
            }}
            placeholder={mediaUploading ? "Uploading..." : `Message ${activeConvName}...`}
            value={msgDraft}
            onChange={(e) => setMsgDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={msgLoading || mediaUploading || (!msgDraft.trim() && !mediaFile)}
            style={{
              width: 44, height: 44, border: 0, borderRadius: "999px",
              background: (msgDraft.trim() || mediaFile) ? "var(--accent)" : "var(--bg-3)",
              color: (msgDraft.trim() || mediaFile) ? "#fff" : "var(--muted)",
              display: "grid", placeItems: "center", cursor: "pointer",
              flexShrink: 0, transition: "background 0.15s"
            }}
          >
            {mediaUploading
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ profileUser, accountEmail, setView, openConversation }) {
  return (
    <div className="content-card">
      <div className="section-head" style={{ marginBottom: 14 }}>
        <button className="action-button" type="button" onClick={() => setView("feed")}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Back
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 0" }}>
        <div className="member-avatar" style={{ width: 72, height: 72, fontSize: "2rem" }}>{profileUser.name?.charAt(0).toUpperCase()}</div>
        <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{profileUser.name}</div>
        <div style={{ color: "var(--muted)", fontSize: "0.88rem" }}>{profileUser.email}</div>
        {profileUser.email !== accountEmail ? (
          <button
            className="post-button"
            type="button"
            onClick={() => void openConversation(profileUser.email, profileUser.name)}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            Send Message
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SearchView({ headerSearch, setHeaderSearch, searchLoading, searchError, searchResults, openUserProfile }) {
  const hasPosts = searchResults.posts.length > 0;
  const hasSubreddits = searchResults.subreddits.length > 0;
  const hasUsers = searchResults.users.length > 0;

  return (
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
        searchLoading ? (
          <div className="search-empty">Searching...</div>
        ) : searchError ? (
          <div className="feedback error">{searchError}</div>
        ) : hasPosts || hasSubreddits || hasUsers ? (
          <div className="posts-feed">
            {hasPosts ? (
              <>
                <div className="rail-title">Posts</div>
                {searchResults.posts.map((item) => (
                  <article className="feed-card" key={`post-${item.id}`}>
                    <div className="post-header">
                      <div className="post-community-avatar">{item.subreddit?.charAt(0).toUpperCase()}</div>
                      <div className="post-meta-col">
                        <div className="post-meta-top"><span className="community-name">r/{item.subreddit}</span></div>
                        <div className="post-meta-bottom">
                          <span style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => void openUserProfile(item.authorEmail, item.authorName)}>
                            u/{item.authorName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="post-caption">{item.caption}</p>
                    {item.imageUrl ? <img className="post-image" src={item.imageUrl} alt="Post" /> : null}
                  </article>
                ))}
              </>
            ) : null}

            {hasSubreddits ? (
              <>
                <div className="rail-title">Communities</div>
                {searchResults.subreddits.map((item) => (
                  <article className="community-card" key={`subreddit-${item.id}`}>
                    <div className="community-handle">r/{item.name}</div>
                    <h3>{item.title}</h3>
                    <p>{item.description || "No description added yet."}</p>
                  </article>
                ))}
              </>
            ) : null}

            {hasUsers ? (
              <>
                <div className="rail-title">People</div>
                {searchResults.users.map((user) => (
                  <div
                    className="member-card"
                    key={`user-${user.id}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => void openUserProfile(user.email, user.name)}
                  >
                    <div className="member-avatar">{user.name?.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div className="member-name">{user.name}</div>
                      <div className="member-email">{user.email}</div>
                    </div>
                    <div style={{ color: "var(--accent)", fontSize: "0.8rem", fontWeight: 700 }}>Open</div>
                  </div>
                ))}
              </>
            ) : null}
          </div>
        ) : (
          <div className="search-empty">No results for "{headerSearch}"</div>
        )
      ) : (
        <div className="search-empty">Type something to search...</div>
      )}
    </div>
  );
}

function MemberSearchRail({ memberSearch, setMemberSearch, searchMembers, membersLoading, members, openUserProfile }) {
  return (
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
            {(Array.isArray(members) ? members : []).map((member) => (
              <div className="member-card" key={member.id} style={{ cursor: "pointer" }} onClick={() => void openUserProfile(member.email, member.name)}>
                <div className="member-avatar">{member.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div className="member-name">{member.name}</div>
                  <div className="member-email">{member.email}</div>
                </div>
                <div style={{ color: "var(--accent)", fontSize: "0.8rem", fontWeight: 700 }}>Message -&gt;</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="search-empty">No matching members found.</div>
        )}
      </div>
    </aside>
  );
}

export { MemberSearchRail, MessagesView, ProfileView, SearchView, ThreadView };
