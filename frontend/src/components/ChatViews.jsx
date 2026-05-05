import React from "react";
import { parseMarkdown } from "../utils/markdown";

const QUICK_EMOJIS = ["😀","😂","❤️","🔥","👍","👎","😮","🎉","💯","✨","🙏","😢"];

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDateSeparator(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today - msgDay) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function TypingDots() {
  return (
    <div className="message-bubble message-received" style={{ padding: "10px 16px", display: "inline-flex", gap: 4, alignItems: "center" }}>
      <span className="typing-dot" style={{ animationDelay: "0s" }} />
      <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
      <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
    </div>
  );
}

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
        <div className="member-list" style={{ gap: 4 }}>
          {(Array.isArray(conversations) ? conversations : []).map((conv) => {
            const lastMsg = conv.messages?.[conv.messages.length - 1];
            const preview = lastMsg ? (lastMsg.text || "Sent an attachment") : "";
            return (
              <div
                key={conv.otherEmail}
                className="conv-card"
                style={{
                  cursor: "pointer",
                  padding: "14px 16px",
                  borderRadius: "16px",
                  border: conv.unread > 0 ? "1px solid var(--accent)" : "1px solid transparent",
                  background: conv.unread > 0 ? "hsla(14, 100%, 50%, 0.06)" : "var(--bg-dark)",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 14
                }}
                onClick={() => void openConversation(conv.otherEmail, conv.otherName)}
              >
                <div className="member-avatar" style={{ width: 48, height: 48, flexShrink: 0 }}>{conv.otherName?.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span className="member-name" style={{ fontSize: "1rem", fontWeight: conv.unread > 0 ? 800 : 600 }}>{conv.otherName}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0, fontWeight: 500 }}>{formatRelativeTime(conv.lastAt)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.84rem", color: conv.unread > 0 ? "var(--text-main)" : "var(--text-muted)", fontWeight: conv.unread > 0 ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
                      {lastMsg?.fromEmail !== conv.otherEmail ? "You: " : ""}{preview.slice(0, 60)}
                    </span>
                    {conv.unread > 0 ? (
                      <span style={{ background: "var(--accent)", color: "#fff", borderRadius: "10px", padding: "2px 8px", fontSize: "0.7rem", fontWeight: 800, flexShrink: 0 }}>
                        {conv.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ThreadView({
  activeConvName,
  accountEmail,
  activeConv,
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
  isOtherOnline,
  typingUsers,
  sendTyping,
  sendStopTyping,
  uploadProgress,
  handleDeleteMessage,
  handleEditMessage
}) {
  const isTyping = typingUsers.has(activeConv);
  const typingTimeoutRef = React.useRef(null);
  const [showEmoji, setShowEmoji] = React.useState(false);
  const chatContainerRef = React.useRef(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const [editingMsgId, setEditingMsgId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState("");

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const threshold = 80;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  };

  React.useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadMessages, isAtBottom]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setMsgDraft(val);

    if (activeConv) {
      sendTyping(activeConv);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendStopTyping(activeConv);
      }, 3000);
    }
  };

  const insertEmoji = (emoji) => {
    setMsgDraft(prev => prev + emoji);
    setShowEmoji(false);
  };

  // Group messages by date
  let lastDateLabel = "";

  return (
    <div className="content-card chat-window" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="chat-header" style={{ marginBottom: 0, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="action-button" type="button" onClick={() => { void loadConversations(); setView("messages"); }} style={{ padding: "8px" }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="member-avatar" style={{ width: 44, height: 44, fontSize: "1.1rem" }}>
              {activeConvName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{activeConvName}</h2>
              <div style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: isOtherOnline ? "var(--success)" : "var(--text-muted)", boxShadow: isOtherOnline ? "0 0 8px var(--success)" : "none", transition: "all 0.3s" }} />
                <span style={{ color: isOtherOnline ? "var(--success)" : "var(--text-muted)", fontWeight: 600 }}>
                  {isTyping ? "typing..." : isOtherOnline ? "Active Now" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", padding: "16px 8px" }}
        className="custom-scrollbar"
      >
        {threadMessages.length === 0 ? (
          <div className="search-empty" style={{ margin: "auto", opacity: 0.5 }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--text-muted)" style={{ marginBottom: 12 }}><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            <p style={{ fontSize: "0.95rem" }}>Say hello to <strong>{activeConvName}</strong>! 👋</p>
          </div>
        ) : (
          (Array.isArray(threadMessages) ? threadMessages : []).map((msg) => {
            const isMine = msg.fromEmail === accountEmail;
            const dateLabel = formatDateSeparator(msg.createdAt);
            let showDateSep = false;
            if (dateLabel !== lastDateLabel) {
              showDateSep = true;
              lastDateLabel = dateLabel;
            }

            return (
              <React.Fragment key={msg.id}>
                {showDateSep && (
                  <div style={{ textAlign: "center", padding: "12px 0", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    <span style={{ background: "var(--bg-card)", padding: "4px 14px", borderRadius: "10px", border: "1px solid var(--border)" }}>{dateLabel}</span>
                  </div>
                )}
                <div
                  className={`msg-row ${isMine ? "msg-row-sent" : "msg-row-received"}`}
                  style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", padding: "2px 0" }}
                >
                  <div
                    className={`message-bubble ${isMine ? "message-sent" : "message-received"}`}
                    style={{ maxWidth: "75%", position: "relative" }}
                  >
                    {editingMsgId === msg.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
                        <textarea
                          autoFocus
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditMessage(msg.id, editDraft); setEditingMsgId(null); } }}
                          style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: 8, minHeight: 60, fontSize: "0.95rem" }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                          <button onClick={() => setEditingMsgId(null)} style={{ background: "transparent", color: "white", border: "none", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                          <button onClick={() => { handleEditMessage(msg.id, editDraft); setEditingMsgId(null); }} style={{ background: "white", color: "black", border: "none", borderRadius: 12, padding: "4px 12px", fontSize: "0.85rem", cursor: "pointer", fontWeight: 700 }}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.mediaUrl && msg.mediaType === "video" ? (
                          <video src={msg.mediaUrl} controls style={{ maxWidth: "100%", borderRadius: "12px", marginBottom: msg.text ? 8 : 0 }} />
                        ) : msg.mediaUrl ? (
                          <img src={msg.mediaUrl} alt="media" style={{ maxWidth: "100%", borderRadius: "12px", marginBottom: msg.text ? 8 : 0, cursor: "zoom-in" }} onClick={() => window.open(msg.mediaUrl, "_blank")} />
                        ) : null}
                        {msg.text && <p dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} style={{ margin: 0, lineHeight: 1.5 }} />}
                      </>
                    )}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 }}>
                      {isMine && !msg._optimistic && editingMsgId !== msg.id && (
                        <div style={{ display: "flex", gap: 4, marginRight: "auto" }}>
                          <button title="Edit" onClick={() => { setEditingMsgId(msg.id); setEditDraft(msg.text); }} style={{ background: "none", border: "none", padding: 2, color: "rgba(255,255,255,0.8)", cursor: "pointer" }}><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
                          <button title="Delete" onClick={() => handleDeleteMessage(msg.id)} style={{ background: "none", border: "none", padding: 2, color: "rgba(255,255,255,0.8)", cursor: "pointer" }}><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
                        </div>
                      )}
                      {msg.isEdited && <span style={{ fontSize: "10px", opacity: 0.6, fontStyle: "italic", marginRight: 4 }}>(edited)</span>}
                      <span style={{ fontSize: "10px", opacity: 0.6 }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isMine && (
                        <span style={{ fontSize: "11px", opacity: 0.7, color: msg.read ? "var(--accent)" : "rgba(255,255,255,0.6)" }} title={msg.read ? "Read" : "Delivered"}>
                          {msg.read ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        {isTyping && <TypingDots />}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && threadMessages.length > 5 && (
        <button
          type="button"
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
          style={{
            position: "absolute", bottom: 100, right: 24, width: 40, height: 40,
            borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)",
            color: "var(--text-main)", cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 10
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
        </button>
      )}

      {/* Input Area */}
      <div style={{ marginTop: "auto", paddingTop: 12, position: "relative" }}>
        {msgError && <div className="feedback error" style={{ marginBottom: 12 }}>{msgError}</div>}

        {mediaPreview && (
          <div style={{ position: "relative", display: "inline-block", marginBottom: 12, animation: "fadeIn 0.3s" }}>
             {mediaFile?.type.startsWith("video")
               ? <video src={mediaPreview} style={{ height: 100, borderRadius: "14px", border: "2px solid var(--accent)" }} />
               : <img src={mediaPreview} alt="preview" style={{ height: 100, borderRadius: "14px", border: "2px solid var(--accent)" }} />
             }
             {mediaUploading && (
               <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", borderRadius: "14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white" }}>
                 <div style={{ width: "80%", height: 6, background: "rgba(255,255,255,0.3)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                   <div style={{ width: `${uploadProgress}%`, height: "100%", background: "var(--accent)", transition: "width 0.2s" }} />
                 </div>
                 <span style={{ fontSize: "12px", fontWeight: 800 }}>{uploadProgress}%</span>
               </div>
             )}
             <button type="button" onClick={clearMedia} style={{ position: "absolute", top: -8, right: -8, width: 24, height: 24, borderRadius: "50%", background: "var(--danger)", border: "2px solid var(--bg-card)", color: "white", cursor: "pointer", fontWeight: 800 }}>&times;</button>
          </div>
        )}

        {/* Emoji Picker */}
        {showEmoji && (
          <div style={{
            position: "absolute", bottom: "100%", left: 0, marginBottom: 8,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "16px", padding: "12px", display: "flex", flexWrap: "wrap",
            gap: 4, maxWidth: 280, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            animation: "fadeIn 0.2s", zIndex: 20
          }}>
            {QUICK_EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => insertEmoji(e)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", padding: "6px", borderRadius: "8px", transition: "background 0.15s" }}
                onMouseEnter={ev => ev.currentTarget.style.background = "var(--bg-elevated)"}
                onMouseLeave={ev => ev.currentTarget.style.background = "none"}
              >{e}</button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "var(--bg-dark)", padding: "8px 8px 8px 4px", borderRadius: "20px", border: "1px solid var(--border)" }}>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleMediaSelect} />

          <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="action-button" style={{ padding: "10px", borderRadius: "50%", background: showEmoji ? "var(--accent-soft)" : "transparent", flexShrink: 0 }} title="Emoji">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
          </button>

          <button type="button" onClick={() => fileInputRef.current?.click()} className="action-button" style={{ padding: "10px", borderRadius: "50%", flexShrink: 0 }} title="Attach media">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
          </button>

          <textarea
            style={{ flex: 1, background: "transparent", border: "none", color: "var(--text-main)", resize: "none", padding: "10px 4px", maxHeight: "120px", outline: "none", fontFamily: "inherit", fontSize: "0.95rem", lineHeight: 1.4 }}
            placeholder={mediaUploading ? "Uploading media..." : "Type a message..."}
            value={msgDraft}
            onChange={handleTextChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); setShowEmoji(false); } }}
            onPaste={(e) => {
              if (e.clipboardData) {
                // Try files array first
                if (e.clipboardData.files && e.clipboardData.files.length > 0) {
                  const file = e.clipboardData.files[0];
                  if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
                    e.preventDefault();
                    handleMediaSelect({ target: { files: [file] } });
                    return;
                  }
                }
                // Try items array (common for mobile keyboards like Gboard)
                if (e.clipboardData.items) {
                  for (let i = 0; i < e.clipboardData.items.length; i++) {
                    const item = e.clipboardData.items[i];
                    if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
                      const file = item.getAsFile();
                      if (file) {
                        e.preventDefault();
                        handleMediaSelect({ target: { files: [file] } });
                        return;
                      }
                    }
                  }
                }
              }
            }}
            rows={1}
          />

          <button
            type="button"
            onClick={() => { sendMessage(); setShowEmoji(false); }}
            disabled={msgLoading || mediaUploading || (!msgDraft.trim() && !mediaFile)}
            className="post-button"
            style={{ borderRadius: "50%", width: 44, height: 44, padding: 0, flexShrink: 0, transition: "all 0.2s" }}
          >
            {mediaUploading
              ? <div style={{ fontSize: "10px", fontWeight: 800 }}>{uploadProgress}%</div>
              : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
