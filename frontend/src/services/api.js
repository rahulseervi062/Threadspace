const API_BASE = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

async function handleResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error("Backend is not returning JSON. Please ensure the server is running.");
  }

  try {
    const data = JSON.parse(raw);
    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }
    return data;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Failed to parse server response");
  }
}

export const api = {
  // Auth
  login: (credentials) => fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  }).then(handleResponse),

  signup: (data) => fetch(`${API_BASE}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(handleResponse),

  forgotPassword: (email) => fetch(`${API_BASE}/api/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  }).then(handleResponse),

  resetPassword: (token, password) => fetch(`${API_BASE}/api/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password })
  }).then(handleResponse),

  // Posts
  getPosts: (page = 1, limit = 10) => fetch(`${API_BASE}/api/posts?page=${page}&limit=${limit}`).then(handleResponse),
  getTrendingPosts: () => fetch(`${API_BASE}/api/posts/trending`).then(handleResponse),
  getRecommendedPosts: (email) => fetch(`${API_BASE}/api/posts/recommended?userEmail=${encodeURIComponent(email)}`).then(handleResponse),
  
  createPost: (postData) => fetch(`${API_BASE}/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postData)
  }).then(handleResponse),

  updatePost: (id, postData) => fetch(`${API_BASE}/api/posts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postData)
  }).then(handleResponse),

  deletePost: (id) => fetch(`${API_BASE}/api/posts/${id}`, { method: "DELETE" }).then(handleResponse),

  reactToPost: (postId, email, reaction) => fetch(`${API_BASE}/api/posts/${postId}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail: email, type: reaction })
  }).then(handleResponse),

  savePost: (postId, email) => fetch(`${API_BASE}/api/posts/${postId}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail: email })
  }).then(handleResponse),

  // Comments
  addComment: (postId, commentData) => fetch(`${API_BASE}/api/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(commentData)
  }).then(handleResponse),

  addReply: (postId, commentId, replyData) => fetch(`${API_BASE}/api/posts/${postId}/comments/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(replyData)
  }).then(handleResponse),

  // Subreddits
  getSubreddits: () => fetch(`${API_BASE}/api/subreddits`).then(handleResponse),
  createSubreddit: (data) => fetch(`${API_BASE}/api/subreddits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(handleResponse),
  toggleFollowSubreddit: (name, email) => fetch(`${API_BASE}/api/subreddits/${name}/follow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail: email })
  }).then(handleResponse),

  // Users & Profile
  getUsers: (query) => fetch(`${API_BASE}/api/users?q=${encodeURIComponent(query)}`).then(handleResponse),
  getAccount: (email) => fetch(`${API_BASE}/api/account?email=${encodeURIComponent(email)}`).then(handleResponse),
  updateAccount: (data) => fetch(`${API_BASE}/api/account`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(handleResponse),
  updateAvatar: (email, avatar) => fetch(`${API_BASE}/api/account/avatar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, avatar })
  }).then(handleResponse),
  toggleFollowUser: (targetEmail, followerEmail) => fetch(`${API_BASE}/api/users/${encodeURIComponent(targetEmail)}/follow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ followerEmail })
  }).then(handleResponse),

  // Messages
  getConversations: (email) => fetch(`${API_BASE}/api/messages?userEmail=${encodeURIComponent(email)}`).then(handleResponse),
  getMessages: (otherEmail, myEmail) => fetch(`${API_BASE}/api/messages/${encodeURIComponent(otherEmail)}?userEmail=${encodeURIComponent(myEmail)}`).then(handleResponse),
  sendMessage: (msgData) => fetch(`${API_BASE}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msgData)
  }).then(handleResponse),
  editMessage: (messageId, userEmail, text) => fetch(`${API_BASE}/api/messages/${messageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail, text })
  }).then(handleResponse),
  deleteMessage: (messageId, userEmail) => fetch(`${API_BASE}/api/messages/${messageId}?userEmail=${encodeURIComponent(userEmail)}`, {
    method: "DELETE"
  }).then(handleResponse),

  // Notifications & Presence
  getNotifications: (email) => fetch(`${API_BASE}/api/notifications?userEmail=${encodeURIComponent(email)}`).then(handleResponse),
  markNotificationsRead: (email) => fetch(`${API_BASE}/api/notifications/read`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail: email })
  }).then(handleResponse),
  getPresence: () => fetch(`${API_BASE}/api/presence`).then(handleResponse),

  // Search
  search: (query) => fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`).then(handleResponse),

  // Uploads
  uploadMedia: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/uploads/message-media`, {
      method: "POST",
      body: formData
    }).then(handleResponse);
  },

  // Upload with progress (uses XHR for onprogress support)
  uploadMediaWithProgress: (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/api/uploads/message-media`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.message || "Upload failed"));
        } catch { reject(new Error("Upload failed")); }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  }
};
