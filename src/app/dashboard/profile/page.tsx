import { redirect } from "next/navigation";

import { Container } from "@/components/ui/container";
import { getAvatarPublicUrl } from "@/features/profile/avatar-storage";
import { AvatarForm } from "@/features/profile/avatar-form";
import {
  getCurrentProfile,
  getTechnologyOptions,
} from "@/features/profile/current-profile";
import { DashboardNavigation } from "@/features/profile/dashboard-navigation";
import { ProfileEditForm } from "@/features/profile/profile-edit-form";

export default async function ProfileSettingsPage() {
  const [{ profile }, technologies] = await Promise.all([
    getCurrentProfile(),
    getTechnologyOptions(),
  ]);

  if (!profile) {
    redirect("/onboarding");
  }

  const avatarUrl = await getAvatarPublicUrl(profile.avatar_path);

  return (
    <main className="flex-1" id="main-content">
      <Container className="py-10 sm:py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <DashboardNavigation
              active="profile"
              profile={{
                avatarUrl,
                displayName: profile.display_name,
                isPublic: profile.is_public,
                username: profile.username,
              }}
            />
          </aside>

          <div className="min-w-0">
            <header className="border-b border-[#ded3c7] pb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6a52]">
                Developer identity
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#3b2f27] sm:text-5xl">
                Profile settings
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#75685d]">
                Shape how developers discover you and keep your public profile current.
              </p>
            </header>

            <section
              aria-labelledby="profile-avatar-title"
              className="mt-8 rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] p-6 shadow-[0_18px_48px_rgba(59,47,39,0.06)] sm:p-8"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a52]">
                Profile image
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#3b2f27]" id="profile-avatar-title">
                Profile avatar
              </h2>
              <AvatarForm
                avatarUrl={avatarUrl}
                displayName={profile.display_name}
                hasAvatar={Boolean(profile.avatar_path)}
              />
            </section>

            <section
              aria-labelledby="profile-details-title"
              className="mt-6 rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] p-6 shadow-[0_18px_48px_rgba(59,47,39,0.06)] sm:p-8"
            >
              <div className="border-b border-[#ded3c7] pb-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a52]">
                  Public information
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#3b2f27]" id="profile-details-title">
                  Developer profile
                </h2>
              </div>
              <div className="mt-8">
                <ProfileEditForm profile={profile} technologies={technologies} />
              </div>
            </section>
          </div>
        </div>
      </Container>
    </main>
  );
}
