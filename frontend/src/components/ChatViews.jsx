import React from "react";

export function MessagesView({ conversations, openConversation, getMessagePreview, unreadConversationCount }) {
  return (
    <div className="content-card">
      <div className="section-head" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem" }}>Direct Messages</h1>
          <p style={{ color: "var(--text-muted)" }}>
            {unreadConversationCount 
              ? `You have ${unreadConversationCount} unread message${unreadConversationCount === 1 ? "" : "s"}.` 
              : "Your inbox is clear. Stay connected!"}
          </p>
        </div>
      </div>
      {conversations.length === 0 ? (
        <div className="search-empty" style={{ padding: "60px 0" }}>
           <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.5 }}><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
           <p>No conversations yet. Start a chat from a member's profile!</p>
        </div>
      ) : (
        <div className="member-list" style={{ gap: 12 }}>
          {(Array.isArray(conversations) ? conversations : []).map((conv) => (
            <div
              key={conv.otherEmail}
              className="member-card"
              style={{ 
                cursor: "pointer", 
                padding: "16px",
                border: conv.unread > 0 ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: conv.unread > 0 ? "var(--accent-soft)" : "var(--bg-dark)",
                transition: "all 0.2s"
              }}
              onClick={() => void openConversation(conv.otherEmail, conv.otherName)}
            >
              <div className="member-avatar" style={{ width: 48, height: 48 }}>{conv.otherName?.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div className="member-name" style={{ fontSize: "1.05rem" }}>{conv.otherName}</div>
                <div className="member-email" style={{ fontSize: "0.85rem", opacity: 0.8 }}>{getMessagePreview(conv.messages?.[conv.messages.length - 1] || conv).slice(0, 50)}...</div>
              </div>
              {conv.unread > 0 ? (
                <div style={{ background: "var(--accent)", color: "#fff", borderRadius: "8px", padding: "4px 10px", fontSize: "0.75rem", fontWeight: 800, boxShadow: "0 2px 8px hsla(14, 100%, 50%, 0.4)" }}>
                  {conv.unread} NEW
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThreadView({
  activeConvName,
  accountEmail,
  threadMessages,
  loadConversations,
  setView,
  messagesEndRef,
  msgError,
  mediaPreview,
  mediaFile,
  clearMedia,
  fileInputRef,
  handleMediaSelect,
  msgLoading,
  mediaUploading,
  msgDraft,
  setMsgDraft,
  sendMessage,
  isOtherOnline
}) {
  return (
    <div className="content-card chat-window" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      <div className="section-head" style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="action-button" type="button" onClick={() => { void loadConversations(); setView("messages"); }} style={{ padding: "8px" }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="member-avatar" style={{ width: 40, height: 40 }}>
              {activeConvName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{activeConvName}</h2>
              <div style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: isOtherOnline ? "var(--success)" : "var(--text-muted)" }} />
                <span style={{ color: isOtherOnline ? "var(--success)" : "var(--text-muted)", fontWeight: 600 }}>{isOtherOnline ? "Active Now" : "Offline"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", padding: "10px 4px" }} className="custom-scrollbar">
        {threadMessages.length === 0 ? (
          <div className="search-empty" style={{ margin: "auto", opacity: 0.6 }}>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          (Array.isArray(threadMessages) ? threadMessages : []).map((msg) => (
            <div
              key={msg.id}
              className={`message-bubble ${msg.fromEmail === accountEmail ? "message-sent" : "message-received"}`}
            >
              {msg.mediaUrl && msg.mediaType === "video" ? (
                <video src={msg.mediaUrl} controls style={{ maxWidth: "100%", borderRadius: "12px", marginBottom: msg.text ? 8 : 0 }} />
              ) : msg.mediaUrl ? (
                <img src={msg.mediaUrl} alt="media" style={{ maxWidth: "100%", borderRadius: "12px", marginBottom: msg.text ? 8 : 0, cursor: "zoom-in" }} onClick={() => window.open(msg.mediaUrl, "_blank")} />
              ) : null}
              {msg.text && <p>{msg.text}</p>}
              <div style={{ fontSize: "10px", opacity: 0.7, marginTop: 4, textAlign: "right" }}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        {msgError && <div className="feedback error" style={{ marginBottom: 12 }}>{msgError}</div>}
        
        {mediaPreview && (
          <div style={{ position: "relative", display: "inline-block", marginBottom: 12, animation: "fadeIn 0.3s" }}>
             {mediaFile?.type.startsWith("video") 
               ? <video src={mediaPreview} style={{ height: 120, borderRadius: "14px", border: "2px solid var(--accent)" }} />
               : <img src={mediaPreview} alt="preview" style={{ height: 120, borderRadius: "14px", border: "2px solid var(--accent)" }} />
             }
             <button type="button" onClick={clearMedia} style={{ position: "absolute", top: -8, right: -8, width: 24, height: 24, borderRadius: "50%", background: "var(--danger)", border: "2px solid var(--bg-card)", color: "white", cursor: "pointer", fontWeight: 800 }}>&times;</button>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", background: "var(--bg-dark)", padding: "8px", borderRadius: "20px", border: "1px solid var(--border)" }}>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleMediaSelect} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="action-button" style={{ padding: "10px", borderRadius: "50%", background: "var(--bg-elevated)" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
          </button>
          <textarea
            style={{ flex: 1, background: "transparent", border: "none", color: "var(--text-main)", resize: "none", padding: "10px 0", maxHeight: "120px", outline: "none" }}
            placeholder={mediaUploading ? "Uploading media..." : "Type your message..."}
            value={msgDraft}
            onChange={(e) => setMsgDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button 
            type="button" 
            onClick={sendMessage} 
            disabled={msgLoading || mediaUploading || (!msgDraft.trim() && !mediaFile)}
            className="post-button"
            style={{ borderRadius: "50%", width: 44, height: 44, padding: 0, flexShrink: 0 }}
          >
            {mediaUploading 
              ? <div className="skeleton-spinner" style={{ width: 18, height: 18, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
