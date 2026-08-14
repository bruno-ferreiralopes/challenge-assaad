import {
  formatDateTime,
  type UserProfile,
} from "@/lib/user/profile";

type UserProfileCardProps = {
  user: UserProfile;
};

export function UserProfileCard({ user }: UserProfileCardProps) {
  return (
    <dl className="space-y-3 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      <div>
        <dt className="font-medium text-zinc-500">Email</dt>
        <dd>{user.email ?? "-"}</dd>
      </div>
      <div>
        <dt className="font-medium text-zinc-500">ID</dt>
        <dd className="break-all font-mono text-xs">{user.id}</dd>
      </div>
      <div>
        <dt className="font-medium text-zinc-500">Ultimo acesso</dt>
        <dd>
          {user.lastSignInAt ? formatDateTime(user.lastSignInAt) : "-"}
        </dd>
      </div>
    </dl>
  );
}
