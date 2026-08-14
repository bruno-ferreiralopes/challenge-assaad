"use client";

import { FormattedDate } from "@/components/ui/formatted-date";
import { useHealthCheck } from "@/hooks/use-health-check";

export function HealthCheckPanel() {
  const healthCheck = useHealthCheck();

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Health Check</h2>
        <p className="text-xs text-zinc-500">
          Verifica autenticacao e conexao com o Supabase.
        </p>
      </div>

      <button
        type="button"
        onClick={() => healthCheck.mutate()}
        disabled={healthCheck.isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {healthCheck.isPending ? "Verificando..." : "Executar health check"}
      </button>

      {healthCheck.isSuccess ? (
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-medium text-zinc-500">Status</dt>
            <dd className="text-green-600">{healthCheck.data.status}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500">Autenticado</dt>
            <dd>{healthCheck.data.auth ? "Sim" : "Nao"}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500">Verificado em</dt>
            <dd>
              <FormattedDate value={healthCheck.data.checkedAt} />
            </dd>
          </div>
        </dl>
      ) : null}

      {healthCheck.isError ? (
        <p className="text-sm text-red-600" role="alert">
          {healthCheck.error instanceof Error
            ? healthCheck.error.message
            : "Falha ao executar health check."}
        </p>
      ) : null}
    </div>
  );
}
