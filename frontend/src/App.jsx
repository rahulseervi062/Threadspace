 import { useEffect, useState } from "react";

const API_BASE = "https://threadspace-e2sj.onrender.com";


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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [accountName, setAccountName] = useState("Demo User");
  const [accountEmail, setAccountEmail] = useState("demo@site.com");
  const [accountPhone, setAccountPhone] = useState("9999999999");
  const [accountAvatar, setAccountAvatar] = useState("");
  const [avatarStatus, setAvatarStatus] = useState({ loading: false, message: "", type: "" });
  const [authMode, setAuthMode] = useState("login");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [resetPasswordOtpMode, setResetPasswordOtpMode] = useState(false);
  const [resetPasswordEmail, setResetPasswordEmail] = useState("");
  const [view, setView] = useState("feed");
  const [selectedCommunityName, setSelectedCommunityName] = useState("");
  const [sortMode, setSortMode] = useState("latest");
  const [themeMode, setThemeMode] = useState("dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ posts: [], subreddits: [], users: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("all"); // all | members | communities
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    otp: "",
    newPassword: ""
  });
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
  const [openComments, setOpenComments] = useState({});
  const [openCommentMenus, setOpenCommentMenus] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [openReplyInputs, setOpenReplyInputs] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentDraft, setEditCommentDraft] = useState("");
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostDraft, setEditPostDraft] = useState({ caption: "", subreddit: "", imageUrl: "" });
  const [status, setStatus] = useState({ loading: false, type: "", message: "", showForgotPassword: false });
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
  const [settingsStatus, setSettingsStatus] = useState({
    loading: false,
    type: "",
    message: ""
  });
  const [settingsForm, setSettingsForm] = useState({
    name: "Demo User",
    phone: "9999999999",
    currentPassword: "",
    newPassword: ""
  });
  const [postsLoading, setPostsLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const normalizedMemberSearch = memberSearch.trim().toLowerCase();
  const currentUserProfile = members.find((member) => member.email === accountEmail) || null;
  const matchingSubreddits = normalizedMemberSearch
    ? subreddits.filter((item) => {
        const name = String(item.name || "").toLowerCase();
        const title = String(item.title || "").toLowerCase();
        const description = String(item.description || "").toLowerCase();

        return (
          name.includes(normalizedMemberSearch) ||
          title.includes(normalizedMemberSearch) ||
          description.includes(normalizedMemberSearch)
        );
      })
    : [];
  const selectedCommunity = subreddits.find((item) => item.name === selectedCommunityName) || null;
  const selectedCommunityPosts = selectedCommunity
    ? posts.filter((item) => item.subreddit === selectedCommunity.name)
    : [];
  const savedPosts = posts.filter((item) => item.savedBy?.includes(accountEmail));
  const profilePosts = posts.filter((item) => item.authorEmail === accountEmail);
  const sortedPosts = [...posts].sort((a, b) => {
    if (sortMode === "top") return (b.likes || 0) - (a.likes || 0);
    if (sortMode === "discussed") return (b.comments?.length || 0) - (a.comments?.length || 0);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
  const sortedCommunityPosts = [...selectedCommunityPosts].sort((a, b) => {
    if (sortMode === "top") return (b.likes || 0) - (a.likes || 0);
    if (sortMode === "discussed") return (b.comments?.length || 0) - (a.comments?.length || 0);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
  const trendingSubreddits = [...subreddits]
    .map((item) => ({
      ...item,
      postCount: posts.filter((postItem) => postItem.subreddit === item.name).length
    }))
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 3);
  const notificationItems = posts
    .flatMap((item) => {
      const postNotifications = [];
      if (item.authorEmail === accountEmail) {
        if ((item.likes || 0) > 0) {
          postNotifications.push({
            id: `${item.id}-likes`,
            text: `${item.likes} like${item.likes === 1 ? "" : "s"} on your post in r/${item.subreddit}`,
            createdAt: item.createdAt
          });
        }
        (item.comments || []).forEach((comment) => {
          if (comment.authorEmail !== accountEmail && comment.authorName) {
            postNotifications.push({
              id: `${item.id}-comment-${comment.id}`,
              text: `${comment.authorName} commented on your post in r/${item.subreddit}`,
              createdAt: comment.createdAt
            });
          }
        });
      }
      return postNotifications;
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadSubreddits();
    void loadPosts();
    void searchMembers("");
  }, [isAuthenticated]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!currentUserProfile) return;
    setAccountPhone(currentUserProfile.phone || "");
    setSettingsForm((current) => ({
      ...current,
      name: currentUserProfile.name || accountName,
      phone: currentUserProfile.phone || ""
    }));
  }, [currentUserProfile, accountName]);

  async function loadPosts() {
    setPostsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/posts`);
      const data = await readJsonResponse(response);
      if (response.ok) setPosts(data.posts || []);
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
        const next = data.subreddits || [];
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

  function formatRelativeTime(value) {
    if (!value) return "just now";
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.max(1, Math.floor(diff / 60000));

    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(value).toLocaleDateString();
  }

  function openView(nextView) {
    setShowAccountMenu(false);
    setView(nextView);
  }

  function handleLogout() {
    setIsAuthenticated(false);
    setShowAccountMenu(false);
    setView("feed");
    setSelectedCommunityName("");
    setMemberSearch("");
    setCommentDrafts({});
    setOpenComments({});
    setOpenCommentMenus({});
    setPostStatus({ loading: false, type: "", message: "" });
    setSettingsStatus({ loading: false, type: "", message: "" });
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setAvatarStatus({ loading: false, type: "error", message: "Image must be under 2MB." });
      return;
    }
    setAvatarStatus({ loading: true, type: "", message: "" });
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      try {
        const response = await fetch(`${API_BASE}/api/account/avatar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: accountEmail, avatar: base64 })
        });
        const data = await readJsonResponse(response);
        if (data.ok) {
          setAccountAvatar(data.avatar);
          setAvatarStatus({ loading: false, type: "success", message: "Profile picture updated!" });
        } else {
          setAvatarStatus({ loading: false, type: "error", message: data.message || "Failed to update." });
        }
      } catch (err) {
        setAvatarStatus({ loading: false, type: "error", message: err.message });
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSettingsSubmit(event) {
    event.preventDefault();
    setSettingsStatus({ loading: true, type: "", message: "" });

    try {
      const response = await fetch(`${API_BASE}/api/account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: accountEmail,
          name: settingsForm.name,
          phone: settingsForm.phone
        })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Could not update account.");

      setAccountName(data.user.name);
      setAccountPhone(data.user.phone || "");
      setSettingsStatus({
        loading: false,
        type: "success",
        message: "Profile settings updated."
      });
      void searchMembers(memberSearch);
    } catch (error) {
      setSettingsStatus({
        loading: false,
        type: "error",
        message: error.message || "Could not update account."
      });
    }
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault();
    setSettingsStatus({ loading: true, type: "", message: "" });

    try {
      const response = await fetch(`${API_BASE}/api/account/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: accountEmail,
          currentPassword: settingsForm.currentPassword,
          newPassword: settingsForm.newPassword
        })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Could not update password.");

      setSettingsForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: ""
      }));
      setSettingsStatus({
        loading: false,
        type: "success",
        message: data.message || "Password updated successfully."
      });
    } catch (error) {
      setSettingsStatus({
        loading: false,
        type: "error",
        message: error.message || "Could not update password."
      });
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, type: "", message: "", showForgotPassword: false });

    try {
      const endpoint = authMode === "login" ? "/api/login" : "/api/signup";
      const payload =
        authMode === "login"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, phone: form.phone, password: form.password };

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await readJsonResponse(response);
      if (!response.ok) {
        if (data.requiresOtp) {
          setOtpMode(true);
          setOtpEmail(data.email);
          setStatus({
            loading: false,
            type: "info",
            message: data.message,
            showForgotPassword: false
          });
          return;
        }
        setStatus({
          loading: false,
          type: "error",
          message: data.message || "Authentication failed.",
          showForgotPassword: data.showForgotPassword || false
        });
        return;
      }

      setStatus({
        loading: false,
        type: "success",
        message:
          authMode === "login"
            ? `Welcome back, ${data.user.name}.`
            : `Account created for ${data.user.name}.`,
        showForgotPassword: false
      });
      setAccountName(data.user.name);
      setAccountEmail(data.user.email);
      setAccountPhone(data.user.phone || form.phone || "");
      setAccountAvatar(data.user.avatar || "");
      setSettingsForm((current) => ({
        ...current,
        name: data.user.name,
        phone: data.user.phone || form.phone || ""
      }));
      setIsAuthenticated(true);
      setView("feed");
    } catch (error) {
      setStatus({
        loading: false,
        type: "error",
        message: error.message || "Something went wrong.",
        showForgotPassword: false
      });
    }
  }

  async function handleOtpSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, type: "", message: "", showForgotPassword: false });

    try {
      const response = await fetch(`${API_BASE}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, otp: form.otp })
      });

      const data = await readJsonResponse(response);
      if (!response.ok) {
        setStatus({
          loading: false,
          type: "error",
          message: data.message || "OTP verification failed.",
          showForgotPassword: false
        });
        return;
      }

      setStatus({
        loading: false,
        type: "success",
        message: `Welcome back, ${data.user.name}.`,
        showForgotPassword: false
      });
      setAccountName(data.user.name);
      setAccountEmail(data.user.email);
      setAccountPhone(data.user.phone || "");
      setAccountAvatar(data.user.avatar || "");
      setSettingsForm((current) => ({
        ...current,
        name: data.user.name,
        phone: data.user.phone || ""
      }));
      setIsAuthenticated(true);
      setOtpMode(false);
      setOtpEmail("");
      setForm({ ...form, otp: "" });
      setView("feed");
    } catch (error) {
      setStatus({
        loading: false,
        type: "error",
        message: error.message || "Something went wrong.",
        showForgotPassword: false
      });
    }
  }

  async function handleForgotPasswordSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, type: "", message: "", showForgotPassword: false });

    try {
      const response = await fetch(`${API_BASE}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email })
      });

      const data = await readJsonResponse(response);
      if (!response.ok) {
        setStatus({
          loading: false,
          type: "error",
          message: data.message || "Failed to send reset OTP.",
          showForgotPassword: false
        });
        return;
      }

      if (data.requiresOtp) {
        setResetPasswordOtpMode(true);
        setResetPasswordEmail(data.email || form.email);
        setStatus({
          loading: false,
          type: "info",
          message: data.message || "Password reset OTP has been sent to your email.",
          showForgotPassword: false
        });
        setForgotPasswordMode(false);
        return;
      }

      setStatus({
        loading: false,
        type: "success",
        message: data.message,
        showForgotPassword: false
      });
      setForgotPasswordMode(false);
    } catch (error) {
      setStatus({
        loading: false,
        type: "error",
        message: error.message || "Something went wrong.",
        showForgotPassword: false
      });
    }
  }

  async function handleResetPasswordOtpSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, type: "", message: "", showForgotPassword: false });

    try {
      const response = await fetch(`${API_BASE}/api/reset-password-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetPasswordEmail,
          otp: form.otp,
          newPassword: form.newPassword
        })
      });

      const data = await readJsonResponse(response);
      if (!response.ok) {
        setStatus({
          loading: false,
          type: "error",
          message: data.message || "Password reset failed.",
          showForgotPassword: false
        });
        return;
      }

      setStatus({
        loading: false,
        type: "success",
        message: "Password has been reset successfully. You can now log in with your new password.",
        showForgotPassword: false
      });
      setResetPasswordOtpMode(false);
      setResetPasswordEmail("");
      setForm({ ...form, otp: "", newPassword: "" });
      setAuthMode("login");
    } catch (error) {
      setStatus({
        loading: false,
        type: "error",
        message: error.message || "Something went wrong.",
        showForgotPassword: false
      });
    }
  }

  function handleAuthChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
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
    if (!text) return;

    try {
      const response = await fetch(`${API_BASE}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          authorName: accountName,
          authorEmail: accountEmail
        })
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Comment failed.");

      setPosts((current) =>
        current.map((item) => (item.id === postId ? data.post : item))
      );
      setCommentDrafts((current) => ({
        ...current,
        [postId]: ""
      }));
    } catch (error) {
      setPostStatus({
        loading: false,
        type: "error",
        message: error.message || "Unable to add comment."
      });
    }
  }

  async function handleDeleteComment(postId, commentId) {
    const previousPosts = posts;

    setPosts((current) =>
      current.map((item) =>
        item.id === postId
          ? {
              ...item,
              comments: (item.comments || []).filter((comment) => comment.id !== commentId)
            }
          : item
      )
    );
    setOpenCommentMenus((current) => ({
      ...current,
      [commentId]: false
    }));

    try {
      let response = await fetch(
        `${API_BASE}/api/posts/${postId}/comments/${commentId}?userEmail=${encodeURIComponent(accountEmail)}`,
        {
          method: "DELETE"
        }
      );
      let data = await readJsonResponse(response);

      if (!response.ok) {
        response = await fetch(
          `${API_BASE}/api/posts/${postId}/comments/${commentId}/delete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userEmail: accountEmail })
          }
        );
        data = await readJsonResponse(response);
      }

      if (!response.ok) throw new Error(data.message || "Delete failed.");

      setPosts((current) =>
        current.map((item) => (item.id === postId ? data.post : item))
      );
    } catch (error) {
      setPosts(previousPosts);
      setPostStatus({
        loading: false,
        type: "error",
        message: error.message || "Unable to delete comment."
      });
    }
  }

  async function handleReplySubmit(postId, commentId) {
    const text = (replyDrafts[commentId] || "").trim();
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
      if (!response.ok) throw new Error(data.message || "Reply failed.");

      setPosts((current) =>
        current.map((item) => (item.id === postId ? data.post : item))
      );
      setReplyDrafts((current) => ({
        ...current,
        [commentId]: ""
      }));
      setOpenReplyInputs((current) => ({
        ...current,
        [commentId]: false
      }));
    } catch (error) {
      setPostStatus({
        loading: false,
        type: "error",
        message: error.message || "Unable to add reply."
      });
    }
  }

  async function handleUpdateComment(postId, commentId) {
    const text = editCommentDraft.trim();
    if (!text) return;

    try {
      const response = await fetch(`${API_BASE}/api/posts/${postId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          userEmail: accountEmail
        })
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Comment update failed.");

      setPosts((current) =>
        current.map((item) => (item.id === postId ? data.post : item))
      );
      setEditingCommentId(null);
      setEditCommentDraft("");
      setOpenCommentMenus((current) => ({
        ...current,
        [commentId]: false
      }));
    } catch (error) {
      setPostStatus({
        loading: false,
        type: "error",
        message: error.message || "Unable to update comment."
      });
    }
  }

  async function handleUpdatePost(postId) {
    if (!editPostDraft.caption.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editPostDraft,
          userEmail: accountEmail
        })
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Post update failed.");

      setPosts((current) =>
        current.map((item) => (item.id === postId ? data.post : item))
      );
      setEditingPostId(null);
      setEditPostDraft({ caption: "", subreddit: "", imageUrl: "" });
    } catch (error) {
      setPostStatus({
        loading: false,
        type: "error",
        message: error.message || "Unable to update post."
      });
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

  function toggleCommentMenu(commentId) {
    setOpenCommentMenus((current) => ({
      ...current,
      [commentId]: !current[commentId]
    }));
  }

  function handleReplyToComment(postId, authorName, commentId) {
    setCommentDrafts((current) => ({
      ...current,
      [postId]: `@${authorName} `
    }));
    setOpenCommentMenus((current) => ({
      ...current,
      [commentId]: false
    }));
  }

  function openCommunity(name) {
    setSelectedCommunityName(name);
    setPost((current) => ({ ...current, subreddit: name }));
    setView("community");
  }

  function renderPostCard(item) {
    return (
      <article className="feed-card" key={item.id} id={`post-${item.id}`}>
        <div className="feed-meta">
          <span className="meta-subreddit">r/{item.subreddit}</span>
          <span className="meta-author">Posted by {item.authorName}</span>
          <span className="meta-author">{formatRelativeTime(item.createdAt)}</span>
        </div>
        <p className="post-caption">{item.caption}</p>
        <img className="post-image" src={item.imageUrl} alt="Post" />
        <div className="post-actions">
          <button
            className={
              item.likedBy?.includes(accountEmail)
                ? "action-button active"
                : "action-button"
            }
            type="button"
            onClick={() => void handleReaction(item.id, "like")}
          >
            {renderIcon("like")}
            <span>{item.likes || 0}</span>
          </button>
          <button
            className={
              item.dislikedBy?.includes(accountEmail)
                ? "action-button active"
                : "action-button"
            }
            type="button"
            onClick={() => void handleReaction(item.id, "dislike")}
          >
            {renderIcon("dislike")}
            <span>{item.dislikes || 0}</span>
          </button>
          <button
            className={openComments[item.id] ? "action-button active" : "action-button"}
            type="button"
            onClick={() => toggleComments(item.id)}
          >
            {renderIcon("comment")}
            <span>{item.comments?.length || 0}</span>
          </button>
          <button
            className={
              item.savedBy?.includes(accountEmail)
                ? "action-button active"
                : "action-button"
            }
            type="button"
            onClick={() => void handleSave(item.id)}
          >
            {renderIcon("save")}
          </button>
          <button
            className="action-button"
            type="button"
            onClick={() => void handleShare(item.id)}
          >
            {renderIcon("share")}
          </button>
          {item.authorEmail === accountEmail ? (
            <button
              className="action-button delete"
              type="button"
              onClick={() => void handleDelete(item.id)}
            >
              {renderIcon("delete")}
            </button>
          ) : null}
        </div>
        {openComments[item.id] ? (
          <>
            <div className="comment-box">
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
                Post
              </button>
            </div>
            {item.comments?.length ? (
              <div className="comment-list">
                {item.comments.map((comment) => (
                  <div className="comment-item" key={comment.id}>
                    <div className="comment-row">
                      <div className="comment-content">
                        <span className="comment-author">{comment.authorName}</span>
                        <span className="comment-text">{comment.text}</span>
                        <span className="comment-time">{formatRelativeTime(comment.createdAt)}</span>
                      </div>
                      <div className="comment-actions-menu">
                        <button
                          className="comment-menu-button"
                          type="button"
                          onClick={() => toggleCommentMenu(comment.id)}
                        >
                          ...
                        </button>
                        {openCommentMenus[comment.id] ? (
                          <div className="comment-menu-dropdown">
                            <button
                              type="button"
                              onClick={() => handleReplyToComment(item.id, comment.authorName, comment.id)}
                            >
                              Reply
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteComment(item.id, comment.id)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="comment-empty">No comments yet.</div>
            )}
          </>
        ) : null}
      </article>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="page-shell">
        <section className="login-panel">
          <div className="brand-chip">Threadspace</div>
          {forgotPasswordMode ? (
            <>
              <h1>Reset Your Password</h1>
              <p className="subtitle">
                Enter your email and we'll send you a 6-digit OTP to reset your password.
              </p>
              <form className="login-form" onSubmit={handleForgotPasswordSubmit}>
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
                <button type="submit" disabled={status.loading}>
                  {status.loading ? "Sending..." : "Send OTP"}
                </button>
              </form>
              <button
                type="button"
                className="back-to-login"
                onClick={() => {
                  setForgotPasswordMode(false);
                  setStatus({ loading: false, type: "", message: "", showForgotPassword: false });
                }}
              >
                Back to Login
              </button>
              {status.message ? (
                <div className={`feedback ${status.type}`}>{status.message}</div>
              ) : null}
            </>
          ) : resetPasswordOtpMode ? (
            <>
              <h1>Reset Your Password</h1>
              <p className="subtitle">
                Enter the 6-digit OTP sent to {resetPasswordEmail} and your new password
              </p>
              <form className="login-form" onSubmit={handleResetPasswordOtpSubmit}>
                <label>
                  <span>OTP</span>
                  <input
                    name="otp"
                    type="text"
                    placeholder="123456"
                    value={form.otp}
                    onChange={handleAuthChange}
                    required
                    maxLength="6"
                  />
                </label>
                <label>
                  <span>New Password</span>
                  <input
                    name="newPassword"
                    type="password"
                    placeholder="Enter your new password"
                    value={form.newPassword}
                    onChange={handleAuthChange}
                    required
                  />
                </label>
                <button type="submit" disabled={status.loading}>
                  {status.loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
              <button
                type="button"
                className="back-to-login"
                onClick={() => {
                  setResetPasswordOtpMode(false);
                  setResetPasswordEmail("");
                  setForm({ ...form, otp: "", newPassword: "" });
                  setStatus({ loading: false, type: "", message: "", showForgotPassword: false });
                }}
              >
                Back to Login
              </button>
              {status.message ? (
                <div className={`feedback ${status.type}`}>{status.message}</div>
              ) : null}
            </>
          ) : otpMode ? (
            <>
              <h1>Verify Your Identity</h1>
              <p className="subtitle">
                Enter the 6-digit OTP sent to {otpEmail}
              </p>
              <form className="login-form" onSubmit={handleOtpSubmit}>
                <label>
                  <span>OTP</span>
                  <input
                    name="otp"
                    type="text"
                    placeholder="123456"
                    value={form.otp}
                    onChange={handleAuthChange}
                    required
                    maxLength="6"
                  />
                </label>
                <button type="submit" disabled={status.loading}>
                  {status.loading ? "Verifying..." : "Verify OTP"}
                </button>
              </form>
              <button
                type="button"
                className="back-to-login"
                onClick={() => {
                  setOtpMode(false);
                  setOtpEmail("");
                  setForm({ ...form, otp: "" });
                  setStatus({ loading: false, type: "", message: "", showForgotPassword: false });
                }}
              >
                Back to Login
              </button>
              {status.message ? (
                <div className={`feedback ${status.type}`}>{status.message}</div>
              ) : null}
            </>
          ) : (
            <>
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
                {authMode === "signup" ? (
                  <label>
                    <span>Mobile Number</span>
                    <input
                      name="phone"
                      type="tel"
                      placeholder="Enter your mobile number"
                      value={form.phone}
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
              {authMode === "login" ? (
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => {
                    setForgotPasswordMode(true);
                    setStatus({ loading: false, type: "", message: "", showForgotPassword: false });
                  }}
                >
                  Forgot Password?
                </button>
              ) : null}
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="reddit-shell">
      <header className="site-header">
        <div className="site-brand">threadspace</div>
        <nav className="site-nav">
          <button className={view === "feed" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("feed")}>Home Feed</button>
          <button className={view === "create" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("create")}>New Post</button>
          <button className={view === "subreddits" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("subreddits")}>Subreddits</button>
          <button className={view === "saved" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("saved")}>Saved</button>
          <button className={view === "notifications" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("notifications")}>Notifications</button>
          <button className={view === "profile" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("profile")}>Profile</button>
          <button className={view === "settings" ? "nav-link active" : "nav-link"} type="button" onClick={() => setView("settings")}>
              {accountAvatar ? (
                <img src={accountAvatar} alt="avatar" style={{width:"24px",height:"24px",borderRadius:"50%",objectFit:"cover",marginRight:"6px",verticalAlign:"middle"}} />
              ) : (
                <span style={{display:"inline-block",width:"24px",height:"24px",borderRadius:"50%",background:"#6366f1",color:"#fff",textAlign:"center",lineHeight:"24px",fontSize:"12px",marginRight:"6px",verticalAlign:"middle"}}>{accountName.charAt(0).toUpperCase()}</span>
              )}
              Settings
            </button>
        </nav>
        <div className="account-menu-wrap">
          <button className="account-icon" type="button" onClick={() => setShowAccountMenu((v) => !v)}>
            {accountName.charAt(0)}
          </button>
          {showAccountMenu ? (
            <div className="account-menu">
              <div className="account-menu-label">Account Name</div>
              <div className="account-menu-value">{accountName}</div>
              <div className="account-menu-label">Email</div>
              <div className="account-menu-value">{accountEmail}</div>
              <div className="account-menu-actions">
                <button type="button" onClick={() => openView("profile")}>Profile</button>
                <button type="button" onClick={() => openView("settings")}>Settings</button>
                <button type="button" onClick={handleLogout}>Logout</button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <section className="app-grid">
        <aside className="left-rail">
          <div className="rail-card">
            <div className="rail-title">Communities</div>
            <div className="subreddit-list">
              {subreddits.map((item) => (
                <button
                  key={item.id}
                  className={post.subreddit === item.name ? "subreddit-pill active" : "subreddit-pill"}
                  type="button"
                  onClick={() => openCommunity(item.name)}
                >
                  r/{item.name}
                </button>
              ))}
            </div>
          </div>
          <div className="rail-card">
            <div className="rail-title">Trending</div>
            <div className="subreddit-list">
              {trendingSubreddits.map((item) => (
                <button
                  key={`trend-${item.id}`}
                  className="subreddit-pill"
                  type="button"
                  onClick={() => openCommunity(item.name)}
                >
                  r/{item.name} · {item.postCount} posts
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="main-column">
          <div className="content-card search-panel">
            <div className="rail-title">Search Members And Communities</div>
            <label className="search-box">
              <input
                type="text"
                placeholder="Search members or communities..."
                value={memberSearch}
                onChange={(event) => {
                  const value = event.target.value;
                  setMemberSearch(value);
                  void searchMembers(value);
                }}
              />
            </label>
            <div style={{display:"flex",gap:"8px",marginTop:"12px",marginBottom:"4px"}}>
              {["all","members","communities"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSearchFilter(f)}
                  style={{
                    padding:"6px 14px",
                    borderRadius:"999px",
                    border:"none",
                    cursor:"pointer",
                    fontWeight: searchFilter === f ? "700" : "400",
                    background: searchFilter === f ? "#6366f1" : "rgba(255,255,255,0.08)",
                    color: searchFilter === f ? "#fff" : "inherit",
                    fontSize:"13px",
                    textTransform:"capitalize"
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            {memberSearch.trim() ? (
              <>
                {(searchFilter === "all" || searchFilter === "members") && (
                  <div className="search-results-block">
                    <div className="search-section-title">Members {members.length > 0 && <span style={{background:"#6366f1",color:"#fff",borderRadius:"999px",padding:"1px 8px",fontSize:"11px",marginLeft:"6px"}}>{members.length}</span>}</div>
                    {membersLoading ? (
                      <div className="search-empty">Searching members...</div>
                    ) : members.length ? (
                      <div className="member-list">
                        {members.map((member) => (
                          <div className="member-card" key={member.id} style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px",borderRadius:"10px",background:"rgba(255,255,255,0.04)",marginBottom:"8px"}}>
                            <div className="member-avatar" style={{width:"40px",height:"40px",borderRadius:"50%",background:"#6366f1",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",fontSize:"16px",flexShrink:0}}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{flex:1}}>
                              <div className="member-name" style={{fontWeight:"600"}}>{member.name}</div>
                              <div className="member-email" style={{fontSize:"12px",opacity:0.6}}>{member.email}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="search-empty">No matching members found.</div>
                    )}
                  </div>
                )}

                {(searchFilter === "all" || searchFilter === "communities") && (
                  <div className="search-results-block">
                    <div className="search-section-title">Communities {matchingSubreddits.length > 0 && <span style={{background:"#6366f1",color:"#fff",borderRadius:"999px",padding:"1px 8px",fontSize:"11px",marginLeft:"6px"}}>{matchingSubreddits.length}</span>}</div>
                    {matchingSubreddits.length ? (
                      <div className="subreddit-cards">
                        {matchingSubreddits.map((item) => {
                          const communityPostCount = posts.filter(p => p.subreddit === item.name).length;
                          return (
                            <button
                              className="community-card community-link-card"
                              key={item.id}
                              type="button"
                              onClick={() => openCommunity(item.name)}
                            >
                              <div className="community-handle">r/{item.name}</div>
                              <h3>{item.title}</h3>
                              <p>{item.description || "No description added yet."}</p>
                              <div style={{display:"flex",gap:"12px",marginTop:"8px",fontSize:"12px",opacity:0.7}}>
                                <span>📝 {communityPostCount} posts</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="search-empty">No matching communities found.</div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{marginTop:"16px"}}>
                <div className="search-section-title">All Communities</div>
                <div className="subreddit-cards">
                  {subreddits.map((item) => {
                    const communityPostCount = posts.filter(p => p.subreddit === item.name).length;
                    return (
                      <button
                        className="community-card community-link-card"
                        key={item.id}
                        type="button"
                        onClick={() => openCommunity(item.name)}
                      >
                        <div className="community-handle">r/{item.name}</div>
                        <h3>{item.title}</h3>
                        <p>{item.description || "No description added yet."}</p>
                        <div style={{display:"flex",gap:"12px",marginTop:"8px",fontSize:"12px",opacity:0.7}}>
                          <span>📝 {communityPostCount} posts</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {view === "feed" ? (
            <div className="content-card">
              <div className="section-head">
                <div>
                  <h1>Home Feed</h1>
                  <p>Browse recent posts from your communities.</p>
                </div>
                <div className="section-actions">
                  <label className="sort-control">
                    <span>Sort</span>
                    <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                      <option value="latest">Latest</option>
                      <option value="top">Top</option>
                      <option value="discussed">Most Discussed</option>
                    </select>
                  </label>
                  <button className="post-button" type="button" onClick={() => setView("create")}>
                    Create Post
                  </button>
                </div>
              </div>
              {postStatus.message ? <div className={`feedback ${postStatus.type}`}>{postStatus.message}</div> : null}
              {postsLoading ? (
                <div className="empty-preview">Loading posts...</div>
              ) : sortedPosts.length ? (
                <div className="posts-feed">
                  {sortedPosts.map((item) => renderPostCard(item))}
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
                    {subreddits.map((item) => (
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
                {subreddits.map((item) => (
                  <button
                    className="community-card community-link-card"
                    key={item.id}
                    type="button"
                    onClick={() => openCommunity(item.name)}
                  >
                    <div className="community-handle">r/{item.name}</div>
                    <h3>{item.title}</h3>
                    <p>{item.description || "No description added yet."}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {view === "community" && selectedCommunity ? (
            <div className="content-card community-page">
              <div className="community-page-topbar">
                <button
                  className="action-button community-back-button"
                  type="button"
                  onClick={() => setView("feed")}
                >
                  Back To Feed
                </button>
              </div>
              <div className="section-head">
                <div>
                  <h1>r/{selectedCommunity.name}</h1>
                  <p>{selectedCommunity.description || "No description added yet."}</p>
                </div>
                <button
                  className="post-button"
                  type="button"
                  onClick={() => {
                    setPost((current) => ({ ...current, subreddit: selectedCommunity.name }));
                    setView("create");
                  }}
                >
                  Create Post
                </button>
              </div>
              <div className="community-summary">
                <div className="community-summary-item">
                  <span className="community-summary-label">📝 Posts</span>
                  <strong>{selectedCommunityPosts.length}</strong>
                </div>
                <div className="community-summary-item">
                  <span className="community-summary-label">❤️ Total Likes</span>
                  <strong>{selectedCommunityPosts.reduce((sum, p) => sum + (p.likes || 0), 0)}</strong>
                </div>
                <div className="community-summary-item">
                  <span className="community-summary-label">💬 Total Comments</span>
                  <strong>{selectedCommunityPosts.reduce((sum, p) => sum + (p.comments?.length || 0), 0)}</strong>
                </div>
                <div className="community-summary-item">
                  <span className="community-summary-label">👥 Contributors</span>
                  <strong>{new Set(selectedCommunityPosts.map(p => p.authorEmail)).size}</strong>
                </div>
                {selectedCommunity.description ? (
                  <div className="community-summary-item" style={{gridColumn:"1/-1"}}>
                    <span className="community-summary-label">📋 About</span>
                    <strong>{selectedCommunity.description}</strong>
                  </div>
                ) : null}
              </div>
              {selectedCommunityPosts.length ? (
                <div className="posts-feed">
                  {sortedCommunityPosts.map((item) => renderPostCard(item))}
                </div>
              ) : (
                <div className="empty-preview">No posts in this community yet.</div>
              )}
            </div>
          ) : null}

          {view === "saved" ? (
            <div className="content-card">
              <div className="section-head">
                <div>
                  <h1>Saved Posts</h1>
                  <p>All the posts you bookmarked for later.</p>
                </div>
              </div>
              {savedPosts.length ? (
                <div className="posts-feed">
                  {savedPosts.map((item) => renderPostCard(item))}
                </div>
              ) : (
                <div className="empty-preview">You have not saved any posts yet.</div>
              )}
            </div>
          ) : null}

          {view === "notifications" ? (
            <div className="content-card">
              <div className="section-head">
                <div>
                  <h1>Notifications</h1>
                  <p>Recent activity on your posts and communities.</p>
                </div>
              </div>
              {notificationItems.length ? (
                <div className="notification-list">
                  {notificationItems.map((item) => (
                    <div className="notification-card" key={item.id}>
                      <strong>{item.text}</strong>
                      <span className="notification-time">{formatRelativeTime(item.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-preview">No notifications yet.</div>
              )}
            </div>
          ) : null}

          {view === "profile" ? (
            <div className="content-card">
              <div className="section-head">
                <div>
                  <h1>{accountName}</h1>
                  <p>{accountEmail}</p>
                </div>
              </div>
              <div className="community-summary">
                <div className="community-summary-item">
                  <span className="community-summary-label">Mobile</span>
                  <strong>{accountPhone || "Not added"}</strong>
                </div>
                <div className="community-summary-item">
                  <span className="community-summary-label">Posts</span>
                  <strong>{profilePosts.length}</strong>
                </div>
                <div className="community-summary-item">
                  <span className="community-summary-label">Saved</span>
                  <strong>{savedPosts.length}</strong>
                </div>
              </div>
              {profilePosts.length ? (
                <div className="posts-feed">
                  {profilePosts.map((item) => renderPostCard(item))}
                </div>
              ) : (
                <div className="empty-preview">You have not posted anything yet.</div>
              )}
            </div>
          ) : null}

          {view === "settings" ? (
            <div className="content-card">
              <div className="section-head">
                <div>
                  <h1>Settings</h1>
                  <p>Update your profile, password, and theme.</p>
                </div>
              </div>
              <form className="settings-grid" onSubmit={handleSettingsSubmit}>
                <label style={{gridColumn:"1/-1"}}>
                  <span>Profile Picture</span>
                  <div style={{display:"flex",alignItems:"center",gap:"16px",marginTop:"8px"}}>
                    {accountAvatar ? (
                      <img src={accountAvatar} alt="avatar" style={{width:"72px",height:"72px",borderRadius:"50%",objectFit:"cover",border:"3px solid #6366f1"}} />
                    ) : (
                      <div style={{width:"72px",height:"72px",borderRadius:"50%",background:"#6366f1",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",fontWeight:"bold"}}>
                        {accountName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <input type="file" accept="image/*" id="avatar-upload" style={{display:"none"}} onChange={handleAvatarUpload} disabled={avatarStatus.loading} />
                      <label htmlFor="avatar-upload" style={{cursor:"pointer",background:"#6366f1",color:"#fff",padding:"8px 16px",borderRadius:"8px",fontSize:"14px"}}>
                        {avatarStatus.loading ? "Uploading..." : "Choose Photo"}
                      </label>
                      {avatarStatus.message && (
                        <p style={{marginTop:"6px",fontSize:"13px",color: avatarStatus.type === "success" ? "#22c55e" : "#ef4444"}}>{avatarStatus.message}</p>
                      )}
                    </div>
                  </div>
                </label>
                <label>
                  <span>Display Name</span>
                  <input
                    type="text"
                    value={settingsForm.name}
                    onChange={(event) =>
                      setSettingsForm((current) => ({ ...current, name: event.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  <span>Mobile Number</span>
                  <input
                    type="tel"
                    value={settingsForm.phone}
                    onChange={(event) =>
                      setSettingsForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  <span>Theme</span>
                  <select
                    value={themeMode}
                    onChange={(event) => setThemeMode(event.target.value)}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </label>
                <button className="post-button" type="submit" disabled={settingsStatus.loading}>
                  {settingsStatus.loading ? "Saving..." : "Save Settings"}
                </button>
              </form>
              <form className="settings-grid password-grid" onSubmit={handlePasswordUpdate}>
                <label>
                  <span>Current Password</span>
                  <input
                    type="password"
                    value={settingsForm.currentPassword}
                    onChange={(event) =>
                      setSettingsForm((current) => ({ ...current, currentPassword: event.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  <span>New Password</span>
                  <input
                    type="password"
                    value={settingsForm.newPassword}
                    onChange={(event) =>
                      setSettingsForm((current) => ({ ...current, newPassword: event.target.value }))
                    }
                    required
                  />
                </label>
                <button className="post-button" type="submit" disabled={settingsStatus.loading}>
                  {settingsStatus.loading ? "Updating..." : "Change Password"}
                </button>
              </form>
              {settingsStatus.message ? (
                <div className={`feedback ${settingsStatus.type}`}>{settingsStatus.message}</div>
              ) : null}
            </div>
          ) : null}
        </section>

      </section>
    </main>
  );
}