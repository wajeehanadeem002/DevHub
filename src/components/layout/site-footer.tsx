import Link from "next/link";

import { BrandMark } from "@/components/ui/brand-mark";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

const footerGroups = [
  {
    heading: "Platform",
    links: [
      { href: "/projects", label: "Explore" },
      { href: "#developers", label: "Developers" },
      { href: "/projects", label: "Projects" },
      { href: "#technologies", label: "Technologies" },
    ],
  },
  {
    heading: "Community",
    links: [
      { href: "#final-cta", label: "Guidelines" },
      { href: "#final-cta", label: "Discussions" },
      { href: "#final-cta", label: "Resources" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "#final-cta", label: "About" },
      { href: "#final-cta", label: "Contact" },
      { href: "#final-cta", label: "Privacy" },
      { href: "#final-cta", label: "Terms" },
    ],
  },
] as const;

const socialLinks = [
  {
    href: "https://github.com",
    label: "GitHub",
    path: "M9 19c-4.2 1.3-4.2-2.2-5.9-2.7M15 22v-3.4c0-1 .1-1.4-.5-2 2.8-.3 5.7-1.4 5.7-6.2 0-1.4-.5-2.6-1.3-3.5.1-.3.6-1.7-.1-3.5 0 0-1.1-.4-3.7 1.3A12.8 12.8 0 0 0 8.5 4C6 2.4 4.8 2.8 4.8 2.8 4.1 4.6 4.6 6 4.7 6.3a5.1 5.1 0 0 0-1.4 3.6c0 4.8 2.9 5.9 5.7 6.2-.5.5-.6 1-.6 2V22",
  },
  {
    href: "https://www.linkedin.com",
    label: "LinkedIn",
    path: "M6.5 9.5V18M6.5 6.5v.1M10.5 18v-8.5M10.5 13.2c.7-2.3 6-2.5 6 1.2V18",
  },
  {
    href: "https://x.com",
    label: "X",
    path: "m5 5 14 14M19 5 5 19",
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-[#8a6a52]/40 bg-[#3b2f27] pb-8 pt-16 text-[#fcfaf5] sm:pt-20">
      <Container>
        <div className="grid gap-12 border-b border-[#e9ded0]/15 pb-14 md:grid-cols-[1.4fr_2fr] lg:gap-24">
          <div>
            <Link
              className="inline-flex items-center gap-2.5 rounded-lg text-lg font-semibold tracking-[-0.03em] text-[#fcfaf5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d8c3a8]"
              href="/"
            >
              <BrandMark />
              {siteConfig.name}
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-6 text-[#d8c3a8]">
              Where developers build, showcase, and connect.
            </p>
            <div className="mt-7 flex gap-2.5">
              {socialLinks.map((social) => (
                <a
                  aria-label={social.label}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[#e9ded0]/20 bg-[#fcfaf5]/[0.04] text-[#d8c3a8] transition-[border-color,color,transform] hover:-translate-y-0.5 hover:border-[#d8c3a8]/70 hover:text-[#fcfaf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8c3a8] motion-reduce:transform-none"
                  href={social.href}
                  key={social.label}
                  rel="noreferrer"
                  target="_blank"
                >
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <path
                      d={social.path}
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.heading}>
                <h2 className="text-sm font-semibold text-[#fcfaf5]">{group.heading}</h2>
                <ul className="mt-5 space-y-3.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        className="rounded text-sm text-[#d8c3a8] transition-colors hover:text-[#fcfaf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8c3a8]"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-7 text-xs text-[#d8c3a8]/75 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <p>{siteConfig.tagline}</p>
        </div>
      </Container>
    </footer>
  );
}
