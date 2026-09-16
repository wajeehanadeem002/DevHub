import { clerkMiddleware } from "@clerk/nextjs/server";

import { enforceRouteAccess } from "@/lib/auth/route-access";

export default clerkMiddleware(async (auth, request) => {
  await enforceRouteAccess(auth, request.nextUrl.pathname);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
