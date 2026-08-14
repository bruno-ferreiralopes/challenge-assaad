import { type NextRequest, NextResponse } from "next/server";

import { isInvalidSessionError } from "@/lib/auth/invalid-session";
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

function shouldSkipSessionRefresh(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/auth/refresh") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout")
  ) {
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
  const { supabase, getSupabaseResponse } = createRequestClient(request);
  const { userId, error } = await refreshSessionWithUser(
    supabase,
    getSessionDedupeKey(cookieHeader),
    { cookieHeader },
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

  const response = getSupabaseResponse();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
