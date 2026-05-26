"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { useUser } from "@/contexts/UserContext";

interface SessionTimeoutContextType {
  resetSession: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

export function SessionTimeoutProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const showModalRef = useRef(false);

  // Sync ref with state to prevent stale closures in event listeners without re-binding them
  showModalRef.current = showModal;

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    if (showModalRef.current) return;

    // Start 15 minutes timer (15 * 60 * 1000 ms)
    inactivityTimerRef.current = setTimeout(() => {
      setShowModal(true);
      setCountdown(10);
    }, 15 * 60 * 1000);
  }, []);

  const handleKeepSession = useCallback(() => {
    setShowModal(false);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Handle countdown interval when modal opens
  useEffect(() => {
    if (showModal) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            setShowModal(false);
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [showModal, logout]);

  // Setup user interaction event listeners when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear everything if user logs out
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setShowModal(false);
      return;
    }

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    let lastActivityTime = Date.now();

    const handleActivity = () => {
      const now = Date.now();
      // Throttle activity resets to once per second for performance optimization
      if (now - lastActivityTime > 1000) {
        lastActivityTime = now;
        resetInactivityTimer();
      }
    };

    // Attach listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize the first timer
    resetInactivityTimer();

    // Cleanup listeners on unmount or auth change
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isAuthenticated, resetInactivityTimer]);

  return (
    <SessionTimeoutContext.Provider value={{ resetSession: handleKeepSession }}>
      {children}

      {/* Premium Inactivity Warning Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl max-w-sm w-full mx-4 transform scale-100 transition-all duration-300 animate-in fade-in-50 zoom-in-95">
            <div className="flex flex-col items-center text-center">
              {/* Warning Icon with a pulse animation */}
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 rounded-full flex items-center justify-center mb-4 text-amber-600 dark:text-amber-500 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Session Inactivity</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                You’ve been inactive. Your session will expire in
              </p>

              {/* Countdown display */}
              <div className="mt-4 flex items-center justify-center">
                <span className="text-5xl font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {countdown}
                </span>
                <span className="text-lg font-semibold text-slate-400 ml-1">s</span>
              </div>

              {/* Action button */}
              <button
                onClick={handleKeepSession}
                className="mt-6 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md shadow-indigo-200 dark:shadow-none hover:shadow-indigo-300 transition-all duration-200 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </SessionTimeoutContext.Provider>
  );
}

export function useSessionTimeout() {
  const context = useContext(SessionTimeoutContext);
  if (context === undefined) {
    throw new Error("useSessionTimeout must be used within a SessionTimeoutProvider");
  }
  return context;
}
