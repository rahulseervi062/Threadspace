import { useState, useCallback } from "react";
import { api } from "../services/api";

export function usePosts(accountEmail) {
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postStatus, setPostStatus] = useState({ loading: false, type: "", message: "" });
  const [subreddits, setSubreddits] = useState([]);
  const [followingSubreddits, setFollowingSubreddits] = useState([]);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const data = await api.getPosts();
      setPosts(data.posts || []);
    } catch (err) {
      setPostStatus({ loading: false, type: "error", message: "Failed to load posts" });
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const loadSubreddits = useCallback(async () => {
    try {
      const data = await api.getSubreddits();
      setSubreddits(data.subreddits || []);
    } catch (err) {}
  }, []);

  const handleReaction = async (postId, type) => {
    try {
      const data = await api.reactToPost(postId, accountEmail, type);
      if (data.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...data.post } : p));
      }
    } catch (err) {}
  };

  const handleSave = async (postId) => {
    try {
      const data = await api.savePost(postId, accountEmail);
      if (data.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...data.post } : p));
      }
    } catch (err) {}
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const data = await api.deletePost(postId);
      if (data.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err) {}
  };

  const handleToggleSubredditFollow = async (name) => {
    try {
      const data = await api.toggleFollowSubreddit(name, accountEmail);
      if (data.ok) {
        setFollowingSubreddits(data.following || []);
      }
    } catch (err) {}
  };

  return {
    posts,
    setPosts,
    postsLoading,
    postStatus,
    setPostStatus,
    subreddits,
    setSubreddits,
    followingSubreddits,
    setFollowingSubreddits,
    loadPosts,
    loadSubreddits,
    handleReaction,
    handleSave,
    handleDelete,
    handleToggleSubredditFollow
  };
}
