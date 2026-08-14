"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  coordinatedRefresh,
  subscribeSessionSync,
  tabId,
} from "@/lib/auth/session-coordinator.client";

type SessionProviderProps = {
  children: React.ReactNode;
};

function isLoginRoute(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

export function SessionProvider({ children }: SessionProviderProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (isLoginRoute(pathname)) {
      return;
    }

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
  }, [pathname]);

  return children;
}
