import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

const clerkEnvSchema = z.object({
  CLERK_SECRET_KEY: z.string().trim().startsWith("sk_").min(8),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().trim().startsWith("pk_").min(8),
});

const supabasePublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
});

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClerkEnv = z.infer<typeof clerkEnvSchema>;
export type SupabasePublicEnv = z.infer<typeof supabasePublicEnvSchema>;

export function parsePublicEnv(input: unknown): PublicEnv {
  return publicEnvSchema.parse(input);
}

export function parseServerEnv(input: unknown): ServerEnv {
  return serverEnvSchema.parse(input);
}

export function parseClerkEnv(input: unknown): ClerkEnv {
  return clerkEnvSchema.parse(input);
}

export function parseSupabasePublicEnv(input: unknown): SupabasePublicEnv {
  return supabasePublicEnvSchema.parse(input);
}
