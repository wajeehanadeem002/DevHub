import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { BrandMark } from "@/components/ui/brand-mark";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

const navigationItems = [
  { href: "/projects", label: "Explore" },
  { href: "/#developers", label: "Developers" },
  { href: "/projects", label: "Projects" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#ded3c7] bg-[#f6f1e8]/95 backdrop-blur-xl">
      <Container className="grid h-[72px] grid-cols-[1fr_auto] items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
        <Link
          className="inline-flex w-fit items-center gap-2.5 rounded-lg text-lg font-semibold tracking-[-0.03em] text-[#3b2f27] transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a6a52]"
          href="/"
        >
          <BrandMark />
          <span>{siteConfig.name}</span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-8 lg:flex"
        >
          {navigationItems.map((item) => (
            <Link
              className="rounded-md text-sm font-medium text-[#75685d] transition-colors hover:text-[#8a6a52] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a6a52]"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2.5 sm:gap-3">
          <label className="group relative hidden xl:block">
            <span className="sr-only">Search DevHub</span>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75685d] transition-colors group-focus-within:text-[#8a6a52]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
            <input
              aria-label="Search DevHub"
              className="h-9 w-44 rounded-lg border border-[#ded3c7] bg-[#fcfaf5] pl-9 pr-3 text-sm text-[#3b2f27] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[#75685d]/75 hover:bg-[#fcfaf5] focus:border-[#8a6a52] focus:bg-[#fcfaf5] focus:shadow-[0_0_0_3px_rgba(138,106,82,0.14)]"
              placeholder="Search"
              type="search"
            />
          </label>
          <Show when="signed-out">
            <Link
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-[#75685d] transition-colors hover:text-[#8a6a52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] sm:inline-flex"
              href="/sign-in"
            >
              Sign In
            </Link>
            <Link
              className="inline-flex h-9 items-center rounded-lg bg-[#3b2f27] px-3.5 text-sm font-semibold text-[#fcfaf5] shadow-[0_8px_24px_rgba(59,47,39,0.14)] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#8a6a52] hover:shadow-[0_12px_30px_rgba(59,47,39,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] motion-reduce:transform-none"
              href="/sign-up"
            >
              Join DevHub
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              className="inline-flex h-9 items-center rounded-lg bg-[#3b2f27] px-3.5 text-sm font-semibold text-[#fcfaf5] shadow-[0_8px_24px_rgba(59,47,39,0.14)] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#8a6a52] hover:shadow-[0_12px_30px_rgba(59,47,39,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] motion-reduce:transform-none"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-9",
                  userButtonTrigger:
                  "rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]",
                },
              }}
              customMenuItems={[{ href: "/dashboard", label: "Dashboard" }]}
            />
          </Show>
        </div>
      </Container>
    </header>
  );
}
