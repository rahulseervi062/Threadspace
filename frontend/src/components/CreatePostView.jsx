import React from "react";

export function CreatePostView({ subreddits, post, handlePostSubmit, handlePostChange, handleImageChange, postStatus }) {
  return (
    <div className="content-card">
      <div className="section-head" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem" }}>Create Post</h1>
          <p style={{ color: "var(--text-muted)" }}>Choose a community, upload a photo, and share your thoughts.</p>
        </div>
      </div>
      <form className="upload-grid" onSubmit={handlePostSubmit} style={{ gap: 20 }}>
        <label>
          <span>Select Community</span>
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
            placeholder="What's on your mind?"
            value={post.caption}
            onChange={handlePostChange}
            style={{ minHeight: 120 }}
          />
        </label>
        <label>
          <span>Upload Image</span>
          <div className="file-input-wrapper" style={{ position: "relative", overflow: "hidden", display: "inline-block" }}>
             <input type="file" accept="image/*" onChange={handleImageChange} />
          </div>
        </label>
        <button className="post-button" type="submit" disabled={postStatus.loading}>
          {postStatus.loading ? "Publishing..." : "Post to Threadspace"}
        </button>
      </form>
      {postStatus.message ? <div className={`feedback ${postStatus.type}`} style={{ marginTop: 20 }}>{postStatus.message}</div> : null}
    </div>
  );
}
