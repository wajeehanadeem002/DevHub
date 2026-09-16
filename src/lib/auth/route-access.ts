const protectedRoutePrefixes = ["/dashboard", "/onboarding"] as const;

type RouteAuthBoundary = {
  protect: () => Promise<unknown>;
};

export function isProtectedRoute(pathname: string) {
  return protectedRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function enforceRouteAccess(
  auth: RouteAuthBoundary,
  pathname: string,
) {
  if (isProtectedRoute(pathname)) {
    await auth.protect();
  }
}
