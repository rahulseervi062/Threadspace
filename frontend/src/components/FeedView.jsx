import React from "react";

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
  handleReaction,
  openComments,
  toggleComments,
  handleSave,
  handleShare,
  handleDelete,
  commentErrors,
  commentDrafts,
  replyDrafts,
  setCommentDrafts,
  setReplyDrafts,
  handleCommentSubmit,
  handleReplySubmit,
  editingPostId,
  editPost,
  setEditPost,
  startEditPost,
  cancelEditPost,
  handleEditPostImage,
  handleEditPostSubmit,
  title = "Home Feed",
  description = "Browse recent posts from your communities."
}) {
  return (
    <div className="content-card">
      <div className="section-head" style={{ marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem" }}>{title}</h1>
          <p style={{ color: "var(--text-muted)" }}>{description}</p>
        </div>
        <button className="post-button" type="button" onClick={() => setView("create")}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ marginRight: 8 }}><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Create Post
        </button>
      </div>
      
      {postStatus.message && postStatus.type !== "error" ? (
        <div className={`feedback ${postStatus.type}`} style={{ marginBottom: 20 }}>{postStatus.message}</div>
      ) : null}

      {postsLoading ? (
        <div className="feed-page">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length ? (
        <div className="feed-page">
          {(Array.isArray(posts) ? posts : []).map((item) => (
            <article className="feed-card" key={item.id} id={`post-${item.id}`}>
              <div className="post-header">
                <div className="post-community-avatar">
                  {item.subreddit?.charAt(0).toUpperCase()}
                </div>
                <div className="post-meta-col">
                  <span className="community-name" style={{ cursor: "pointer" }} onClick={() => openCommunity(item.subreddit)}>r/{item.subreddit}</span>
                  <span className="post-author" style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => void openUserProfile(item.authorEmail, item.authorName)}>u/{item.authorName}</span>
                </div>
              </div>

              {editingPostId === item.id ? (
                <div className="upload-grid" style={{ marginBottom: 14 }}>
                  <label>
                    <span>Caption</span>
                    <textarea value={editPost.caption} onChange={(e) => setEditPost((current) => ({ ...current, caption: e.target.value }))} />
                  </label>
                  <label>
                    <span>Community</span>
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
                  <p className="post-caption">{item.caption}</p>
                  {item.imageUrl ? <img className="post-image" src={item.imageUrl} alt="Post" /> : null}
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
                    <button className="action-button" type="button" onClick={() => startEditPost(item)}>Edit</button>
                    <button className="action-button delete" type="button" onClick={() => void handleDelete(item.id)}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z"/></svg>
                    </button>
                  </>
                ) : null}
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
                          <p className="comment-text" style={{ fontSize: "0.9rem" }}>{comment.text}</p>
                          
                          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                            {Array.isArray(comment.replies) && comment.replies.length ? (
                              <div style={{ display: "grid", gap: 8, paddingLeft: 16, borderLeft: "2px solid var(--accent-soft)" }}>
                                {comment.replies.map((reply) => (
                                  <div key={reply.id}>
                                    <span className="comment-author" style={{ fontSize: "0.8rem" }}>{reply.authorName}</span>
                                    <p className="comment-text" style={{ fontSize: "0.85rem" }}>{reply.text}</p>
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
          ))}
        </div>
      ) : (
        <div className="empty-preview">No posts yet. Create one to start your feed.</div>
      )}
    </div>
  );
}
