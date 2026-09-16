import type { ComponentPropsWithoutRef } from "react";

type IconProps = ComponentPropsWithoutRef<"svg">;

const defaults = {
  "aria-hidden": true,
  fill: "none",
  viewBox: "0 0 24 24",
} as const;

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M7 4.75A1.75 1.75 0 0 1 8.75 3h6.5A1.75 1.75 0 0 1 17 4.75V21l-5-3-5 3V4.75Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M20.8 8.6c0 5-8.8 10.2-8.8 10.2S3.2 13.6 3.2 8.6A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.8 1.9Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

export function VerifiedIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="m12 2.8 2.1 1.5 2.6-.1.7 2.5 2.2 1.4-.9 2.4.9 2.4-2.2 1.4-.7 2.5-2.6-.1L12 18.2l-2.1-1.5-2.6.1-.7-2.5-2.2-1.4.9-2.4-.9-2.4 2.2-1.4.7-2.5 2.6.1L12 2.8Z" fill="currentColor" />
      <path d="m8.7 10.5 2.1 2.1 4.5-4.5" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 20c.5-3.7 2.6-5.6 6.5-5.6s6 1.9 6.5 5.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="m4 8 8-4 8 4-8 4-8-4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
      <path d="m4 12 8 4 8-4M4 16l8 4 8-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15.4 8.6-2.1 4.7-4.7 2.1 2.1-4.7 4.7-2.1Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

export function NetworkIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <circle cx="6" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8 8.5 2.7 6.8M16 8.5l-2.7 6.8M8.5 7h7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M14 4l-4 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="m5 12.5 4.2 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
