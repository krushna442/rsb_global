// hooks/useSocket.ts
// ── useSocket React hook ──────────────────────────────────────────────────────
// Subscribe to a single Socket.IO event with automatic cleanup on unmount.
//
// Usage (in any page/component):
//
//   const reload = useCallback(() => loadData(date), [date]);
//   useSocket('hourly-production:changed', reload);
//
// The hook is intentionally lightweight:
//  - It does NOT connect/disconnect the socket (that's done by SocketProvider).
//  - It does NOT make any API calls itself.
//  - Multiple hooks in the same component each add ONE listener and remove it on cleanup.

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

/**
 * Subscribe to a Socket.IO event while the component is mounted.
 *
 * @param event    - Socket.IO event name, e.g. 'hourly-production:changed'
 * @param callback - Function to call when the event fires.
 *                   Wrap in useCallback to avoid re-subscriptions.
 * @param enabled  - Optional flag to conditionally enable the subscription (default: true).
 */
export function useSocket(
  event: string,
  callback: (payload: any) => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [event, callback, enabled]);
}
