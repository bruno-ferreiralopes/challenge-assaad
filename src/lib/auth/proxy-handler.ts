import { type NextRequest, NextResponse } from "next/server";

import {
  getSessionDedupeKey,
  refreshSessionWithUser,
} from "@/lib/auth/refresh-session-server";
import { clearSupabaseCookies } from "@/lib/auth/session-cookies";
import { createRequestClient } from "@/lib/supabase/request-client";

import {
  hasSupabaseAuthCookie,
  isAuthRoute,
  isProtectedRoute,
} from "./routes";

function isInvalidSessionError(error: {
  status?: number;
  code?: string;
  message?: string;
}) {
  return (
    error.status === 401 ||
    error.status === 403 ||
    error.code === "refresh_token_not_found" ||
    error.message?.includes("Refresh Token")
  );
}

function shouldSkipSessionRefresh(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth/refresh")) {
    return true;
  }

  if (
    request.method === "POST" &&
    (pathname === "/login" || isProtectedRoute(pathname) || isAuthRoute(pathname))
  ) {
    return true;
  }

  return false;
}

export async function handleAuthProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldSkipSessionRefresh(request)) {
    return NextResponse.next();
  }

  if (isAuthRoute(pathname) && !hasSupabaseAuthCookie(request)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (!hasSupabaseAuthCookie(request)) {
    if (isProtectedRoute(pathname)) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      clearSupabaseCookies(request, response);
      return response;
    }

    return NextResponse.next();
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const { supabase, supabaseResponse } = createRequestClient(request);
  const { userId, error } = await refreshSessionWithUser(
    supabase,
    getSessionDedupeKey(cookieHeader),
  );
  const isAuthenticated = Boolean(userId);

  if (error && isInvalidSessionError(error)) {
    if (isProtectedRoute(pathname)) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      clearSupabaseCookies(request, response);
      return response;
    }

    const response = NextResponse.next({
      request,
    });
    clearSupabaseCookies(request, response);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (!isAuthenticated && isProtectedRoute(pathname)) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    clearSupabaseCookies(request, response);
    return response;
  }

  if (isAuthenticated && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  supabaseResponse.headers.set("Cache-Control", "private, no-store");
  return supabaseResponse;
}
