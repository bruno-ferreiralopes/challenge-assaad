"use client";

import {
  SESSION_REFRESH_LOCK,
  SESSION_SYNC_CHANNEL,
  type SessionSyncMessage,
} from "@/lib/auth/session-constants";

let sharedRefreshPromise: Promise<boolean> | null = null;

function createTabId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

export const tabId = createTabId();

function broadcast(message: SessionSyncMessage) {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }

  const channel = new BroadcastChannel(SESSION_SYNC_CHANNEL);
  channel.postMessage(message);
  channel.close();
}

async function requestRefresh(force = false): Promise<boolean> {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ force }),
  });

  let body: { success?: boolean; skipped?: boolean; userId?: string; error?: string } = {};

  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (response.ok) {
    if (body.success) {
      broadcast({
        type: "refresh-success",
        tabId,
        at: new Date().toISOString(),
        userId: body.userId,
      });
      return true;
    }

    if (body.skipped) {
      return false;
    }
  }

  broadcast({
    type: "refresh-failed",
    tabId,
    at: new Date().toISOString(),
    reason: body.error ?? `HTTP ${response.status}`,
  });

  return false;
}

export async function coordinatedRefresh(
  options: { force?: boolean } = {},
): Promise<boolean> {
  if (sharedRefreshPromise) {
    return sharedRefreshPromise;
  }

  const force = options.force === true;

  sharedRefreshPromise = (async () => {
    broadcast({
      type: "refresh-started",
      tabId,
      at: new Date().toISOString(),
    });

    if (typeof navigator !== "undefined" && "locks" in navigator) {
      return navigator.locks.request(SESSION_REFRESH_LOCK, () =>
        requestRefresh(force),
      );
    }

    return requestRefresh(force);
  })().finally(() => {
    sharedRefreshPromise = null;
  });

  return sharedRefreshPromise;
}

export function subscribeSessionSync(
  listener: (message: SessionSyncMessage) => void,
) {
  if (typeof BroadcastChannel === "undefined") {
    return () => undefined;
  }

  const channel = new BroadcastChannel(SESSION_SYNC_CHANNEL);
  channel.onmessage = (event: MessageEvent<SessionSyncMessage>) => {
    listener(event.data);
  };

  return () => channel.close();
}
