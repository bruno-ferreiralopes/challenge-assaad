export type SessionErrorLike = {
  status?: number;
  code?: string;
  message?: string;
};

const INVALID_SESSION_CODES = new Set([
  "refresh_token_not_found",
  "invalid_refresh_token",
  "refresh_token_already_used",
  "session_not_found",
  "bad_jwt",
  "invalid_jwt",
  "invalid_grant",
]);

export function isInvalidSessionError(error: SessionErrorLike) {
  if (error.status === 401) {
    return true;
  }

  if (error.code && INVALID_SESSION_CODES.has(error.code)) {
    return true;
  }

  return false;
}
