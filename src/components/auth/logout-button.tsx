"use client";

import { useTransition } from "react";

import { logoutAction } from "@/lib/auth/actions";
import { Spinner } from "@/components/ui/spinner";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
      window.location.assign("/login");
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
    >
      {isPending ? <Spinner color="white" width="16px" height="16px" /> : "Sair"}
    </button>
  );
}
