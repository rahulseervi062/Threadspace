import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

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
  const [posts, setPosts] = useState([]);
  const [subreddits, setSubreddits] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [members, setMembers] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentErrors, setCommentErrors] = useState({});
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
  const [searchResults, setSearchResults] = useState({
    posts: [],
    subreddits: [],
    users: []
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [conversations, setConversations] = useState([]);
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

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadSubreddits();
    void loadPosts();
    void searchMembers("");
    void loadConversations();
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
    setProfileUser({ email: userEmail, name: userName });
    setView("profile");
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
                <button type="button" onClick={() => { setShowAccountMenu(false); setIsAuthenticated(false);
                  try { localStorage.removeItem("ts_auth"); localStorage.removeItem("ts_name"); localStorage.removeItem("ts_email"); localStorage.removeItem("ts_phone"); } catch {} }}>Sign Out</button>
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
              {postStatus.message && postStatus.type !== "error" ? <div className={`feedback ${postStatus.type}`}>{postStatus.message}</div> : null}
              {postsLoading ? (
                <div className="empty-preview">Loading posts...</div>
              ) : posts.length ? (
                <div className="posts-feed">
                  {(Array.isArray(posts) ? posts : []).map((item) => (
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
                            <span style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => void openUserProfile(item.authorEmail, item.authorName)}>u/{item.authorName}</span>
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
                            {commentErrors[item.id] ? (
                              <div className="feedback error" style={{ marginTop: 0 }}>{commentErrors[item.id]}</div>
                            ) : null}
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
                              {(Array.isArray(item.comments) ? item.comments : []).map((comment) => (
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
                    {(Array.isArray(subreddits) ? subreddits : []).map((item) => (
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
                {(Array.isArray(subreddits) ? subreddits : []).map((item) => (
                  <article className="community-card" key={item.id}>
                    <div className="community-handle">r/{item.name}</div>
                    <h3>{item.title}</h3>
                    <p>{item.description || "No description added yet."}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {view === "messages" ? (
            <div className="content-card">
              <div className="section-head" style={{ marginBottom: 14 }}>
                <h1>💬 Messages</h1>
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
                        <div style={{ background: "var(--accent)", color: "#fff", borderRadius: "999px", padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700 }}>{conv.unread}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {view === "thread" ? (
            <div className="content-card" style={{ display: "flex", flexDirection: "column", minHeight: "80vh" }}>
              <div className="section-head" style={{ marginBottom: 14 }}>
                <button className="action-button" type="button" onClick={() => { void loadConversations(); setView("messages"); }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                  Back
                </button>
                <h1 style={{ fontSize: "1rem", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>
                    <div className="member-avatar" style={{ display: "inline-grid", width: 28, height: 28, fontSize: "0.8rem", marginRight: 8, verticalAlign: "middle" }}>{activeConvName?.charAt(0).toUpperCase()}</div>
                    {activeConvName}
                  </span>
                  <span style={{ fontSize: "11px", color: "#22c55e", display: "flex", alignItems: "center", gap: 4, marginLeft: 36 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                    Online
                  </span>
                </h1>
              </div>
              {/* Messages thread */}
              <div style={{ flex: 1, display: "grid", gap: 10, marginBottom: 14, maxHeight: "60vh", overflowY: "auto", padding: "4px 0" }}>
                {threadMessages.length === 0 ? (
                  <div className="search-empty">No messages yet. Say hi! 👋</div>
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
                      <div style={{
                        maxWidth: "75%",
                        padding: msg.mediaUrl && !msg.text ? "4px" : "10px 14px",
                        borderRadius: msg.fromEmail === accountEmail ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: msg.fromEmail === accountEmail ? "var(--accent)" : "var(--bg-3)",
                        color: msg.fromEmail === accountEmail ? "#fff" : "var(--text)",
                        fontSize: "0.92rem",
                        lineHeight: 1.4,
                        overflow: "hidden"
                      }}>
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
              {/* Message input */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                {/* Media preview */}
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
                    >×</button>
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,image/gif,video/*"
                    style={{ display: "none" }}
                    onChange={handleMediaSelect}
                  />
                  {/* Attach button */}
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
                      : <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                    }
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {view === "profile" && profileUser ? (
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
                searchLoading ? (
                  <div className="search-empty">Searching...</div>
                ) : searchError ? (
                  <div className="feedback error">{searchError}</div>
                ) : searchResults.posts.length || searchResults.subreddits.length || searchResults.users.length ? (
                  <div className="posts-feed">
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

                    {searchResults.subreddits.map((item) => (
                      <article className="community-card" key={`subreddit-${item.id}`}>
                        <div className="community-handle">r/{item.name}</div>
                        <h3>{item.title}</h3>
                        <p>{item.description || "No description added yet."}</p>
                      </article>
                    ))}

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
                  </div>
                ) : (
                  <div className="search-empty">No results for "{headerSearch}"</div>
                )
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
                {(Array.isArray(members) ? members : []).map((member) => (
                  <div className="member-card" key={member.id} style={{ cursor: "pointer" }} onClick={() => void openUserProfile(member.email, member.name)}>
                    <div className="member-avatar">{member.name.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div className="member-name">{member.name}</div>
                      <div className="member-email">{member.email}</div>
                    </div>
                    <div style={{ color: "var(--accent)", fontSize: "0.8rem", fontWeight: 700 }}>Message →</div>
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
