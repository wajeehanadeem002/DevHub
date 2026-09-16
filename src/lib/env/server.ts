import "server-only";

import { parseServerEnv } from "./schema";

export const serverEnv = parseServerEnv({
  NODE_ENV: process.env.NODE_ENV,
});
