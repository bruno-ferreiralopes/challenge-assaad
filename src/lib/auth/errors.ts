import { AuthError as SupabaseAuthError } from "@supabase/supabase-js";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email ou senha incorretos.",
  email_not_confirmed: "Confirme seu email antes de entrar.",
  user_banned: "Sua conta foi suspensa. Entre em contato com o suporte.",
  over_request_rate_limit:
    "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
  weak_password: "A senha informada e muito fraca.",
  user_not_found: "Usuario nao encontrado.",
};

function isNetworkError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("econnrefused") ||
    normalized.includes("etimedout") ||
    normalized.includes("timeout") ||
    normalized.includes("aborted")
  );
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof SupabaseAuthError) {
    if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
      return AUTH_ERROR_MESSAGES[error.code];
    }

    if (isNetworkError(error.message)) {
      return "Nao foi possivel conectar ao servidor de autenticacao. Verifique sua conexao e tente novamente.";
    }

    if (error.status === 400 || error.status === 401) {
      return "Email ou senha incorretos.";
    }

    if (error.status === 403) {
      return "Acesso negado. Voce nao tem permissao para entrar.";
    }

    if (error.status === 429) {
      return AUTH_ERROR_MESSAGES.over_request_rate_limit;
    }

    if (error.status && error.status >= 500) {
      return "Servico de autenticacao indisponivel no momento. Tente novamente em instantes.";
    }

    if (error.message) {
      if (isNetworkError(error.message)) {
        return "Nao foi possivel conectar ao servidor de autenticacao. Verifique sua conexao e tente novamente.";
      }

      return error.message;
    }
  }

  if (error instanceof Error) {
    if (isTimeoutError(error)) {
      return "O servidor de autenticacao demorou para responder. Tente novamente em instantes.";
    }

    if (isNetworkError(error.message)) {
      return "Nao foi possivel conectar ao servidor. Verifique sua conexao e tente novamente.";
    }

    return error.message;
  }

  return "Ocorreu um erro inesperado. Tente novamente.";
}

export function getAuthErrorStatus(error: unknown): number {
  if (error instanceof SupabaseAuthError) {
    if (error.code === "over_request_rate_limit") {
      return 429;
    }

    if (error.code === "email_not_confirmed" || error.code === "user_banned") {
      return 403;
    }

    if (error.status === 429) {
      return 429;
    }

    if (error.status === 403) {
      return 403;
    }

    if (error.status === 400 || error.status === 401) {
      return 401;
    }

    if (error.status && error.status >= 500) {
      return 503;
    }

    if (error.message && isNetworkError(error.message)) {
      return 503;
    }
  }

  if (error instanceof Error) {
    if (isTimeoutError(error)) {
      return 504;
    }

    if (isNetworkError(error.message)) {
      return 503;
    }
  }

  return 401;
}

export function getApiErrorMessage(
  status: number,
  body?: { error?: string },
): string {
  if (status === 401 || status === 403) {
    return "Sessao expirada. Faca login novamente.";
  }

  if (status === 429) {
    return AUTH_ERROR_MESSAGES.over_request_rate_limit;
  }

  if (status >= 500) {
    return "Servico indisponivel no momento. Tente novamente em instantes.";
  }

  return body?.error ?? "Nao foi possivel completar a operacao.";
}
