import React from "react";
import { parseMarkdown } from "../utils/markdown";

export function PostSkeleton() {
  return (
    <div className="feed-card" style={{ opacity: 0.7 }}>
      <div className="post-header">
        <div className="post-community-avatar skeleton" style={{ width: 40, height: 40 }} />
        <div className="post-meta-col" style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: "40%", height: 16, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: "25%", height: 12 }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: "100%", height: 24, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: "100%", height: 200, borderRadius: 12 }} />
    </div>
  );
}

export function FeedView({
  postsLoading,
  posts,
  postStatus,
  setView,
  accountEmail,
  openUserProfile,
  openCommunity,
  openPost,
  handleReaction,
  openComments,
  toggleComments,
  handleSave,
  handleShare,
  handleDelete,
  handleReportPost,
  handlePollVote,
  commentErrors,
  commentDrafts,
  replyDrafts,
  setCommentDrafts,
  setReplyDrafts,
  handleCommentSubmit,
  handleReplySubmit,
  handleEditComment,
  handleDeleteComment,
  handleReportComment,
  editingComment,
  commentEditDraft,
  setEditingComment,
  setCommentEditDraft,
  editingPostId,
  editPost,
  setEditPost,
  startEditPost,
  cancelEditPost,
  handleEditPostImage,
  handleEditPostSubmit,
  title = "Your Pulse",
  description = "Browse recent drops from people and circles you follow.",
  hasMore,
  loadMorePosts,
  activeSort = "new",
  onSortChange,
  stories = []
}) {
  const observer = React.useRef();
  const lastPostRef = React.useCallback(node => {
    if (postsLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMorePosts();
      }
    });
    if (node) observer.current.observe(node);
  }, [postsLoading, hasMore, loadMorePosts]);

  const renderPostMedia = (item) => {
    const images = Array.isArray(item.images) && item.images.length ? item.images : item.imageUrl ? [item.imageUrl] : [];
    if (!images.length) return null;

    if (item.mediaType === "video") {
      return <video className="post-image" src={images[0]} controls />;
    }

    if (images.length === 1) {
      return <img className="post-image" src={images[0]} alt="Post" />;
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
        {images.slice(0, 4).map((src, index) => (
          <img key={`${item.id}-${index}`} src={src} alt="Post" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10 }} />
        ))}
      </div>
    );
  };

  const renderPoll = (item) => {
    if (!item.poll?.question || !Array.isArray(item.poll.options)) return null;
    const votes = item.poll.votes || {};
    const totalVotes = Object.keys(votes).length;
    const selectedOption = votes[accountEmail];
    const userHasVoted = selectedOption !== undefined;

    return (
      <div className="poll-container">
        <strong style={{ display: "block", marginBottom: 12, fontSize: "1rem" }}>{item.poll.question}</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {item.poll.options.map((option) => {
            const optionVotes = Object.values(votes).filter((v) => v === option).length;
            const pct = totalVotes ? Math.round((optionVotes / totalVotes) * 100) : 0;
            const isMyChoice = selectedOption === option;

            return (
              <div
                key={option}
                className={`poll-option-row ${userHasVoted ? "voted" : ""} ${isMyChoice ? "voted-mine" : ""}`}
                onClick={() => {
                  if (!userHasVoted) {
                    handlePollVote?.(item.id, option);
                  }
                }}
                style={{ cursor: userHasVoted ? "default" : "pointer" }}
              >
                {userHasVoted && (
                  <div className="poll-progress-bar" style={{ width: `${pct}%` }} />
                )}
                <span className="poll-option-text" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {option}
                  {isMyChoice && <span style={{ color: "var(--accent)", fontSize: "0.85rem" }}>✓</span>}
                </span>
                {userHasVoted && (
                  <span className="poll-option-pct">{pct}%</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="poll-total-votes">
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </div>
      </div>
    );
  };

  const renderTags = (caption) => {
    const tags = String(caption || "").match(/#[a-z0-9_]+/gi) || [];
    if (!tags.length) return null;
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {[...new Set(tags)].map((tag) => <span key={tag} className="subreddit-pill" style={{ width: "auto", padding: "4px 10px", fontSize: "0.75rem" }}>{tag}</span>)}
      </div>
    );
  };

  return (
    <div className="content-card">
      {stories.length ? (
        <div className="stories-strip" aria-label="Stories">
          <button className="story-tile add-story" type="button" onClick={() => setView("create")}>
            <span className="story-avatar">+</span>
            <span>Your story</span>
          </button>
          {stories.slice(0, 10).map((story) => (
            <button className="story-tile" key={story.id} type="button" onClick={() => openPost?.(story.id)}>
              <span className="story-avatar">
                {story.imageUrl ? <img src={story.imageUrl} alt="" /> : story.authorName?.charAt(0)}
              </span>
              <span>{story.authorName || "Creator"}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="section-head" style={{ marginBottom: "18px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem" }}>{title}</h1>
          <p style={{ color: "var(--text-muted)" }}>{description}</p>
        </div>
        <button className="post-button" type="button" onClick={() => setView("create")}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ marginRight: 8 }}><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Create
        </button>
      </div>

      {onSortChange && (
        <div className="sort-tabs-container">
          <button
            className={`sort-tab-pill ${activeSort === "new" ? "active" : ""}`}
            type="button"
            onClick={() => onSortChange("new")}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm3.3 14.3L11 12.8V7h1.5v4.9l3.85 2.3-.66 1.1z"/></svg>
            New
          </button>
          <button
            className={`sort-tab-pill ${activeSort === "hot" ? "active" : ""}`}
            type="button"
            onClick={() => onSortChange("hot")}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73C7.2 3.4 8.9 1 8.9 1S5.3 2.7 3.85 6.07C2.4 9.45 2.5 13.53 5.48 16.5 8.7 19.7 14 19.8 17.3 16.5c3.27-3.27 3.23-8.62.62-11.83L13.5.67zM12.98 15.6c-.66.86-1.8 1.4-2.98 1.4-1.3 0-2.3-.6-2.9-1.5.3-.1.6-.2.9-.4 1.2-.8 1.8-1.9 1.8-3.1 0-1-.3-1.8-.8-2.5.7.7 1 1.6 1 2.6 0 1 .4 1.8.9 2.5.4-.5.8-1.2.8-2 0-.3-.1-.5-.1-.8.9.8 1.3 1.9 1.3 3.1 0 .9-.4 1.7-.9 2.3z"/></svg>
            Hot
          </button>
          <button
            className={`sort-tab-pill ${activeSort === "top" ? "active" : ""}`}
            type="button"
            onClick={() => onSortChange("top")}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            Top
          </button>
        </div>
      )}
      
      {postStatus.message && postStatus.type !== "error" ? (
        <div className={`feedback ${postStatus.type}`} style={{ marginBottom: 20 }}>{postStatus.message}</div>
      ) : null}

      <div className="feed-page">
        {(Array.isArray(posts) ? posts : []).map((item, index) => {
          const isLast = index === posts.length - 1;
          return (
            <article className="feed-card" key={item.id} id={`post-${item.id}`} ref={isLast ? lastPostRef : null}>
              <div className="post-header">
                <div className="post-community-avatar">
                  {item.subreddit?.charAt(0).toUpperCase()}
                </div>
                <div className="post-meta-col">
                  <span className="community-name" style={{ cursor: "pointer" }} onClick={() => openCommunity(item.subreddit)}>#{item.subreddit || "pulse"}</span>
                  <span className="post-author" style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => void openUserProfile(item.authorEmail, item.authorName)}>@{item.authorName}</span>
                </div>
              </div>

              {openPost ? (
                <button className="action-button" type="button" onClick={() => openPost(item.id)} style={{ marginBottom: 12, paddingLeft: 0 }}>
                  Open post
                </button>
              ) : null}

              {editingPostId === item.id ? (
                <div className="upload-grid" style={{ marginBottom: 14 }}>
                  <label>
                    <span>Caption</span>
                    <textarea value={editPost.caption} onChange={(e) => setEditPost((current) => ({ ...current, caption: e.target.value }))} />
                  </label>
                  <label>
                    <span>Circle</span>
                    <input value={editPost.subreddit} onChange={(e) => setEditPost((current) => ({ ...current, subreddit: e.target.value }))} />
                  </label>
                  <label>
                    <span>Replace Image</span>
                    <input type="file" accept="image/*" onChange={handleEditPostImage} />
                  </label>
                  {editPost.imageUrl ? <img className="post-image" src={editPost.imageUrl} alt="Preview" /> : null}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="post-button" type="button" onClick={() => void handleEditPostSubmit(item.id)}>Save</button>
                    <button className="action-button" type="button" onClick={cancelEditPost}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="post-caption" dangerouslySetInnerHTML={{ __html: parseMarkdown(item.caption) }} />
                  {renderTags(item.caption)}
                  {renderPostMedia(item)}
                  {renderPoll(item)}
                </>
              )}

              <div className="post-actions">
                <div className="vote-cluster">
                  <button
                    className={item.likedBy?.includes(accountEmail) ? "vote-btn upvoted" : "vote-btn"}
                    type="button"
                    onClick={() => void handleReaction(item.id, "like")}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M14 9V5.5C14 4.12 12.88 3 11.5 3L7 10v11h10.28c.92 0 1.72-.62 1.95-1.51l1.38-5.5A2 2 0 0 0 18.67 11H15a1 1 0 0 1-1-1Z"/><path d="M5 10H3v11h2V10Z"/></svg>
                    <span className="vote-count">{item.likes || 0}</span>
                  </button>
                  <div className="vote-divider" style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
                  <button
                    className={item.dislikedBy?.includes(accountEmail) ? "vote-btn downvoted" : "vote-btn"}
                    type="button"
                    onClick={() => void handleReaction(item.id, "dislike")}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 15v3.5c0 1.38 1.12 2.5 2.5 2.5L17 14V3H6.72C5.8 3 5 3.62 4.77 4.51l-1.38 5.5A2 2 0 0 0 5.33 13H9a1 1 0 0 1 1 1Z"/><path d="M19 3h2v11h-2V3Z"/></svg>
                  </button>
                </div>
                
                <button
                  className={openComments[item.id] ? "action-button active" : "action-button"}
                  type="button"
                  onClick={() => toggleComments(item.id)}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                  <span>{item.comments?.length || 0}</span>
                </button>

                <button
                  className={item.savedBy?.includes(accountEmail) ? "action-button active" : "action-button"}
                  type="button"
                  onClick={() => void handleSave(item.id)}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 22a1 1 0 0 1-.5-.14L12 18.2l-5.5 3.66A1 1 0 0 1 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16a1 1 0 0 1-1 1z"/></svg>
                </button>

                <button className="action-button" type="button" onClick={() => void handleShare(item.id)}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M14 3 21 10l-7 7v-4c-5 0-8 1.5-11 5 1-6 4-11 11-12V3Z"/></svg>
                  Share
                </button>

                {item.authorEmail === accountEmail ? (
                  <>
                    {startEditPost ? <button className="action-button" type="button" onClick={() => startEditPost(item)}>Edit</button> : null}
                    <button className="action-button delete" type="button" onClick={() => void handleDelete(item.id)}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z"/></svg>
                    </button>
                  </>
                ) : (
                  <button className="action-button" type="button" onClick={() => void handleReportPost?.(item.id)}>
                    Flag
                  </button>
                )}
              </div>

              {openComments[item.id] ? (
                <div className="comment-section" style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
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
                    <button className="post-button" type="button" onClick={() => void handleCommentSubmit(item.id)}>
                      Add Comment
                    </button>
                  </div>
                  {item.comments?.length ? (
                    <div className="comment-list" style={{ marginTop: 20 }}>
                      {(Array.isArray(item.comments) ? item.comments : []).map((comment) => (
                        <div className="comment-item" key={comment.id} style={{ background: "var(--bg-dark)", padding: "12px", borderRadius: "10px", marginBottom: "8px" }}>
                          <span className="comment-author">{comment.authorName}</span>
                          {editingComment?.postId === item.id && editingComment?.commentId === comment.id ? (
                            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                              <textarea value={commentEditDraft} onChange={(event) => setCommentEditDraft?.(event.target.value)} />
                              <div style={{ display: "flex", gap: 8 }}>
                                <button className="post-button" type="button" onClick={() => void handleEditComment?.(item.id, comment.id)}>Save</button>
                                <button className="action-button" type="button" onClick={() => { setEditingComment?.(null); setCommentEditDraft?.(""); }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <p className="comment-text" style={{ fontSize: "0.9rem" }} dangerouslySetInnerHTML={{ __html: parseMarkdown(comment.text) }} />
                          )}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                            {comment.authorEmail === accountEmail ? (
                              <>
                                <button className="action-button" type="button" onClick={() => { setEditingComment?.({ postId: item.id, commentId: comment.id }); setCommentEditDraft?.(comment.text || ""); }}>Edit</button>
                                <button className="action-button delete" type="button" onClick={() => void handleDeleteComment?.(item.id, comment.id)}>Delete</button>
                              </>
                            ) : (
                              <button className="action-button" type="button" onClick={() => void handleReportComment?.(item.id, comment.id)}>Report comment</button>
                            )}
                          </div>
                          
                          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                            {Array.isArray(comment.replies) && comment.replies.length ? (
                              <div style={{ display: "grid", gap: 8, paddingLeft: 16, borderLeft: "2px solid var(--accent-soft)" }}>
                                {comment.replies.map((reply) => (
                                  <div key={reply.id}>
                                    <span className="comment-author" style={{ fontSize: "0.8rem" }}>{reply.authorName}</span>
                                    <p className="comment-text" style={{ fontSize: "0.85rem" }} dangerouslySetInnerHTML={{ __html: parseMarkdown(reply.text) }} />
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                              <input
                                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", fontSize: "0.85rem" }}
                                value={replyDrafts[`${item.id}-${comment.id}`] || ""}
                                onChange={(event) => setReplyDrafts((current) => ({ ...current, [`${item.id}-${comment.id}`]: event.target.value }))}
                                placeholder="Write a reply"
                              />
                              <button className="post-button" style={{ padding: "6px 12px", fontSize: "0.8rem" }} type="button" onClick={() => void handleReplySubmit(item.id, comment.id)}>Reply</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="comment-empty" style={{ textAlign: "center", padding: "20px 0" }}>No comments yet.</div>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {postsLoading && (
        <div className="feed-page" style={{ marginTop: 20 }}>
          <PostSkeleton />
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="search-empty" style={{ padding: "40px 0", opacity: 0.5 }}>
          You are all caught up.
        </div>
      )}
      
      {!postsLoading && posts.length === 0 && (
        <div className="empty-preview">No drops yet. Share a photo, video, poll, or update to start the pulse.</div>
      )}
    </div>
  );
}
