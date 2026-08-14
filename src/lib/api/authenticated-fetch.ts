import { getApiErrorMessage, getAuthErrorMessage } from "@/lib/auth/errors";
import { coordinatedRefresh } from "@/lib/auth/session-coordinator.client";

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

async function parseJsonBody(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getErrorBody(body: unknown) {
  return typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error?: string }).error === "string"
    ? (body as { error: string })
    : undefined;
}

export async function authenticatedFetch<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, { credentials: "include" });
  } catch (error) {
    throw new ServerError(getAuthErrorMessage(error));
  }

  let body: unknown = await parseJsonBody(response);

  if (response.status === 401 || response.status === 403) {
    const recovered = await coordinatedRefresh();

    if (recovered) {
      try {
        response = await fetch(url, { credentials: "include" });
        body = await parseJsonBody(response);
      } catch (error) {
        throw new ServerError(getAuthErrorMessage(error));
      }

      if (response.ok) {
        return body as T;
      }
    }

    await handleUnauthorized();
    throw new AuthError(
      getApiErrorMessage(response.status, getErrorBody(body)),
      response.status,
    );
  }

  const errorBody = getErrorBody(body);

  if (response.status === 500 || response.status === 503) {
    throw new ServerError(getApiErrorMessage(response.status, errorBody));
  }

  if (!response.ok) {
    throw new Error(getApiErrorMessage(response.status, errorBody));
  }

  return body as T;
}
