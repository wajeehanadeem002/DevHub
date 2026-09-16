import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { publicEnv } from "@/lib/env/public";
import { siteConfig } from "@/lib/site";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description: siteConfig.description,
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html className={`${geistSans.variable} ${geistMono.variable}`} lang="en">
      <body className="flex min-h-screen flex-col bg-[#f6f1e8] font-sans text-[#3b2f27] antialiased">
        <ClerkProvider afterSignOutUrl="/">
          <a
            className="sr-only z-50 rounded-md bg-[#3b2f27] px-4 py-2 text-[#fcfaf5] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            href="#main-content"
          >
            Skip to content
          </a>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
        </ClerkProvider>
      </body>
    </html>
  );
}
