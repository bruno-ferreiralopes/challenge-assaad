"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  coordinatedRefresh,
  subscribeSessionSync,
  tabId,
} from "@/lib/auth/session-coordinator.client";
import type { SessionSyncMessage } from "@/lib/auth/session-constants";

type LogEntry = {
  id: string;
  at: string;
  message: string;
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR");
}

export function MultiTabDemoPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const appendLog = useCallback((message: string) => {
    setLogs((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        at: new Date().toISOString(),
        message,
      },
      ...current,
    ].slice(0, 40));
  }, []);

  useEffect(() => {
    appendLog(`Aba iniciada com ID ${tabId}`);

    const unsubscribe = subscribeSessionSync((message: SessionSyncMessage) => {
      if (message.type === "refresh-started") {
        appendLog(
          message.tabId === tabId
            ? "Esta aba iniciou um refresh coordenado"
            : `Aba ${message.tabId} iniciou refresh (${formatTime(message.at)})`,
        );
        return;
      }

      if (message.type === "refresh-success") {
        setRefreshCount((count) => count + 1);
        appendLog(
          message.tabId === tabId
            ? "Refresh concluido nesta aba"
            : `Aba ${message.tabId} concluiu refresh; cookies atualizados no browser`,
        );
        return;
      }

      if (message.type === "refresh-failed") {
        appendLog(
          `Refresh falhou na aba ${message.tabId}: ${message.reason ?? "erro desconhecido"}`,
        );
      }
    });

    const handleSessionRefreshed = () => {
      appendLog("Sessao atualizada por outra aba (BroadcastChannel)");
    };

    window.addEventListener("supabase-session-refreshed", handleSessionRefreshed);

    return () => {
      unsubscribe();
      window.removeEventListener(
        "supabase-session-refreshed",
        handleSessionRefreshed,
      );
    };
  }, [appendLog]);

  async function handleRefresh() {
    setIsRefreshing(true);
    appendLog("Disparando refresh coordenado...");

    try {
      const success = await coordinatedRefresh();
      appendLog(success ? "Refresh coordenado: sucesso" : "Refresh coordenado: falha");
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleOpenTab() {
    window.open("/demo/multi-tab", "_blank");
    appendLog("Nova aba aberta em /demo/multi-tab");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Demo multi-aba
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Abra esta pagina em varias abas. Apenas uma aba por vez executa o
          refresh (Web Lock), e as demais recebem o resultado via
          BroadcastChannel.
        </p>
      </div>

      <dl className="grid gap-3 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800 sm:grid-cols-3">
        <div>
          <dt className="font-medium text-zinc-500">ID desta aba</dt>
          <dd className="font-mono text-xs">{tabId}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Refreshs observados</dt>
          <dd>{refreshCount}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Canal de sync</dt>
          <dd className="font-mono text-xs">supabase-session-sync</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isRefreshing ? "Refreshando..." : "Forcar refresh coordenado"}
        </button>
        <button
          type="button"
          onClick={handleOpenTab}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Abrir nova aba
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Voltar ao dashboard
        </Link>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Log de eventos</h2>
        <ul className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-800">
          {logs.length === 0 ? (
            <li className="text-zinc-500">Nenhum evento ainda.</li>
          ) : (
            logs.map((entry) => (
              <li key={entry.id} className="font-mono">
                [{formatTime(entry.at)}] {entry.message}
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700">
        <h2 className="font-medium">Como reproduzir o cenario</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
          <li>Faca login no app.</li>
          <li>Abra esta pagina em 3 abas ou janelas.</li>
          <li>Clique em &quot;Forcar refresh coordenado&quot; em todas quase ao mesmo tempo.</li>
          <li>Observe que apenas uma aba executa o POST /api/auth/refresh.</li>
          <li>As outras abas recebem refresh-success via BroadcastChannel.</li>
          <li>Troque de aba ou volte apos inatividade: o SessionProvider renova ao focar.</li>
        </ol>
      </div>
    </div>
  );
}
