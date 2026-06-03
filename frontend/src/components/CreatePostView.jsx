import React from "react";

export function CreatePostView({ subreddits, post, setPost, handlePostSubmit, handlePostChange, handleImageChange, postStatus }) {
  const [postType, setPostType] = React.useState("media");

  const addPollOption = () => {
    if ((post.pollOptions || []).length < 4) {
      setPost((current) => ({
        ...current,
        pollOptions: [...(current.pollOptions || ["", ""]), ""]
      }));
    }
  };

  const removePollOption = (indexToRemove) => {
    if ((post.pollOptions || []).length > 2) {
      setPost((current) => ({
        ...current,
        pollOptions: current.pollOptions.filter((_, idx) => idx !== indexToRemove)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // If it's a media post, clear poll properties before submitting
    if (postType === "media") {
      setPost(current => ({
        ...current,
        pollQuestion: "",
        pollOptions: ["", ""]
      }));
    } else {
      // If poll post, clear media properties
      setPost(current => ({
        ...current,
        imageUrl: "",
        images: [],
        mediaType: "image"
      }));
    }
    // We trigger the submit in the next tick so the state updates first, or let handlePostSubmit handle it.
    // Actually, let's just make sure the payload is cleaned up or we can submit directly since handlePostSubmit
    // does check `post.pollQuestion.trim()` anyway to decide if it's a poll!
    handlePostSubmit(e);
  };

  return (
    <div className="content-card">
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem" }}>Create Drop</h1>
          <p style={{ color: "var(--text-muted)" }}>Share a photo, video, story-style update, or quick poll with your circle.</p>
        </div>
      </div>

      <div className="auth-tabs" style={{ marginBottom: 20 }}>
        <button
          className={postType === "media" ? "auth-tab active" : "auth-tab"}
          type="button"
          onClick={() => setPostType("media")}
        >
          Photo / Video
        </button>
        <button
          className={postType === "poll" ? "auth-tab active" : "auth-tab"}
          type="button"
          onClick={() => setPostType("poll")}
        >
          Poll
        </button>
      </div>

      <form className="upload-grid" onSubmit={handleSubmit} style={{ gap: 20 }}>
        <label>
          <span>Select Circle</span>
          <select name="subreddit" value={post.subreddit} onChange={handlePostChange}>
            {(Array.isArray(subreddits) ? subreddits : []).map((item) => (
              <option key={item.id} value={item.name}>#{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Caption</span>
          <textarea
            name="caption"
            placeholder={postType === "media" ? "Write a caption, tag a mood, or add #hashtags..." : "Describe your poll..."}
            value={post.caption}
            onChange={handlePostChange}
            style={{ minHeight: 100 }}
            required
          />
        </label>

        {postType === "media" ? (
          <>
            <label>
              <span>Upload Photo / Video</span>
              <input type="file" accept="image/*,video/*" onChange={handleImageChange} />
            </label>
            {post.imageUrl ? (
              <div style={{ position: "relative", marginTop: 10 }}>
                {post.mediaType === "video" ? (
                  <video src={post.imageUrl} controls style={{ width: "100%", maxHeight: 300, borderRadius: 12, objectFit: "cover" }} />
                ) : (
                  <img src={post.imageUrl} alt="Upload preview" style={{ width: "100%", maxHeight: 300, borderRadius: 12, objectFit: "cover" }} />
                )}
                <button
                  type="button"
                  onClick={() => setPost(curr => ({ ...curr, imageUrl: "", images: [], mediaType: "image" }))}
                  style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.6)", color: "white", border: 0, borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: "1rem" }}
                >
                  ✕
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div style={{ display: "grid", gap: 14, padding: "16px", background: "rgba(0,0,0,0.12)", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <label>
              <span>Poll Question</span>
              <input
                name="pollQuestion"
                value={post.pollQuestion}
                onChange={handlePostChange}
                placeholder="e.g., Which framework do you prefer?"
                required
              />
            </label>
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)" }}>Poll Choices</span>
              {(post.pollOptions || ["", ""]).map((option, index) => (
                <div key={index} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={option}
                    onChange={(event) => setPost((current) => ({
                      ...current,
                      pollOptions: current.pollOptions.map((item, itemIndex) => itemIndex === index ? event.target.value : item)
                    }))}
                    placeholder={`Choice ${index + 1}`}
                    required
                  />
                  {(post.pollOptions || []).length > 2 && (
                    <button
                      type="button"
                      onClick={() => removePollOption(index)}
                      style={{ background: "transparent", color: "var(--danger)", border: 0, padding: 8, cursor: "pointer" }}
                      title="Remove Choice"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {(post.pollOptions || []).length < 4 && (
                <button
                  className="action-button"
                  type="button"
                  onClick={addPollOption}
                  style={{ width: "fit-content", fontSize: "0.8rem", border: "1px dashed var(--border)", padding: "6px 14px" }}
                >
                  + Add Choice
                </button>
              )}
            </div>
          </div>
        )}

        <button className="post-button" type="submit" disabled={postStatus.loading}>
          {postStatus.loading ? "Publishing..." : "Publish Drop"}
        </button>
      </form>
      {postStatus.message ? <div className={`feedback ${postStatus.type}`} style={{ marginTop: 20 }}>{postStatus.message}</div> : null}
    </div>
  );
}
