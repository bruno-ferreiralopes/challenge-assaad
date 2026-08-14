import { type NextRequest, NextResponse } from "next/server";

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

export async function handleAuthProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (
    request.method === "POST" &&
    (pathname === "/login" || isProtectedRoute(pathname) || isAuthRoute(pathname))
  ) {
    return NextResponse.next();
  }

  if (isAuthRoute(pathname) && !hasSupabaseAuthCookie(request)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  const { supabase, supabaseResponse } = createRequestClient(request);
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

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
