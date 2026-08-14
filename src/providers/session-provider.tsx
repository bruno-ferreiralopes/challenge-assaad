"use client";

import { useEffect } from "react";

import {
  coordinatedRefresh,
  subscribeSessionSync,
  tabId,
} from "@/lib/auth/session-coordinator.client";

type SessionProviderProps = {
  children: React.ReactNode;
};

export function SessionProvider({ children }: SessionProviderProps) {
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void coordinatedRefresh();
      }
    }

    function handleWindowFocus() {
      void coordinatedRefresh();
    }

    void coordinatedRefresh();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    const unsubscribe = subscribeSessionSync((message) => {
      if (message.type === "refresh-success" && message.tabId !== tabId) {
        window.dispatchEvent(new CustomEvent("supabase-session-refreshed"));
      }
    });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      unsubscribe();
    };
  }, []);

  return children;
}
