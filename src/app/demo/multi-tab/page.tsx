import { redirect } from "next/navigation";

import { MultiTabDemoPanel } from "@/components/demo/multi-tab-demo-panel";
import { getUserProfile } from "@/lib/user/profile";

export const dynamic = "force-dynamic";

export default async function MultiTabDemoPage() {
  const user = await getUserProfile();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 items-start justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <MultiTabDemoPanel />
      </div>
    </div>
  );
}
