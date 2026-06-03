import { useEffect } from "react";
import { io } from "socket.io-client";
import { useRef } from "react";

const API_BASE = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

/**
 * Connects to Socket.IO for real-time notifications and presence.
 * Separate from useMessages to avoid re-renders on every message.
 */
export function useRealtime({ accountEmail, onNotification, onPresenceUpdate }) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!accountEmail) return;

    // Re-use existing socket if already connected by useMessages
    // We listen for the notification event on a new socket
    const socket = io(API_BASE, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", accountEmail);
    });

    socket.on("notification", (notification) => {
      onNotification?.(notification);
    });

    socket.on("presenceUpdate", ({ email, online }) => {
      onPresenceUpdate?.(email, online);
    });

    return () => {
      socket.off("notification");
      socket.off("presenceUpdate");
      socket.disconnect();
    };
  }, [accountEmail]);
}
