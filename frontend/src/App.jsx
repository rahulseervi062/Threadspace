import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import {
  MemberSearchRail,
  MessagesView,
  ProfileView,
  SearchView,
  ThreadView
} from "./components/MainViews";
import {
  AuthView,
  CreatePostView,
  FeedView,
  ResetPasswordView,
  SettingsView,
  SubredditsView
} from "./components/AppViews";

const API_BASE = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const MAX_MESSAGE_MEDIA_BYTES = 10 * 1024 * 1024;
const ALLOWED_MESSAGE_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

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

function getMessagePreview(message) {
  if (message?.text?.trim()) return message.text.trim();
  if (message?.mediaType === "video") return "Sent a video";
  if (message?.mediaType === "gif") return "Sent a GIF";
  if (message?.mediaType === "image") return "Sent a photo";
  if (message?.mediaUrl) return "Sent an attachment";
  return "No messages yet";
}

function getSelectedMediaType(file) {
  if (!file?.type) return null;
  if (file.type === "image/gif") return "gif";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

function getReadableError(error, fallbackMessage) {
  const message = String(error?.message || "").trim();
  if (!message) return fallbackMessage;
  if (message.toLowerCase() === "failed to fetch") {
    return "Cannot reach the server. Check that the backend URL is correct and the backend is deployed.";
  }
  return message;
}

function normalizeEmailSafe(value) {
  return String(value || "").trim().toLowerCase();
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try { return localStorage.getItem("ts_auth") === "true"; } catch { return false; }
  });
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [accountName, setAccountName] = useState(() => { try { return localStorage.getItem("ts_name") || "Demo User"; } catch { return "Demo User"; } });
  const [accountEmail, setAccountEmail] = useState(() => { try { return localStorage.getItem("ts_email") || "demo@site.com"; } catch { return "demo@site.com"; } });
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
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [posts, setPosts] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [recommendedPosts, setRecommendedPosts] = useState([]);
  const [subreddits, setSubreddits] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [members, setMembers] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [commentErrors, setCommentErrors] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPost, setEditPost] = useState({ caption: "", subreddit: "", imageUrl: "" });
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
  const [searchResults, setSearchResults] = useState({
    posts: [],
    subreddits: [],
    users: []
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [onlineEmails, setOnlineEmails] = useState([]);
  const socketRef = useRef(null);
  const activeConvRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [activeConv, setActiveConv] = useState(null); // otherEmail
  const [activeConvName, setActiveConvName] = useState("");
  const [threadMessages, setThreadMessages] = useState([]);
  const [msgDraft, setMsgDraft] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError] = useState("");
  const [mediaFile, setMediaFile] = useState(null);       // selected File object
  const [mediaPreview, setMediaPreview] = useState(null); // local object URL for preview
  const [mediaUploading, setMediaUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [profileUser, setProfileUser] = useState(null); // user being viewed
  const [accountProfile, setAccountProfile] = useState({
    id: 0,
    name: "",
    username: "",
    email: "",
    phone: "",
    avatar: "",
    bio: "",
    karma: 0,
    following: [],
    followers: [],
    followingSubreddits: [],
    online: false
  });
  const [profileForm, setProfileForm] = useState({
    name: "",
    username: "",
    phone: "",
    bio: ""
  });
  const [profileStatus, setProfileStatus] = useState({ loading: false, type: "", message: "" });
  const unreadConversationCount = conversations.filter((conv) => Number(conv?.unread || 0) > 0).length;
  const unreadNotificationsCount = notifications.filter((item) => !item.read).length;

  function signOut() {
    setShowAccountMenu(false);
    setIsAuthenticated(false);
    setView("feed");
    try {
      localStorage.removeItem("ts_auth");
      localStorage.removeItem("ts_name");
      localStorage.removeItem("ts_email");
      localStorage.removeItem("ts_phone");
    } catch {}
    setNotifications([]);
    setOnlineEmails([]);
  }

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadSubreddits();
    void loadPosts();
    void loadTrendingPosts();
    void loadRecommendedPosts();
    void searchMembers("");
    void loadConversations();
    void loadAccountProfile(accountEmail, true);
    void loadPresence();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const query = headerSearch.trim();
    if (!query) {
      setSearchResults({ posts: [], subreddits: [], users: [] });
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runSearch(query);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [headerSearch, isAuthenticated]);

  async function loadPosts() {
    setPostsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/posts`);
      const data = await readJsonResponse(response);
      if (response.ok) setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch {
      setPostStatus({ loading: false, type: "error", message: "Could not load posts." });
    } finally {
      setPostsLoading(false);
    }
  }

  async function loadTrendingPosts() {
    try {
      const response = await fetch(`${API_BASE}/api/posts/trending`);
      const data = await readJsonResponse(response);
      if (response.ok) setTrendingPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch {
      setTrendingPosts([]);
    }
  }

  async function loadRecommendedPosts() {
    if (!accountEmail) return;
    try {
      const response = await fetch(`${API_BASE}/api/posts/recommended?userEmail=${encodeURIComponent(accountEmail)}`);
      const data = await readJsonResponse(response);
      if (response.ok) setRecommendedPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch {
      setRecommendedPosts([]);
    }
  }

  async function loadAccountProfile(email = accountEmail, syncDraft = false) {
    if (!email) return;
    try {
      const response = await fetch(`${API_BASE}/api/account?email=${encodeURIComponent(email)}`);
      const data = await readJsonResponse(response);
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Unable to load account.");
      }

      if (normalizeEmailSafe(email) === normalizeEmailSafe(accountEmail)) {
        setAccountProfile(data.user || {});
        if (syncDraft) {
          setProfileForm({
            name: data.user?.name || "",
            username: data.user?.username || "",
            phone: data.user?.phone || "",
            bio: data.user?.bio || ""
          });
        }
      }

      return data.user;
    } catch {
      return null;
    }
  }

  async function loadPresence() {
    try {
      const response = await fetch(`${API_BASE}/api/presence`);
      const data = await readJsonResponse(response);
      if (response.ok && data.ok) {
        setOnlineEmails(Array.isArray(data.onlineEmails) ? data.onlineEmails : []);
      }
    } catch {
      setOnlineEmails([]);
    }
  }

  async function loadSubreddits() {
    try {
      const response = await fetch(`${API_BASE}/api/subreddits`);
      const data = await readJsonResponse(response);
      if (response.ok) {
        const next = Array.isArray(data.subreddits) ? data.subreddits : [];
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

  async function runSearch(query) {
    setSearchLoading(true);
    setSearchError("");
    try {
      const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
      const data = await readJsonResponse(response);

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Search failed.");
      }

      setSearchResults({
        posts: Array.isArray(data.results?.posts) ? data.results.posts : [],
        subreddits: Array.isArray(data.results?.subreddits) ? data.results.subreddits : [],
        users: Array.isArray(data.results?.users) ? data.results.users : []
      });
    } catch (error) {
      setSearchResults({ posts: [], subreddits: [], users: [] });
      setSearchError(getReadableError(error, "Search is unavailable right now."));
    } finally {
      setSearchLoading(false);
    }
  }

  // Socket.io real-time connection
  useEffect(() => {
    if (!isAuthenticated || !accountEmail) return;

    const socket = io(API_BASE, {
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", accountEmail);
    });

    socket.on("newMessage", (message) => {
      if (
        message.fromEmail === accountEmail ||
        message.toEmail === accountEmail
      ) {
        setConversations((prev) => {
          const otherEmail =
            message.fromEmail === accountEmail ? message.toEmail : message.fromEmail;
          const otherName =
            message.fromEmail === accountEmail ? message.toName : message.fromName;
          const preview = getMessagePreview(message);
          const exists = prev.find((c) => c.otherEmail === otherEmail);

          if (!exists) {
            return [
              ...prev,
              {
                otherEmail,
                otherName,
                messages: [message],
                lastAt: message.createdAt,
                unread: message.toEmail === accountEmail ? 1 : 0,
                lastMessage: preview
              }
            ];
          }

          const next = prev.map((c) => {
            if (c.otherEmail === otherEmail) {
              const nextMessages = [...(c.messages || []), message];
              const unreadIncrement = message.toEmail === accountEmail ? 1 : 0;
              return {
                ...c,
                otherName,
                messages: nextMessages,
                lastAt: message.createdAt,
                unread: (c.unread || 0) + unreadIncrement,
                lastMessage: preview
              };
            }
            return c;
          });

          return next.sort((a, b) => String(b.lastAt || "").localeCompare(String(a.lastAt || "")));
        });

        const otherEmail =
          message.fromEmail === accountEmail ? message.toEmail : message.fromEmail;

        if (activeConvRef.current === otherEmail) {
          setThreadMessages((prev) => {
            const exists = prev.find((m) => m.id === message.id);
            return exists ? prev : [...prev, message];
          });
        }
      }
    });

    socket.on("presence:update", (payload) => {
      setOnlineEmails(Array.isArray(payload?.onlineEmails) ? payload.onlineEmails : []);
    });

    socket.on("notification", (notification) => {
      setNotifications((prev) => [{ ...notification, read: false }, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, accountEmail]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  async function loadConversations() {
    try {
      const res = await fetch(`${API_BASE}/api/messages?userEmail=${encodeURIComponent(accountEmail)}`);
      const data = await readJsonResponse(res);
      if (data.ok) setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    } catch {}
  }

  async function openConversation(otherEmail, otherName) {
    setActiveConv(otherEmail);
    setActiveConvName(otherName);
    setView("thread");
    setMsgError("");
    setThreadMessages([]);
    try {
      const res = await fetch(`${API_BASE}/api/messages/${encodeURIComponent(otherEmail)}?userEmail=${encodeURIComponent(accountEmail)}`);
      const data = await readJsonResponse(res);
      if (data.ok) {
        setThreadMessages(data.messages || []);
        setActiveConvName(data.otherName || otherName);
        setConversations((prev) =>
          prev.map((conv) =>
            conv.otherEmail === otherEmail ? { ...conv, unread: 0 } : conv
          )
        );
      }
    } catch {}
  }

  function handleMediaSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MESSAGE_MEDIA_TYPES.has(file.type)) {
      setMsgError("Please select a JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_MESSAGE_MEDIA_BYTES) {
      setMsgError("Media must be 10MB or smaller.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }

    setMsgError("");
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  }

  function clearMedia() {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendMessage() {
    if (!msgDraft.trim() && !mediaFile) return;
    if (!activeConv) return;
    setMsgLoading(true);
    setMsgError("");
    const text = msgDraft.trim();
    setMsgDraft("");
    let mediaUrl = null;
    let mediaType = null;

    if (mediaFile) {
      setMediaUploading(true);
      try {
        const uploadData = new FormData();
        uploadData.append("file", mediaFile);

        const uploadRes = await fetch(`${API_BASE}/api/uploads/message-media`, {
          method: "POST",
          body: uploadData
        });
        const uploadJson = await readJsonResponse(uploadRes);
        if (!uploadRes.ok) {
          throw new Error(uploadJson.message || "Failed to upload media.");
        }

        mediaUrl = uploadJson.mediaUrl || null;
        mediaType = uploadJson.mediaType || getSelectedMediaType(mediaFile);
      } catch (error) {
        setMsgError(error.message || "Failed to upload media.");
        setMsgDraft(text);
        setMsgLoading(false);
        setMediaUploading(false);
        return;
      }
      setMediaUploading(false);
      clearMedia();
    }

    try {
      const res = await fetch(`${API_BASE}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail: accountEmail,
          fromName: accountName,
          toEmail: activeConv,
          toName: activeConvName,
          text,
          mediaUrl,
          mediaType
        })
      });
      const data = await readJsonResponse(res);
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Unable to send message.");
      }

      setThreadMessages((prev) => {
        const exists = prev.find((m) => m.id === data.message.id);
        return exists ? prev : [...prev, data.message];
      });
      setConversations((prev) => {
        const preview = getMessagePreview(data.message);
        const existing = prev.find((conv) => conv.otherEmail === activeConv);
        if (!existing) {
          return [
            {
              otherEmail: activeConv,
              otherName: activeConvName,
              messages: [data.message],
              lastAt: data.message.createdAt,
              unread: 0,
              lastMessage: preview
            },
            ...prev
          ];
        }

        return prev
          .map((conv) =>
            conv.otherEmail === activeConv
              ? {
                  ...conv,
                  otherName: activeConvName,
                  messages: [...(conv.messages || []), data.message],
                  lastAt: data.message.createdAt,
                  unread: 0,
                  lastMessage: preview
                }
              : conv
          )
          .sort((a, b) => String(b.lastAt || "").localeCompare(String(a.lastAt || "")));
      });
    } catch (error) {
      setMsgError(error.message || "Unable to send message.");
      setMsgDraft(text);
    }
    setMsgLoading(false);
  }

  useEffect(() => () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
  }, [mediaPreview]);

  async function openUserProfile(userEmail, userName) {
    const fullProfile = await loadAccountProfile(userEmail, false);
    setProfileUser(fullProfile || { email: userEmail, name: userName });
    setView("profile");
  }

  function markNotificationsRead() {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }

  function openPost(postId) {
    setView("feed");
    window.setTimeout(() => {
      document.getElementById(`post-${postId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function openCommunity(subredditName) {
    setSelectedCommunity(subredditName);
    setView("feed");
  }

  async function handleProfileSave(event) {
    event?.preventDefault?.();
    setProfileStatus({ loading: true, type: "", message: "" });
    try {
      const response = await fetch(`${API_BASE}/api/account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: accountEmail,
          name: profileForm.name,
          username: profileForm.username,
          phone: profileForm.phone,
          bio: profileForm.bio
        })
      });
      const data = await readJsonResponse(response);
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Unable to update profile.");
      }

      setAccountName(data.user.name);
      setAccountProfile((current) => ({ ...current, ...data.user }));
      setProfileUser((current) =>
        current && normalizeEmailSafe(current.email) === normalizeEmailSafe(accountEmail)
          ? { ...current, ...data.user }
          : current
      );
      try {
        localStorage.setItem("ts_name", data.user.name);
      } catch {}
      setProfileStatus({ loading: false, type: "success", message: "Profile updated." });
    } catch (error) {
      setProfileStatus({ loading: false, type: "error", message: getReadableError(error, "Unable to update profile.") });
    }
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/account/avatar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: accountEmail,
            avatar: String(reader.result || "")
          })
        });
        const data = await readJsonResponse(response);
        if (!response.ok || !data.ok) {
          throw new Error(data.message || "Unable to upload avatar.");
        }

        setAccountProfile((current) => ({ ...current, avatar: data.avatar }));
        setProfileUser((current) =>
          current && normalizeEmailSafe(current.email) === normalizeEmailSafe(accountEmail)
            ? { ...current, avatar: data.avatar }
            : current
        );
        setProfileStatus({ loading: false, type: "success", message: "Avatar updated." });
      } catch (error) {
        setProfileStatus({ loading: false, type: "error", message: getReadableError(error, "Unable to upload avatar.") });
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleToggleUserFollow(targetUser) {
    if (!targetUser?.id || normalizeEmailSafe(targetUser.email) === normalizeEmailSafe(accountEmail)) return;
    const isFollowing = (accountProfile.following || []).includes(targetUser.id);
    const endpoint = `${API_BASE}/api/users/${targetUser.id}/follow${isFollowing ? `?userEmail=${encodeURIComponent(accountEmail)}` : ""}`;
    const method = isFollowing ? "DELETE" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: isFollowing ? {} : { "Content-Type": "application/json" },
        body: isFollowing ? undefined : JSON.stringify({ userEmail: accountEmail })
      });
      const data = await readJsonResponse(response);
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Unable to update follow status.");
      }

      const nextFollowing = isFollowing
        ? (accountProfile.following || []).filter((id) => id !== targetUser.id)
        : [...(accountProfile.following || []), targetUser.id];
      setAccountProfile((current) => ({ ...current, following: nextFollowing }));
      setProfileUser((current) =>
        current && current.id === targetUser.id
          ? {
              ...current,
              followers: isFollowing
                ? (current.followers || []).filter((id) => id !== accountProfile.id)
                : [...(current.followers || []), accountProfile.id]
            }
          : current
      );
      void loadRecommendedPosts();
    } catch (error) {
      setPostStatus({ loading: false, type: "error", message: getReadableError(error, "Unable to update follow status.") });
    }
  }

  async function handleToggleSubredditFollow(subredditName) {
    const isFollowing = (accountProfile.followingSubreddits || []).includes(subredditName);
    const endpoint = `${API_BASE}/api/subreddits/${encodeURIComponent(subredditName)}/follow${isFollowing ? `?userEmail=${encodeURIComponent(accountEmail)}` : ""}`;
    const method = isFollowing ? "DELETE" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: isFollowing ? {} : { "Content-Type": "application/json" },
        body: isFollowing ? undefined : JSON.stringify({ userEmail: accountEmail })
      });
      const data = await readJsonResponse(response);
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Unable to update community follow.");
      }

      const nextFollowing = isFollowing
        ? (accountProfile.followingSubreddits || []).filter((name) => name !== subredditName)
        : [...(accountProfile.followingSubreddits || []), subredditName];
      setAccountProfile((current) => ({ ...current, followingSubreddits: nextFollowing }));
      if (selectedCommunity && isFollowing && selectedCommunity === subredditName) {
        setSelectedCommunity("");
      }
      void loadRecommendedPosts();
    } catch (error) {
      setSubredditStatus({ loading: false, type: "error", message: getReadableError(error, "Unable to update community follow.") });
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
      try {
        localStorage.setItem("ts_auth", "true");
        localStorage.setItem("ts_name", data.user.name);
        localStorage.setItem("ts_email", data.user.email);
        localStorage.setItem("ts_phone", data.user.phone || "");
      } catch {}
    } catch (error) {
      setStatus({
        loading: false,
        type: "error",
        message: getReadableError(error, "Something went wrong.")
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
    if (!text) {
      setCommentErrors((prev) => ({ ...prev, [postId]: "Please write a comment first." }));
      setTimeout(() => setCommentErrors((prev) => ({ ...prev, [postId]: "" })), 3000);
      return;
    }

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
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      setCommentErrors((prev) => ({ ...prev, [postId]: "" }));
    } catch (error) {
      setCommentErrors((prev) => ({ ...prev, [postId]: error.message || "Unable to add comment." }));
      setTimeout(() => setCommentErrors((prev) => ({ ...prev, [postId]: "" })), 4000);
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

  function handleEditPostImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditPost((current) => ({ ...current, imageUrl: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  }

  async function handleEditPostSubmit(postId) {
    try {
      const response = await fetch(`${API_BASE}/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: editPost.caption,
          subreddit: editPost.subreddit,
          imageUrl: editPost.imageUrl,
          userEmail: accountEmail
        })
      });

      const data = await readJsonResponse(response);
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Unable to update post.");
      }

      setPosts((current) => current.map((item) => (item.id === postId ? data.post : item)));
      cancelEditPost();
      setPostStatus({ loading: false, type: "success", message: "Post updated successfully." });
    } catch (error) {
      setPostStatus({ loading: false, type: "error", message: getReadableError(error, "Unable to update post.") });
    }
  }

  async function handleReplySubmit(postId, commentId) {
    const key = `${postId}-${commentId}`;
    const text = String(replyDrafts[key] || "").trim();
    if (!text) return;

    try {
      const response = await fetch(`${API_BASE}/api/posts/${postId}/comments/${commentId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          authorName: accountName,
          authorEmail: accountEmail
        })
      });
      const data = await readJsonResponse(response);
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Unable to add reply.");
      }

      setPosts((current) => current.map((item) => (item.id === postId ? data.post : item)));
      setReplyDrafts((current) => ({ ...current, [key]: "" }));
    } catch (error) {
      setCommentErrors((prev) => ({ ...prev, [postId]: getReadableError(error, "Unable to add reply.") }));
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

  function startEditPost(postItem) {
    setEditingPostId(postItem.id);
    setEditPost({
      caption: postItem.caption || "",
      subreddit: postItem.subreddit || "",
      imageUrl: postItem.imageUrl || ""
    });
  }

  function cancelEditPost() {
    setEditingPostId(null);
    setEditPost({ caption: "", subreddit: "", imageUrl: "" });
  }

  const filteredFeedPosts = selectedCommunity
    ? posts.filter((item) => item.subreddit === selectedCommunity)
    : posts;
  const savedPosts = posts.filter((item) => item.savedBy?.includes(accountEmail));
  const isOtherOnline = activeConv ? onlineEmails.includes(normalizeEmailSafe(activeConv)) : false;
  const isOwnProfile = Boolean(profileUser?.email) && normalizeEmailSafe(profileUser.email) === normalizeEmailSafe(accountEmail);
  const isFollowingProfileUser = Boolean(profileUser?.id) && (accountProfile.following || []).includes(profileUser.id);

  if (resetToken && !isAuthenticated) {
    return (
      <ResetPasswordView
        resetForm={resetForm}
        setResetForm={setResetForm}
        handleResetPassword={handleResetPassword}
        resetStatus={resetStatus}
        setResetToken={setResetToken}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthView
        authMode={authMode}
        setAuthMode={setAuthMode}
        form={form}
        handleAuthChange={handleAuthChange}
        handleAuthSubmit={handleAuthSubmit}
        status={status}
        showForgotPassword={showForgotPassword}
        setShowForgotPassword={setShowForgotPassword}
        forgotEmail={forgotEmail}
        setForgotEmail={setForgotEmail}
        handleForgotPassword={handleForgotPassword}
        forgotStatus={forgotStatus}
        setForgotStatus={setForgotStatus}
      />
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
          <input
            type="text"
            placeholder="Search Threadspace"
            value={headerSearch}
            onFocus={() => setView("search")}
            onChange={(e) => {
              setHeaderSearch(e.target.value);
              setView("search");
            }}
          />
        </div>
        <nav className="site-nav">
          <button className={view === "feed" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("feed")}>Home</button>
          <button className={view === "saved" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("saved")}>Saved</button>
          <button className={view === "trending" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("trending")}>Trending</button>
          <button className={view === "recommended" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("recommended")}>For You</button>
          <button className={view === "create" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("create")}>Post</button>
          <button className={view === "subreddits" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("subreddits")}>Communities</button>
        </nav>
        <div className="account-menu-wrap">
          <button className="account-icon" type="button" onClick={() => { setShowNotifications((current) => !current); markNotificationsRead(); }}>
            N
            {unreadNotificationsCount ? <span className="badge">{unreadNotificationsCount}</span> : null}
          </button>
          {showNotifications ? (
            <div className="account-menu" style={{ right: 0, top: 44, minWidth: 280 }}>
              <div className="account-menu-label">Notifications</div>
              {notifications.length ? notifications.map((item) => (
                <div key={item.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }}>
                  <div className="account-menu-value" style={{ fontSize: "0.9rem" }}>{item.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{item.message}</div>
                </div>
              )) : <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 8 }}>No notifications yet.</div>}
            </div>
          ) : null}
        </div>
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
                <button type="button" onClick={signOut}>Sign Out</button>
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
        <button className={view === "messages" || view === "thread" ? "bottom-nav-btn active" : "bottom-nav-btn"} type="button" onClick={() => { void loadConversations(); setView("messages"); }}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
          Inbox
          {unreadConversationCount ? <span className="badge">{unreadConversationCount}</span> : null}
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
              {(Array.isArray(subreddits) ? subreddits : []).map((item) => (
                <button
                  key={item.id}
                  className={selectedCommunity === item.name ? "subreddit-pill active" : "subreddit-pill"}
                  type="button"
                  onClick={() => { setSelectedCommunity((current) => current === item.name ? "" : item.name); setView("feed"); }}
                >
                  r/{item.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="main-column">
          {view === "feed" ? (
            <FeedView
              postsLoading={postsLoading}
              posts={filteredFeedPosts}
              postStatus={postStatus}
              setView={setView}
              accountEmail={accountEmail}
              openUserProfile={openUserProfile}
              openCommunity={openCommunity}
              handleReaction={handleReaction}
              openComments={openComments}
              toggleComments={toggleComments}
              handleSave={handleSave}
              handleShare={handleShare}
              handleDelete={handleDelete}
              commentErrors={commentErrors}
              commentDrafts={commentDrafts}
              replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts}
              setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit}
              handleReplySubmit={handleReplySubmit}
              editingPostId={editingPostId}
              editPost={editPost}
              setEditPost={setEditPost}
              startEditPost={startEditPost}
              cancelEditPost={cancelEditPost}
              handleEditPostImage={handleEditPostImage}
              handleEditPostSubmit={handleEditPostSubmit}
              title={selectedCommunity ? `r/${selectedCommunity}` : "Home Feed"}
              description={selectedCommunity ? `Posts from r/${selectedCommunity}.` : "Browse recent posts from your communities."}
            />
          ) : null}

          {view === "saved" ? (
            <FeedView
              postsLoading={postsLoading}
              posts={savedPosts}
              postStatus={postStatus}
              setView={setView}
              accountEmail={accountEmail}
              openUserProfile={openUserProfile}
              openCommunity={openCommunity}
              handleReaction={handleReaction}
              openComments={openComments}
              toggleComments={toggleComments}
              handleSave={handleSave}
              handleShare={handleShare}
              handleDelete={handleDelete}
              commentErrors={commentErrors}
              commentDrafts={commentDrafts}
              replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts}
              setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit}
              handleReplySubmit={handleReplySubmit}
              editingPostId={editingPostId}
              editPost={editPost}
              setEditPost={setEditPost}
              startEditPost={startEditPost}
              cancelEditPost={cancelEditPost}
              handleEditPostImage={handleEditPostImage}
              handleEditPostSubmit={handleEditPostSubmit}
              title="Saved Posts"
              description="All the posts you have bookmarked."
            />
          ) : null}

          {view === "trending" ? (
            <FeedView
              postsLoading={postsLoading}
              posts={trendingPosts}
              postStatus={postStatus}
              setView={setView}
              accountEmail={accountEmail}
              openUserProfile={openUserProfile}
              openCommunity={openCommunity}
              handleReaction={handleReaction}
              openComments={openComments}
              toggleComments={toggleComments}
              handleSave={handleSave}
              handleShare={handleShare}
              handleDelete={handleDelete}
              commentErrors={commentErrors}
              commentDrafts={commentDrafts}
              replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts}
              setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit}
              handleReplySubmit={handleReplySubmit}
              editingPostId={editingPostId}
              editPost={editPost}
              setEditPost={setEditPost}
              startEditPost={startEditPost}
              cancelEditPost={cancelEditPost}
              handleEditPostImage={handleEditPostImage}
              handleEditPostSubmit={handleEditPostSubmit}
              title="Trending"
              description="Popular posts from the last 24 hours."
            />
          ) : null}

          {view === "recommended" ? (
            <FeedView
              postsLoading={postsLoading}
              posts={recommendedPosts}
              postStatus={postStatus}
              setView={setView}
              accountEmail={accountEmail}
              openUserProfile={openUserProfile}
              openCommunity={openCommunity}
              handleReaction={handleReaction}
              openComments={openComments}
              toggleComments={toggleComments}
              handleSave={handleSave}
              handleShare={handleShare}
              handleDelete={handleDelete}
              commentErrors={commentErrors}
              commentDrafts={commentDrafts}
              replyDrafts={replyDrafts}
              setCommentDrafts={setCommentDrafts}
              setReplyDrafts={setReplyDrafts}
              handleCommentSubmit={handleCommentSubmit}
              handleReplySubmit={handleReplySubmit}
              editingPostId={editingPostId}
              editPost={editPost}
              setEditPost={setEditPost}
              startEditPost={startEditPost}
              cancelEditPost={cancelEditPost}
              handleEditPostImage={handleEditPostImage}
              handleEditPostSubmit={handleEditPostSubmit}
              title="Recommended"
              description="Posts based on the people and communities you follow."
            />
          ) : null}

          {view === "create" ? (
            <CreatePostView
              subreddits={subreddits}
              post={post}
              handlePostSubmit={handlePostSubmit}
              handlePostChange={handlePostChange}
              handleImageChange={handleImageChange}
              postStatus={postStatus}
            />
          ) : null}

          {view === "subreddits" ? (
            <SubredditsView
              subredditForm={subredditForm}
              handleCreateSubreddit={handleCreateSubreddit}
              handleSubredditChange={handleSubredditChange}
              subredditStatus={subredditStatus}
              subreddits={subreddits}
              followingSubreddits={accountProfile.followingSubreddits || []}
              handleToggleSubredditFollow={handleToggleSubredditFollow}
              openCommunity={openCommunity}
            />
          ) : null}

          {view === "settings" ? (
            <SettingsView
              accountName={accountName}
              accountEmail={accountEmail}
              onSignOut={signOut}
              profileForm={profileForm}
              setProfileForm={setProfileForm}
              handleProfileSave={handleProfileSave}
              handleAvatarUpload={handleAvatarUpload}
              profileStatus={profileStatus}
              accountProfile={accountProfile}
            />
          ) : null}

          {view === "messages" ? (
            <MessagesView
              conversations={conversations}
              openConversation={openConversation}
              getMessagePreview={getMessagePreview}
              unreadConversationCount={unreadConversationCount}
            />
          ) : null}

          {view === "thread" ? (
            <ThreadView
              activeConvName={activeConvName}
              accountEmail={accountEmail}
              threadMessages={threadMessages}
              loadConversations={loadConversations}
              setView={setView}
              messagesEndRef={messagesEndRef}
              msgError={msgError}
              mediaPreview={mediaPreview}
              mediaFile={mediaFile}
              clearMedia={clearMedia}
              fileInputRef={fileInputRef}
              handleMediaSelect={handleMediaSelect}
              msgLoading={msgLoading}
              mediaUploading={mediaUploading}
              msgDraft={msgDraft}
              setMsgDraft={setMsgDraft}
              sendMessage={sendMessage}
              isOtherOnline={isOtherOnline}
            />
          ) : null}

          {view === "profile" && profileUser ? (
            <ProfileView
              profileUser={profileUser}
              accountEmail={accountEmail}
              setView={setView}
              openConversation={openConversation}
              isOwnProfile={isOwnProfile}
              isFollowing={isFollowingProfileUser}
              handleToggleUserFollow={handleToggleUserFollow}
              isOnline={Boolean(profileUser?.email) && onlineEmails.includes(normalizeEmailSafe(profileUser.email))}
            />
          ) : null}

          {view === "search" ? (
            <SearchView
              headerSearch={headerSearch}
              setHeaderSearch={setHeaderSearch}
              searchLoading={searchLoading}
              searchError={searchError}
              searchResults={searchResults}
              openUserProfile={openUserProfile}
              openPost={openPost}
              openCommunity={openCommunity}
            />
          ) : null}
        </section>

        <MemberSearchRail
          memberSearch={memberSearch}
          setMemberSearch={setMemberSearch}
          searchMembers={searchMembers}
          membersLoading={membersLoading}
          members={members}
          openUserProfile={openUserProfile}
        />
      </section>
    </main>
  );
}
