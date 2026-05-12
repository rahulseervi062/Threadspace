import React from "react";

export function CreatePostView({ subreddits, post, setPost, handlePostSubmit, handlePostChange, handleImageChange, postStatus }) {
  return (
    <div className="content-card">
      <div className="section-head" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem" }}>Create Post</h1>
          <p style={{ color: "var(--text-muted)" }}>Choose a community, add media or a poll, and share your thoughts.</p>
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
          <span>Upload Media</span>
          <div className="file-input-wrapper" style={{ position: "relative", overflow: "hidden", display: "inline-block" }}>
             <input type="file" accept="image/*,video/*" multiple onChange={handleImageChange} />
          </div>
        </label>
        {post.images?.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            {post.images.map((src, index) => (
              post.mediaType === "video" && index === 0
                ? <video key={src} src={src} controls style={{ width: "100%", borderRadius: 10 }} />
                : <img key={src} src={src} alt="Post preview" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10 }} />
            ))}
          </div>
        ) : null}
        <div style={{ display: "grid", gap: 10 }}>
          <label>
            <span>Poll Question</span>
            <input
              name="pollQuestion"
              value={post.pollQuestion}
              onChange={handlePostChange}
              placeholder="Ask the community"
            />
          </label>
          {(post.pollOptions || ["", ""]).map((option, index) => (
            <input
              key={index}
              value={option}
              onChange={(event) => setPost((current) => ({
                ...current,
                pollOptions: current.pollOptions.map((item, itemIndex) => itemIndex === index ? event.target.value : item)
              }))}
              placeholder={`Option ${index + 1}`}
            />
          ))}
          {(post.pollOptions || []).length < 4 ? (
            <button
              className="action-button"
              type="button"
              onClick={() => setPost((current) => ({ ...current, pollOptions: [...current.pollOptions, ""] }))}
            >
              Add Option
            </button>
          ) : null}
        </div>
        <button className="post-button" type="submit" disabled={postStatus.loading}>
          {postStatus.loading ? "Publishing..." : "Post to Threadspace"}
        </button>
      </form>
      {postStatus.message ? <div className={`feedback ${postStatus.type}`} style={{ marginTop: 20 }}>{postStatus.message}</div> : null}
    </div>
  );
}
