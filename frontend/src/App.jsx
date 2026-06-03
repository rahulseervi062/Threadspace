 import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Toaster, toast } from "react-hot-toast";
import "./styles.css";

// Services & Hooks
import { api } from "./services/api";
import { useAuth } from "./hooks/useAuth";
import { useRealtime } from "./hooks/useRealtime";
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
import { StoriesViewer } from "./components/StoriesViewer";
import { OnboardingView } from "./components/OnboardingView";
import { CommunityView } from "./components/CommunityView";
import { HashtagView } from "./components/HashtagView";
import { ProfileView, SearchView, MemberSearchRail, ModerationView } from "./components/MainViews";

const normalizeEmailSafe = (e) => String(e || "").toLowerCase().trim();

export default function App() {
  // --- Main Router State ---
  const [view, setView] = useState("feed");
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [selectedPostId, setSelectedPostId] = useState(null);
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
    handleToggleSubredditFollow, hasMore, loadMorePosts,
    trendingPosts, recommendedPosts, followingPosts, loadTrendingPosts, loadRecommendedPosts, loadFollowingPosts
  } = usePosts(accountEmail);

  const {
    conversations, activeConv, activeConvName, threadMessages, loadConversations,
    openConversation, setThreadMessages, typingUsers, sendTyping, sendStopTyping
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
  const [editingComment, setEditingComment] = useState(null);
  const [commentEditDraft, setCommentEditDraft] = useState("");
  const [editingPostId, setEditingPostId] = useState(null);
  const emptyPost = { caption: "", imageUrl: "", images: [], mediaType: "image", subreddit: "", pollQuestion: "", pollOptions: ["", ""] };
  const [editPost, setEditPost] = useState({ caption: "", subreddit: "", imageUrl: "", images: [], mediaType: "image" });
  const [post, setPost] = useState(emptyPost);

  // --- Local States for Account & Notifications ---
  const [accountProfile, setAccountProfile] = useState({});
  const [profileUser, setProfileUser] = useState(null);
  const [profileStatus, setProfileStatus] = useState({ loading: false, type: "", message: "" });
  const [profileForm, setProfileForm] = useState({ name: "", username: "", phone: "", bio: "", banner: "" });
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [onlineEmails, setOnlineEmails] = useState([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ts_dark") !== "false");
  const [subredditForm, setSubredditForm] = useState({ name: "", title: "", description: "" });
  const [storiesViewerIndex, setStoriesViewerIndex] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedHashtag, setSelectedHashtag] = useState("");
  const [activeCommunityView, setActiveCommunityView] = useState("");
  const [subredditStatus, setSubredditStatus] = useState({ loading: false, type: "", message: "" });
  const [modReports, setModReports] = useState([]);
  const [modReportsLoading, setModReportsLoading] = useState(false);

  // --- Chat Helpers ---
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [msgDraft, setMsgDraft] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [msgError, setMsgError] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);

  // --- Reset Password State ---
  const [resetForm, setResetForm] = useState({ password: "", confirm: "" });
  const [resetStatus, setResetStatus] = useState({ loading: false, type: "", message: "" });

  // --- Real-time notifications via WebSocket ---
  useRealtime({
    accountEmail: isAuthenticated ? accountEmail : null,
    onNotification: (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadNotificationsCount(c => c + 1);
    },
    onPresenceUpdate: (email, online) => {
      setOnlineEmails(prev =>
        online ? [...new Set([...prev, email])] : prev.filter(e => e !== email)
      );
    }
  });

  // --- Dark Mode Effect ---
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("ts_dark", darkMode ? "true" : "false");
  }, [darkMode]);

  // --- Initial Loads & Syncs ---
  useEffect(() => {
    if (isAuthenticated) {
      loadPosts();
      loadSubreddits();
      loadConversations();
      loadAccount();
      loadNotifications();
      searchMembers("");

      loadFollowingPosts();

      // Show onboarding for new users
      const hasOnboarded = localStorage.getItem("ts_onboarded");
      if (!hasOnboarded) setShowOnboarding(true);

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
    const handleGlobalClick = (e) => {
      const hashtagEl = e.target.closest('.hashtag');
      if (hashtagEl) {
        const tag = hashtagEl.getAttribute("data-tag");
        if (tag) {
          setSelectedHashtag(tag);
          setView("hashtag");
          window.scrollTo(0, 0);
        }
      }
    };
    const handleHashtagEvent = (e) => {
      if (e.detail?.tag) {
        setSelectedHashtag(e.detail.tag);
        setView("hashtag");
      }
    };
    document.addEventListener("click", handleGlobalClick);
    window.addEventListener("openHashtag", handleHashtagEvent);
    return () => {
      document.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("openHashtag", handleHashtagEvent);
    };
  }, []);

  useEffect(() => {
    if (view === "thread") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (view === "trending") loadTrendingPosts();
    if (view === "recommended") loadRecommendedPosts();
    if (view === "following") loadFollowingPosts();
  }, [threadMessages, view, loadTrendingPosts, loadRecommendedPosts, loadFollowingPosts]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const routeView = params.get("view");
    const postId = Number(params.get("post"));
    const email = params.get("email");
    const community = params.get("name");

    if (routeView === "post" && postId) {
      setSelectedPostId(postId);
      setOpenComments((current) => ({ ...current, [postId]: true }));
      setView("post");
    } else if (routeView === "user" && email) {
      void openUserProfile(email);
    } else if (routeView === "community" && community) {
      setSelectedCommunity(community);
      setView("feed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // --- API Wrappers ---
  const loadAccount = async () => {
    try {
      const data = await api.getAccount(accountEmail);
      if (data.ok) {
        setAccountProfile(data.user);
        setProfileForm({ name: data.user.name, username: data.user.username || "", phone: data.user.phone || "", bio: data.user.bio || "", banner: data.user.banner || "" });
        setFollowingSubreddits(data.user.followingSubreddits || []);
      }
    } catch (err) { }
  };

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications(accountEmail);
      if (data.ok) {
        setNotifications(data.notifications || []);
        setUnreadNotificationsCount(data.unreadCount || 0);
      }
    } catch (err) { }
  };

  const markNotificationsRead = async () => {
    try {
      await api.markNotificationsRead(accountEmail);
      setUnreadNotificationsCount(0);
    } catch (err) { }
  };

  const loadPresence = async () => {
    try {
      const data = await api.getPresence();
      if (data.ok) setOnlineEmails((data.onlineUsers || []).map(u => normalizeEmailSafe(u.email)));
    } catch (err) { }
  };

  // --- Post Handlers ---
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setPostStatus({ loading: true, type: "", message: "" });
    try {
      const pollOptions = post.pollOptions.map((option) => option.trim()).filter(Boolean);
      const payload = {
        ...post,
        poll: post.pollQuestion.trim() && pollOptions.length >= 2
          ? { question: post.pollQuestion.trim(), options: pollOptions }
          : null,
        authorName: accountName,
        authorEmail: accountEmail
      };
      const data = await api.createPost(payload);
      if (data.ok) {
        setPosts(prev => [data.post, ...prev]);
        setPost({ ...emptyPost, subreddit: post.subreddit });
        setPostStatus({ loading: false, type: "success", message: "Post shared!" });
        setView("feed");
      }
    } catch (err) {
      setPostStatus({ loading: false, type: "error", message: err.message });
    }
  };

  const handlePostChange = (e) => setPost(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const readFileAsDataUrl = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const urls = await Promise.all(files.slice(0, 4).map(readFileAsDataUrl));
    const firstFile = files[0];
    setPost(prev => ({
      ...prev,
      imageUrl: urls[0],
      images: urls,
      mediaType: firstFile.type.startsWith("video") ? "video" : "image"
    }));
  };

  const handleCommentSubmit = async (postId) => {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    try {
      const data = await api.addComment(postId, { text, authorName: accountName, authorEmail: accountEmail });
      if (data.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? data.post : p));
        setCommentDrafts(prev => ({ ...prev, [postId]: "" }));
      }
    } catch (err) { }
  };

  const handleEditComment = async (postId, commentId) => {
    const text = commentEditDraft.trim();
    if (!text) return;
    try {
      const data = await api.editComment(postId, commentId, accountEmail, text);
      if (data.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? data.post : p));
        setEditingComment(null);
        setCommentEditDraft("");
        toast.success("Comment updated");
      }
    } catch (err) {
      toast.error(err.message || "Failed to edit comment");
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const data = await api.deleteComment(postId, commentId, accountEmail);
      if (data.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? data.post : p));
        toast.success("Comment deleted");
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete comment");
    }
  };

  const handleReportComment = async (postId, commentId) => {
    try {
      const data = await api.reportComment(postId, commentId, accountEmail, "Reported by user");
      if (data.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? data.post : p));
        toast.success("Comment reported");
      }
    } catch (err) {
      toast.error(err.message || "Failed to report comment");
    }
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
    } catch (err) { }
  };

  const handleReportPost = async (postId) => {
    try {
      const data = await api.reportPost(postId, accountEmail, "Reported by user");
      if (data.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? data.post : p));
        toast.success("Post reported");
      }
    } catch (err) {
      toast.error(err.message || "Failed to report post");
    }
  };

  const handlePollVote = async (postId, option) => {
    try {
      const data = await api.votePoll(postId, accountEmail, option);
      if (data.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? data.post : p));
      }
    } catch (err) {
      toast.error(err.message || "Failed to vote");
    }
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
      } catch (err) { }
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileForm((current) => ({ ...current, banner: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleToggleUserFollow = async (targetUser) => {
    try {
      const targetId = targetUser?.id || targetUser?.email || targetUser;
      const isCurrentlyFollowing = (accountProfile.following || []).includes(targetId);
      const data = await api.toggleFollowUser(targetId, accountEmail, isCurrentlyFollowing);
      if (data.ok) {
        setAccountProfile(prev => ({
          ...prev,
          following: isCurrentlyFollowing
            ? (prev.following || []).filter(id => id !== targetId)
            : [...(prev.following || []), targetId]
        }));
        toast.success(isCurrentlyFollowing ? "Unfollowed user" : "Following user!");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update follow status");
    }
  };

  const handleBlockUser = async (targetEmail) => {
    try {
      const data = await api.toggleBlockUser(targetEmail, accountEmail);
      if (data.ok) {
        setAccountProfile((current) => ({ ...current, blockedUsers: data.blockedUsers || [] }));
        toast.success((data.blockedUsers || []).includes(targetEmail) ? "User blocked" : "User unblocked");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update block");
    }
  };

  const handleShare = (postId) => {
    const url = `${window.location.origin}${window.location.pathname}?view=post&post=${postId}`;
    if (navigator.share) {
      navigator.share({ title: "Pulse Drop", url }).catch(() => { });
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success("Link copied to clipboard!")).catch(() => toast.error("Failed to copy link"));
    }
  };

  const loadModReports = useCallback(async () => {
    setModReportsLoading(true);
    try {
      const data = await api.getReports();
      if (data.ok) setModReports(data.reports || []);
    } catch (err) {
      toast.error(err.message || "Failed to load reports");
    } finally {
      setModReportsLoading(false);
    }
  }, []);

  const handleEditPostSubmit = async (postId) => {
    try {
      const data = await api.updatePost(postId, { ...editPost, authorEmail: accountEmail });
      if (data.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...data.post } : p));
        setEditingPostId(null);
        toast.success("Post updated!");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update post");
    }
  };

  const handleSubredditChange = (e) => {
    const { name, value } = e.target;
    setSubredditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSubreddit = async (e) => {
    e.preventDefault();
    if (!subredditForm.name.trim()) return;
    setSubredditStatus({ loading: true, type: "", message: "" });
    try {
      const data = await api.createSubreddit({ ...subredditForm, creatorEmail: accountEmail });
      if (data.ok) {
        setSubreddits(prev => [...prev, data.subreddit]);
        setSubredditForm({ name: "", title: "", description: "" });
        setSubredditStatus({ loading: false, type: "success", message: "Circle created!" });
        toast.success(`#${data.subreddit.name} created!`);
      }
    } catch (err) {
      setSubredditStatus({ loading: false, type: "error", message: err.message || "Failed to create circle" });
    }
  };

  // --- Chat Handlers ---
  const handleMediaSelect = (e, manualUrl = null) => {
    const file = e?.target?.files?.[0];
    if (!file && !manualUrl) return;

    if (manualUrl) {
      setMediaPreview(manualUrl);
      setMediaFile(null); // No file to upload, it's already a URL
      return;
    }

    setMediaFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setMediaPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleMessageMediaPaste = (e) => {
    const mediaFile = Array.from(e.clipboardData?.files || []).find((file) =>
      file.type.startsWith("image/") || file.type.startsWith("video/") || file.type.startsWith("audio/")
    );

    if (!mediaFile) return;

    e.preventDefault();
    handleMediaSelect({ target: { files: [mediaFile] } });
  };

  const getMediaTypeFromFile = (file) => {
    if (!file?.type) return "";
    if (file.type === "image/gif") return "gif";
    if (file.type.startsWith("video")) return "video";
    if (file.type.startsWith("audio")) return "audio";
    if (file.type.startsWith("image")) return "image";
    return "";
  };

  const getMediaTypeFromUrl = (url) => {
    if (!url) return "";
    if (url.includes("giphy.com")) return "gif";
    if (url.startsWith("data:image/gif")) return "gif";
    if (url.startsWith("data:image")) return "image";
    if (url.startsWith("data:video")) return "video";
    if (url.startsWith("data:audio")) return "audio";

    try {
      const { pathname } = new URL(url);
      const extension = pathname.split(".").pop()?.toLowerCase();
      if (extension === "gif") return "gif";
      if (["jpg", "jpeg", "png", "webp"].includes(extension)) return "image";
      if (["mp4", "webm", "mov"].includes(extension)) return "video";
      if (["mp3", "wav", "m4a", "ogg", "oga"].includes(extension)) return "audio";
    } catch {
      return "";
    }

    return "";
  };

  const sendMessage = async () => {
    if (!msgDraft.trim() && !mediaFile && !mediaPreview) return;
    setMsgLoading(true);

    // Capture ALL values upfront before any state changes
    let text = msgDraft.trim();
    const from = accountEmail;
    const fromN = accountName;
    const to = activeConv;
    const toN = activeConvName;
    let currentMediaFile = mediaFile;
    let currentMediaPreview = mediaPreview;
    let currentMediaType = getMediaTypeFromFile(currentMediaFile);

    // Auto-detect GIF links
    if (!currentMediaFile && (text.startsWith("http") || text.startsWith("data:"))) {
      const detectedMediaType = getMediaTypeFromUrl(text);
      if (detectedMediaType) {
        currentMediaPreview = text;
        currentMediaType = detectedMediaType;
        text = "";
      }
    }

    // If media was manually selected/set (like Giphy from picker) and type is empty, detect it from preview URL
    if (!currentMediaType && currentMediaPreview) {
      currentMediaType = getMediaTypeFromUrl(currentMediaPreview);
    }

    if (!from || !to) return;

    // Optimistic: show message instantly
    const optimisticMsg = {
      id: Date.now(),
      fromEmail: from,
      fromName: fromN,
      toEmail: to,
      toName: toN,
      text,
      mediaUrl: currentMediaPreview || "",
      mediaType: currentMediaType,
      replyTo: replyingTo,
      createdAt: new Date().toISOString(),
      read: false,
      _optimistic: true
    };

    // Clear inputs immediately
    setMsgDraft("");
    setMediaFile(null);
    setMediaPreview("");
    setReplyingTo(null);
    setMsgError("");
    setThreadMessages(prev => [...prev, optimisticMsg]);

    // Send in background using captured values
    try {
      let finalMediaUrl = "";
      let finalMediaType = currentMediaType;

      if (currentMediaFile) {
        setMediaUploading(true);
        setUploadProgress(0);
        const uploadData = await api.uploadMediaWithProgress(currentMediaFile, (pct) => {
          setUploadProgress(pct);
        });
        finalMediaUrl = uploadData.mediaUrl;
        finalMediaType = uploadData.mediaType || finalMediaType;
        setMediaUploading(false);
        setUploadProgress(0);
      } else if (currentMediaPreview) {
        // Was a detected link/data URI
        finalMediaUrl = currentMediaPreview;
      }

      const data = await api.sendMessage({
        fromEmail: from,
        fromName: fromN,
        toEmail: to,
        toName: toN,
        text,
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaType,
        replyTo: optimisticMsg.replyTo
      });
      if (data.ok) {
        setThreadMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...data.message, _optimistic: false } : m));
      }
    } catch (err) {
      setMsgError(err.message);
      setThreadMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...m, _optimistic: false, _failed: true } : m));
    } finally {
      setMsgLoading(false);
      setMediaUploading(false);
    }
  };

  const handleRetryMessage = (message) => {
    setMsgDraft(message.text || "");
    setMediaPreview(message.mediaUrl || "");
    setMediaFile(null);
    setReplyingTo(message.replyTo || null);
    setThreadMessages(prev => prev.filter(m => m.id !== message.id));
  };

  const handleDeleteMessage = async (messageId) => {
    // Optimistic delete
    setThreadMessages(prev => prev.filter(m => m.id !== messageId));
    try {
      await api.deleteMessage(messageId, accountEmail);
    } catch (err) {
      setMsgError(err.message || "Failed to delete message");
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    // Optimistic edit
    setThreadMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: newText, isEdited: true } : m));
    try {
      await api.editMessage(messageId, accountEmail, newText);
    } catch (err) {
      setMsgError(err.message || "Failed to edit message");
    }
  };

  const handleMessageReaction = async (messageId, reaction) => {
    try {
      const data = await api.reactToMessage(messageId, accountEmail, reaction);
      if (data.ok) {
        setThreadMessages(prev => prev.map(m => m.id === messageId ? data.message : m));
      }
    } catch (err) {
      setMsgError(err.message || "Failed to react");
    }
  };

  // --- Navigation Helpers ---
  const setRouteParams = (params) => {
    const query = new URLSearchParams(params);
    window.history.replaceState({}, "", `${window.location.pathname}?${query.toString()}`);
  };

  const openPost = (postId) => {
    const numericPostId = Number(postId);
    if (!numericPostId) return;
    setSelectedPostId(numericPostId);
    setOpenComments((current) => ({ ...current, [numericPostId]: true }));
    setView("post");
    setRouteParams({ view: "post", post: numericPostId });
    window.scrollTo(0, 0);
  };

  const openUserProfile = async (email, name) => {
    setView("profile");
    setRouteParams({ view: "user", email });
    try {
      const data = await api.getAccount(email);
      if (data.ok) setProfileUser(data.user);
    } catch (err) { }
  };

  const openCommunity = (name) => {
    setSelectedCommunity(name);
    setActiveCommunityView(name);
    setView("community");
    setRouteParams({ view: "community", name });
    window.scrollTo(0, 0);
  };

  const handleNotificationClick = async (notification) => {
    setShowNotifications(false);
    if (notification.postId) {
      openPost(notification.postId);
      return;
    }
    if (notification.type === "message" && notification.actorEmail) {
      await openConversation(notification.actorEmail, notification.actorEmail, setView);
      return;
    }
    if (notification.actorEmail) {
      await openUserProfile(notification.actorEmail);
    }
  };

  // --- Derived Data ---
  const filteredFeedPosts = useMemo(() => (
    selectedCommunity
      ? posts.filter((item) => item.subreddit === selectedCommunity)
      : posts
  ), [posts, selectedCommunity]);

  const savedPosts = useMemo(() => posts.filter(p => p.savedBy?.includes(accountEmail)), [posts, accountEmail]);
  const isOtherOnline = activeConv ? onlineEmails.includes(normalizeEmailSafe(activeConv)) : false;
  const unreadConversationCount = useMemo(
    () => conversations.reduce((sum, conv) => sum + (conv.unread > 0 ? 1 : 0), 0),
    [conversations]
  );
  const profilePosts = useMemo(
    () => posts.filter((p) => normalizeEmailSafe(p.authorEmail) === normalizeEmailSafe(profileUser?.email)),
    [posts, profileUser?.email]
  );
  const selectedPost = useMemo(
    () => posts.find((postItem) => Number(postItem.id) === Number(selectedPostId)),
    [posts, selectedPostId]
  );
  const isFollowingProfile = profileUser ? (accountProfile.following || []).includes(profileUser.id || profileUser.email) : false;
  const storyPosts = useMemo(
    () => posts.filter((item) => item.imageUrl || (Array.isArray(item.images) && item.images.length)).slice(0, 12),
    [posts]
  );
  const openStory = (postId) => {
    const idx = storyPosts.findIndex(s => s.id === postId);
    setStoriesViewerIndex(idx >= 0 ? idx : 0);
  };

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
    <main className="reddit-shell pulse-shell">
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: "var(--bg-card)", color: "var(--text-main)", border: "1px solid var(--border)", backdropFilter: "var(--glass-blur)" } }} />
      <header className="site-header">
        <div className="header-inner">
          <div className="site-brand" onClick={() => setView("feed")}>Pulse</div>
          <div className="header-search">
            <span className="header-search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            </span>
            <input
              type="text" placeholder="Search Pulse" value={headerSearch}
              onFocus={() => setView("search")}
              onChange={(e) => { setHeaderSearch(e.target.value); setView("search"); }}
            />
          </div>
          <nav className="site-nav">
            <button className={view === "feed" ? "nav-link active" : "nav-link"} onClick={() => { setSelectedCommunity(""); setView("feed"); }}>Feed</button>
            <button className={view === "following" ? "nav-link active" : "nav-link"} onClick={() => setView("following")}>Following</button>
            <button className={view === "trending" ? "nav-link active" : "nav-link"} onClick={() => setView("trending")}>Trending</button>
            <button className={view === "recommended" ? "nav-link active" : "nav-link"} onClick={() => setView("recommended")}>For You</button>
            <button className={view === "subreddits" ? "nav-link active" : "nav-link"} onClick={() => setView("subreddits")}>Circles</button>
            <button className={view === "messages" || view === "thread" ? "nav-link active" : "nav-link"} onClick={() => setView("messages")}>Chats</button>
            <button className={view === "saved" ? "nav-link active" : "nav-link"} onClick={() => setView("saved")}>Saved</button>
          </nav>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className="action-button" onClick={() => setDarkMode(d => !d)} title={darkMode ? "Light mode" : "Dark mode"} style={{ padding: "8px", borderRadius: "50%" }}>
              {darkMode
                ? <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0zM7.05 18.36l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0z" /></svg>
                : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" /></svg>
              }
            </button>
            <div className="account-menu-wrap">
              <button className="account-icon" onClick={() => { setShowNotifications(!showNotifications); markNotificationsRead(); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>
                {unreadNotificationsCount > 0 && <span className="badge">{unreadNotificationsCount}</span>}
              </button>
              {showNotifications && (
                <div className="account-menu" style={{ minWidth: 300, maxHeight: 400, overflowY: "auto" }}>
                  <div className="account-menu-label">Notifications</div>
                  {notifications.length ? notifications.map(n => (
                    <button key={n.id} type="button" onClick={() => void handleNotificationClick(n)} style={{ width: "100%", padding: "12px", border: 0, borderTop: "1px solid var(--border)", background: "transparent", color: "var(--text-main)", textAlign: "left", cursor: "pointer" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{n.title}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{n.message}</div>
                    </button>
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
        <button className={view === "feed" ? "bottom-nav-btn active" : "bottom-nav-btn"} onClick={() => setView("feed")}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>Feed</button>
        <button className={view === "search" ? "bottom-nav-btn active" : "bottom-nav-btn"} onClick={() => setView("search")}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>Explore</button>
        <button className="bottom-nav-btn" onClick={() => setView("create")}><div className="create-circle"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg></div></button>
        <button className={view === "messages" || view === "thread" ? "bottom-nav-btn active" : "bottom-nav-btn"} onClick={() => setView("messages")}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>Chats</button>
        <button className={view === "settings" ? "bottom-nav-btn active" : "bottom-nav-btn"} onClick={() => setView("settings")}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>Profile</button>
      </nav>

      <section className="app-grid">
        <aside className="left-rail">
          <div className="rail-card">
            <div className="rail-title">Circles</div>
            <div className="subreddit-list">
              {subreddits.map(s => (
                <button key={s.id} className={selectedCommunity === s.name ? "subreddit-pill active" : "subreddit-pill"} onClick={() => openCommunity(s.name)}>#{s.name}</button>
              ))}
            </div>
          </div>
          <div className="rail-card pulse-quick-card">
            <div className="rail-title">Quick Actions</div>
            <button className="subreddit-pill" type="button" onClick={() => setView("create")}>New story</button>
            <button className="subreddit-pill" type="button" onClick={() => setView("messages")}>Open chats</button>
            <button className="subreddit-pill" type="button" onClick={() => setView("subreddits")}>Create channel</button>
          </div>
        </aside>

        <section className="main-column">
          {view === "feed" && (
            <FeedView
              postsLoading={postsLoading} posts={filteredFeedPosts} postStatus={postStatus} setView={setView}
              accountEmail={accountEmail} openUserProfile={openUserProfile} openCommunity={openCommunity} openPost={openPost}
              handleReaction={handleReaction} openComments={openComments} toggleComments={(id) => setOpenComments(c => ({ ...c, [id]: !c[id] }))}
              handleSave={handleSave} handleShare={handleShare} handleDelete={handleDelete}
              handleReportPost={handleReportPost} handlePollVote={handlePollVote}
              commentErrors={commentErrors} commentDrafts={commentDrafts} replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts} setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit} handleReplySubmit={handleReplySubmit} handleEditComment={handleEditComment} handleDeleteComment={handleDeleteComment} handleReportComment={handleReportComment} editingComment={editingComment} commentEditDraft={commentEditDraft} setEditingComment={setEditingComment} setCommentEditDraft={setCommentEditDraft}
              editingPostId={editingPostId} editPost={editPost} setEditPost={setEditPost}
              startEditPost={(p) => { setEditingPostId(p.id); setEditPost({ caption: p.caption, subreddit: p.subreddit, imageUrl: p.imageUrl, images: p.images || [], mediaType: p.mediaType || "image" }); }}
              cancelEditPost={() => setEditingPostId(null)} handleEditPostImage={() => { }} handleEditPostSubmit={handleEditPostSubmit}
              title={selectedCommunity ? `#${selectedCommunity}` : "Your Pulse"}
              description={selectedCommunity ? "Latest drops from this circle." : "Stories, media drops, polls, and chats from people you follow."}
              hasMore={hasMore} loadMorePosts={loadMorePosts} stories={storyPosts} onStoryClick={openStory}
            />
          )}

          {view === "saved" && (
            <FeedView
              postsLoading={postsLoading} posts={savedPosts} postStatus={postStatus} setView={setView}
              accountEmail={accountEmail} openUserProfile={openUserProfile} openCommunity={openCommunity} openPost={openPost}
              handleReaction={handleReaction} openComments={openComments} toggleComments={(id) => setOpenComments(c => ({ ...c, [id]: !c[id] }))}
              handleSave={handleSave} handleShare={handleShare} handleDelete={handleDelete}
              handleReportPost={handleReportPost} handlePollVote={handlePollVote}
              commentErrors={commentErrors} commentDrafts={commentDrafts} replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts} setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit} handleReplySubmit={handleReplySubmit} handleEditComment={handleEditComment} handleDeleteComment={handleDeleteComment} handleReportComment={handleReportComment} editingComment={editingComment} commentEditDraft={commentEditDraft} setEditingComment={setEditingComment} setCommentEditDraft={setCommentEditDraft}
              title="Saved Drops"
              hasMore={false} loadMorePosts={() => { }}
            />
          )}

          {view === "trending" && (
            <FeedView
              postsLoading={postsLoading} posts={trendingPosts} postStatus={postStatus} setView={setView}
              accountEmail={accountEmail} openUserProfile={openUserProfile} openCommunity={openCommunity} openPost={openPost}
              handleReaction={handleReaction} openComments={openComments} toggleComments={(id) => setOpenComments(c => ({ ...c, [id]: !c[id] }))}
              handleSave={handleSave} handleShare={handleShare} handleDelete={handleDelete}
              handleReportPost={handleReportPost} handlePollVote={handlePollVote}
              commentErrors={commentErrors} commentDrafts={commentDrafts} replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts} setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit} handleReplySubmit={handleReplySubmit} handleEditComment={handleEditComment} handleDeleteComment={handleDeleteComment} handleReportComment={handleReportComment} editingComment={editingComment} commentEditDraft={commentEditDraft} setEditingComment={setEditingComment} setCommentEditDraft={setCommentEditDraft}
              title="Trending" description="Visual drops and conversations getting attention now."
              hasMore={false} loadMorePosts={() => { }}
            />
          )}

          {view === "recommended" && (
            <FeedView
              postsLoading={postsLoading} posts={recommendedPosts} postStatus={postStatus} setView={setView}
              accountEmail={accountEmail} openUserProfile={openUserProfile} openCommunity={openCommunity} openPost={openPost}
              handleReaction={handleReaction} openComments={openComments} toggleComments={(id) => setOpenComments(c => ({ ...c, [id]: !c[id] }))}
              handleSave={handleSave} handleShare={handleShare} handleDelete={handleDelete}
              handleReportPost={handleReportPost} handlePollVote={handlePollVote}
              commentErrors={commentErrors} commentDrafts={commentDrafts} replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts} setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit} handleReplySubmit={handleReplySubmit} handleEditComment={handleEditComment} handleDeleteComment={handleDeleteComment} handleReportComment={handleReportComment} editingComment={editingComment} commentEditDraft={commentEditDraft} setEditingComment={setEditingComment} setCommentEditDraft={setCommentEditDraft}
              title="For You" description="Recommended posts based on your interests."
              hasMore={false} loadMorePosts={() => { }}
            />
          )}

          {view === "post" && (
            <FeedView
              postsLoading={postsLoading} posts={selectedPost ? [selectedPost] : []} postStatus={postStatus} setView={setView}
              accountEmail={accountEmail} openUserProfile={openUserProfile} openCommunity={openCommunity} openPost={openPost}
              handleReaction={handleReaction} openComments={openComments} toggleComments={(id) => setOpenComments(c => ({ ...c, [id]: true }))}
              handleSave={handleSave} handleShare={handleShare} handleDelete={handleDelete}
              handleReportPost={handleReportPost} handlePollVote={handlePollVote}
              commentErrors={commentErrors} commentDrafts={commentDrafts} replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts} setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit} handleReplySubmit={handleReplySubmit} handleEditComment={handleEditComment} handleDeleteComment={handleDeleteComment} handleReportComment={handleReportComment} editingComment={editingComment} commentEditDraft={commentEditDraft} setEditingComment={setEditingComment} setCommentEditDraft={setCommentEditDraft}
              editingPostId={editingPostId} editPost={editPost} setEditPost={setEditPost}
              startEditPost={(p) => { setEditingPostId(p.id); setEditPost({ caption: p.caption, subreddit: p.subreddit, imageUrl: p.imageUrl, images: p.images || [], mediaType: p.mediaType || "image" }); }}
              cancelEditPost={() => setEditingPostId(null)} handleEditPostImage={() => { }} handleEditPostSubmit={handleEditPostSubmit}
              title={selectedPost ? `Drop by ${selectedPost.authorName}` : "Drop"} description={selectedPost ? `#${selectedPost.subreddit}` : "This drop may not be loaded yet."}
              hasMore={false} loadMorePosts={() => { }}
            />
          )}

          {view === "create" && (
            <CreatePostView subreddits={subreddits} post={post} setPost={setPost} handlePostSubmit={handlePostSubmit} handlePostChange={handlePostChange} handleImageChange={handleImageChange} postStatus={postStatus} />
          )}

          {view === "subreddits" && (
            <SubredditsView
              subredditForm={subredditForm} handleCreateSubreddit={handleCreateSubreddit} handleSubredditChange={handleSubredditChange}
              subredditStatus={subredditStatus} subreddits={subreddits} followingSubreddits={followingSubreddits}
              handleToggleSubredditFollow={handleToggleSubredditFollow} openCommunity={openCommunity}
            />
          )}

          {view === "messages" && (
            <MessagesView conversations={conversations} openConversation={(email, name) => openConversation(email, name, setView)} getMessagePreview={(m) => m.text || "Media"} unreadConversationCount={unreadConversationCount} />
          )}

          {view === "thread" && (
            <ThreadView
              activeConvName={activeConvName} accountEmail={accountEmail} activeConv={activeConv}
              threadMessages={threadMessages}
              loadConversations={loadConversations} setView={setView} messagesEndRef={messagesEndRef}
              msgError={msgError} mediaPreview={mediaPreview} mediaFile={mediaFile} clearMedia={() => { setMediaFile(null); setMediaPreview(""); }}
              fileInputRef={fileInputRef} handleMediaSelect={handleMediaSelect} handleMessageMediaPaste={handleMessageMediaPaste} msgLoading={msgLoading}
              mediaUploading={mediaUploading} msgDraft={msgDraft} setMsgDraft={setMsgDraft}
              sendMessage={sendMessage} isOtherOnline={isOtherOnline}
              typingUsers={typingUsers} sendTyping={sendTyping} sendStopTyping={sendStopTyping}
              uploadProgress={uploadProgress}
              replyingTo={replyingTo} setReplyingTo={setReplyingTo}
              handleDeleteMessage={handleDeleteMessage} handleEditMessage={handleEditMessage} handleMessageReaction={handleMessageReaction}
              handleRetryMessage={handleRetryMessage}
            />
          )}

          {view === "profile" && (
            <ProfileView profileUser={profileUser} accountEmail={accountEmail} setView={setView} openConversation={(email, name) => openConversation(email, name, setView)} isOwnProfile={normalizeEmailSafe(profileUser?.email) === normalizeEmailSafe(accountEmail)} isFollowing={isFollowingProfile} handleToggleUserFollow={handleToggleUserFollow} isOnline={onlineEmails.includes(normalizeEmailSafe(profileUser?.email))} userPosts={profilePosts} savedPosts={savedPosts} blockedUsers={accountProfile.blockedUsers || []} handleBlockUser={handleBlockUser} />
          )}

          {view === "settings" && (
            <SettingsView accountName={accountName} accountEmail={accountEmail} onSignOut={signOut} profileForm={profileForm} setProfileForm={setProfileForm} handleProfileSave={handleProfileSave} handleAvatarUpload={handleAvatarUpload} handleBannerUpload={handleBannerUpload} profileStatus={profileStatus} accountProfile={accountProfile} />
          )}

          {view === "moderation" && (
            <ModerationView reports={modReports} loading={modReportsLoading} loadReports={loadModReports} openPost={openPost} />
          )}

          {view === "search" && (
            <SearchView headerSearch={headerSearch} setHeaderSearch={setHeaderSearch} searchLoading={searchLoading} searchError={searchError} searchResults={searchResults} openUserProfile={openUserProfile} openPost={openPost} openCommunity={openCommunity} />
          )}

          {view === "following" && (
            <FeedView
              postsLoading={postsLoading} posts={followingPosts} postStatus={postStatus} setView={setView}
              accountEmail={accountEmail} openUserProfile={openUserProfile} openCommunity={openCommunity} openPost={openPost}
              handleReaction={handleReaction} openComments={openComments} toggleComments={(id) => setOpenComments(c => ({ ...c, [id]: !c[id] }))}
              handleSave={handleSave} handleShare={handleShare} handleDelete={handleDelete}
              handleReportPost={handleReportPost} handlePollVote={handlePollVote}
              commentErrors={commentErrors} commentDrafts={commentDrafts} replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts} setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit} handleReplySubmit={handleReplySubmit} handleEditComment={handleEditComment} handleDeleteComment={handleDeleteComment} handleReportComment={handleReportComment} editingComment={editingComment} commentEditDraft={commentEditDraft} setEditingComment={setEditingComment} setCommentEditDraft={setCommentEditDraft}
              title="Following" description="Posts from people you follow."
              hasMore={false} loadMorePosts={() => {}}
            />
          )}

          {view === "hashtag" && (
            <HashtagView
              hashtag={selectedHashtag}
              posts={posts}
              openPost={openPost}
              openUserProfile={openUserProfile}
              accountEmail={accountEmail}
              handleReaction={handleReaction}
              handleSave={handleSave}
              setView={setView}
            />
          )}

          {view === "community" && (
            <CommunityView
              communityName={activeCommunityView}
              subreddits={subreddits}
              posts={posts}
              followingSubreddits={followingSubreddits}
              handleToggleSubredditFollow={handleToggleSubredditFollow}
              openPost={openPost}
              accountEmail={accountEmail}
              setView={setView}
              setSelectedCommunity={setSelectedCommunity}
            />
          )}
        </section>

        <MemberSearchRail memberSearch={memberSearch} setMemberSearch={setMemberSearch} searchMembers={searchMembers} membersLoading={membersLoading} members={members} openUserProfile={openUserProfile} />
      </section>
      {/* Stories Viewer */}
      {storiesViewerIndex !== null && storyPosts.length > 0 && (
        <StoriesViewer
          stories={storyPosts}
          initialIndex={storiesViewerIndex}
          onClose={() => setStoriesViewerIndex(null)}
          accountEmail={accountEmail}
        />
      )}

      {/* Onboarding */}
      {showOnboarding && isAuthenticated && (
        <OnboardingView
          accountName={accountName}
          subreddits={subreddits}
          handleToggleSubredditFollow={handleToggleSubredditFollow}
          followingSubreddits={followingSubreddits}
          onFinish={() => {
            setShowOnboarding(false);
            localStorage.setItem("ts_onboarded", "true");
          }}
        />
      )}
    </main>
  );
}