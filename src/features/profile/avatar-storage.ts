import "server-only";

import { requireProfile } from "@/lib/auth/require-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { AvatarExtension } from "./avatar-input";

const AVATAR_BUCKET = "avatars";

type AvatarLifecycleResult =
  | {
      avatarPath: string;
      cleanupWarning: boolean;
      status: "updated";
    }
  | { cleanupWarning: boolean; status: "removed" };

export async function getAvatarPublicUrl(avatarPath: string | null) {
  if (!avatarPath) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath).data
    .publicUrl;
}

export async function uploadCurrentAvatar(
  file: File,
  extension: AvatarExtension,
): Promise<AvatarLifecycleResult> {
  const { profile, userId } = await requireProfile();
  const supabase = await createServerSupabaseClient();
  const avatarPath = `${userId}/${crypto.randomUUID()}.${extension}`;
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  const { error: uploadError } = await bucket.upload(avatarPath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    throw new Error("Unable to upload your new avatar.", {
      cause: uploadError,
    });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_path: avatarPath })
    .eq("user_id", userId);

  if (profileError) {
    await bucket.remove([avatarPath]);
    throw new Error("Unable to save your new avatar.", {
      cause: profileError,
    });
  }

  let cleanupWarning = false;
  if (profile.avatar_path) {
    const { error } = await bucket.remove([profile.avatar_path]);
    cleanupWarning = Boolean(error);
  }

  return { avatarPath, cleanupWarning, status: "updated" };
}

export async function removeCurrentAvatar(): Promise<AvatarLifecycleResult> {
  const { profile, userId } = await requireProfile();
  const supabase = await createServerSupabaseClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_path: null })
    .eq("user_id", userId);

  if (profileError) {
    throw new Error("Unable to remove your avatar.", { cause: profileError });
  }

  let cleanupWarning = false;
  if (profile.avatar_path) {
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([profile.avatar_path]);
    cleanupWarning = Boolean(error);
  }

  return { cleanupWarning, status: "removed" };
}
