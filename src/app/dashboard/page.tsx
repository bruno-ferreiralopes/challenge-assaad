import { redirect } from "next/navigation";

import { getUserProfile } from "@/lib/user/profile";

import { HealthCheckPanel } from "@/components/dashboard/health-check-panel";
import { LogoutButton } from "@/components/auth/logout-button";
import { UserProfileCard } from "@/components/dashboard/user-profile-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUserProfile();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Voce esta autenticado.
          </p>
        </div>

        <UserProfileCard user={user} />
        <HealthCheckPanel />

        <LogoutButton />
      </div>
    </div>
  );
}
