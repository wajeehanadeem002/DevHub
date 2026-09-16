import Image from "next/image";

const sizes = {
  lg: { className: "size-28 text-3xl", pixels: 112 },
  md: { className: "size-16 text-lg", pixels: 64 },
  sm: { className: "size-11 text-sm", pixels: 44 },
} as const;

type ProfileAvatarProps = {
  avatarUrl: string | null;
  className?: string;
  displayName: string;
  priority?: boolean;
  size?: keyof typeof sizes;
};

function getInitials(displayName: string) {
  const segments = displayName.trim().split(/\s+/).filter(Boolean);
  const first = segments[0]?.[0] ?? "D";
  const last = segments.length > 1 ? segments.at(-1)?.[0] : "";
  return `${first}${last}`.toUpperCase();
}

export function ProfileAvatar({
  avatarUrl,
  className = "",
  displayName,
  priority = false,
  size = "md",
}: ProfileAvatarProps) {
  const sizeConfig = sizes[size];
  const sharedClassName = `${sizeConfig.className} shrink-0 rounded-2xl border border-[#ded3c7] bg-[#e9ded0] ${className}`;

  if (avatarUrl) {
    return (
      <Image
        alt={`${displayName} avatar`}
        className={`${sharedClassName} object-cover`}
        height={sizeConfig.pixels}
        priority={priority}
        src={avatarUrl}
        width={sizeConfig.pixels}
      />
    );
  }

  return (
    <span
      aria-label={`${displayName} initials`}
      className={`grid place-items-center font-bold tracking-[-0.04em] text-[#3b2f27] ${sharedClassName}`}
      role="img"
    >
      {getInitials(displayName)}
    </span>
  );
}
