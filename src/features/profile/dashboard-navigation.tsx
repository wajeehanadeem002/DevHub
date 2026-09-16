import Link from "next/link";

import { BookmarkIcon, CodeIcon, LayersIcon, UserIcon } from "@/components/ui/icons";

import { ProfileAvatar } from "./profile-avatar";

type DashboardNavigationProps = {
  active: "overview" | "profile" | "projects" | "saved";
  profile: {
    avatarUrl: string | null;
    displayName: string;
    isPublic: boolean;
    username: string;
  };
};

const baseLinkClassName =
  "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]";

export function DashboardNavigation({
  active,
  profile,
}: DashboardNavigationProps) {
  const itemClassName = (item: DashboardNavigationProps["active"]) =>
    `${baseLinkClassName} ${
      active === item
        ? "bg-[#3b2f27] text-[#fcfaf5]"
        : "text-[#75685d] hover:bg-[#e9ded0]/70 hover:text-[#3b2f27]"
    }`;

  return (
    <div className="rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] p-5 shadow-[0_16px_45px_rgba(59,47,39,0.06)]">
      <div className="flex items-center gap-3 border-b border-[#ded3c7] pb-5">
        <ProfileAvatar
          avatarUrl={profile.avatarUrl}
          displayName={profile.displayName}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#3b2f27]">
            {profile.displayName}
          </p>
          <p className="truncate text-sm text-[#75685d]">@{profile.username}</p>
        </div>
      </div>

      <nav aria-label="Dashboard navigation" className="mt-4 space-y-1.5">
        <Link
          aria-current={active === "overview" ? "page" : undefined}
          className={itemClassName("overview")}
          href="/dashboard"
        >
          <LayersIcon className="size-4" />
          Overview
        </Link>
        <Link
          aria-current={active === "profile" ? "page" : undefined}
          className={itemClassName("profile")}
          href="/dashboard/profile"
        >
          <UserIcon className="size-4" />
          Edit profile
        </Link>
        {profile.isPublic ? (
          <Link
            className={`${baseLinkClassName} text-[#75685d] hover:bg-[#e9ded0]/70 hover:text-[#3b2f27]`}
            href={`/developers/${profile.username}`}
          >
            <UserIcon className="size-4" />
            View public profile
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-[#9b8e83]"
          >
            <UserIcon className="size-4" />
            Public profile hidden
          </span>
        )}
        <Link
          aria-current={active === "projects" ? "page" : undefined}
          className={itemClassName("projects")}
          href="/dashboard/projects"
        >
          <CodeIcon className="size-4" />
          Projects
        </Link>
        <Link
          aria-current={active === "saved" ? "page" : undefined}
          className={itemClassName("saved")}
          href="/dashboard/saved"
        >
          <BookmarkIcon className="size-4" />
          Saved projects
        </Link>
      </nav>
    </div>
  );
}
