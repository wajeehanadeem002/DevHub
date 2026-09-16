import { SignIn } from "@clerk/nextjs";

import { parseProjectSignInReturn } from "@/features/auth/sign-in-return";

type SignInPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const returnTo = parseProjectSignInReturn((await searchParams).returnTo);
  const redirectProps = returnTo
    ? { fallbackRedirectUrl: returnTo, forceRedirectUrl: returnTo }
    : { fallbackRedirectUrl: "/onboarding" };

  return (
    <main
      className="flex flex-1 items-center justify-center px-6 py-16"
      id="main-content"
    >
      <SignIn {...redirectProps} />
    </main>
  );
}
