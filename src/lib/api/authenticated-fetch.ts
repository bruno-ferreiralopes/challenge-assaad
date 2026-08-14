import { getApiErrorMessage, getAuthErrorMessage } from "@/lib/auth/errors";

class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerError";
  }
}

async function handleUnauthorized() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignora falha de rede no logout; o redirect ainda deve ocorrer.
  }

  window.location.href = "/login";
}

export async function authenticatedFetch<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new ServerError(getAuthErrorMessage(error));
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    body = {};
  }

  const errorBody =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error?: string }).error === "string"
      ? (body as { error: string })
      : undefined;

  if (response.status === 401 || response.status === 403) {
    await handleUnauthorized();
    throw new AuthError(
      getApiErrorMessage(response.status, errorBody),
      response.status,
    );
  }

  if (response.status === 500 || response.status === 503) {
    throw new ServerError(getApiErrorMessage(response.status, errorBody));
  }

  if (!response.ok) {
    throw new Error(getApiErrorMessage(response.status, errorBody));
  }

  return body as T;
}
