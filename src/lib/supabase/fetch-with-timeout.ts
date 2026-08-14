const DEFAULT_TIMEOUT_MS = 10_000;

function mergeSignals(
  timeoutMs: number,
  requestSignal?: AbortSignal | null,
) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  if (!requestSignal) {
    return timeoutSignal;
  }

  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([requestSignal, timeoutSignal]);
  }

  return timeoutSignal;
}

function createFetchWithTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      signal: mergeSignals(timeoutMs, init?.signal),
    });
  };
}

export const supabaseFetch = createFetchWithTimeout();
