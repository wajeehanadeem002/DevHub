import type { DeveloperPreview } from "./types";

export const developers: readonly DeveloperPreview[] = [
  {
    avatar: "/avatars/alex-morgan.svg",
    description: "Building thoughtful web products from interface to infrastructure.",
    followers: "1.8K",
    name: "Alex Morgan",
    projects: 12,
    role: "Full Stack Developer",
    technologies: ["React", "Next.js", "TypeScript"],
    username: "@alexmorgan",
  },
  {
    avatar: "/avatars/daniel-kim.svg",
    description: "Frontend specialist focused on design systems and product craft.",
    followers: "1.3K",
    name: "Daniel Kim",
    projects: 9,
    role: "Frontend Engineer",
    technologies: ["React", "TypeScript", "Tailwind CSS"],
    username: "@danielkim",
  },
  {
    avatar: "/avatars/ryan-carter.svg",
    description: "Designing reliable APIs and data systems for growing products.",
    followers: "984",
    name: "Ryan Carter",
    projects: 8,
    role: "Backend Developer",
    technologies: ["Node.js", "PostgreSQL", "Python"],
    username: "@ryancarter",
  },
  {
    avatar: "/avatars/noah-williams.svg",
    description: "Turning applied machine learning into useful developer tools.",
    followers: "1.5K",
    name: "Noah Williams",
    projects: 11,
    role: "AI Engineer",
    technologies: ["Python", "AI / ML", "FastAPI"],
    username: "@noahwilliams",
  },
] as const;

export const technologies = [
  { mark: "Re", name: "React" },
  { mark: "N", name: "Next.js" },
  { mark: "TS", name: "TypeScript" },
  { mark: "JS", name: "Node.js" },
  { mark: "Py", name: "Python" },
  { mark: "J", name: "Java" },
  { mark: "S", name: "Supabase" },
  { mark: "PG", name: "PostgreSQL" },
  { mark: "AI", name: "AI / ML" },
  { mark: "TW", name: "Tailwind CSS" },
] as const;
