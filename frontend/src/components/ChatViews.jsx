import React from "react";
import { parseMarkdown } from "../utils/markdown";
import { api } from "../services/api";

const QUICK_GIFS = [
  { id: "fallback-1", title: "Excited", preview: "https://media.giphy.com/media/3o7TKsQ8UQ4l4LhGz6/giphy.gif", url: "https://media.giphy.com/media/3o7TKsQ8UQ4l4LhGz6/giphy.gif" },
  { id: "fallback-2", title: "Waiting", preview: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif", url: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif" },
  { id: "fallback-3", title: "Nice", preview: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
  { id: "fallback-4", title: "Hello", preview: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif", url: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif" }
];

const QUICK_EMOJIS = ["😀", "😂", "❤️", "🔥", "👍", "👎", "😮", "🎉", "💯", "✨", "🙏", "😢", "😍", "🤔", "👏", "🥳", "😎", "🫡", "💪", "🎯"];
const REACTION_MAP = { heart: "❤️", laugh: "😂", fire: "🔥" };

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

function getFirstUrl(text = "") {
  return String(text).match(/https?:\/\/[^\s<]+/i)?.[0] || "";
}

function getLinkPreview(text = "") {
  const url = getFirstUrl(text);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return {
      url,
      host: parsed.hostname.replace(/^www\./, ""),
      path: parsed.pathname === "/" ? parsed.origin : `${parsed.origin}${parsed.pathname}`
    };
  } catch {
    return null;
  }
}

function getMessageStatus(message) {
  if (message._failed) return "Failed - tap to retry";
  if (message._optimistic) return "Sending...";
  if (message.read) return "Seen";
  return "Delivered";
}

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
      <div className="message-bubble message-received" style={{ padding: "10px 16px", display: "inline-flex", gap: 5, alignItems: "center" }}>
        <span className="typing-dot" style={{ animationDelay: "0s" }} />
        <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
        <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
      </div>
    </div>
  );
}

