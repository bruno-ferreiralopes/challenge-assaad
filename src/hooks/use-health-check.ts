import { useMutation } from "@tanstack/react-query";

import { authenticatedFetch } from "@/lib/api/authenticated-fetch";

type HealthCheckResult = {
  status: "ok";
  auth: true;
  userId: string;
  checkedAt: string;
};

export function useHealthCheck() {
  return useMutation({
    mutationFn: () => authenticatedFetch<HealthCheckResult>("/api/health"),
    retry: false,
  });
}
