import React, { useState, useEffect, useRef, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast";
import "./styles.css";

// Services & Hooks
import { api } from "./services/api";
import { useAuth } from "./hooks/useAuth";
import { usePosts } from "./hooks/usePosts";
import { useMessages } from "./hooks/useMessages";
import { useSearch } from "./hooks/useSearch";

// Components
import { AuthView } from "./components/AuthView";
import { FeedView } from "./components/FeedView";
import { CreatePostView } from "./components/CreatePostView";
import { SubredditsView } from "./components/SubredditsView";
import { SettingsView } from "./components/SettingsView";
import { ResetPasswordView } from "./components/ResetPasswordView";
import { MessagesView, ThreadView } from "./components/ChatViews";
import { ProfileView, SearchView, MemberSearchRail } from "./components/MainViews";

const normalizeEmailSafe = (e) => String(e || "").toLowerCase().trim();

export default function App() {
  // --- Main Router State ---
  const [view, setView] = useState("feed");
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get("token") || "");

  // --- Modular Hooks ---
  const {
    isAuthenticated, accountName, accountEmail, authMode, setAuthMode,
    form, status, handleAuthChange, handleAuthSubmit,
    showForgotPassword, setShowForgotPassword, forgotEmail, setForgotEmail,
    handleForgotPassword, forgotStatus, setForgotStatus, signOut, setAccountName
  } = useAuth();

  const {
    posts, setPosts, postsLoading, postStatus, setPostStatus,
    subreddits, setSubreddits, followingSubreddits, setFollowingSubreddits,
    loadPosts, loadSubreddits, handleReaction, handleSave, handleDelete,
    handleToggleSubredditFollow
  } = usePosts(accountEmail);

  const {
    conversations, activeConv, activeConvName, threadMessages, loadConversations,
    openConversation, setThreadMessages
  } = useMessages(accountEmail, accountName);

  const {
    headerSearch, setHeaderSearch, searchResults, searchLoading, searchError, runSearch,
    memberSearch, setMemberSearch, members, membersLoading, searchMembers
  } = useSearch();

  // --- Local States for Post Interaction ---
  const [openComments, setOpenComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [commentErrors, setCommentErrors] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPost, setEditPost] = useState({ caption: "", subreddit: "", imageUrl: "" });
  const [post, setPost] = useState({ caption: "", imageUrl: "", subreddit: "" });

  // --- Local States for Account & Notifications ---
  const [accountProfile, setAccountProfile] = useState({});
  const [profileUser, setProfileUser] = useState(null);
  const [profileStatus, setProfileStatus] = useState({ loading: false, type: "", message: "" });
  const [profileForm, setProfileForm] = useState({ name: "", username: "", phone: "", bio: "" });
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [onlineEmails, setOnlineEmails] = useState([]);

  // --- Chat Helpers ---
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [msgDraft, setMsgDraft] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [msgError, setMsgError] = useState("");

  // --- Reset Password State ---
  const [resetForm, setResetForm] = useState({ password: "", confirm: "" });
  const [resetStatus, setResetStatus] = useState({ loading: false, type: "", message: "" });

  // --- Initial Loads & Syncs ---
  useEffect(() => {
    if (isAuthenticated) {
      loadPosts();
      loadSubreddits();
      loadConversations();
      loadAccount();
      loadNotifications();
      searchMembers("");
      
      const interval = setInterval(() => {
        loadPresence();
        loadNotifications();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadPosts, loadSubreddits, loadConversations]);

  useEffect(() => {
    if (headerSearch.trim()) {
      const timer = setTimeout(() => runSearch(headerSearch), 300);
      return () => clearTimeout(timer);
    }
  }, [headerSearch, runSearch]);

  useEffect(() => {
    if (view === "thread") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (view === "trending") loadTrendingPosts();
    if (view === "recommended") loadRecommendedPosts();
  }, [threadMessages, view, loadTrendingPosts, loadRecommendedPosts]);

  // --- API Wrappers ---
  const loadAccount = async () => {
    try {
      const data = await api.getAccount(accountEmail);
      if (data.ok) {
        setAccountProfile(data.user);
        setProfileForm({ name: data.user.name, username: data.user.username || "", phone: data.user.phone || "", bio: data.user.bio || "" });
        setFollowingSubreddits(data.user.followingSubreddits || []);
      }
    } catch (err) {}
  };

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications(accountEmail);
      if (data.ok) {
        setNotifications(data.notifications || []);
        setUnreadNotificationsCount(data.unreadCount || 0);
      }
    } catch (err) {}
  };

  const markNotificationsRead = async () => {
    try {
      await api.markNotificationsRead(accountEmail);
      setUnreadNotificationsCount(0);
    } catch (err) {}
  };

  const loadPresence = async () => {
    try {
      const data = await api.getPresence();
      if (data.ok) setOnlineEmails((data.onlineUsers || []).map(u => normalizeEmailSafe(u.email)));
    } catch (err) {}
  };

  // --- Post Handlers ---
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setPostStatus({ loading: true, type: "", message: "" });
    try {
      const data = await api.createPost({ ...post, authorName: accountName, authorEmail: accountEmail });
      if (data.ok) {
        setPosts(prev => [data.post, ...prev]);
        setPost({ caption: "", imageUrl: "", subreddit: post.subreddit });
        setPostStatus({ loading: false, type: "success", message: "Post shared!" });
        setView("feed");
      }
    } catch (err) {
      setPostStatus({ loading: false, type: "error", message: err.message });
    }
  };

  const handlePostChange = (e) => setPost(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPost(prev => ({ ...prev, imageUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleCommentSubmit = async (postId) => {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    try {
      const data = await api.addComment(postId, { text, authorName: accountName });
      if (data.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? data.post : p));
        setCommentDrafts(prev => ({ ...prev, [postId]: "" }));
      }
    } catch (err) {}
  };

  const handleReplySubmit = async (postId, commentId) => {
    const key = `${postId}-${commentId}`;
    const text = (replyDrafts[key] || "").trim();
    if (!text) return;
    try {
      const data = await api.addReply(postId, commentId, { text, authorName: accountName, authorEmail: accountEmail });
      if (data.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? data.post : p));
        setReplyDrafts(prev => ({ ...prev, [key]: "" }));
      }
    } catch (err) {}
  };

  // --- Profile & Settings Handlers ---
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileStatus({ loading: true, type: "", message: "" });
    try {
      const data = await api.updateAccount({ email: accountEmail, ...profileForm });
      if (data.ok) {
        setAccountProfile(prev => ({ ...prev, ...data.user }));
        setAccountName(data.user.name);
        localStorage.setItem("ts_name", data.user.name);
        setProfileStatus({ loading: false, type: "success", message: "Profile updated!" });
      }
    } catch (err) {
      setProfileStatus({ loading: false, type: "error", message: err.message });
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const data = await api.updateAvatar(accountEmail, reader.result);
        if (data.ok) setAccountProfile(prev => ({ ...prev, avatar: data.avatar }));
      } catch (err) {}
    };
    reader.readAsDataURL(file);
  };

  // --- Chat Handlers ---
  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setMediaPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    if (!msgDraft.trim() && !mediaFile) return;
    setMsgLoading(true);
    try {
      let mediaUrl = "";
      let mediaType = "";
      if (mediaFile) {
        setMediaUploading(true);
        const data = await api.uploadMedia(mediaFile);
        mediaUrl = data.url;
        mediaType = mediaFile.type.startsWith("video") ? "video" : "image";
        setMediaUploading(false);
      }
      const data = await api.sendMessage({
        fromEmail: accountEmail,
        fromName: accountName,
        toEmail: activeConv,
        toName: activeConvName,
        text: msgDraft.trim(),
        mediaUrl,
        mediaType
      });
      if (data.ok) {
        setMsgDraft("");
        setMediaFile(null);
        setMediaPreview("");
      }
    } catch (err) {
      setMsgError(err.message);
    } finally {
      setMsgLoading(false);
    }
  };

  // --- Navigation Helpers ---
  const openUserProfile = async (email, name) => {
    setView("profile");
    try {
      const data = await api.getAccount(email);
      if (data.ok) setProfileUser(data.user);
    } catch (err) {}
  };

  const openCommunity = (name) => {
    setSelectedCommunity(name);
    setView("feed");
  };

  // --- Derived Data ---
  const filteredFeedPosts = selectedCommunity
    ? posts.filter((item) => item.subreddit === selectedCommunity)
    : posts;
  
  const savedPosts = posts.filter(p => p.savedBy?.includes(accountEmail));
  const isOtherOnline = activeConv ? onlineEmails.includes(normalizeEmailSafe(activeConv)) : false;

  // --- Render ---
  if (resetToken && !isAuthenticated) {
    return <ResetPasswordView resetForm={resetForm} setResetForm={setResetForm} handleResetPassword={null} resetStatus={resetStatus} setResetToken={setResetToken} />;
  }

  if (!isAuthenticated) {
    return (
      <AuthView
        authMode={authMode} setAuthMode={setAuthMode} form={form}
        handleAuthChange={handleAuthChange} handleAuthSubmit={handleAuthSubmit}
        status={status} showForgotPassword={showForgotPassword} setShowForgotPassword={setShowForgotPassword}
        forgotEmail={forgotEmail} setForgotEmail={setForgotEmail} handleForgotPassword={handleForgotPassword}
        forgotStatus={forgotStatus} setForgotStatus={setForgotStatus}
      />
    );
  }

  return (
    <main className="reddit-shell">
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: "var(--bg-card)", color: "var(--text-main)", border: "1px solid var(--border)", backdropFilter: "var(--glass-blur)" } }} />
      <header className="site-header">
        <div className="header-inner">
          <div className="site-brand" onClick={() => setView("feed")}>threadspace</div>
          <div className="header-search">
            <span className="header-search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </span>
            <input
              type="text" placeholder="Search Threadspace" value={headerSearch}
              onFocus={() => setView("search")}
              onChange={(e) => { setHeaderSearch(e.target.value); setView("search"); }}
            />
          </div>
          <nav className="site-nav">
            <button className={view === "feed" ? "nav-link active" : "nav-link"} onClick={() => { setSelectedCommunity(""); setView("feed"); }}>Home</button>
            <button className={view === "trending" ? "nav-link active" : "nav-link"} onClick={() => setView("trending")}>Trending</button>
            <button className={view === "recommended" ? "nav-link active" : "nav-link"} onClick={() => setView("recommended")}>For You</button>
            <button className={view === "saved" ? "nav-link active" : "nav-link"} onClick={() => setView("saved")}>Saved</button>
          </nav>
          
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className="account-menu-wrap">
              <button className="account-icon" onClick={() => { setShowNotifications(!showNotifications); markNotificationsRead(); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
                {unreadNotificationsCount > 0 && <span className="badge">{unreadNotificationsCount}</span>}
              </button>
              {showNotifications && (
                <div className="account-menu" style={{ minWidth: 300, maxHeight: 400, overflowY: "auto" }}>
                  <div className="account-menu-label">Notifications</div>
                  {notifications.length ? notifications.map(n => (
                    <div key={n.id} style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{n.title}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{n.message}</div>
                    </div>
                  )) : <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)" }}>No notifications</div>}
                </div>
              )}
            </div>

            <div className="account-menu-wrap">
              <button className="account-icon" onClick={() => setShowAccountMenu(!showAccountMenu)}>
                {accountProfile.avatar ? <img src={accountProfile.avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : accountName.charAt(0)}
              </button>
              {showAccountMenu && (
                <div className="account-menu">
                  <div className="account-menu-label">Signed in as</div>
                  <div className="account-menu-value">{accountName}</div>
                  <div className="account-menu-actions">
                    <button onClick={() => { setView("settings"); setShowAccountMenu(false); }}>Settings</button>
                    <button onClick={signOut} style={{ color: "var(--danger)" }}>Sign Out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="bottom-nav">
        <button className={view === "feed" ? "bottom-nav-btn active" : "bottom-nav-btn"} onClick={() => setView("feed")}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>Home</button>
        <button className={view === "search" ? "bottom-nav-btn active" : "bottom-nav-btn"} onClick={() => setView("search")}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>Search</button>
        <button className="bottom-nav-btn" onClick={() => setView("create")}><div className="create-circle"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></div></button>
        <button className={view === "messages" || view === "thread" ? "bottom-nav-btn active" : "bottom-nav-btn"} onClick={() => setView("messages")}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>Inbox</button>
        <button className={view === "settings" ? "bottom-nav-btn active" : "bottom-nav-btn"} onClick={() => setView("settings")}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>Profile</button>
      </nav>

      <section className="app-grid">
        <aside className="left-rail">
          <div className="rail-card">
            <div className="rail-title">Your Communities</div>
            <div className="subreddit-list">
              {subreddits.map(s => (
                <button key={s.id} className={selectedCommunity === s.name ? "subreddit-pill active" : "subreddit-pill"} onClick={() => openCommunity(s.name)}>r/{s.name}</button>
              ))}
            </div>
          </div>
        </aside>

        <section className="main-column">
          {view === "feed" && (
            <FeedView
              postsLoading={postsLoading} posts={filteredFeedPosts} postStatus={postStatus} setView={setView}
              accountEmail={accountEmail} openUserProfile={openUserProfile} openCommunity={openCommunity}
              handleReaction={handleReaction} openComments={openComments} toggleComments={(id) => setOpenComments(c => ({...c, [id]: !c[id]}))}
              handleSave={handleSave} handleShare={() => {}} handleDelete={handleDelete}
              commentErrors={commentErrors} commentDrafts={commentDrafts} replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts} setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit} handleReplySubmit={handleReplySubmit}
              editingPostId={editingPostId} editPost={editPost} setEditPost={setEditPost}
              startEditPost={(p) => { setEditingPostId(p.id); setEditPost({ caption: p.caption, subreddit: p.subreddit, imageUrl: p.imageUrl }); }}
              cancelEditPost={() => setEditingPostId(null)} handleEditPostImage={() => {}} handleEditPostSubmit={() => {}}
              title={selectedCommunity ? `r/${selectedCommunity}` : "Home Feed"}
              hasMore={hasMore} loadMorePosts={loadMorePosts}
            />
          )}

          {view === "saved" && (
            <FeedView
              postsLoading={postsLoading} posts={savedPosts} postStatus={postStatus} setView={setView}
              accountEmail={accountEmail} openUserProfile={openUserProfile} openCommunity={openCommunity}
              handleReaction={handleReaction} openComments={openComments} toggleComments={(id) => setOpenComments(c => ({...c, [id]: !c[id]}))}
              handleSave={handleSave} handleShare={() => {}} handleDelete={handleDelete}
              commentErrors={commentErrors} commentDrafts={commentDrafts} replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts} setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit} handleReplySubmit={handleReplySubmit}
              title="Saved Posts"
              hasMore={false} loadMorePosts={() => {}}
            />
          )}

          {view === "trending" && (
            <FeedView
              postsLoading={postsLoading} posts={trendingPosts} postStatus={postStatus} setView={setView}
              accountEmail={accountEmail} openUserProfile={openUserProfile} openCommunity={openCommunity}
              handleReaction={handleReaction} openComments={openComments} toggleComments={(id) => setOpenComments(c => ({...c, [id]: !c[id]}))}
              handleSave={handleSave} handleShare={() => {}} handleDelete={handleDelete}
              commentErrors={commentErrors} commentDrafts={commentDrafts} replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts} setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit} handleReplySubmit={handleReplySubmit}
              title="Trending Posts" description="Most popular posts in the last 24 hours."
              hasMore={false} loadMorePosts={() => {}}
            />
          )}

          {view === "recommended" && (
            <FeedView
              postsLoading={postsLoading} posts={recommendedPosts} postStatus={postStatus} setView={setView}
              accountEmail={accountEmail} openUserProfile={openUserProfile} openCommunity={openCommunity}
              handleReaction={handleReaction} openComments={openComments} toggleComments={(id) => setOpenComments(c => ({...c, [id]: !c[id]}))}
              handleSave={handleSave} handleShare={() => {}} handleDelete={handleDelete}
              commentErrors={commentErrors} commentDrafts={commentDrafts} replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts} setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit} handleReplySubmit={handleReplySubmit}
              title="For You" description="Recommended posts based on your interests."
              hasMore={false} loadMorePosts={() => {}}
            />
          )}

          {view === "create" && (
            <CreatePostView subreddits={subreddits} post={post} handlePostSubmit={handlePostSubmit} handlePostChange={handlePostChange} handleImageChange={handleImageChange} postStatus={postStatus} />
          )}

          {view === "subreddits" && (
            <SubredditsView
              subredditForm={{ name: "", title: "", description: "" }} handleCreateSubreddit={() => {}} handleSubredditChange={() => {}}
              subredditStatus={{}} subreddits={subreddits} followingSubreddits={followingSubreddits}
              handleToggleSubredditFollow={handleToggleSubredditFollow} openCommunity={openCommunity}
            />
          )}

          {view === "messages" && (
            <MessagesView conversations={conversations} openConversation={(email, name) => openConversation(email, name, setView)} getMessagePreview={(m) => m.text || "Media"} unreadConversationCount={0} />
          )}

          {view === "thread" && (
            <ThreadView
              activeConvName={activeConvName} accountEmail={accountEmail} activeConv={activeConv}
              threadMessages={threadMessages}
              loadConversations={loadConversations} setView={setView} messagesEndRef={messagesEndRef}
              msgError={msgError} mediaPreview={mediaPreview} mediaFile={mediaFile} clearMedia={() => { setMediaFile(null); setMediaPreview(""); }}
              fileInputRef={fileInputRef} handleMediaSelect={handleMediaSelect} msgLoading={msgLoading}
              mediaUploading={mediaUploading} msgDraft={msgDraft} setMsgDraft={setMsgDraft}
              sendMessage={sendMessage} isOtherOnline={isOtherOnline}
              typingUsers={typingUsers} sendTyping={sendTyping} sendStopTyping={sendStopTyping}
            />
          )}

          {view === "profile" && (
            <ProfileView profileUser={profileUser} accountEmail={accountEmail} setView={setView} openConversation={(email, name) => openConversation(email, name, setView)} isOwnProfile={normalizeEmailSafe(profileUser?.email) === normalizeEmailSafe(accountEmail)} isFollowing={false} handleToggleUserFollow={() => {}} isOnline={onlineEmails.includes(normalizeEmailSafe(profileUser?.email))} />
          )}

          {view === "settings" && (
            <SettingsView accountName={accountName} accountEmail={accountEmail} onSignOut={signOut} profileForm={profileForm} setProfileForm={setProfileForm} handleProfileSave={handleProfileSave} handleAvatarUpload={handleAvatarUpload} profileStatus={profileStatus} accountProfile={accountProfile} />
          )}

          {view === "search" && (
            <SearchView headerSearch={headerSearch} setHeaderSearch={setHeaderSearch} searchLoading={searchLoading} searchError={searchError} searchResults={searchResults} openUserProfile={openUserProfile} openPost={() => {}} openCommunity={openCommunity} />
          )}
        </section>

        <MemberSearchRail memberSearch={memberSearch} setMemberSearch={setMemberSearch} searchMembers={searchMembers} membersLoading={membersLoading} members={members} openUserProfile={openUserProfile} />
      </section>
    </main>
  );
}