// ─── MessagesView ──────────────────────────────────────────────────────────────
export function MessagesView({ conversations, openConversation, unreadConversationCount }) {
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!search.trim()) return conversations;
    return conversations.filter(c =>
      c.otherName?.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage?.toLowerCase().includes(search.toLowerCase())
    );
  }, [conversations, search]);

  return (
    <div className="content-card">
      {/* Header */}
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem" }}>Chats</h1>
          <p style={{ color: "var(--text-muted)" }}>
            {unreadConversationCount
              ? `${unreadConversationCount} unread chat${unreadConversationCount === 1 ? "" : "s"}`
              : "Private chats, media, replies, and reactions."}
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--accent)", pointerEvents: "none" }} viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder="Search chats..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 42, height: 44, borderRadius: "999px", background: "var(--bg-elevated)" }}
        />
      </div>

      {conversations.length === 0 ? (
        <div className="search-empty" style={{ padding: "60px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <svg viewBox="0 0 24 24" width="52" height="52" fill="var(--text-muted)" style={{ opacity: 0.4 }}>
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
          <p style={{ fontSize: "1rem", fontWeight: 600 }}>No conversations yet</p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Start a chat from someone's profile!</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="search-empty" style={{ padding: "40px 0" }}>No conversations match "{search}"</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map((conv) => {
            const preview = conv.lastMessage || "";
            return (
              <div
                key={conv.otherEmail}
                className="conv-card"
                style={{
                  cursor: "pointer",
                  padding: "14px 16px",
                  borderRadius: "16px",
                  border: conv.unread > 0 ? "1px solid var(--accent)" : "1px solid transparent",
                  background: conv.unread > 0 ? "hsla(172, 78%, 50%, 0.06)" : "var(--bg-dark)",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 14
                }}
                onClick={() => void openConversation(conv.otherEmail, conv.otherName)}
              >
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div className="member-avatar" style={{ width: 50, height: 50, fontSize: "1.2rem", borderRadius: "16px" }}>
                    {conv.otherName?.charAt(0).toUpperCase()}
                  </div>
                  {conv.unread > 0 && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      background: "var(--accent)", color: "hsl(232, 24%, 7%)",
                      borderRadius: "10px", padding: "2px 6px",
                      fontSize: "0.65rem", fontWeight: 900,
                      border: "2px solid var(--bg-card)"
                    }}>{conv.unread > 9 ? "9+" : conv.unread}</span>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: "0.97rem", fontWeight: conv.unread > 0 ? 800 : 600, color: "var(--text-main)" }}>
                      {conv.otherName}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500, flexShrink: 0 }}>
                      {formatRelativeTime(conv.lastAt)}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "0.84rem",
                    color: conv.unread > 0 ? "var(--text-main)" : "var(--text-muted)",
                    fontWeight: conv.unread > 0 ? 600 : 400,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    display: "block"
                  }}>
                    {preview.slice(0, 70)}
                  </span>
                </div>

                <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.5 }}>
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ThreadView ────────────────────────────────────────────────────────────────
export function ThreadView({
  activeConv,
  activeConvName,
  accountEmail,
  accountName,
  threadMessages,
  setThreadMessages,
  loadConversations,
  setView,
  messagesEndRef,
  msgError,
  msgDraft,
  setMsgDraft,
  mediaFile,
  setMediaFile,
  mediaPreview,
  setMediaPreview,
  mediaUploading,
  setMediaUploading,
  uploadProgress,
  setUploadProgress,
  replyingTo,
  setReplyingTo,
  clearMedia,
  fileInputRef,
  handleMediaSelect,
  handleMessageMediaPaste,
  msgLoading,
  isOtherOnline,
  sendMessage,
  typingUsers,
  sendTyping,
  sendStopTyping,
  handleDeleteMessage,
  handleEditMessage,
  handleMessageReaction,
  handleRetryMessage
}) {
  const isTyping = typingUsers.has(activeConv);
  const typingTimeoutRef = React.useRef(null);
  const chatContainerRef = React.useRef(null);

  const [showEmoji, setShowEmoji] = React.useState(false);
  const [showGifs, setShowGifs] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [msgSearch, setMsgSearch] = React.useState("");
  const [gifQuery, setGifQuery] = React.useState("trending");
  const [gifResults, setGifResults] = React.useState(QUICK_GIFS);
  const [gifLoading, setGifLoading] = React.useState(false);
  const [gifError, setGifError] = React.useState("");
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const [editingMsgId, setEditingMsgId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState("");
  const [hoveredMsgId, setHoveredMsgId] = React.useState(null);
  const [showAiPanel, setShowAiPanel] = React.useState(false);
  const [aiDraft, setAiDraft] = React.useState("");
  const [aiMessages, setAiMessages] = React.useState([
    { role: "assistant", text: "Hi! I'm your Pulse chat assistant. I can help you draft messages, summarize conversations, or answer questions." }
  ]);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [imageZoom, setImageZoom] = React.useState(null);
  const [recording, setRecording] = React.useState(false);
  const mediaRecorderRef = React.useRef(null);
  const recordedChunksRef = React.useRef([]);

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };

  React.useEffect(() => {
    if (isAtBottom) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages, isAtBottom]);

  React.useEffect(() => {
    if (!showGifs) return;
    const searchTerm = gifQuery.trim() || "trending";
    const timer = setTimeout(async () => {
      setGifLoading(true);
      setGifError("");
      try {
        const data = await api.searchGifs(searchTerm, 12);
        if (data.ok && data.gifs.length) setGifResults(data.gifs);
        else { setGifResults(QUICK_GIFS); setGifError(data.message || "Showing quick GIFs"); }
      } catch (err) {
        setGifResults(QUICK_GIFS);
        setGifError(err.message || "Showing quick GIFs");
      } finally { setGifLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [gifQuery, showGifs]);

  const insertEmoji = (emoji) => {
    setMsgDraft(c => `${c}${emoji}`);
    setShowEmoji(false);
  };

  const handleTextChange = (e) => {
    setMsgDraft(e.target.value);
    if (activeConv) {
      sendTyping(activeConv);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => sendStopTyping(activeConv), 3000);
    }
  };

  const filteredMessages = React.useMemo(() => {
    if (!msgSearch.trim()) return threadMessages;
    return threadMessages.filter(m =>
      m.text?.toLowerCase().includes(msgSearch.toLowerCase())
    );
  }, [threadMessages, msgSearch]);

  // AI panel
  const sendAiMessage = async () => {
    const text = aiDraft.trim();
    if (!text || aiLoading) return;
    const newUserMsg = { role: "user", text };
    setAiMessages(prev => [...prev, newUserMsg]);
    setAiDraft("");
    setAiLoading(true);

    const conversationContext = threadMessages.slice(-10).map(m =>
      `${m.fromEmail === accountEmail ? accountName : activeConvName}: ${m.text || "[media]"}`
    ).join("\n");

    const systemPrompt = `You are a helpful AI assistant embedded in Pulse, a social messaging platform. The user is ${accountName} chatting with ${activeConvName}. Recent conversation:\n${conversationContext}\n\nHelp the user draft replies, summarize, or answer questions concisely.`;

    try {
      const history = aiMessages.concat(newUserMsg)
        .filter(m => m.role !== "assistant" || aiMessages.indexOf(m) > 0)
        .map(m => ({ role: m.role, content: m.text }));

      // Immediately add a placeholder assistant message and stop the loading indicator
      setAiMessages(prev => [...prev, { role: "assistant", text: "" }]);
      setAiLoading(false);

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 500,
          system: systemPrompt,
          messages: history,
          stream: true
        })
      });

      if (!resp.ok) throw new Error("API Error");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr.trim() === "[DONE]") continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  setAiMessages(prev => {
                    const newMsgs = [...prev];
                    const lastIdx = newMsgs.length - 1;
                    newMsgs[lastIdx] = { ...newMsgs[lastIdx], text: newMsgs[lastIdx].text + parsed.delta.text };
                    return newMsgs;
                  });
                }
              } catch (e) { /* ignore chunk parse error */ }
            }
          }
        }
      }
    } catch {
      setAiMessages(prev => {
        const msgs = [...prev];
        if (msgs[msgs.length - 1].text === "") {
           msgs[msgs.length - 1].text = "Something went wrong. Please try again.";
        }
        return msgs;
      });
    } finally {
      setAiLoading(false);
    }
  };

  const useAiReply = (text) => {
    setMsgDraft(text);
    setShowAiPanel(false);
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recordedChunksRef.current = [];
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
      handleMediaSelect({ target: { files: [file] } });
    };

    recorder.start();
    setRecording(true);
  };

  let lastDateLabel = "";

  return (
    <div className="content-card chat-window chat-thread-shell" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", position: "relative", overflow: "hidden" }}>

      {/* Image zoom overlay */}
      {imageZoom && (
        <div
          onClick={() => setImageZoom(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}
        >
          <img src={imageZoom} alt="full" style={{ maxWidth: "92vw", maxHeight: "88vh", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }} />
          <button onClick={() => setImageZoom(null)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.15)", border: "none", color: "white", width: 42, height: 42, borderRadius: "50%", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Header */}
      <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className="action-button"
          type="button"
          onClick={() => { void loadConversations(); setView("messages"); }}
          style={{ padding: 8, borderRadius: "50%", flexShrink: 0 }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div className="member-avatar" style={{ width: 46, height: 46, fontSize: "1.1rem", borderRadius: "14px" }}>
              {activeConvName?.charAt(0).toUpperCase()}
            </div>
            <span style={{
              position: "absolute", bottom: 0, right: 0,
              width: 12, height: 12, borderRadius: "50%",
              background: isOtherOnline ? "var(--success)" : "var(--bg-elevated)",
              border: "2px solid var(--bg-card)",
              boxShadow: isOtherOnline ? "0 0 8px var(--success)" : "none",
              transition: "all 0.3s"
            }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeConvName}</h2>
            <span style={{ fontSize: "0.75rem", color: isTyping ? "var(--accent)" : isOtherOnline ? "var(--success)" : "var(--text-muted)", fontWeight: 600, fontStyle: isTyping ? "italic" : "normal" }}>
              {isTyping ? "typing..." : isOtherOnline ? "Active now" : "Offline"}
            </span>
          </div>
        </div>

        {/* Header actions */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            className={`action-button ${showSearch ? "active" : ""}`}
            type="button"
            onClick={() => { setShowSearch(s => !s); setMsgSearch(""); }}
            title="Search messages"
            style={{ padding: 8, borderRadius: "50%" }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          </button>
          <button
            className={`action-button ${showAiPanel ? "active" : ""}`}
            type="button"
            onClick={() => setShowAiPanel(s => !s)}
            title="AI Assistant"
            style={{ padding: "8px 12px", borderRadius: "999px", gap: 6, fontSize: "0.8rem", fontWeight: 800, background: showAiPanel ? "var(--accent-soft)" : "transparent", color: showAiPanel ? "var(--accent)" : "var(--text-muted)" }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg>
            AI
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div style={{ padding: "10px 0 4px", position: "relative" }}>
          <input
            autoFocus
            type="text"
            placeholder="Search in this conversation..."
            value={msgSearch}
            onChange={e => setMsgSearch(e.target.value)}
            style={{ paddingLeft: 42, height: 40, borderRadius: "999px", background: "var(--bg-elevated)", fontSize: "0.9rem" }}
          />
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          {msgSearch && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", color: "var(--text-muted)" }}>{filteredMessages.length} results</span>}
        </div>
      )}

      {/* Main body: messages + optional AI panel */}
      <div className="chat-thread-body" style={{ flex: 1, display: "flex", gap: 0, minHeight: 0 }}>

        {/* Messages Area */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", padding: "16px 4px", minHeight: 0 }}
        >
          {filteredMessages.length === 0 ? (
            <div className="search-empty" style={{ margin: "auto", opacity: 0.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, border: "none" }}>
              {msgSearch ? (
                <>
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="var(--text-muted)"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
                  <p>No messages match "{msgSearch}"</p>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--text-muted)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
                  <p style={{ fontSize: "0.95rem", fontWeight: 600 }}>Say hi to <strong>{activeConvName}</strong>! 👋</p>
                </>
              )}
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMine = msg.fromEmail === accountEmail;
              const dateLabel = formatDateSeparator(msg.createdAt);
              const linkPreview = getLinkPreview(msg.text);
              const messageStatus = getMessageStatus(msg);
              let showDateSep = false;
              if (dateLabel !== lastDateLabel) { showDateSep = true; lastDateLabel = dateLabel; }

              return (
                <React.Fragment key={msg.id}>
                  {showDateSep && (
                    <div style={{ textAlign: "center", padding: "14px 0 8px", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      <span style={{ background: "var(--bg-card)", padding: "4px 16px", borderRadius: "10px", border: "1px solid var(--border)" }}>{dateLabel}</span>
                    </div>
                  )}

                  <div
                    style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", padding: "3px 0", position: "relative" }}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                  >
                    {/* Hover action bar */}
                    {hoveredMsgId === msg.id && !msg._optimistic && editingMsgId !== msg.id && (
                      <div style={{
                        position: "absolute",
                        [isMine ? "left" : "right"]: 0,
                        top: "50%", transform: "translateY(-50%)",
                        display: "flex", alignItems: "center", gap: 2,
                        background: "var(--bg-card)", border: "1px solid var(--border)",
                        borderRadius: "999px", padding: "3px 6px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        zIndex: 10, animation: "fadeIn 0.15s ease"
                      }}>
                        {["heart", "laugh", "fire"].map(r => (
                          <button key={r} type="button" title={r}
                            onClick={() => handleMessageReaction?.(msg.id, r)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", padding: "2px 4px", borderRadius: "6px", transition: "background 0.12s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                          >{REACTION_MAP[r]}</button>
                        ))}
                        <div style={{ width: 1, height: 14, background: "var(--border)", margin: "0 2px" }} />
                        <button type="button" title="Reply"
                          onClick={() => setReplyingTo({ id: msg.id, text: msg.text || "Media", fromName: msg.fromName })}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: "6px", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700 }}
                        >Reply</button>
                        {msg.text && (
                          <button type="button" title="Copy"
                            onClick={() => navigator.clipboard?.writeText(msg.text)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: "6px", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700 }}
                          >Copy</button>
                        )}
                        {isMine && (
                          <>
                            <button type="button" title="Edit"
                              onClick={() => { setEditingMsgId(msg.id); setEditDraft(msg.text); }}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: "6px", color: "var(--text-muted)" }}
                            >
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                            </button>
                            <button type="button" title="Delete"
                              onClick={() => handleDeleteMessage(msg.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: "6px", color: "var(--danger)" }}
                            >
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    <div
                      className={`message-bubble ${isMine ? "message-sent" : "message-received"}`}
                      onClick={() => msg._failed && handleRetryMessage?.(msg)}
                      style={{ maxWidth: "72%", borderColor: msg._failed ? "var(--danger)" : undefined, cursor: msg._failed ? "pointer" : undefined, opacity: msg._failed ? 0.82 : 1 }}
                    >
                      {/* Reply preview */}
                      {msg.replyTo && (
                        <div style={{ borderLeft: "3px solid rgba(255,255,255,0.4)", paddingLeft: 8, marginBottom: 8, opacity: 0.8, fontSize: "0.78rem", borderRadius: "0 4px 4px 0", background: "rgba(0,0,0,0.12)", padding: "4px 8px" }}>
                          <strong>{msg.replyTo.fromName}</strong>
                          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{msg.replyTo.text || "Media"}</div>
                        </div>
                      )}

                      {/* Edit mode */}
                      {editingMsgId === msg.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
                          <textarea
                            autoFocus
                            value={editDraft}
                            onChange={e => setEditDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditMessage(msg.id, editDraft); setEditingMsgId(null); } }}
                            style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: 8, minHeight: 60, fontSize: "0.9rem", resize: "none" }}
                          />
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                            <button onClick={() => setEditingMsgId(null)} style={{ background: "transparent", color: "rgba(255,255,255,0.7)", border: "none", fontSize: "0.8rem", cursor: "pointer", padding: "4px 8px" }}>Cancel</button>
                            <button onClick={() => { handleEditMessage(msg.id, editDraft); setEditingMsgId(null); }} style={{ background: "white", color: "#111", border: "none", borderRadius: 8, padding: "4px 12px", fontSize: "0.82rem", cursor: "pointer", fontWeight: 800 }}>Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Media */}
                          {msg.mediaUrl && msg.mediaType === "audio" ? (
                            <audio src={msg.mediaUrl} controls style={{ width: 240, maxWidth: "100%", marginBottom: msg.text ? 8 : 0 }} />
                          ) : msg.mediaUrl && msg.mediaType === "video" ? (
                            <video src={msg.mediaUrl} controls style={{ maxWidth: "100%", borderRadius: 10, marginBottom: msg.text ? 8 : 0 }} />
                          ) : msg.mediaUrl ? (
                            <img src={msg.mediaUrl} alt="media" style={{ maxWidth: "100%", borderRadius: 10, marginBottom: msg.text ? 8 : 0, cursor: "zoom-in", display: "block" }} onClick={() => setImageZoom(msg.mediaUrl)} />
                          ) : null}
                          {/* Text */}
                          {msg.text && <p dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} style={{ margin: 0, lineHeight: 1.55, fontSize: "0.95rem" }} />}
                          {linkPreview && (
                            <a href={linkPreview.url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 8, padding: "9px 10px", borderRadius: 10, background: "rgba(0,0,0,0.14)", border: "1px solid rgba(255,255,255,0.18)", color: "inherit", textDecoration: "none" }}>
                              <strong style={{ display: "block", fontSize: "0.78rem", marginBottom: 2 }}>{linkPreview.host}</strong>
                              <span style={{ display: "block", fontSize: "0.72rem", opacity: 0.72, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{linkPreview.path}</span>
                            </a>
                          )}
                        </>
                      )}

                      {/* Meta row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, justifyContent: "flex-end" }}>
                        {msg.isEdited && <span style={{ fontSize: "0.65rem", opacity: 0.6, fontStyle: "italic" }}>(edited)</span>}
                        <span style={{ fontSize: "0.68rem", opacity: 0.65 }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isMine && (
                          <span style={{ fontSize: "0.7rem", color: msg.read ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)" }} title={msg.read ? "Read" : "Delivered"}>
                            {msg.read ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>

                      {msg._failed && (
                        <button type="button" onClick={() => handleRetryMessage?.(msg)} style={{ marginTop: 6, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)", color: "inherit", borderRadius: 999, padding: "3px 9px", fontSize: "0.72rem", cursor: "pointer" }}>
                          Failed - tap to retry
                        </button>
                      )}
                      {msg._optimistic && (
                        <div style={{ marginTop: 4, fontSize: "0.72rem", opacity: 0.7 }}>Sending...</div>
                      )}

                      {/* Reactions */}
                      {msg.reactions && Object.values(msg.reactions).some(e => Array.isArray(e) && e.length > 0) && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                          {Object.entries(msg.reactions).map(([r, emails]) =>
                            Array.isArray(emails) && emails.length ? (
                              <span key={r} style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.18)", borderRadius: 10, padding: "2px 7px", cursor: "pointer" }} onClick={() => handleMessageReaction?.(msg.id, r)}>
                                {REACTION_MAP[r]} {emails.length}
                              </span>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          {isTyping && <TypingDots />}
          <div ref={messagesEndRef} />
        </div>

        {/* AI Assistant Panel */}
        {showAiPanel && (
          <div style={{
            width: 300, flexShrink: 0, borderLeft: "1px solid var(--border)",
            display: "flex", flexDirection: "column", background: "var(--bg-dark)",
            animation: "fadeIn 0.2s ease"
          }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), hsl(188, 84%, 46%))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="hsl(232,24%,7%)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg>
                </div>
                <span style={{ fontSize: "0.88rem", fontWeight: 800 }}>AI Assistant</span>
              </div>
              <button className="action-button" onClick={() => setShowAiPanel(false)} style={{ padding: 4, borderRadius: "50%" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            </div>

            {/* AI Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
              {aiMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 4 }}>
                  <div style={{
                    padding: "9px 12px", borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                    background: m.role === "user" ? "linear-gradient(135deg, var(--accent), hsl(188,84%,46%))" : "var(--bg-card)",
                    border: m.role === "user" ? "none" : "1px solid var(--border)",
                    color: m.role === "user" ? "hsl(232,24%,7%)" : "var(--text-main)",
                    fontSize: "0.84rem", lineHeight: 1.55, maxWidth: "90%"
                  }}>{m.text}</div>
                  {m.role === "assistant" && (
                    <button onClick={() => useAiReply(m.text)}
                      style={{ fontSize: "0.72rem", background: "var(--accent-soft)", border: "1px solid var(--border-focus)", color: "var(--accent)", borderRadius: 8, padding: "3px 10px", cursor: "pointer", fontWeight: 700 }}>
                      Use as reply ↗
                    </button>
                  )}
                </div>
              ))}
              {aiLoading && (
                <div className="message-bubble message-received" style={{ padding: "10px 16px", display: "inline-flex", gap: 5, alignItems: "center", width: "fit-content" }}>
                  <span className="typing-dot" style={{ animationDelay: "0s" }} />
                  <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
                  <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
                </div>
              )}
            </div>

            {/* Quick prompts */}
            <div style={{ padding: "8px 12px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid var(--border)" }}>
              {["Summarize chat", "Draft a reply", "Suggest topics"].map(p => (
                <button key={p} onClick={() => { setAiDraft(p); }}
                  style={{ fontSize: "0.72rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "999px", padding: "4px 10px", cursor: "pointer", color: "var(--text-muted)", fontWeight: 700, transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >{p}</button>
              ))}
            </div>

            {/* AI input */}
            <div style={{ padding: "8px 12px 12px", display: "flex", gap: 6, alignItems: "flex-end" }}>
              <textarea
                placeholder="Ask AI anything..."
                value={aiDraft}
                onChange={e => setAiDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                style={{ flex: 1, minHeight: 40, maxHeight: 100, resize: "none", padding: "10px 12px", fontSize: "0.84rem", borderRadius: 12, background: "var(--bg-card)" }}
              />
              <button className="post-button" onClick={sendAiMessage} disabled={aiLoading || !aiDraft.trim()} style={{ width: 38, height: 38, padding: 0, borderRadius: "50%", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to bottom */}
      {!isAtBottom && threadMessages.length > 5 && (
        <button
          type="button"
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
          style={{
            position: "absolute", bottom: 90, right: showAiPanel ? 316 : 16,
            width: 38, height: 38, borderRadius: "50%",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            color: "var(--text-main)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 10, transition: "right 0.2s"
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" /></svg>
        </button>
      )}

      {/* Input Area */}
      <div style={{ marginTop: "auto", paddingTop: 12, position: "relative" }}>
        {msgError && <div className="feedback error" style={{ marginBottom: 10 }}>{msgError}</div>}

        {/* Reply preview */}
        {replyingTo && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "8px 12px", borderLeft: "3px solid var(--accent)", background: "var(--bg-dark)", borderRadius: 10, animation: "fadeIn 0.2s" }}>
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: "0.78rem", color: "var(--accent)" }}>Replying to {replyingTo.fromName}</strong>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{replyingTo.text}</div>
            </div>
            <button type="button" className="action-button" onClick={() => setReplyingTo(null)} style={{ padding: 4, borderRadius: "50%", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
            </button>
          </div>
        )}

        {/* Media preview */}
        {mediaPreview && (
          <div style={{ position: "relative", display: "inline-block", marginBottom: 10, animation: "fadeIn 0.2s" }}>
            {mediaFile?.type.startsWith("audio")
              ? <audio src={mediaPreview} controls style={{ width: 240, maxWidth: "100%" }} />
              : mediaFile?.type.startsWith("video")
              ? <video src={mediaPreview} style={{ height: 90, borderRadius: 12, border: "2px solid var(--accent)" }} />
              : <img src={mediaPreview} alt="preview" style={{ height: 90, borderRadius: 12, border: "2px solid var(--accent)" }} />
            }
            {mediaUploading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white" }}>
                <div style={{ width: "78%", height: 5, background: "rgba(255,255,255,0.25)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ width: `${uploadProgress}%`, height: "100%", background: "var(--accent)", transition: "width 0.2s" }} />
                </div>
                <span style={{ fontSize: "11px", fontWeight: 800 }}>{uploadProgress}%</span>
              </div>
            )}
            <button type="button" onClick={clearMedia} style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: "50%", background: "var(--danger)", border: "2px solid var(--bg-card)", color: "white", cursor: "pointer", fontWeight: 800, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        )}

        {/* Emoji Picker */}
        {showEmoji && (
          <div style={{
            position: "absolute", bottom: "100%", left: 0, marginBottom: 8,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 16, padding: 12, display: "flex", flexWrap: "wrap",
            gap: 4, maxWidth: 300, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            animation: "fadeIn 0.18s", zIndex: 20
          }}>
            {QUICK_EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => insertEmoji(e)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", padding: "5px", borderRadius: 8, transition: "background 0.12s" }}
                onMouseEnter={ev => ev.currentTarget.style.background = "var(--bg-elevated)"}
                onMouseLeave={ev => ev.currentTarget.style.background = "none"}
              >{e}</button>
            ))}
          </div>
        )}

        {/* GIF Picker */}
        {showGifs && (
          <div style={{
            position: "absolute", bottom: "100%", left: 52, marginBottom: 8,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 16, padding: 12, width: "min(340px, calc(100vw - 32px))",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 20
          }}>
            <input value={gifQuery} onChange={e => setGifQuery(e.target.value)} placeholder="Search GIFs..." style={{ marginBottom: 10, height: 38 }} />
            {gifError && <div style={{ color: "var(--text-muted)", fontSize: "0.73rem", marginBottom: 6 }}>{gifError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxHeight: 240, overflowY: "auto" }}>
              {gifLoading ? (
                <div className="search-empty" style={{ gridColumn: "1 / -1", padding: 16, border: "none" }}>Searching...</div>
              ) : gifResults.map(gif => (
                <button key={gif.id || gif.url} type="button"
                  onClick={() => { handleMediaSelect(null, gif.url); setShowGifs(false); }}
                  style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", borderRadius: 8, overflow: "hidden" }}
                >
                  <img src={gif.preview} alt={gif.title || "GIF"} style={{ width: "100%", aspectRatio: "1.2", objectFit: "cover", borderRadius: 8 }} />
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, color: "var(--text-muted)", fontSize: "0.68rem", textAlign: "right" }}>Powered by GIPHY</div>
          </div>
        )}

        {/* Input bar */}
        <div
          style={{ display: "flex", gap: 6, alignItems: "flex-end", background: "var(--bg-dark)", padding: "6px 6px 6px 4px", borderRadius: 22, border: "1px solid var(--border)", transition: "border-color 0.2s" }}
          onFocus={e => e.currentTarget.style.borderColor = "var(--border-focus)"}
          onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
          onDrop={e => {
            const file = Array.from(e.dataTransfer?.files || []).find(f => f.type.startsWith("image/") || f.type.startsWith("video/") || f.type.startsWith("audio/"));
            if (!file) return;
            e.preventDefault();
            handleMediaSelect({ target: { files: [file] } });
          }}
          onDragOver={e => e.preventDefault()}
        >
          <input ref={fileInputRef} type="file" accept=".gif,image/gif,image/*,video/*,audio/*" style={{ display: "none" }} onChange={handleMediaSelect} />

          <button type="button" onClick={() => { setShowEmoji(s => !s); setShowGifs(false); }}
            className="action-button"
            style={{ padding: 9, borderRadius: "50%", background: showEmoji ? "var(--accent-soft)" : "transparent", flexShrink: 0 }}
            title="Emoji"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" /></svg>
          </button>

          <button type="button" onClick={() => { setShowGifs(s => !s); setShowEmoji(false); }}
            className="action-button"
            style={{ padding: "9px 10px", borderRadius: "50%", background: showGifs ? "var(--accent-soft)" : "transparent", flexShrink: 0, fontSize: "0.75rem", fontWeight: 900 }}
            title="GIF"
          >GIF</button>

          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="action-button"
            style={{ padding: 9, borderRadius: "50%", flexShrink: 0 }}
            title="Attach media"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
          </button>

          <button type="button" onClick={() => void toggleRecording()}
            className="action-button"
            style={{ padding: 9, borderRadius: "50%", flexShrink: 0, background: recording ? "var(--danger)" : "transparent", color: recording ? "white" : "var(--text-muted)" }}
            title={recording ? "Stop voice note" : "Record voice note"}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" /></svg>
          </button>

          <textarea
            placeholder={mediaUploading ? "Uploading..." : "Type a message..."}
            value={msgDraft}
            onChange={handleTextChange}
            onPaste={handleMessageMediaPaste}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
                setShowEmoji(false);
                setShowGifs(false);
              }
            }}
            style={{ flex: 1, background: "transparent", border: "none", color: "var(--text-main)", padding: "10px 4px", resize: "none", maxHeight: 120, outline: "none", fontFamily: "inherit", fontSize: "0.95rem", lineHeight: 1.5 }}
          />

          <button
            type="button"
            onClick={() => { sendMessage(); setShowEmoji(false); setShowGifs(false); }}
            disabled={msgLoading || mediaUploading || (!msgDraft.trim() && !mediaFile && !mediaPreview)}
            className="post-button"
            style={{ borderRadius: "50%", width: 42, height: 42, padding: 0, flexShrink: 0 }}
          >
            {mediaUploading
              ? <span style={{ fontSize: "0.65rem", fontWeight: 900 }}>{uploadProgress}%</span>
              : <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            }
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 6, fontSize: "0.68rem", color: "var(--text-muted)", opacity: 0.5 }}>
          Enter to send · Shift+Enter for new line · Drag & drop media
        </div>
      </div>
    </div>
  );
}
