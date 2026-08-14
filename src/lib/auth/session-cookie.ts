const AUTH_TOKEN_COOKIE_PATTERN = /^sb-.+-auth-token(?:\.(\d+))?$/;
const DEFAULT_REFRESH_THRESHOLD_SECONDS = 120;

type CookieLike = {
  name: string;
  value: string;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  if (typeof Buffer !== "undefined") {
    return Buffer.from(normalized + padding, "base64").toString("utf8");
  }

  return atob(normalized + padding);
}

function decodeJwtExp(accessToken: string): number | null {
  const parts = accessToken.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { exp?: unknown };

    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function parseSessionValue(rawValue: string) {
  const value = rawValue.startsWith("base64-")
    ? decodeBase64Url(rawValue.slice("base64-".length))
    : rawValue;

  try {
    return JSON.parse(value) as {
      access_token?: string;
      expires_at?: number;
    };
  } catch {
    return null;
  }
}

function getAuthTokenCookieChunks(cookies: CookieLike[]) {
  const chunks = new Map<number, string>();

  for (const cookie of cookies) {
    const match = cookie.name.match(AUTH_TOKEN_COOKIE_PATTERN);

    if (!match) {
      continue;
    }

    const index = match[1] ? Number(match[1]) : 0;
    chunks.set(index, `${chunks.get(index) ?? ""}${cookie.value}`);
  }

  if (chunks.size === 0) {
    return null;
  }

  return [...chunks.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, value]) => value)
    .join("");
}

export function getAccessTokenExpFromCookies(cookies: CookieLike[]): number | null {
  const sessionValue = getAuthTokenCookieChunks(cookies);

  if (!sessionValue) {
    return null;
  }

  const session = parseSessionValue(sessionValue);

  if (!session) {
    return null;
  }

  if (typeof session.expires_at === "number") {
    return session.expires_at;
  }

  if (typeof session.access_token === "string") {
    return decodeJwtExp(session.access_token);
  }

  return null;
}

export function getAccessTokenExpFromCookieHeader(cookieHeader: string) {
  const cookies: CookieLike[] = [];

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();

    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    cookies.push({
      name: trimmed.slice(0, separatorIndex),
      value: decodeURIComponent(trimmed.slice(separatorIndex + 1)),
    });
  }

  return getAccessTokenExpFromCookies(cookies);
}

export function shouldRefreshSession(
  cookies: CookieLike[] | string,
  thresholdSeconds = DEFAULT_REFRESH_THRESHOLD_SECONDS,
) {
  const exp =
    typeof cookies === "string"
      ? getAccessTokenExpFromCookieHeader(cookies)
      : getAccessTokenExpFromCookies(cookies);

  if (!exp) {
    return true;
  }

  const expiresAtMs = exp > 1_000_000_000_000 ? exp : exp * 1000;

  return expiresAtMs <= Date.now() + thresholdSeconds * 1000;
}
