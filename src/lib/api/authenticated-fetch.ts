import { getApiErrorMessage, getAuthErrorMessage } from "@/lib/auth/errors";
import { coordinatedRefresh } from "@/lib/auth/session-coordinator.client";

class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerError";
  }
}

const redirectPending = new Promise<never>(() => {
  // Mantem a promise pendente ate a navegacao concluir para bloquear a navegacao.
});

async function handleUnauthorized(): Promise<never> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignora falha de rede no logout; o redirect ainda deve ocorrer.
  }

  window.location.href = "/login";
  return redirectPending;
}

async function parseJsonBody(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function authenticatedFetch<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, { credentials: "include" });
  } catch (error) {
    throw new ServerError(getAuthErrorMessage(error));
  }

  let body: unknown = await parseJsonBody(response);

  if (response.status === 401) {
    const recovered = await coordinatedRefresh({ force: true });

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

    return handleUnauthorized();
  }

  const errorBody =
    body && typeof body === "object" ? (body as { error?: string }) : undefined;

  if (response.status === 500 || response.status === 503) {
    throw new ServerError(getApiErrorMessage(response.status, errorBody));
  }

  if (!response.ok) {
    throw new Error(getApiErrorMessage(response.status, errorBody));
  }

  return body as T;
}
