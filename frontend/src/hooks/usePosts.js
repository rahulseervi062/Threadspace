import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { api } from "../services/api";

export function usePosts(accountEmail) {
  const [posts, setPosts] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [recommendedPosts, setRecommendedPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postStatus, setPostStatus] = useState({ loading: false, type: "", message: "" });
  const [subreddits, setSubreddits] = useState([]);
  const [followingSubreddits, setFollowingSubreddits] = useState([]);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadPosts = useCallback(async (isInitial = true) => {
    if (isInitial) setPostsLoading(true);
    const targetPage = isInitial ? 1 : page + 1;
    
    try {
      const data = await api.getPosts(targetPage);
      if (data.ok) {
        setPosts(prev => isInitial ? data.posts : [...prev, ...data.posts]);
        setHasMore(data.hasMore);
        setPage(targetPage);
      }
    } catch (err) {
      toast.error("Failed to load posts");
    } finally {
      if (isInitial) setPostsLoading(false);
    }
  }, [page]);

  const loadTrendingPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const data = await api.getTrendingPosts();
      if (data.ok) setTrendingPosts(data.posts || []);
    } catch (err) {}
    finally { setPostsLoading(false); }
  }, []);

  const loadRecommendedPosts = useCallback(async () => {
    if (!accountEmail) return;
    setPostsLoading(true);
    try {
      const data = await api.getRecommendedPosts(accountEmail);
      if (data.ok) setRecommendedPosts(data.posts || []);
    } catch (err) {}
    finally { setPostsLoading(false); }
  }, [accountEmail]);

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
        toast.success(type === "like" ? "Upvoted!" : "Downvoted!");
      }
    } catch (err) {
      toast.error("Failed to update reaction");
    }
  };

  const handleSave = async (postId) => {
    try {
      const data = await api.savePost(postId, accountEmail);
      if (data.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...data.post } : p));
        const isSaved = data.post.savedBy?.includes(accountEmail);
        toast.success(isSaved ? "Post saved!" : "Post unsaved!");
      }
    } catch (err) {
      toast.error("Failed to save post");
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const data = await api.deletePost(postId);
      if (data.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        toast.success("Post deleted");
      }
    } catch (err) {
      toast.error("Failed to delete post");
    }
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
    handleToggleSubredditFollow,
    hasMore,
    loadMorePosts: () => loadPosts(false),
    trendingPosts,
    recommendedPosts,
    loadTrendingPosts,
    loadRecommendedPosts
  };
}
