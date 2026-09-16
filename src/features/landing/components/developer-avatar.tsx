import Image from "next/image";

type DeveloperAvatarProps = {
  className?: string;
  name: string;
  size?: number;
  src: string;
};

export function DeveloperAvatar({
  className = "",
  name,
  size = 64,
  src,
}: DeveloperAvatarProps) {
  return (
    <Image
      alt={`${name} profile avatar`}
      className={`rounded-full border border-[#ded3c7] bg-[#e9ded0] object-cover ${className}`}
      height={size}
      src={src}
      width={size}
    />
  );
}
