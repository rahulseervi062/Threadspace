import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { api } from "../services/api";

const API_BASE = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

export function useMessages(accountEmail, accountName) {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [activeConvName, setActiveConvName] = useState("");
  const [threadMessages, setThreadMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    if (!accountEmail) return;

    const socket = io(API_BASE, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("join", accountEmail));
    
    socket.on("newMessage", (message) => {
      if (message.fromEmail === accountEmail || message.toEmail === accountEmail) {
        const otherEmail = message.fromEmail === accountEmail ? message.toEmail : message.fromEmail;
        
        setConversations(prev => {
          const exists = prev.find(c => c.otherEmail === otherEmail);
          const preview = message.text || "Sent an attachment";
          
          if (!exists) {
            return [{
              otherEmail,
              otherName: message.fromEmail === accountEmail ? message.toName : message.fromName,
              messages: [message],
              lastAt: message.createdAt,
              unread: message.toEmail === accountEmail ? 1 : 0,
              lastMessage: preview
            }, ...prev];
          }

          return prev.map(c => c.otherEmail === otherEmail ? {
            ...c,
            lastAt: message.createdAt,
            unread: message.toEmail === accountEmail ? (c.unread || 0) + 1 : c.unread,
            lastMessage: preview
          } : c).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
        });

        if (activeConv === otherEmail) {
          setThreadMessages(prev => [...prev, message]);
        }
      }
    });

    socket.on("typing", ({ fromEmail }) => {
      setTypingUsers(prev => new Set([...prev, fromEmail]));
    });

    socket.on("stopTyping", ({ fromEmail }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(fromEmail);
        return next;
      });
    });

    return () => {
      socket.off("newMessage");
      socket.off("typing");
      socket.off("stopTyping");
      socket.disconnect();
    };
  }, [accountEmail, activeConv]);

  const loadConversations = useCallback(async () => {
    if (!accountEmail) return;
    try {
      const data = await api.getConversations(accountEmail);
      if (data.ok) setConversations(data.conversations || []);
    } catch (err) {}
  }, [accountEmail]);

  const openConversation = async (otherEmail, otherName, setView) => {
    setActiveConv(otherEmail);
    setActiveConvName(otherName);
    setView("thread");
    try {
      const data = await api.getMessages(otherEmail, accountEmail);
      if (data.ok) {
        setThreadMessages(data.messages || []);
        setConversations(prev => prev.map(c => c.otherEmail === otherEmail ? { ...c, unread: 0 } : c));
      }
    } catch (err) {}
  };

  const sendTyping = (toEmail) => {
    socketRef.current?.emit("typing", { fromEmail: accountEmail, toEmail });
  };

  const sendStopTyping = (toEmail) => {
    socketRef.current?.emit("stopTyping", { fromEmail: accountEmail, toEmail });
  };

  return {
    conversations,
    activeConv,
    activeConvName,
    threadMessages,
    typingUsers,
    loadConversations,
    openConversation,
    setThreadMessages,
    sendTyping,
    sendStopTyping
  };
}
