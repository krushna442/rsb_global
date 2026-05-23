// lib/socket.ts
// ── Socket.IO client singleton ────────────────────────────────────────────────
// Creates exactly ONE persistent socket connection for the entire app.
// Imported by useSocket() hook — never import directly in components.

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Return (and lazily create) the singleton Socket.IO client.
 * Safe to call multiple times — always returns the same instance.
 *
 * The socket connects with:
 *  - autoConnect: false  → we connect manually after the user is authenticated
 *  - reconnection: true  → auto-reconnects with exponential back-off
 *  - withCredentials: true → cookies forwarded (matches backend CORS)
 */
export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_URL || "http://localhost:5000";

    socket = io(url, {
      autoConnect: false,
      withCredentials: true,
      // Prefer WebSocket, fall back to long-polling if WS is blocked
      transports: ["websocket", "polling"],
      // Reconnection settings — safe for 24×7 servers
      reconnection: true,
      reconnectionDelay: 1000,        // 1 s initial delay
      reconnectionDelayMax: 15000,    // cap back-off at 15 s
      reconnectionAttempts: Infinity, // retry forever (server restarts, etc.)
    });

    // Development / debug logging
    if (process.env.NODE_ENV === "development") {
      socket.on("connect",    () => console.log("[Socket.IO] Connected:", socket?.id));
      socket.on("disconnect", (r) => console.log("[Socket.IO] Disconnected:", r));
      socket.on("connect_error", (e) => console.warn("[Socket.IO] Connect error:", e.message));
    }
  }

  return socket;
}

/** Connect the socket (call after user authenticates). */
export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
}

/** Disconnect and destroy the singleton (call on logout). */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
