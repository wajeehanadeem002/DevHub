import "server-only";

import { parseClerkEnv } from "./schema";

export function getClerkEnv() {
  return parseClerkEnv({
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
}
